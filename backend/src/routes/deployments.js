/**
 * Deployment Routes - HR Outsourcing Module (Module 1.3)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/deployments - List all deployments
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, client_id, staff_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE d.tenant_id = $1 AND d.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND d.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (staff_id) {
      whereClause += ` AND d.staff_id = $${paramIndex}`;
      params.push(staff_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM deployments d ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT d.*,
        c.company_name as client_name,
        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
        e.name as engagement_name
       FROM deployments d
       LEFT JOIN clients c ON d.client_id = c.id
       LEFT JOIN staff s ON d.staff_id = s.id
       LEFT JOIN engagements e ON d.engagement_id = e.id
       ${whereClause}
       ORDER BY d.start_date DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('List deployments error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deployments' });
  }
});

// GET /api/deployments/:id - Get deployment by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*,
        c.company_name as client_name,
        CONCAT(s.first_name, ' ', s.last_name) as staff_name,
        e.name as engagement_name
       FROM deployments d
       LEFT JOIN clients c ON d.client_id = c.id
       LEFT JOIN staff s ON d.staff_id = s.id
       LEFT JOIN engagements e ON d.engagement_id = e.id
       WHERE d.id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Deployment not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get deployment error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deployment' });
  }
});

// POST /api/deployments - Create new deployment
router.post('/', async (req, res) => {
  try {
    const {
      staff_id, client_id, engagement_id, start_date, end_date,
      billing_rate, billing_type, location, role_title, notes
    } = req.body;

    if (!staff_id || !client_id || !start_date) {
      return res.status(400).json({
        success: false,
        error: 'Staff, client, and start date are required'
      });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO deployments (
        id, tenant_id, staff_id, client_id, engagement_id, start_date, end_date,
        billing_rate, billing_type, location, role_title, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', $13)
      RETURNING *`,
      [
        id, req.tenant_id, staff_id, client_id, engagement_id, start_date, end_date,
        billing_rate, billing_type || 'monthly', location, role_title, notes, req.user.id
      ]
    );

    // Update staff availability
    await pool.query(
      'UPDATE staff SET is_available = false WHERE id = $1',
      [staff_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create deployment error:', error);
    res.status(500).json({ success: false, error: 'Failed to create deployment' });
  }
});

// PUT /api/deployments/:id - Update deployment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'end_date', 'billing_rate', 'billing_type', 'location',
      'role_title', 'notes', 'status'
    ];

    const updateFields = [];
    const values = [id, req.tenant_id];
    let paramIndex = 3;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    updateFields.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE deployments SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Deployment not found' });
    }

    // If status changed to completed, update staff availability
    if (updates.status === 'completed' || updates.status === 'terminated') {
      await pool.query(
        'UPDATE staff SET is_available = true WHERE id = $1',
        [result.rows[0].staff_id]
      );
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update deployment error:', error);
    res.status(500).json({ success: false, error: 'Failed to update deployment' });
  }
});

// POST /api/deployments/:id/transfer - Transfer deployment to new client
router.post('/:id/transfer', async (req, res) => {
  try {
    const { new_client_id, transfer_date, transfer_reason } = req.body;

    if (!new_client_id) {
      return res.status(400).json({ success: false, error: 'New client ID is required' });
    }

    // End current deployment
    await pool.query(
      `UPDATE deployments SET status = 'transferred', end_date = $3, notes = COALESCE(notes, '') || $4
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.tenant_id, transfer_date || new Date().toISOString(), `\nTransferred: ${transfer_reason || 'N/A'}`]
    );

    // Get original deployment details
    const original = await pool.query(
      'SELECT * FROM deployments WHERE id = $1',
      [req.params.id]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Deployment not found' });
    }

    const orig = original.rows[0];

    // Create new deployment at new client
    const newId = uuidv4();
    const result = await pool.query(
      `INSERT INTO deployments (id, tenant_id, staff_id, client_id, start_date, billing_rate, billing_type, role_title, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9)
       RETURNING *`,
      [newId, req.tenant_id, orig.staff_id, new_client_id, transfer_date || new Date().toISOString(), orig.billing_rate, orig.billing_type, orig.role_title, req.user.id]
    );

    res.json({ success: true, data: result.rows[0], message: 'Deployment transferred successfully' });

  } catch (error) {
    console.error('Transfer deployment error:', error);
    res.status(500).json({ success: false, error: 'Failed to transfer deployment' });
  }
});

// GET /api/deployments/:id/service-logs - Get service logs for deployment
router.get('/:id/service-logs', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    let whereClause = 'WHERE sl.deployment_id = $1 AND sl.tenant_id = $2';
    let params = [req.params.id, req.tenant_id];
    let paramIndex = 3;

    if (from_date) {
      whereClause += ` AND sl.date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND sl.date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT sl.* FROM service_logs sl ${whereClause} ORDER BY sl.date DESC`,
      params
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get service logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch service logs' });
  }
});

// GET /api/deployments/:id/service-logs/summary - Get summary of service logs
router.get('/:id/service-logs/summary', async (req, res) => {
  try {
    const { from_date, to_date } = req.query;

    let whereClause = 'WHERE sl.deployment_id = $1 AND sl.tenant_id = $2';
    let params = [req.params.id, req.tenant_id];
    let paramIndex = 3;

    if (from_date) {
      whereClause += ` AND sl.date >= $${paramIndex}`;
      params.push(from_date);
      paramIndex++;
    }

    if (to_date) {
      whereClause += ` AND sl.date <= $${paramIndex}`;
      params.push(to_date);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT
        COUNT(*) as total_entries,
        COALESCE(SUM(hours_worked), 0) as total_hours,
        COALESCE(SUM(CASE WHEN billable THEN hours_worked ELSE 0 END), 0) as billable_hours,
        COALESCE(SUM(CASE WHEN NOT billable THEN hours_worked ELSE 0 END), 0) as non_billable_hours
       FROM service_logs sl ${whereClause}`,
      params
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get service logs summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch summary' });
  }
});

// POST /api/deployments/:id/service-logs - Add service log
router.post('/:id/service-logs', async (req, res) => {
  try {
    const { date, hours_worked, description, billable } = req.body;

    if (!date || !hours_worked) {
      return res.status(400).json({ success: false, error: 'Date and hours worked are required' });
    }

    const id = uuidv4();
    const result = await pool.query(
      `INSERT INTO service_logs (id, tenant_id, deployment_id, date, hours_worked, description, billable, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, req.tenant_id, req.params.id, date, hours_worked, description, billable !== false, req.user.id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Add service log error:', error);
    res.status(500).json({ success: false, error: 'Failed to add service log' });
  }
});

// POST /api/deployments/:id/service-logs/approve - Approve service logs for period
router.post('/:id/service-logs/approve', async (req, res) => {
  try {
    const { month } = req.body; // Format: YYYY-MM

    if (!month) {
      return res.status(400).json({ success: false, error: 'Month is required (YYYY-MM format)' });
    }

    const startDate = `${month}-01`;
    const endDate = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).toISOString().split('T')[0];

    const result = await pool.query(
      `UPDATE service_logs SET approved = true, approved_by = $1, approved_at = NOW()
       WHERE deployment_id = $2 AND tenant_id = $3 AND date >= $4 AND date <= $5 AND approved = false
       RETURNING *`,
      [req.user.id, req.params.id, req.tenant_id, startDate, endDate]
    );

    res.json({
      success: true,
      message: `Approved ${result.rows.length} service log entries`,
      data: result.rows
    });

  } catch (error) {
    console.error('Approve service logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve service logs' });
  }
});

// DELETE /api/deployments/:id - Soft delete deployment
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE deployments SET deleted_at = NOW(), status = 'terminated'
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id, staff_id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Deployment not found' });
    }

    // Make staff available again
    await pool.query(
      'UPDATE staff SET is_available = true WHERE id = $1',
      [result.rows[0].staff_id]
    );

    res.json({ success: true, message: 'Deployment terminated successfully' });

  } catch (error) {
    console.error('Delete deployment error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete deployment' });
  }
});

module.exports = router;
