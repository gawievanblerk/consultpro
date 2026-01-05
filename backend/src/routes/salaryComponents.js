const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

/**
 * Salary Components API
 * Manages employee salary breakdown (basic, housing, transport, etc.)
 */

// Valid component types
const VALID_COMPONENT_TYPES = ['basic', 'housing', 'transport', 'meal', 'utility', 'leave', 'thirteenth_month', 'other'];

/**
 * GET /api/salary-components/:employeeId
 * Get salary components for an employee
 */
router.get('/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { includeExpired } = req.query;

    let query = `
      SELECT sc.*, e.first_name, e.last_name, e.salary as total_salary
      FROM salary_components sc
      JOIN employees e ON sc.employee_id = e.id
      WHERE sc.employee_id = $1 AND sc.tenant_id = $2
    `;

    if (!includeExpired) {
      query += ' AND (sc.end_date IS NULL OR sc.end_date >= CURRENT_DATE)';
    }

    query += ' ORDER BY sc.component_type, sc.effective_date DESC';

    const result = await pool.query(query, [employeeId, req.tenant_id]);

    // Calculate total from components
    const activeComponents = result.rows.filter(c => !c.end_date || new Date(c.end_date) >= new Date());
    const componentTotal = activeComponents.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    res.json({
      success: true,
      data: {
        employee_id: employeeId,
        components: result.rows,
        summary: {
          component_total: componentTotal,
          active_count: activeComponents.length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching salary components:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch salary components' });
  }
});

/**
 * POST /api/salary-components/:employeeId
 * Set or update salary components for an employee
 * Can replace all components or add individual ones
 */
router.post('/:employeeId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { employeeId } = req.params;
    const { components, replace_all = false } = req.body;

    if (!components || !Array.isArray(components)) {
      return res.status(400).json({ success: false, error: 'Components array is required' });
    }

    // Validate components
    for (const comp of components) {
      if (!comp.component_type || !VALID_COMPONENT_TYPES.includes(comp.component_type)) {
        return res.status(400).json({
          success: false,
          error: `Invalid component_type: ${comp.component_type}. Valid types: ${VALID_COMPONENT_TYPES.join(', ')}`
        });
      }
      if (comp.amount === undefined || comp.amount < 0) {
        return res.status(400).json({ success: false, error: 'Valid amount is required for each component' });
      }
    }

    // Verify employee exists
    const empCheck = await client.query(
      'SELECT id FROM employees WHERE id = $1 AND tenant_id = $2',
      [employeeId, req.tenant_id]
    );

    if (empCheck.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    await client.query('BEGIN');

    if (replace_all) {
      // End all existing active components
      await client.query(`
        UPDATE salary_components
        SET end_date = CURRENT_DATE - 1
        WHERE employee_id = $1 AND tenant_id = $2
        AND (end_date IS NULL OR end_date >= CURRENT_DATE)
      `, [employeeId, req.tenant_id]);
    }

    // Insert new components
    const insertedComponents = [];
    for (const comp of components) {
      const result = await client.query(`
        INSERT INTO salary_components (
          tenant_id, employee_id, component_type, name, amount,
          is_taxable, is_pension_applicable, effective_date, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        req.tenant_id,
        employeeId,
        comp.component_type,
        comp.name || comp.component_type.charAt(0).toUpperCase() + comp.component_type.slice(1).replace('_', ' '),
        comp.amount,
        comp.is_taxable !== false,
        comp.is_pension_applicable !== false,
        comp.effective_date || new Date(),
        comp.notes,
        req.user?.id
      ]);
      insertedComponents.push(result.rows[0]);
    }

    // Update employee's total salary if replace_all
    if (replace_all) {
      const totalSalary = components.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
      await client.query(
        'UPDATE employees SET salary = $1 WHERE id = $2',
        [totalSalary, employeeId]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `${insertedComponents.length} components saved`,
      data: insertedComponents
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error saving salary components:', error);
    res.status(500).json({ success: false, error: 'Failed to save salary components' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/salary-components/:id
 * Update a specific salary component
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, name, is_taxable, is_pension_applicable, end_date, notes } = req.body;

    const result = await pool.query(`
      UPDATE salary_components
      SET
        amount = COALESCE($3, amount),
        name = COALESCE($4, name),
        is_taxable = COALESCE($5, is_taxable),
        is_pension_applicable = COALESCE($6, is_pension_applicable),
        end_date = $7,
        notes = COALESCE($8, notes),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, req.tenant_id, amount, name, is_taxable, is_pension_applicable, end_date, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Salary component not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating salary component:', error);
    res.status(500).json({ success: false, error: 'Failed to update salary component' });
  }
});

/**
 * DELETE /api/salary-components/:id
 * Soft delete by setting end date
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE salary_components
      SET end_date = CURRENT_DATE
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, req.tenant_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Salary component not found' });
    }

    res.json({ success: true, message: 'Component deactivated', data: result.rows[0] });
  } catch (error) {
    console.error('Error deleting salary component:', error);
    res.status(500).json({ success: false, error: 'Failed to delete salary component' });
  }
});

/**
 * POST /api/salary-components/:employeeId/from-salary
 * Auto-generate salary components from employee's total salary
 * Uses standard Nigerian breakdown: Basic 40%, Housing 20%, Transport 15%, Others
 */
router.post('/:employeeId/from-salary', async (req, res) => {
  const client = await pool.connect();

  try {
    const { employeeId } = req.params;
    const { breakdown } = req.body;

    // Default Nigerian salary breakdown
    const defaultBreakdown = {
      basic: 0.40,      // 40%
      housing: 0.20,    // 20%
      transport: 0.15,  // 15%
      meal: 0.05,       // 5%
      utility: 0.05,    // 5%
      other: 0.15       // 15%
    };

    const percentages = breakdown || defaultBreakdown;

    // Get employee's current salary
    const empResult = await client.query(
      'SELECT id, salary, first_name, last_name FROM employees WHERE id = $1 AND tenant_id = $2',
      [employeeId, req.tenant_id]
    );

    if (empResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const employee = empResult.rows[0];
    const totalSalary = parseFloat(employee.salary) || 0;

    if (totalSalary <= 0) {
      return res.status(400).json({ success: false, error: 'Employee has no salary set' });
    }

    await client.query('BEGIN');

    // End existing components
    await client.query(`
      UPDATE salary_components
      SET end_date = CURRENT_DATE - 1
      WHERE employee_id = $1 AND tenant_id = $2
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    `, [employeeId, req.tenant_id]);

    // Create new components based on breakdown
    const components = [];
    for (const [type, percentage] of Object.entries(percentages)) {
      if (percentage > 0 && VALID_COMPONENT_TYPES.includes(type)) {
        const amount = Math.round(totalSalary * percentage * 100) / 100;
        const result = await client.query(`
          INSERT INTO salary_components (
            tenant_id, employee_id, component_type, name, amount,
            is_taxable, is_pension_applicable, effective_date, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8)
          RETURNING *
        `, [
          req.tenant_id,
          employeeId,
          type,
          type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ') + ' Allowance',
          amount,
          true,
          ['basic', 'housing', 'transport'].includes(type), // Pension applicable only for these
          req.user?.id
        ]);
        components.push(result.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `Generated ${components.length} salary components from total salary of ${totalSalary}`,
      data: {
        employee: `${employee.first_name} ${employee.last_name}`,
        total_salary: totalSalary,
        components
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating salary components:', error);
    res.status(500).json({ success: false, error: 'Failed to generate salary components' });
  } finally {
    client.release();
  }
});

module.exports = router;
