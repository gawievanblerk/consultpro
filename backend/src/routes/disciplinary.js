const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// ============================================================================
// DISCIPLINARY ACTIONS
// ============================================================================

// GET /api/disciplinary/actions - List disciplinary actions
router.get('/actions', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, action_type, status } = req.query;

    let query = `
      SELECT
        da.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        c.trading_name as company_name,
        u.first_name || ' ' || u.last_name as issued_by_name
      FROM disciplinary_actions da
      JOIN employees e ON da.employee_id = e.id
      JOIN companies c ON da.company_id = c.id
      LEFT JOIN users u ON da.issued_by = u.id
      WHERE da.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND da.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (employee_id) {
      query += ` AND da.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (action_type) {
      query += ` AND da.action_type = $${paramIdx++}`;
      params.push(action_type);
    }
    if (status) {
      query += ` AND da.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY da.action_date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching disciplinary actions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch disciplinary actions' });
  }
});

// GET /api/disciplinary/actions/:id - Get single disciplinary action
router.get('/actions/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        da.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.email as employee_email,
        c.trading_name as company_name,
        u.first_name || ' ' || u.last_name as issued_by_name
      FROM disciplinary_actions da
      JOIN employees e ON da.employee_id = e.id
      JOIN companies c ON da.company_id = c.id
      LEFT JOIN users u ON da.issued_by = u.id
      WHERE da.id = $1 AND da.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Disciplinary action not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching disciplinary action:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch disciplinary action' });
  }
});

// POST /api/disciplinary/actions - Create disciplinary action
router.post('/actions', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const {
      company_id, employee_id, incident_date, incident_description,
      incident_location, witnesses, action_type, action_date,
      warning_letter_reference, warning_letter_content,
      investigation_conducted, investigation_date, investigation_findings, investigation_panel,
      employee_explanation, employee_response_date,
      suspension_start_date, suspension_end_date, suspension_with_pay
    } = req.body;

    const result = await pool.query(`
      INSERT INTO disciplinary_actions (
        tenant_id, company_id, employee_id, incident_date, incident_description,
        incident_location, witnesses, action_type, action_date,
        warning_letter_reference, warning_letter_content,
        investigation_conducted, investigation_date, investigation_findings, investigation_panel,
        employee_explanation, employee_response_date,
        suspension_start_date, suspension_end_date, suspension_with_pay,
        status, issued_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'pending', $21)
      RETURNING *
    `, [
      tenantId, company_id, employee_id, incident_date, incident_description,
      incident_location, witnesses, action_type, action_date,
      warning_letter_reference, warning_letter_content,
      investigation_conducted || false, investigation_date, investigation_findings, investigation_panel,
      employee_explanation, employee_response_date,
      suspension_start_date, suspension_end_date, suspension_with_pay,
      userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating disciplinary action:', error);
    res.status(500).json({ success: false, error: 'Failed to create disciplinary action' });
  }
});

// PUT /api/disciplinary/actions/:id - Update disciplinary action
router.put('/actions/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'incident_date', 'incident_description', 'incident_location', 'witnesses',
      'action_type', 'action_date', 'warning_letter_reference', 'warning_letter_content',
      'investigation_conducted', 'investigation_date', 'investigation_findings', 'investigation_panel',
      'employee_explanation', 'employee_response_date',
      'suspension_start_date', 'suspension_end_date', 'suspension_with_pay',
      'outcome', 'outcome_date', 'outcome_notes',
      'appeal_submitted', 'appeal_date', 'appeal_reason', 'appeal_outcome', 'appeal_outcome_date',
      'status', 'employee_acknowledged'
    ];

    const fields = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramIdx++}`);
        values.push(updates[field]);
      }
    }

    if (updates.employee_acknowledged === true) {
      fields.push(`employee_acknowledged_at = NOW()`);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    fields.push('updated_at = NOW()');
    values.push(id, tenantId);

    const result = await pool.query(`
      UPDATE disciplinary_actions
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Disciplinary action not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating disciplinary action:', error);
    res.status(500).json({ success: false, error: 'Failed to update disciplinary action' });
  }
});

// POST /api/disciplinary/actions/:id/close - Close disciplinary action
router.post('/actions/:id/close', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { outcome, outcome_notes } = req.body;

    const result = await pool.query(`
      UPDATE disciplinary_actions
      SET status = 'closed',
          outcome = $1,
          outcome_date = CURRENT_DATE,
          outcome_notes = $2,
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [outcome || 'upheld', outcome_notes, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Disciplinary action not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error closing disciplinary action:', error);
    res.status(500).json({ success: false, error: 'Failed to close disciplinary action' });
  }
});

// ============================================================================
// GRIEVANCES
// ============================================================================

