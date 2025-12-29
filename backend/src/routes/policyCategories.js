const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

/**
 * GET /api/policy-categories
 * List all policy categories for the tenant
 */
router.get('/', async (req, res) => {
  try {
    const { company_id, include_system = 'true' } = req.query;

    let query = `
      SELECT
        pc.*,
        (SELECT COUNT(*) FROM policies p WHERE p.category_id = pc.id AND p.deleted_at IS NULL) as policy_count
      FROM policy_categories pc
      WHERE pc.tenant_id = $1
        AND pc.deleted_at IS NULL
        AND pc.is_active = true
    `;
    const params = [req.tenant_id];

    if (company_id) {
      query += ` AND (pc.company_id = $${params.length + 1} OR pc.company_id IS NULL)`;
      params.push(company_id);
    }

    if (include_system === 'false') {
      query += ` AND pc.is_system = false`;
    }

    query += ` ORDER BY pc.sort_order ASC, pc.name ASC`;

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching policy categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch policy categories' });
  }
});

/**
 * GET /api/policy-categories/:id
 * Get a single policy category
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM policy_categories WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching policy category:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch policy category' });
  }
});

/**
 * POST /api/policy-categories
 * Create a new custom policy category
 */
router.post('/', async (req, res) => {
  try {
    const { name, code, description, company_id, sort_order } = req.body;

    if (!name || !code) {
      return res.status(400).json({ success: false, error: 'Name and code are required' });
    }

    // Check for duplicate code
    const existing = await pool.query(
      `SELECT id FROM policy_categories
       WHERE tenant_id = $1 AND code = $2 AND (company_id = $3 OR ($3 IS NULL AND company_id IS NULL))
       AND deleted_at IS NULL`,
      [req.tenant_id, code.toUpperCase(), company_id || null]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'A category with this code already exists' });
    }

    const result = await pool.query(
      `INSERT INTO policy_categories (tenant_id, company_id, name, code, description, sort_order, is_system, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7)
       RETURNING *`,
      [
        req.tenant_id,
        company_id || null,
        name,
        code.toUpperCase(),
        description || null,
        sort_order || 99,
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating policy category:', error);
    res.status(500).json({ success: false, error: 'Failed to create policy category' });
  }
});

/**
 * PUT /api/policy-categories/:id
 * Update a policy category (only custom categories can be fully edited)
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, is_active, sort_order } = req.body;

    // Check if category exists and belongs to tenant
    const existing = await pool.query(
      `SELECT * FROM policy_categories WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    const category = existing.rows[0];

    // System categories can only have sort_order and is_active changed
    if (category.is_system) {
      const result = await pool.query(
        `UPDATE policy_categories
         SET is_active = COALESCE($1, is_active),
             sort_order = COALESCE($2, sort_order),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 AND tenant_id = $4
         RETURNING *`,
        [is_active, sort_order, id, req.tenant_id]
      );

      return res.json({
        success: true,
        data: result.rows[0]
      });
    }

    // Custom categories can be fully edited
    const result = await pool.query(
      `UPDATE policy_categories
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           is_active = COALESCE($3, is_active),
           sort_order = COALESCE($4, sort_order),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND tenant_id = $6
       RETURNING *`,
      [name, description, is_active, sort_order, id, req.tenant_id]
    );

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating policy category:', error);
    res.status(500).json({ success: false, error: 'Failed to update policy category' });
  }
});

/**
 * DELETE /api/policy-categories/:id
 * Soft delete a custom policy category (system categories cannot be deleted)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists and is not a system category
    const existing = await pool.query(
      `SELECT * FROM policy_categories WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, req.tenant_id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }

    if (existing.rows[0].is_system) {
      return res.status(400).json({ success: false, error: 'System categories cannot be deleted' });
    }

    // Check if category has policies
    const policies = await pool.query(
      `SELECT COUNT(*) FROM policies WHERE category_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (parseInt(policies.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with existing policies. Move or delete policies first.'
      });
    }

    // Soft delete
    await pool.query(
      `UPDATE policy_categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting policy category:', error);
    res.status(500).json({ success: false, error: 'Failed to delete policy category' });
  }
});

/**
 * PUT /api/policy-categories/reorder
 * Update sort order for multiple categories
 */
router.put('/batch/reorder', async (req, res) => {
  try {
    const { order } = req.body; // Array of { id, sort_order }

    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: 'Order must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const item of order) {
        await client.query(
          `UPDATE policy_categories SET sort_order = $1, updated_at = CURRENT_TIMESTAMP
           WHERE id = $2 AND tenant_id = $3`,
          [item.sort_order, item.id, req.tenant_id]
        );
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: 'Categories reordered successfully'
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering categories:', error);
    res.status(500).json({ success: false, error: 'Failed to reorder categories' });
  }
});

module.exports = router;
