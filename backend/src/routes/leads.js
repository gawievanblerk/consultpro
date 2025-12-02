/**
 * Lead Routes - Business Development Module (Module 1.2)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/leads - List all leads
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, stage_id, source } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE l.tenant_id = $1 AND l.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (l.company_name ILIKE $${paramIndex} OR l.contact_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND l.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (stage_id) {
      whereClause += ` AND l.stage_id = $${paramIndex}`;
      params.push(stage_id);
      paramIndex++;
    }

    if (source) {
      whereClause += ` AND l.source = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leads l ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT l.*, ps.name as stage_name
       FROM leads l
       LEFT JOIN pipeline_stages ps ON l.stage_id = ps.id
       ${whereClause}
       ORDER BY l.created_at DESC
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
    console.error('List leads error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leads' });
  }
});

// GET /api/leads/:id - Get lead by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, ps.name as stage_name
       FROM leads l
       LEFT JOIN pipeline_stages ps ON l.stage_id = ps.id
       WHERE l.id = $1 AND l.tenant_id = $2 AND l.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch lead' });
  }
});

// POST /api/leads - Create new lead
router.post('/', async (req, res) => {
  try {
    const {
      company_name, contact_name, contact_email, contact_phone,
      source, stage_id, estimated_value, probability,
      expected_close_date, description, notes, assigned_to
    } = req.body;

    if (!company_name || !contact_name) {
      return res.status(400).json({
        success: false,
        error: 'Company name and contact name are required'
      });
    }

    const id = uuidv4();

    // Get first stage if not provided
    let finalStageId = stage_id;
    if (!finalStageId) {
      const stageResult = await pool.query(
        'SELECT id FROM pipeline_stages WHERE tenant_id = $1 AND is_active = true ORDER BY order_index LIMIT 1',
        [req.tenant_id]
      );
      if (stageResult.rows.length > 0) {
        finalStageId = stageResult.rows[0].id;
      }
    }

    const result = await pool.query(
      `INSERT INTO leads (
        id, tenant_id, company_name, contact_name, contact_email, contact_phone,
        source, stage_id, status, estimated_value, probability,
        expected_close_date, description, notes, assigned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        id, req.tenant_id, company_name, contact_name, contact_email, contact_phone,
        source || 'other', finalStageId, 'new', estimated_value, probability || 10,
        expected_close_date, description, notes, assigned_to, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to create lead' });
  }
});

// PUT /api/leads/:id - Update lead
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'company_name', 'contact_name', 'contact_email', 'contact_phone',
      'source', 'stage_id', 'status', 'estimated_value', 'probability',
      'expected_close_date', 'description', 'notes', 'assigned_to'
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
      `UPDATE leads SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lead' });
  }
});

// PUT /api/leads/:id/stage - Move lead to different stage
router.put('/:id/stage', async (req, res) => {
  try {
    const { stage_id } = req.body;

    const result = await pool.query(
      `UPDATE leads
       SET stage_id = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [req.params.id, req.tenant_id, stage_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update lead stage error:', error);
    res.status(500).json({ success: false, error: 'Failed to update lead stage' });
  }
});

// PUT /api/leads/:id/convert - Convert lead to client
router.put('/:id/convert', async (req, res) => {
  try {
    const lead = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenant_id]
    );

    if (lead.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const leadData = lead.rows[0];

    // Create client from lead
    const clientId = uuidv4();
    await pool.query(
      `INSERT INTO clients (id, tenant_id, company_name, phone, email, client_type, created_by)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
      [clientId, req.tenant_id, leadData.company_name, leadData.contact_phone, leadData.contact_email, req.user.id]
    );

    // Create contact from lead
    const contactId = uuidv4();
    const nameParts = leadData.contact_name.split(' ');
    await pool.query(
      `INSERT INTO contacts (id, tenant_id, client_id, first_name, last_name, email, phone, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [contactId, req.tenant_id, clientId, nameParts[0], nameParts.slice(1).join(' ') || '', leadData.contact_email, leadData.contact_phone]
    );

    // Mark lead as won
    await pool.query(
      `UPDATE leads SET status = 'won', converted_client_id = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenant_id, clientId]
    );

    res.json({
      success: true,
      message: 'Lead converted to client successfully',
      data: { clientId, contactId }
    });

  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to convert lead' });
  }
});

// DELETE /api/leads/:id - Soft delete lead
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE leads SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    res.json({ success: true, message: 'Lead deleted successfully' });

  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete lead' });
  }
});

module.exports = router;
