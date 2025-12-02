/**
 * Contact Routes - CRM Module (Module 1.1)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/contacts - List all contacts
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, client_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE ct.tenant_id = $1 AND ct.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (ct.first_name ILIKE $${paramIndex} OR ct.last_name ILIKE $${paramIndex} OR ct.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND ct.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM contacts ct ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT ct.*, c.company_name as client_name
       FROM contacts ct
       LEFT JOIN clients c ON ct.client_id = c.id
       ${whereClause}
       ORDER BY ct.last_name, ct.first_name
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
    console.error('List contacts error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

// GET /api/contacts/:id - Get contact by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ct.*, c.company_name as client_name
       FROM contacts ct
       LEFT JOIN clients c ON ct.client_id = c.id
       WHERE ct.id = $1 AND ct.tenant_id = $2 AND ct.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch contact' });
  }
});

// POST /api/contacts - Create new contact
router.post('/', async (req, res) => {
  try {
    const {
      client_id, first_name, last_name, job_title, department,
      email, phone, mobile, linkedin_url,
      is_primary, is_decision_maker, is_billing_contact, notes
    } = req.body;

    if (!client_id || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        error: 'Client ID, first name, and last name are required'
      });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO contacts (
        id, tenant_id, client_id, first_name, last_name, job_title, department,
        email, phone, mobile, linkedin_url,
        is_primary, is_decision_maker, is_billing_contact, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        id, req.tenant_id, client_id, first_name, last_name, job_title, department,
        email, phone, mobile, linkedin_url,
        is_primary || false, is_decision_maker || false, is_billing_contact || false, notes
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({ success: false, error: 'Failed to create contact' });
  }
});

// PUT /api/contacts/:id - Update contact
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'first_name', 'last_name', 'job_title', 'department',
      'email', 'phone', 'mobile', 'linkedin_url',
      'is_primary', 'is_decision_maker', 'is_billing_contact', 'notes'
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
      `UPDATE contacts SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({ success: false, error: 'Failed to update contact' });
  }
});

// DELETE /api/contacts/:id - Soft delete contact
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE contacts SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    res.json({ success: true, message: 'Contact deleted successfully' });

  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete contact' });
  }
});

// PUT /api/contacts/:id/set-primary - Set as primary contact
router.put('/:id/set-primary', async (req, res) => {
  try {
    // Get contact to find client_id
    const contact = await pool.query(
      'SELECT client_id FROM contacts WHERE id = $1 AND tenant_id = $2',
      [req.params.id, req.tenant_id]
    );

    if (contact.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    // Remove primary from all contacts of this client
    await pool.query(
      'UPDATE contacts SET is_primary = false WHERE client_id = $1 AND tenant_id = $2',
      [contact.rows[0].client_id, req.tenant_id]
    );

    // Set this contact as primary
    const result = await pool.query(
      'UPDATE contacts SET is_primary = true WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Set primary contact error:', error);
    res.status(500).json({ success: false, error: 'Failed to set primary contact' });
  }
});

module.exports = router;
