/**
 * Leave Types Routes - Leave Management Module
 * CRUD operations for leave type configuration
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/leave-types - List all leave types
router.get('/', async (req, res) => {
  try {
    const { active_only = 'true' } = req.query;

    let whereClause = 'WHERE tenant_id = $1 AND deleted_at IS NULL';
    if (active_only === 'true') {
      whereClause += ' AND is_active = true';
    }

    const result = await pool.query(
      `SELECT * FROM leave_types
       ${whereClause}
       ORDER BY sort_order, name`,
      [req.tenant_id]
    );

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('List leave types error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave types' });
  }
});

// GET /api/leave-types/:id - Get leave type by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM leave_types
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave type not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get leave type error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave type' });
  }
});

// POST /api/leave-types - Create new leave type
router.post('/', async (req, res) => {
  try {
    const {
      name, code, description, days_allowed, carry_forward, max_carry_forward,
      requires_approval, requires_documentation, is_paid, min_service_months,
      gender_restriction, color, sort_order
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        error: 'Name and code are required'
      });
    }

    // Check for duplicate code
    const existing = await pool.query(
      'SELECT id FROM leave_types WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL',
      [req.tenant_id, code.toUpperCase()]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A leave type with this code already exists'
      });
    }

    const id = uuidv4();

    const result = await pool.query(
      `INSERT INTO leave_types (
        id, tenant_id, name, code, description, days_allowed, carry_forward, max_carry_forward,
        requires_approval, requires_documentation, is_paid, min_service_months,
        gender_restriction, color, sort_order, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, true)
      RETURNING *`,
      [
        id, req.tenant_id, name, code.toUpperCase(), description,
        days_allowed || 0, carry_forward || false, max_carry_forward || 0,
        requires_approval !== false, requires_documentation || false,
        is_paid !== false, min_service_months || 0,
        gender_restriction || null, color || '#3B82F6', sort_order || 0
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create leave type error:', error);
    res.status(500).json({ success: false, error: 'Failed to create leave type' });
  }
});

// PUT /api/leave-types/:id - Update leave type
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'name', 'description', 'days_allowed', 'carry_forward', 'max_carry_forward',
      'requires_approval', 'requires_documentation', 'is_paid', 'min_service_months',
      'gender_restriction', 'color', 'sort_order', 'is_active'
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
      `UPDATE leave_types SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave type not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update leave type error:', error);
    res.status(500).json({ success: false, error: 'Failed to update leave type' });
  }
});

// DELETE /api/leave-types/:id - Soft delete leave type
router.delete('/:id', async (req, res) => {
  try {
    // Check if there are any leave requests using this type
    const inUse = await pool.query(
      `SELECT COUNT(*) FROM leave_requests
       WHERE leave_type_id = $1 AND deleted_at IS NULL`,
      [req.params.id]
    );

    if (parseInt(inUse.rows[0].count) > 0) {
      // Soft deactivate instead of delete
      const result = await pool.query(
        `UPDATE leave_types SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [req.params.id, req.tenant_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: 'Leave type not found' });
      }

      return res.json({
        success: true,
        message: 'Leave type deactivated (has existing requests)'
      });
    }

    const result = await pool.query(
      `UPDATE leave_types SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave type not found' });
    }

    res.json({ success: true, message: 'Leave type deleted successfully' });

  } catch (error) {
    console.error('Delete leave type error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete leave type' });
  }
});

module.exports = router;
