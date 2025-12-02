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
