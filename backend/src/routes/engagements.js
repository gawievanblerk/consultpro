/**
 * Engagement Routes - CRM Module (Module 1.1)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// Generate engagement number
async function generateEngagementNumber(tenantId, pool) {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) + 1 as next_num FROM engagements WHERE tenant_id = $1 AND created_at >= $2`,
    [tenantId, `${year}-01-01`]
  );
  const num = result.rows[0].next_num.toString().padStart(4, '0');
  return `ENG-${year}-${num}`;
}

// GET /api/engagements - List all engagements
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, client_id, engagement_type } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE e.tenant_id = $1 AND e.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (e.name ILIKE $${paramIndex} OR e.engagement_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND e.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (engagement_type) {
      whereClause += ` AND e.engagement_type = $${paramIndex}`;
      params.push(engagement_type);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM engagements e ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT e.*, c.company_name as client_name
       FROM engagements e
       LEFT JOIN clients c ON e.client_id = c.id
       ${whereClause}
       ORDER BY e.created_at DESC
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
    console.error('List engagements error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch engagements' });
  }
});

// GET /api/engagements/expiring - Get engagements expiring soon (MUST BE BEFORE :id route)
router.get('/expiring', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await pool.query(
      `SELECT e.*, c.company_name as client_name
       FROM engagements e
       LEFT JOIN clients c ON e.client_id = c.id
       WHERE e.tenant_id = $1
         AND e.deleted_at IS NULL
         AND e.status = 'active'
         AND e.end_date IS NOT NULL
         AND e.end_date <= CURRENT_DATE + INTERVAL '1 day' * $2
         AND e.end_date >= CURRENT_DATE
       ORDER BY e.end_date ASC`,
      [req.tenant_id, parseInt(days)]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get expiring engagements error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch expiring engagements' });
  }
});

// GET /api/engagements/:id - Get engagement by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, c.company_name as client_name
       FROM engagements e
       LEFT JOIN clients c ON e.client_id = c.id
       WHERE e.id = $1 AND e.tenant_id = $2 AND e.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get engagement error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch engagement' });
  }
});

// POST /api/engagements - Create new engagement
router.post('/', async (req, res) => {
  try {
    const {
      client_id, name, description, engagement_type, status,
      start_date, end_date, contract_value,
      billing_type, billing_rate, notes
    } = req.body;

    if (!client_id || !name || !engagement_type) {
      return res.status(400).json({
        success: false,
        error: 'Client ID, name, and engagement type are required'
      });
    }

    // Validate client exists
    const clientCheck = await pool.query(
      'SELECT id FROM clients WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [client_id, req.tenant_id]
    );
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const id = uuidv4();
    // Generate contract_number using existing helper (renamed from engagement_number)
    const contract_number = await generateEngagementNumber(req.tenant_id, pool);

    const result = await pool.query(
      `INSERT INTO engagements (
        id, tenant_id, client_id, contract_number, name, description,
        engagement_type, status, start_date, end_date,
        contract_value, billing_type, billing_rate, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, req.tenant_id, client_id, contract_number, name, description,
        engagement_type, status || 'draft', start_date, end_date, contract_value,
        billing_type, billing_rate, notes, req.user.id
      ]
    );

    // Add engagement_number alias in response for API compatibility
    const data = { ...result.rows[0], engagement_number: result.rows[0].contract_number };
    res.status(201).json({ success: true, data });

  } catch (error) {
    console.error('Create engagement error:', error);
    res.status(500).json({ success: false, error: 'Failed to create engagement' });
  }
});

// PUT /api/engagements/:id - Update engagement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'name', 'description', 'engagement_type', 'status',
      'start_date', 'end_date', 'contract_value', 'billing_type', 'billing_rate',
      'contract_number', 'contract_signed_date', 'notes',
      'account_manager_id', 'primary_contact_id'
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
      `UPDATE engagements SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update engagement error:', error);
    res.status(500).json({ success: false, error: 'Failed to update engagement' });
  }
});

// PUT /api/engagements/:id/status - Update engagement status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['draft', 'active', 'on_hold', 'completed', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const result = await pool.query(
      `UPDATE engagements
       SET status = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [req.params.id, req.tenant_id, status]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update engagement status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// DELETE /api/engagements/:id - Soft delete engagement
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE engagements SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }

    res.json({ success: true, message: 'Engagement deleted successfully' });

  } catch (error) {
    console.error('Delete engagement error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete engagement' });
  }
});

// POST /api/engagements/:id/clone - Clone engagement for renewal
router.post('/:id/clone', async (req, res) => {
  try {
    // Get original engagement
    const original = await pool.query(
      `SELECT * FROM engagements WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (original.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Engagement not found' });
    }

    const eng = original.rows[0];
    const newId = uuidv4();
    const newContractNumber = await generateEngagementNumber(req.tenant_id, pool);

    const result = await pool.query(
      `INSERT INTO engagements (
        id, tenant_id, client_id, contract_number, name, description,
        engagement_type, status, contract_value, billing_type, billing_rate, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft', $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        newId, req.tenant_id, eng.client_id, newContractNumber,
        eng.name + ' (Renewal)', eng.description, eng.engagement_type,
        eng.contract_value, eng.billing_type, eng.billing_rate, eng.notes, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Clone engagement error:', error);
    res.status(500).json({ success: false, error: 'Failed to clone engagement' });
  }
});

// GET /api/engagements/:id/staff - Get staff deployed to engagement
router.get('/:id/staff', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.*, s.first_name, s.last_name, s.email, s.job_title
       FROM deployments d
       LEFT JOIN staff s ON d.staff_id = s.id
       WHERE d.engagement_id = $1 AND d.tenant_id = $2 AND d.deleted_at IS NULL
       ORDER BY d.start_date DESC`,
      [req.params.id, req.tenant_id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get engagement staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// GET /api/engagements/:id/invoices - Get invoices for engagement
router.get('/:id/invoices', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM invoices
       WHERE engagement_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       ORDER BY invoice_date DESC`,
      [req.params.id, req.tenant_id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get engagement invoices error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch invoices' });
  }
});

module.exports = router;
