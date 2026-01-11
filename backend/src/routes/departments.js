const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { query } = require('../utils/db');
const {
  authenticateHierarchy,
  requireConsultant,
  requireCompanyAccess
} = require('../middleware/hierarchyAuth');

// All routes require authentication
router.use(authenticateHierarchy);

/**
 * GET /api/departments
 * List departments for a company
 * Query params: company_id (required), status, parent_department_id
 */
router.get('/', async (req, res) => {
  try {
    const { company_id, status, parent_department_id } = req.query;

    if (!company_id) {
      return res.status(400).json({ success: false, error: 'company_id is required' });
    }

    // Build query
    let sql = `
      SELECT
        d.*,
        e.first_name as manager_first_name,
        e.last_name as manager_last_name,
        pd.name as parent_department_name,
        (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND deleted_at IS NULL) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN departments pd ON d.parent_department_id = pd.id
      WHERE d.company_id = $1 AND d.deleted_at IS NULL
    `;
    const params = [company_id];
    let paramIndex = 2;

    if (status) {
      sql += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (parent_department_id) {
      sql += ` AND d.parent_department_id = $${paramIndex}`;
      params.push(parent_department_id);
      paramIndex++;
    }

    sql += ` ORDER BY d.name ASC`;

    const result = await query(sql, params);

    res.json({
      success: true,
      data: result.rows.map(d => ({
        id: d.id,
        companyId: d.company_id,
        name: d.name,
        code: d.code,
        description: d.description,
        managerId: d.manager_id,
        managerName: d.manager_first_name ? `${d.manager_first_name} ${d.manager_last_name}` : null,
        parentDepartmentId: d.parent_department_id,
        parentDepartmentName: d.parent_department_name,
        status: d.status,
        employeeCount: parseInt(d.employee_count) || 0,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }))
    });
  } catch (error) {
    console.error('List departments error:', error);
    res.status(500).json({ success: false, error: 'Failed to list departments' });
  }
});

/**
 * GET /api/departments/:id
 * Get a single department
 */
router.get('/:id', [
  param('id').isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const result = await query(`
      SELECT
        d.*,
        e.first_name as manager_first_name,
        e.last_name as manager_last_name,
        pd.name as parent_department_name,
        (SELECT COUNT(*) FROM employees WHERE department_id = d.id AND deleted_at IS NULL) as employee_count
      FROM departments d
      LEFT JOIN employees e ON d.manager_id = e.id
      LEFT JOIN departments pd ON d.parent_department_id = pd.id
      WHERE d.id = $1 AND d.deleted_at IS NULL
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const d = result.rows[0];
    res.json({
      success: true,
      data: {
        id: d.id,
        companyId: d.company_id,
        name: d.name,
        code: d.code,
        description: d.description,
        managerId: d.manager_id,
        managerName: d.manager_first_name ? `${d.manager_first_name} ${d.manager_last_name}` : null,
        parentDepartmentId: d.parent_department_id,
        parentDepartmentName: d.parent_department_name,
        status: d.status,
        employeeCount: parseInt(d.employee_count) || 0,
        createdAt: d.created_at,
        updatedAt: d.updated_at
      }
    });
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ success: false, error: 'Failed to get department' });
  }
});

/**
 * POST /api/departments
 * Create a new department
 */
router.post('/', [
  body('company_id').isUUID(),
  body('name').notEmpty().trim(),
  body('code').optional().trim(),
  body('description').optional().trim(),
  body('manager_id').optional().isUUID(),
  body('parent_department_id').optional().isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { company_id, name, code, description, manager_id, parent_department_id } = req.body;

    // Check for duplicate name in same company
    const existingResult = await query(`
      SELECT id FROM departments
      WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND deleted_at IS NULL
    `, [company_id, name]);

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'A department with this name already exists' });
    }

    // Create department
    const result = await query(`
      INSERT INTO departments (company_id, name, code, description, manager_id, parent_department_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [company_id, name, code || null, description || null, manager_id || null, parent_department_id || null, req.user.id]);

    const d = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: d.id,
        companyId: d.company_id,
        name: d.name,
        code: d.code,
        description: d.description,
        managerId: d.manager_id,
        parentDepartmentId: d.parent_department_id,
        status: d.status,
        createdAt: d.created_at
      }
    });
  } catch (error) {
    console.error('Create department error:', error);
    res.status(500).json({ success: false, error: 'Failed to create department' });
  }
});

/**
 * PUT /api/departments/:id
 * Update a department
 */
router.put('/:id', [
  param('id').isUUID(),
  body('name').optional().notEmpty().trim(),
  body('code').optional().trim(),
  body('description').optional(),
  body('manager_id').optional(),
  body('parent_department_id').optional(),
  body('status').optional().isIn(['active', 'inactive'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, code, description, manager_id, parent_department_id, status } = req.body;

    // Check department exists
    const existingResult = await query(`
      SELECT * FROM departments WHERE id = $1 AND deleted_at IS NULL
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    const existing = existingResult.rows[0];

    // Check for duplicate name if changing
    if (name && name.toLowerCase() !== existing.name.toLowerCase()) {
      const dupResult = await query(`
        SELECT id FROM departments
        WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND id != $3 AND deleted_at IS NULL
      `, [existing.company_id, name, id]);

      if (dupResult.rows.length > 0) {
        return res.status(400).json({ success: false, error: 'A department with this name already exists' });
      }
    }

    // Prevent circular reference in parent
    if (parent_department_id && parent_department_id === id) {
      return res.status(400).json({ success: false, error: 'Department cannot be its own parent' });
    }

    // Update department
    const result = await query(`
      UPDATE departments
      SET
        name = COALESCE($2, name),
        code = COALESCE($3, code),
        description = COALESCE($4, description),
        manager_id = $5,
        parent_department_id = $6,
        status = COALESCE($7, status),
        updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `, [id, name, code, description, manager_id || null, parent_department_id || null, status]);

    const d = result.rows[0];
    res.json({
      success: true,
      data: {
        id: d.id,
        companyId: d.company_id,
        name: d.name,
        code: d.code,
        description: d.description,
        managerId: d.manager_id,
        parentDepartmentId: d.parent_department_id,
        status: d.status,
        updatedAt: d.updated_at
      }
    });
  } catch (error) {
    console.error('Update department error:', error);
    res.status(500).json({ success: false, error: 'Failed to update department' });
  }
});

/**
 * DELETE /api/departments/:id
 * Soft delete a department
 */
router.delete('/:id', [
  param('id').isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { id } = req.params;

    // Check if department has employees
    const employeeCount = await query(`
      SELECT COUNT(*) as count FROM employees WHERE department_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (parseInt(employeeCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete department with assigned employees. Reassign employees first.'
      });
    }

    // Check if department has child departments
    const childCount = await query(`
      SELECT COUNT(*) as count FROM departments WHERE parent_department_id = $1 AND deleted_at IS NULL
    `, [id]);

    if (parseInt(childCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete department with sub-departments. Delete or reassign sub-departments first.'
      });
    }

    // Soft delete
    const result = await query(`
      UPDATE departments SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Department not found' });
    }

    res.json({ success: true, message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete department' });
  }
});

/**
 * GET /api/departments/:id/employees
 * Get employees in a department
 */
router.get('/:id/employees', [
  param('id').isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const result = await query(`
      SELECT id, first_name, last_name, email, job_title, employment_status
      FROM employees
      WHERE department_id = $1 AND deleted_at IS NULL
      ORDER BY last_name, first_name
    `, [req.params.id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get department employees error:', error);
    res.status(500).json({ success: false, error: 'Failed to get department employees' });
  }
});

module.exports = router;