// GET /api/disciplinary/grievances - List grievances
router.get('/grievances', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, category, status } = req.query;

    let query = `
      SELECT
        g.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        c.trading_name as company_name,
        ae.first_name || ' ' || ae.last_name as against_employee_name,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM grievances g
      JOIN employees e ON g.employee_id = e.id
      JOIN companies c ON g.company_id = c.id
      LEFT JOIN employees ae ON g.against_employee_id = ae.id
      LEFT JOIN users u ON g.assigned_to = u.id
      WHERE g.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND g.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (employee_id) {
      query += ` AND g.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (category) {
      query += ` AND g.category = $${paramIdx++}`;
      params.push(category);
    }
    if (status) {
      query += ` AND g.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY g.grievance_date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching grievances:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch grievances' });
  }
});

// GET /api/disciplinary/grievances/:id - Get single grievance
router.get('/grievances/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        g.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.email as employee_email,
        c.trading_name as company_name,
        ae.first_name || ' ' || ae.last_name as against_employee_name,
        ae.job_title as against_employee_title,
        u.first_name || ' ' || u.last_name as assigned_to_name
      FROM grievances g
      JOIN employees e ON g.employee_id = e.id
      JOIN companies c ON g.company_id = c.id
      LEFT JOIN employees ae ON g.against_employee_id = ae.id
      LEFT JOIN users u ON g.assigned_to = u.id
      WHERE g.id = $1 AND g.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching grievance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch grievance' });
  }
});

// POST /api/disciplinary/grievances - Submit grievance
router.post('/grievances', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const {
      company_id, employee_id, grievance_date, category, subject, description,
      against_employee_id, against_department, against_description,
      expected_resolution, is_confidential
    } = req.body;

    // Generate reference number
    const countResult = await pool.query(
      "SELECT COUNT(*) FROM grievances WHERE tenant_id = $1 AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())",
      [tenantId]
    );
    const grievance_reference = `GRV-${new Date().getFullYear()}-${String(parseInt(countResult.rows[0].count) + 1).padStart(4, '0')}`;

    const result = await pool.query(`
      INSERT INTO grievances (
        tenant_id, company_id, employee_id, grievance_reference, grievance_date,
        category, subject, description,
        against_employee_id, against_department, against_description,
        expected_resolution, is_confidential, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'submitted')
      RETURNING *
    `, [
      tenantId, company_id, employee_id, grievance_reference, grievance_date || new Date(),
      category, subject, description,
      against_employee_id, against_department, against_description,
      expected_resolution, is_confidential !== false
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error submitting grievance:', error);
    res.status(500).json({ success: false, error: 'Failed to submit grievance' });
  }
});

// PUT /api/disciplinary/grievances/:id - Update grievance
router.put('/grievances/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'category', 'subject', 'description',
      'against_employee_id', 'against_department', 'against_description',
      'expected_resolution', 'assigned_to', 'investigation_start_date', 'investigation_notes',
      'resolution_date', 'resolution_description', 'resolution_outcome',
      'employee_satisfied', 'employee_feedback',
      'appeal_submitted', 'appeal_date', 'appeal_reason', 'appeal_outcome',
      'status', 'is_confidential'
    ];

    const fields = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = $${paramIdx++}`);
        values.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    fields.push('updated_at = NOW()');
    values.push(id, tenantId);

    const result = await pool.query(`
      UPDATE grievances
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating grievance:', error);
    res.status(500).json({ success: false, error: 'Failed to update grievance' });
  }
});

// POST /api/disciplinary/grievances/:id/resolve - Resolve grievance
router.post('/grievances/:id/resolve', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { resolution_description, resolution_outcome } = req.body;

    const result = await pool.query(`
      UPDATE grievances
      SET status = 'resolved',
          resolution_date = CURRENT_DATE,
          resolution_description = $1,
          resolution_outcome = $2,
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
      RETURNING *
    `, [resolution_description, resolution_outcome || 'resolved', id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error resolving grievance:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve grievance' });
  }
});

// ============================================================================
// EMPLOYEE CHANGES (Promotions, Transfers, etc.)
// ============================================================================

// GET /api/disciplinary/changes - List employee changes
router.get('/changes', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, change_type, status } = req.query;

    let query = `
      SELECT
        ec.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        c.trading_name as company_name,
        r.first_name || ' ' || r.last_name as requested_by_name,
        a.first_name || ' ' || a.last_name as approved_by_name
      FROM employee_changes ec
      JOIN employees e ON ec.employee_id = e.id
      JOIN companies c ON ec.company_id = c.id
      LEFT JOIN users r ON ec.requested_by = r.id
      LEFT JOIN users a ON ec.approved_by = a.id
      WHERE ec.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND ec.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (employee_id) {
      query += ` AND ec.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (change_type) {
      query += ` AND ec.change_type = $${paramIdx++}`;
      params.push(change_type);
    }
    if (status) {
      query += ` AND ec.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY ec.effective_date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employee changes:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch employee changes' });
  }
});

