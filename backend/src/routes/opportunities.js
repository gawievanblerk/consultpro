/**
 * Opportunities Routes - Business Development Module (Module 1.2)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// Helper to generate opportunity number
async function generateOpportunityNumber(tenantId) {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) + 1 as next_num FROM opportunities WHERE tenant_id = $1 AND created_at >= $2`,
    [tenantId, `${year}-01-01`]
  );
  return `OPP-${year}-${String(result.rows[0].next_num).padStart(4, '0')}`;
}

// GET /api/opportunities - List all opportunities
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, stage, owner_id, client_id, min_value, max_value } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE o.tenant_id = $1 AND o.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (stage) {
      whereClause += ` AND o.stage = $${paramIndex}`;
      params.push(stage);
      paramIndex++;
    }

    if (owner_id) {
      whereClause += ` AND o.owner_id = $${paramIndex}`;
      params.push(owner_id);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND o.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (min_value) {
      whereClause += ` AND o.value >= $${paramIndex}`;
      params.push(min_value);
      paramIndex++;
    }

    if (max_value) {
      whereClause += ` AND o.value <= $${paramIndex}`;
      params.push(max_value);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM opportunities o ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT o.*, c.company_name as client_name, l.company_name as lead_name
       FROM opportunities o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN leads l ON o.lead_id = l.id
       ${whereClause}
       ORDER BY o.created_at DESC
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
    console.error('List opportunities error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch opportunities' });
  }
});

// GET /api/opportunities/:id - Get opportunity by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.company_name as client_name, l.company_name as lead_name
       FROM opportunities o
       LEFT JOIN clients c ON o.client_id = c.id
       LEFT JOIN leads l ON o.lead_id = l.id
       WHERE o.id = $1 AND o.tenant_id = $2 AND o.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get opportunity error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch opportunity' });
  }
});

// GET /api/opportunities/:id/history - Get opportunity stage history
router.get('/:id/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM opportunity_history
       WHERE opportunity_id = $1
       ORDER BY created_at DESC`,
      [req.params.id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get opportunity history error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// POST /api/opportunities - Create new opportunity
router.post('/', async (req, res) => {
  try {
    const {
      name, lead_id, client_id, value, stage, probability,
      expected_close_date, owner_id, description
    } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Opportunity name is required' });
    }

    const id = uuidv4();
    const opportunity_number = await generateOpportunityNumber(req.tenant_id);

    const result = await pool.query(
      `INSERT INTO opportunities (
        id, tenant_id, opportunity_number, name, lead_id, client_id,
        value, stage, probability, expected_close_date, owner_id, description, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        id, req.tenant_id, opportunity_number, name, lead_id, client_id,
        value || 0, stage || 'qualified', probability || 50,
        expected_close_date, owner_id || req.user.id, description, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create opportunity error:', error);
    res.status(500).json({ success: false, error: 'Failed to create opportunity' });
  }
});

// PUT /api/opportunities/:id - Update opportunity
router.put('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const allowedFields = [
      'name', 'value', 'stage', 'probability', 'expected_close_date',
      'owner_id', 'description', 'close_date', 'outcome', 'loss_reason'
    ];

    const updateFields = [];
    const values = [req.params.id, req.tenant_id];
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
      `UPDATE opportunities SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update opportunity error:', error);
    res.status(500).json({ success: false, error: 'Failed to update opportunity' });
  }
});

// POST /api/opportunities/:id/close - Close opportunity (won/lost)
router.post('/:id/close', async (req, res) => {
  try {
    const { outcome, close_notes, loss_reason, close_date } = req.body;

    if (!outcome || !['won', 'lost'].includes(outcome)) {
      return res.status(400).json({ success: false, error: 'Outcome must be won or lost' });
    }

    const result = await pool.query(
      `UPDATE opportunities SET
        outcome = $1, close_date = $2, stage = $3,
        loss_reason = $4, notes = COALESCE(notes, '') || $5,
        probability = $6, updated_at = NOW()
       WHERE id = $7 AND tenant_id = $8 AND deleted_at IS NULL
       RETURNING *`,
      [
        outcome,
        close_date || new Date().toISOString(),
        outcome === 'won' ? 'closed_won' : 'closed_lost',
        loss_reason,
        close_notes ? `\n[${new Date().toISOString()}] ${close_notes}` : '',
        outcome === 'won' ? 100 : 0,
        req.params.id,
        req.tenant_id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Close opportunity error:', error);
    res.status(500).json({ success: false, error: 'Failed to close opportunity' });
  }
});

// DELETE /api/opportunities/:id - Delete opportunity
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE opportunities SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Opportunity not found' });
    }

    res.json({ success: true, message: 'Opportunity deleted successfully' });

  } catch (error) {
    console.error('Delete opportunity error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete opportunity' });
  }
});

module.exports = router;
