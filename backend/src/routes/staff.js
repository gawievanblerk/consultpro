/**
 * Staff Routes - HR Outsourcing Module (Module 1.3)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/staff - List all staff
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, available } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE s.tenant_id = $1 AND s.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND s.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (available === 'true') {
      whereClause += ` AND s.is_available = true`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM staff s ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT s.*,
        (SELECT COUNT(*) FROM deployments d WHERE d.staff_id = s.id AND d.status = 'active') as active_deployments
       FROM staff s
       ${whereClause}
       ORDER BY s.last_name, s.first_name
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
    console.error('List staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// GET /api/staff/:id - Get staff by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
        (SELECT json_agg(d) FROM deployments d WHERE d.staff_id = s.id AND d.deleted_at IS NULL) as deployments
       FROM staff s
       WHERE s.id = $1 AND s.tenant_id = $2 AND s.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff' });
  }
});

// POST /api/staff - Create new staff
router.post('/', async (req, res) => {
  try {
    const {
      first_name, last_name, email, phone, job_title, department,
      skills, hourly_rate, monthly_rate, bank_name, account_number,
      tax_id, address, city, state, notes
    } = req.body;

    if (!first_name || !last_name || !email) {
      return res.status(400).json({
        success: false,
        error: 'First name, last name, and email are required'
      });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO staff (
        id, tenant_id, first_name, last_name, email, phone, job_title, department,
        skills, hourly_rate, monthly_rate, bank_name, account_number,
        tax_id, address, city, state, notes, status, is_available, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'active', true, $19)
      RETURNING *`,
      [
        id, req.tenant_id, first_name, last_name, email, phone, job_title, department,
        skills, hourly_rate, monthly_rate, bank_name, account_number,
        tax_id, address, city, state, notes, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to create staff' });
  }
});

// PUT /api/staff/:id - Update staff
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'first_name', 'last_name', 'email', 'phone', 'job_title', 'department',
      'skills', 'hourly_rate', 'monthly_rate', 'bank_name', 'account_number',
      'tax_id', 'address', 'city', 'state', 'notes', 'status', 'is_available'
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
      `UPDATE staff SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to update staff' });
  }
});

// DELETE /api/staff/:id - Soft delete staff
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE staff SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Staff not found' });
    }

    res.json({ success: true, message: 'Staff deleted successfully' });

  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete staff' });
  }
});

module.exports = router;