// POST /api/disciplinary/changes - Create employee change request
router.post('/changes', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const {
      company_id, employee_id, change_type, effective_date,
      new_job_title, new_department, new_salary, new_reports_to, new_location,
      reason, supporting_documents
    } = req.body;

    // Get current employee details
    const empResult = await pool.query(
      'SELECT job_title, department, salary, reports_to FROM employees WHERE id = $1',
      [employee_id]
    );

    if (empResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const emp = empResult.rows[0];

    const result = await pool.query(`
      INSERT INTO employee_changes (
        tenant_id, company_id, employee_id, change_type, effective_date,
        previous_job_title, previous_department, previous_salary, previous_reports_to,
        new_job_title, new_department, new_salary, new_reports_to, new_location,
        reason, supporting_documents, status, requested_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', $17)
      RETURNING *
    `, [
      tenantId, company_id, employee_id, change_type, effective_date,
      emp.job_title, emp.department, emp.salary, emp.reports_to,
      new_job_title, new_department, new_salary, new_reports_to, new_location,
      reason, supporting_documents ? JSON.stringify(supporting_documents) : '[]', userId
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating employee change:', error);
    res.status(500).json({ success: false, error: 'Failed to create employee change' });
  }
});

// POST /api/disciplinary/changes/:id/approve - Approve and apply employee change
router.post('/changes/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;

    // Get the change request
    const changeResult = await client.query(
      'SELECT * FROM employee_changes WHERE id = $1 AND tenant_id = $2 AND status = $3',
      [id, tenantId, 'pending']
    );

    if (changeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Change request not found or not pending' });
    }

    const change = changeResult.rows[0];

    // Update employee record
    const updateFields = [];
    const updateValues = [];
    let idx = 1;

    if (change.new_job_title) {
      updateFields.push(`job_title = $${idx++}`);
      updateValues.push(change.new_job_title);
    }
    if (change.new_department) {
      updateFields.push(`department = $${idx++}`);
      updateValues.push(change.new_department);
    }
    if (change.new_salary) {
      updateFields.push(`salary = $${idx++}`);
      updateValues.push(change.new_salary);
    }
    if (change.new_reports_to) {
      updateFields.push(`reports_to = $${idx++}`);
      updateValues.push(change.new_reports_to);
    }

    if (updateFields.length > 0) {
      updateFields.push('updated_at = NOW()');
      updateValues.push(change.employee_id);

      await client.query(`
        UPDATE employees SET ${updateFields.join(', ')} WHERE id = $${idx}
      `, updateValues);
    }

    // Update change request status
    await client.query(`
      UPDATE employee_changes
      SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
      WHERE id = $2
    `, [userId, id]);

    await client.query('COMMIT');

    // Fetch updated record
    const result = await pool.query('SELECT * FROM employee_changes WHERE id = $1', [id]);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving employee change:', error);
    res.status(500).json({ success: false, error: 'Failed to approve employee change' });
  } finally {
    client.release();
  }
});

// POST /api/disciplinary/changes/:id/reject - Reject employee change
router.post('/changes/:id/reject', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { rejection_reason } = req.body;

    const result = await pool.query(`
      UPDATE employee_changes
      SET status = 'rejected', rejection_reason = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND status = 'pending'
      RETURNING *
    `, [rejection_reason, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Change request not found or not pending' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error rejecting employee change:', error);
    res.status(500).json({ success: false, error: 'Failed to reject employee change' });
  }
});

// ============================================================================
// ESS - MY DISCIPLINARY HISTORY
// ============================================================================

// GET /api/disciplinary/my-actions - Employee's own disciplinary actions
router.get('/my-actions', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID not found' });
    }

    const result = await pool.query(`
      SELECT da.*, u.first_name || ' ' || u.last_name as issued_by_name
      FROM disciplinary_actions da
      LEFT JOIN users u ON da.issued_by = u.id
      WHERE da.employee_id = $1 AND da.tenant_id = $2
      ORDER BY da.action_date DESC
    `, [employeeId, tenantId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching my disciplinary actions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your disciplinary history' });
  }
});

// GET /api/disciplinary/my-grievances - Employee's own grievances
router.get('/my-grievances', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const employeeId = req.user.employee_id;

    if (!employeeId) {
      return res.status(400).json({ success: false, error: 'Employee ID not found' });
    }

    const result = await pool.query(`
      SELECT g.*, u.first_name || ' ' || u.last_name as assigned_to_name
      FROM grievances g
      LEFT JOIN users u ON g.assigned_to = u.id
      WHERE g.employee_id = $1 AND g.tenant_id = $2
      ORDER BY g.grievance_date DESC
    `, [employeeId, tenantId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching my grievances:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch your grievances' });
  }
});

module.exports = router;
