/**
 * Client Routes - CRM Module (Module 1.1)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/clients - List all clients
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      client_type,
      industry,
      account_manager_id
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = 'WHERE c.tenant_id = $1 AND c.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (c.company_name ILIKE $${paramIndex} OR c.trading_name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (client_type) {
      whereClause += ` AND c.client_type = $${paramIndex}`;
      params.push(client_type);
      paramIndex++;
    }

    if (industry) {
      whereClause += ` AND c.industry = $${paramIndex}`;
      params.push(industry);
      paramIndex++;
    }

    if (account_manager_id) {
      whereClause += ` AND c.account_manager_id = $${paramIndex}`;
      params.push(account_manager_id);
      paramIndex++;
    }

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM clients c ${whereClause}`,
      params
    );

    // Get clients with pagination
    const result = await pool.query(
      `SELECT c.*,
              (SELECT COUNT(*) FROM contacts WHERE client_id = c.id AND deleted_at IS NULL) as contact_count,
              (SELECT COUNT(*) FROM engagements WHERE client_id = c.id AND deleted_at IS NULL) as engagement_count,
              (SELECT COUNT(*) FROM invoices WHERE client_id = c.id AND deleted_at IS NULL) as invoice_count
       FROM clients c
       ${whereClause}
       ORDER BY c.company_name ASC
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
    console.error('List clients error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clients'
    });
  }
});

// GET /api/clients/:id - Get client by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*,
              (SELECT json_agg(ct) FROM contacts ct WHERE ct.client_id = c.id AND ct.deleted_at IS NULL) as contacts,
              (SELECT json_agg(e) FROM engagements e WHERE e.client_id = c.id AND e.deleted_at IS NULL) as engagements
       FROM clients c
       WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Get client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch client'
    });
  }
});

// POST /api/clients - Create new client
router.post('/', async (req, res) => {
  try {
    const {
      company_name,
      trading_name,
      industry,
      company_size,
      registration_number,
      tax_id,
      vat_number,
      website,
      address_line1,
      address_line2,
      city,
      state,
      country,
      postal_code,
      phone,
      email,
      client_type,
      client_tier,
      account_manager_id,
      credit_limit,
      payment_terms,
      notes
    } = req.body;

    if (!company_name) {
      return res.status(400).json({
        success: false,
        error: 'Company name is required'
      });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO clients (
        id, tenant_id, company_name, trading_name, industry, company_size,
        registration_number, tax_id, vat_number, website,
        address_line1, address_line2, city, state, country, postal_code,
        phone, email, client_type, client_tier, account_manager_id,
        credit_limit, payment_terms, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25
      ) RETURNING *`,
      [
        id, req.tenant_id, company_name, trading_name, industry, company_size,
        registration_number, tax_id, vat_number, website,
        address_line1, address_line2, city, state, country || 'Nigeria', postal_code,
        phone, email, client_type || 'prospect', client_tier || 'standard',
        account_manager_id, credit_limit, payment_terms || 30, notes, req.user.id
      ]
    );

    // Log activity
    await pool.query(
      `INSERT INTO activity_logs (tenant_id, entity_type, entity_id, activity_type, description, created_by)
       VALUES ($1, 'client', $2, 'created', $3, $4)`,
      [req.tenant_id, id, `Created client: ${company_name}`, req.user.id]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create client'
    });
  }
});

// PUT /api/clients/:id - Update client
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const updateFields = [];
    const values = [id, req.tenant_id];
    let paramIndex = 3;

    const allowedFields = [
      'company_name', 'trading_name', 'industry', 'company_size',
      'registration_number', 'tax_id', 'vat_number', 'website',
      'address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code',
      'phone', 'email', 'client_type', 'client_tier', 'account_manager_id',
      'credit_limit', 'payment_terms', 'notes'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        values.push(updates[field]);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updateFields.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE clients
       SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Update client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update client'
    });
  }
});

// DELETE /api/clients/:id - Soft delete client
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE clients
       SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id, company_name`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      message: 'Client deleted successfully'
    });

  } catch (error) {
    console.error('Delete client error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete client'
    });
  }
});

module.exports = router;
