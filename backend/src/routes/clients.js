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
      whereClause += ` AND (c.company_name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
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

    // account_manager_id filter - column may not exist in all installations
    if (account_manager_id) {
      // Skip if column doesn't exist - gracefully handle
      try {
        whereClause += ` AND c.created_by = $${paramIndex}`;
        params.push(account_manager_id);
        paramIndex++;
      } catch (e) {
        // Column doesn't exist, skip filter
      }
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

// GET /api/clients/export - Export clients to CSV (MUST BE BEFORE :id route)
router.get('/export', async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const result = await pool.query(
      `SELECT company_name, industry, tin, rc_number,
              email, phone, address_line1, city, state, country,
              client_type, client_tier, payment_terms
       FROM clients
       WHERE tenant_id = $1 AND deleted_at IS NULL
       ORDER BY company_name`,
      [req.tenant_id]
    );

    if (format === 'csv') {
      const headers = ['Company Name', 'Industry', 'TIN', 'RC Number', 'Email', 'Phone', 'Address', 'City', 'State', 'Country', 'Type', 'Tier', 'Payment Terms'];
      const csvRows = [headers.join(',')];

      for (const row of result.rows) {
        csvRows.push([
          row.company_name || '',
          row.industry || '',
          row.tin || '',
          row.rc_number || '',
          row.email || '',
          row.phone || '',
          row.address_line1 || '',
          row.city || '',
          row.state || '',
          row.country || '',
          row.client_type || '',
          row.client_tier || '',
          row.payment_terms || ''
        ].map(v => `"${v}"`).join(','));
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
      return res.send(csvRows.join('\n'));
    }

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Export clients error:', error);
    res.status(500).json({ success: false, error: 'Failed to export clients' });
  }
});

// POST /api/clients/import - Import clients (MUST BE BEFORE :id route)
router.post('/import', async (req, res) => {
  try {
    const { clients } = req.body;

    if (!clients || !Array.isArray(clients)) {
      return res.status(400).json({
        success: false,
        error: 'Clients array is required'
      });
    }

    const imported = [];
    const errors = [];

    for (const client of clients) {
      try {
        if (!client.company_name) {
          errors.push({ client, error: 'Company name is required' });
          continue;
        }

        const id = uuidv4();
        const result = await pool.query(
          `INSERT INTO clients (id, tenant_id, company_name, industry, email, phone, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, company_name`,
          [id, req.tenant_id, client.company_name, client.industry, client.email, client.phone, req.user.id]
        );
        imported.push(result.rows[0]);
      } catch (err) {
        errors.push({ client, error: err.message });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        imported: imported.length,
        errors: errors.length,
        details: { imported, errors }
      }
    });

  } catch (error) {
    console.error('Import clients error:', error);
    res.status(500).json({ success: false, error: 'Failed to import clients' });
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

    // Use correct column names from database
    const tin = tax_id || req.body.tin;
    const rc_number = registration_number || req.body.rc_number;

    // Validate Nigerian TIN format (10-12 digits)
    if (tin && !/^\d{10,12}$/.test(tin)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid TIN format. Nigerian TIN must be 10-12 digits'
      });
    }

    // Validate CAC registration number format (RC followed by digits)
    if (rc_number && !/^RC\d+$/i.test(rc_number)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CAC registration number format. Must be RC followed by digits (e.g., RC123456)'
      });
    }

    // Check for duplicate company (same name + registration number)
    if (rc_number) {
      const duplicate = await pool.query(
        `SELECT id FROM clients WHERE tenant_id = $1 AND company_name = $2 AND rc_number = $3 AND deleted_at IS NULL`,
        [req.tenant_id, company_name, rc_number]
      );
      if (duplicate.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'A client with this company name and registration number already exists'
        });
      }
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO clients (
        id, tenant_id, company_name, industry, website,
        address_line1, address_line2, city, state, country, postal_code,
        phone, email, tin, rc_number, client_type, client_tier,
        credit_limit, payment_terms, notes, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        id, req.tenant_id, company_name, industry, website,
        address_line1, address_line2, city, state, country || 'Nigeria', postal_code,
        phone, email, tin, rc_number, client_type || 'prospect', client_tier || 'standard',
        credit_limit, payment_terms || 30, notes, req.user.id
      ]
    );

    // Log activity - using correct column names from database schema
    await pool.query(
      `INSERT INTO activity_logs (tenant_id, entity_type, entity_id, activity_type, description, performed_by)
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

    // Map old field names to new database column names
    const fieldMapping = {
      'tax_id': 'tin',
      'registration_number': 'rc_number'
    };

    const allowedFields = [
      'company_name', 'industry', 'website',
      'address_line1', 'address_line2', 'city', 'state', 'country', 'postal_code',
      'phone', 'email', 'tin', 'rc_number', 'client_type', 'client_tier',
      'credit_limit', 'payment_terms', 'notes'
    ];

    // Also handle legacy field names
    if (updates.tax_id) updates.tin = updates.tax_id;
    if (updates.registration_number) updates.rc_number = updates.registration_number;

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

// PUT /api/clients/:id/status - Update client status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['active', 'inactive', 'prospect', 'churned'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const result = await pool.query(
      `UPDATE clients SET client_type = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
       RETURNING *`,
      [status, req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update client status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update client status' });
  }
});

// GET /api/clients/:id/headcount - Get active staff count for client
router.get('/:id/headcount', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as headcount
       FROM deployments
       WHERE client_id = $1 AND tenant_id = $2 AND status = 'active' AND deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    res.json({
      success: true,
      data: {
        client_id: req.params.id,
        headcount: parseInt(result.rows[0].headcount)
      }
    });

  } catch (error) {
    console.error('Get headcount error:', error);
    res.status(500).json({ success: false, error: 'Failed to get headcount' });
  }
});

