/**
 * Lead Routes - Business Development Module (Module 1.2)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// Helper to generate lead number
async function generateLeadNumber(tenantId) {
  const year = new Date().getFullYear();
  const result = await pool.query(
    `SELECT COUNT(*) + 1 as next_num FROM leads WHERE tenant_id = $1 AND created_at >= $2`,
    [tenantId, `${year}-01-01`]
  );
  return `LD-${year}-${String(result.rows[0].next_num).padStart(4, '0')}`;
}

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
      whereClause += ` AND l.pipeline_stage_id = $${paramIndex}`;
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
       LEFT JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
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

// GET /api/leads/export - Export leads to CSV (MUST BE BEFORE :id route)
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const result = await pool.query(
      `SELECT id, company_name, contact_name, email, phone,
              source, status, estimated_value, probability, created_at
       FROM leads
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [req.tenant_id]
    );

    if (format === 'csv') {
      const headers = ['ID', 'Company', 'Contact', 'Email', 'Phone', 'Source', 'Status', 'Value', 'Probability', 'Created'];
      const csvRows = [headers.join(',')];

      for (const row of result.rows) {
        csvRows.push([
          row.id || '',
          row.company_name || '',
          row.contact_name || '',
          row.email || '',
          row.phone || '',
          row.source || '',
          row.status || '',
          row.estimated_value || 0,
          row.probability || 0,
          row.created_at || ''
        ].map(v => `"${v}"`).join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
      return res.send(csvRows.join('\n'));
    }

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Export leads error:', error);
    res.status(500).json({ success: false, error: 'Failed to export leads' });
  }
});

// POST /api/leads/import - Import leads from CSV/JSON (MUST BE BEFORE :id route)
router.post('/import', async (req, res) => {
  try {
    const { leads } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ success: false, error: 'Leads array is required' });
    }

    const imported = [];
    const errors = [];

    for (const lead of leads) {
      try {
        if (!lead.company_name) {
          errors.push({ lead, error: 'Company name is required' });
          continue;
        }

        const id = uuidv4();
        const lead_number = await generateLeadNumber(req.tenant_id);

        const result = await pool.query(
          `INSERT INTO leads (id, tenant_id, company_name, contact_name, email, source, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'new', $7)
           RETURNING id, company_name`,
          [id, req.tenant_id, lead.company_name, lead.contact_name, lead.email || lead.contact_email, lead.source || 'other', req.user.id]
        );
        imported.push(result.rows[0]);
      } catch (err) {
        errors.push({ lead, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      data: { imported: imported.length, errors: errors.length, details: { imported, errors } }
    });

  } catch (error) {
    console.error('Import leads error:', error);
    res.status(500).json({ success: false, error: 'Failed to import leads' });
  }
});

// GET /api/leads/:id - Get lead by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, ps.name as stage_name
       FROM leads l
       LEFT JOIN pipeline_stages ps ON l.pipeline_stage_id = ps.id
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
      company_name, contact_name, email, phone,
      source, pipeline_stage_id, stage_id, estimated_value, probability,
      expected_close_date, notes, assigned_to
    } = req.body;

    if (!company_name || !contact_name) {
      return res.status(400).json({
        success: false,
        error: 'Company name and contact name are required'
      });
    }

    const id = uuidv4();

    // Get first stage if not provided (accept both pipeline_stage_id and stage_id for compatibility)
    let finalStageId = pipeline_stage_id || stage_id;
    if (!finalStageId) {
      const stageResult = await pool.query(
        'SELECT id FROM pipeline_stages WHERE tenant_id = $1 AND is_active = true ORDER BY position LIMIT 1',
        [req.tenant_id]
      );
      if (stageResult.rows.length > 0) {
        finalStageId = stageResult.rows[0].id;
      }
    }

    const result = await pool.query(
      `INSERT INTO leads (
        id, tenant_id, company_name, contact_name, email, phone,
        source, pipeline_stage_id, status, estimated_value, probability,
        expected_close_date, notes, assigned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, req.tenant_id, company_name, contact_name, email, phone,
        source || 'other', finalStageId, 'new', estimated_value, probability || 10,
        expected_close_date, notes, assigned_to, req.user.id
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

    // Map legacy field names to correct database columns
    if (updates.stage_id) updates.pipeline_stage_id = updates.stage_id;
    if (updates.contact_email) updates.email = updates.contact_email;
    if (updates.contact_phone) updates.phone = updates.contact_phone;

    const allowedFields = [
      'company_name', 'contact_name', 'email', 'phone',
      'source', 'pipeline_stage_id', 'status', 'estimated_value', 'probability',
      'expected_close_date', 'notes', 'assigned_to', 'score'
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
    const { stage_id, pipeline_stage_id } = req.body;

    const result = await pool.query(
      `UPDATE leads
       SET pipeline_stage_id = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [req.params.id, req.tenant_id, pipeline_stage_id || stage_id]
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

// POST /api/leads/:id/calculate-score - Calculate lead score based on criteria
router.post('/:id/calculate-score', async (req, res) => {
  try {
    const lead = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenant_id]
    );

    if (lead.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const leadData = lead.rows[0];
    let score = 0;

    // Score based on criteria
    if (leadData.email) score += 20;
    if (leadData.phone) score += 15;
    if (leadData.estimated_value > 0) score += 20;
    if (leadData.estimated_value > 1000000) score += 10;
    if (leadData.company_name) score += 10;
    if (leadData.source === 'referral') score += 15;
    if (leadData.status === 'qualified') score += 10;

    // Cap at 100
    score = Math.min(score, 100);

    const result = await pool.query(
      `UPDATE leads SET score = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [score, req.params.id, req.tenant_id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Calculate score error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate score' });
  }
});

// POST /api/leads/:id/convert - Convert lead to client
router.post('/:id/convert', async (req, res) => {
  try {
    const lead = await pool.query(
      'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenant_id]
    );

    if (lead.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    const leadData = lead.rows[0];

    // Check if lead is qualified
    if (leadData.status === 'unqualified') {
      return res.status(400).json({ success: false, error: 'Cannot convert unqualified lead' });
    }

    // Create client from lead
    const clientId = uuidv4();
    await pool.query(
      `INSERT INTO clients (id, tenant_id, company_name, phone, email, client_type, created_by)
       VALUES ($1, $2, $3, $4, $5, 'active', $6)`,
      [clientId, req.tenant_id, leadData.company_name, leadData.phone, leadData.email, req.user.id]
    );

    // Create contact from lead
    const contactId = uuidv4();
    const nameParts = (leadData.contact_name || 'Unknown').split(' ');
    await pool.query(
      `INSERT INTO contacts (id, tenant_id, client_id, first_name, last_name, email, phone, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [contactId, req.tenant_id, clientId, nameParts[0], nameParts.slice(1).join(' ') || '', leadData.email, leadData.phone]
    );

    // Mark lead as converted
    await pool.query(
      `UPDATE leads SET status = 'converted', converted_to_client_id = $3, converted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenant_id, clientId]
    );

    res.json({
      success: true,
      message: 'Lead converted to client successfully',
      data: { client_id: clientId, contact_id: contactId }
    });

  } catch (error) {
    console.error('Convert lead error:', error);
    res.status(500).json({ success: false, error: 'Failed to convert lead' });
  }
});

// PUT /api/leads/:id/convert - Convert lead to client (legacy endpoint)
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
      [clientId, req.tenant_id, leadData.company_name, leadData.phone, leadData.email, req.user.id]
    );

    // Create contact from lead
    const contactId = uuidv4();
    const nameParts = (leadData.contact_name || 'Unknown').split(' ');
    await pool.query(
      `INSERT INTO contacts (id, tenant_id, client_id, first_name, last_name, email, phone, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [contactId, req.tenant_id, clientId, nameParts[0], nameParts.slice(1).join(' ') || '', leadData.email, leadData.phone]
    );

    // Mark lead as won
    await pool.query(
      `UPDATE leads SET status = 'won', converted_to_client_id = $3, converted_at = NOW(), updated_at = NOW()
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
