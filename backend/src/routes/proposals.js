/**
 * Proposal Routes - Business Development Module (Module 1.2)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// Generate proposal number
async function generateProposalNumber(tenantId, pool) {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) + 1 as next_num FROM proposals WHERE tenant_id = $1 AND created_at >= $2`,
    [tenantId, `${year}-01-01`]
  );
  const num = result.rows[0].next_num.toString().padStart(4, '0');
  return `PROP-${year}-${num}`;
}

// GET /api/proposals - List all proposals
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, lead_id, client_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE p.tenant_id = $1 AND p.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (lead_id) {
      whereClause += ` AND p.lead_id = $${paramIndex}`;
      params.push(lead_id);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND p.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM proposals p ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT p.*, c.company_name as client_name, l.company_name as lead_name
       FROM proposals p
       LEFT JOIN clients c ON p.client_id = c.id
       LEFT JOIN leads l ON p.lead_id = l.id
       ${whereClause}
       ORDER BY p.created_at DESC
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
    console.error('List proposals error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proposals' });
  }
});

// GET /api/proposals/templates - Get proposal templates (MUST BE BEFORE :id)
router.get('/templates', async (req, res) => {
  try {
    // Return a list of templates (could be from a templates table or static list)
    const templates = [
      { id: 'consulting', name: 'Consulting Proposal', description: 'Standard consulting services proposal' },
      { id: 'hr-outsourcing', name: 'HR Outsourcing Proposal', description: 'HR outsourcing services proposal' },
      { id: 'recruitment', name: 'Recruitment Proposal', description: 'Recruitment services proposal' }
    ];

    res.json({ success: true, data: templates });

  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch templates' });
  }
});

// GET /api/proposals/:id - Get proposal by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.company_name as client_name
       FROM proposals p
       LEFT JOIN clients c ON p.client_id = c.id
       WHERE p.id = $1 AND p.tenant_id = $2 AND p.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch proposal' });
  }
});

// POST /api/proposals - Create new proposal
router.post('/', async (req, res) => {
  try {
    const {
      lead_id, opportunity_id, client_id, title, description,
      total_value, valid_until, terms, notes
    } = req.body;

    if (!title || (!lead_id && !client_id && !opportunity_id)) {
      return res.status(400).json({
        success: false,
        error: 'Title and either lead, opportunity, or client is required'
      });
    }

    const id = uuidv4();
    const proposal_number = await generateProposalNumber(req.tenant_id, pool);

    const result = await pool.query(
      `INSERT INTO proposals (
        id, tenant_id, proposal_number, lead_id, opportunity_id, client_id, title, description,
        total_value, valid_until, terms, notes, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'draft', $13)
      RETURNING *`,
      [
        id, req.tenant_id, proposal_number, lead_id, opportunity_id, client_id, title, description,
        total_value, valid_until, terms, notes, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to create proposal' });
  }
});

// PUT /api/proposals/:id - Update proposal
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'title', 'description', 'total_value',
      'valid_until', 'terms', 'notes', 'status'
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
      `UPDATE proposals SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to update proposal' });
  }
});

// PUT /api/proposals/:id/send - Send proposal
router.put('/:id/send', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE proposals
       SET status = 'sent', sent_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Send proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to send proposal' });
  }
});

// DELETE /api/proposals/:id - Soft delete proposal
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE proposals SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Proposal not found' });
    }

    res.json({ success: true, message: 'Proposal deleted successfully' });

  } catch (error) {
    console.error('Delete proposal error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete proposal' });
  }
});

module.exports = router;