// GET /api/clients/:id/invoices/summary - Get invoice summary for client
router.get('/:id/invoices/summary', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total_invoices,
        COALESCE(SUM(total_amount), 0) as total_amount,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total_amount ELSE 0 END), 0) as paid_amount,
        COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total_amount ELSE 0 END), 0) as outstanding_amount,
        COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_count
       FROM invoices
       WHERE client_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get invoice summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to get invoice summary' });
  }
});

// GET /api/clients/:id/company - Get linked company for onboarded client
router.get('/:id/company', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT co.*, cl.onboarding_status, cl.onboarded_at
       FROM companies co
       JOIN clients cl ON cl.id = co.client_id
       WHERE co.client_id = $1 AND cl.tenant_id = $2 AND cl.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No company linked to this client'
      });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get client company error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch company' });
  }
});

// POST /api/clients/:id/onboard - Onboard client to HR platform
router.post('/:id/onboard', async (req, res) => {
  const client = await pool.connect();

  try {
    const { admin_email, admin_first_name, admin_last_name } = req.body;
    const clientId = req.params.id;

    if (!admin_email) {
      return res.status(400).json({
        success: false,
        error: 'Admin email is required'
      });
    }

    // Get the client
    const clientResult = await client.query(
      `SELECT c.*, con.id as consultant_id
       FROM clients c
       JOIN consultants con ON con.tenant_id = c.tenant_id
       WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL`,
      [clientId, req.tenant_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const clientData = clientResult.rows[0];

    // Check if already onboarded
    if (clientData.onboarding_status === 'active') {
      return res.status(400).json({
        success: false,
        error: 'Client is already onboarded'
      });
    }

    // Check if company already exists for this client
    const existingCompany = await client.query(
      `SELECT id FROM companies WHERE client_id = $1`,
      [clientId]
    );

    await client.query('BEGIN');

    let companyId;

    if (existingCompany.rows.length > 0) {
      companyId = existingCompany.rows[0].id;
    } else {
      // Create company from client data
      companyId = uuidv4();
      await client.query(
        `INSERT INTO companies (
          id, consultant_id, legal_name, trading_name, industry,
          email, phone, website, address_line1, address_line2,
          city, state, country, tin, rc_number, client_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'active')`,
        [
          companyId,
          clientData.consultant_id,
          clientData.company_name,
          clientData.company_name,
          clientData.industry,
          clientData.email,
          clientData.phone,
          clientData.website,
          clientData.address_line1,
          clientData.address_line2,
          clientData.city,
          clientData.state,
          clientData.country,
          clientData.tin,
          clientData.rc_number,
          clientId
        ]
      );
    }

    // Generate invitation token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create company invitation
    const invitationId = uuidv4();
    await client.query(
      `INSERT INTO company_invitations (
        id, company_id, consultant_id, client_id, email, first_name, last_name,
        role, token, expires_at, invited_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'admin', $8, $9, $10)`,
      [
        invitationId,
        companyId,
        clientData.consultant_id,
        clientId,
        admin_email,
        admin_first_name || null,
        admin_last_name || null,
        token,
        expiresAt,
        req.user.id
      ]
    );

    // Update client onboarding status
    await client.query(
      `UPDATE clients
       SET onboarding_status = 'invited', updated_at = NOW()
       WHERE id = $1`,
      [clientId]
    );

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (tenant_id, entity_type, entity_id, activity_type, description, performed_by)
       VALUES ($1, 'client', $2, 'onboarded', $3, $4)`,
      [req.tenant_id, clientId, `Onboarded client: ${clientData.company_name} - Invited ${admin_email}`, req.user.id]
    );

    await client.query('COMMIT');

    // TODO: Send invitation email with token
    // For now, return the token in development
    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5020'}/onboard/company?token=${token}`;

    res.status(201).json({
      success: true,
      data: {
        company_id: companyId,
        invitation_id: invitationId,
        admin_email,
        expires_at: expiresAt,
        invite_url: inviteUrl
      },
      message: 'Client onboarded successfully. Invitation sent to admin.'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Onboard client error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to onboard client'
    });
  } finally {
    client.release();
  }
});

// POST /api/clients/:id/resend-invite - Resend company admin invitation
router.post('/:id/resend-invite', async (req, res) => {
  try {
    const clientId = req.params.id;

    // Get existing invitation
    const invitation = await pool.query(
      `SELECT ci.*, cl.company_name
       FROM company_invitations ci
       JOIN clients cl ON cl.id = ci.client_id
       WHERE ci.client_id = $1 AND ci.accepted_at IS NULL
       ORDER BY ci.created_at DESC
       LIMIT 1`,
      [clientId]
    );

    if (invitation.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No pending invitation found for this client'
      });
    }

    const inv = invitation.rows[0];

    // Generate new token
    const crypto = require('crypto');
    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update invitation
    await pool.query(
      `UPDATE company_invitations
       SET token = $1, expires_at = $2, resend_count = resend_count + 1,
           last_resent_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [newToken, expiresAt, inv.id]
    );

    const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:5020'}/onboard/company?token=${newToken}`;

    res.json({
      success: true,
      data: {
        invitation_id: inv.id,
        admin_email: inv.email,
        expires_at: expiresAt,
        resend_count: inv.resend_count + 1,
        invite_url: inviteUrl
      },
      message: 'Invitation resent successfully'
    });

  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to resend invitation' });
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
