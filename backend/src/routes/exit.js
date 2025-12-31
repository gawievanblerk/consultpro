const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

// ============================================================================
// EXIT REQUESTS
// ============================================================================

// GET /api/exit/requests - List exit requests
router.get('/requests', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, employee_id, status, request_type } = req.query;

    let query = `
      SELECT
        er.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.hire_date,
        c.trading_name as company_name,
        (SELECT status FROM exit_checklists ec WHERE ec.exit_request_id = er.id LIMIT 1) as checklist_status,
        (SELECT status FROM exit_interviews ei WHERE ei.exit_request_id = er.id LIMIT 1) as interview_status
      FROM exit_requests er
      JOIN employees e ON er.employee_id = e.id
      JOIN companies c ON er.company_id = c.id
      WHERE er.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND er.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (employee_id) {
      query += ` AND er.employee_id = $${paramIdx++}`;
      params.push(employee_id);
    }
    if (status) {
      query += ` AND er.status = $${paramIdx++}`;
      params.push(status);
    }
    if (request_type) {
      query += ` AND er.request_type = $${paramIdx++}`;
      params.push(request_type);
    }

    query += ' ORDER BY er.request_date DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching exit requests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exit requests' });
  }
});

// GET /api/exit/requests/:id - Get single exit request with related data
router.get('/requests/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        er.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.hire_date,
        e.email as employee_email,
        e.phone as employee_phone,
        c.trading_name as company_name,
        c.legal_name,
        u.first_name || ' ' || u.last_name as approved_by_name
      FROM exit_requests er
      JOIN employees e ON er.employee_id = e.id
      JOIN companies c ON er.company_id = c.id
      LEFT JOIN users u ON er.approved_by = u.id
      WHERE er.id = $1 AND er.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exit request not found' });
    }

    // Get related checklist
    const checklistResult = await pool.query(
      'SELECT * FROM exit_checklists WHERE exit_request_id = $1',
      [id]
    );

    // Get related interview
    const interviewResult = await pool.query(
      'SELECT * FROM exit_interviews WHERE exit_request_id = $1',
      [id]
    );

    // Get related handover
    const handoverResult = await pool.query(
      'SELECT * FROM handover_records WHERE exit_request_id = $1',
      [id]
    );

    const exitRequest = result.rows[0];
    exitRequest.checklist = checklistResult.rows[0] || null;
    exitRequest.interview = interviewResult.rows[0] || null;
    exitRequest.handover = handoverResult.rows[0] || null;

    res.json({ success: true, data: exitRequest });
  } catch (error) {
    console.error('Error fetching exit request:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exit request' });
  }
});

// POST /api/exit/requests - Create exit request (resignation or termination)
router.post('/requests', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const {
      company_id, employee_id, request_type, request_date, requested_last_day,
      resignation_letter, resignation_reason, resignation_reason_details,
      termination_reason, termination_reason_details, termination_with_cause,
      notice_period_days
    } = req.body;

    // Create exit request
    const result = await client.query(`
      INSERT INTO exit_requests (
        tenant_id, company_id, employee_id, request_type, request_date, requested_last_day,
        resignation_letter, resignation_reason, resignation_reason_details,
        termination_reason, termination_reason_details, termination_with_cause,
        notice_period_days, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14)
      RETURNING *
    `, [
      tenantId, company_id, employee_id, request_type, request_date, requested_last_day,
      resignation_letter, resignation_reason, resignation_reason_details,
      termination_reason, termination_reason_details, termination_with_cause,
      notice_period_days || 30, userId
    ]);

    const exitRequest = result.rows[0];

    // Create exit checklist automatically
    await client.query(`
      INSERT INTO exit_checklists (
        tenant_id, company_id, employee_id, exit_request_id, status
      ) VALUES ($1, $2, $3, $4, 'pending')
    `, [tenantId, company_id, employee_id, exitRequest.id]);

    // Create exit interview record
    await client.query(`
      INSERT INTO exit_interviews (
        tenant_id, company_id, employee_id, exit_request_id, status
      ) VALUES ($1, $2, $3, $4, 'scheduled')
    `, [tenantId, company_id, employee_id, exitRequest.id]);

    // Create handover record
    await client.query(`
      INSERT INTO handover_records (
        tenant_id, company_id, employee_id, exit_request_id, status, created_by
      ) VALUES ($1, $2, $3, $4, 'pending', $5)
    `, [tenantId, company_id, employee_id, exitRequest.id, userId]);

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: exitRequest });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating exit request:', error);
    res.status(500).json({ success: false, error: 'Failed to create exit request' });
  } finally {
    client.release();
  }
});

// PUT /api/exit/requests/:id - Update exit request
router.put('/requests/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'request_type', 'requested_last_day', 'actual_last_day',
      'resignation_letter', 'resignation_reason', 'resignation_reason_details',
      'termination_reason', 'termination_reason_details', 'termination_with_cause',
      'notice_period_days', 'notice_period_waived', 'notice_period_buyout',
      'notice_period_buyout_amount', 'garden_leave', 'garden_leave_start',
      'garden_leave_end', 'status'
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
      UPDATE exit_requests
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exit request not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating exit request:', error);
    res.status(500).json({ success: false, error: 'Failed to update exit request' });
  }
});

// POST /api/exit/requests/:id/approve - Approve exit request
router.post('/requests/:id/approve', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { actual_last_day } = req.body;

    // Update exit request
    const result = await client.query(`
      UPDATE exit_requests
      SET status = 'approved',
          approved_by = $1,
          approved_at = NOW(),
          actual_last_day = COALESCE($2, requested_last_day),
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4 AND status = 'pending'
      RETURNING *
    `, [userId, actual_last_day, id, tenantId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Exit request not found or not pending' });
    }

    const exitRequest = result.rows[0];

    // Update employee status to 'exiting'
    await client.query(`
      UPDATE employees
      SET employment_status = 'exiting',
          termination_date = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [exitRequest.actual_last_day || exitRequest.requested_last_day, exitRequest.employee_id]);

    await client.query('COMMIT');
    res.json({ success: true, data: exitRequest });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving exit request:', error);
    res.status(500).json({ success: false, error: 'Failed to approve exit request' });
  } finally {
    client.release();
  }
});

// POST /api/exit/requests/:id/complete - Complete exit process
router.post('/requests/:id/complete', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;

    // Check if checklist is complete
    const checklistResult = await client.query(`
      SELECT * FROM exit_checklists WHERE exit_request_id = $1 AND status != 'completed'
    `, [id]);

    if (checklistResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Exit checklist must be completed first' });
    }

    // Update exit request
    const result = await client.query(`
      UPDATE exit_requests
      SET status = 'completed',
          hr_processed = true,
          hr_processed_by = $1,
          hr_processed_at = NOW(),
          updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3 AND status = 'approved'
      RETURNING *
    `, [userId, id, tenantId]);

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: 'Exit request not found or not approved' });
    }

    const exitRequest = result.rows[0];

    // Update employee status to 'terminated'
    await client.query(`
      UPDATE employees
      SET employment_status = 'terminated',
          termination_reason = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [
      exitRequest.request_type === 'resignation' ? exitRequest.resignation_reason_details : exitRequest.termination_reason_details,
      exitRequest.employee_id
    ]);

    // Deactivate user account
    await client.query(`
      UPDATE users SET is_active = false, updated_at = NOW()
      WHERE employee_id = $1
    `, [exitRequest.employee_id]);

    await client.query('COMMIT');
    res.json({ success: true, data: exitRequest });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error completing exit:', error);
    res.status(500).json({ success: false, error: 'Failed to complete exit' });
  } finally {
    client.release();
  }
});

// ============================================================================
// EXIT CHECKLISTS
// ============================================================================

// GET /api/exit/checklists/:id - Get exit checklist
router.get('/checklists/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        ec.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department
      FROM exit_checklists ec
      JOIN employees e ON ec.employee_id = e.id
      WHERE ec.id = $1 AND ec.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exit checklist not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching exit checklist:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exit checklist' });
  }
});

// PUT /api/exit/checklists/:id - Update exit checklist
router.put('/checklists/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // All boolean and other fields for checklist
    const allowedFields = [
      'it_laptop_returned', 'it_laptop_returned_date', 'it_laptop_condition',
      'it_phone_returned', 'it_phone_returned_date', 'it_access_cards_returned',
      'it_email_deactivated', 'it_systems_access_revoked', 'it_data_backup_completed', 'it_notes',
      'finance_final_salary_calculated', 'finance_leave_balance_paid',
      'finance_leave_days_remaining', 'finance_loans_outstanding', 'finance_loans_deducted',
      'finance_advances_cleared', 'finance_expense_claims_settled', 'finance_pension_notified',
      'finance_final_payment_processed', 'finance_final_payment_date', 'finance_final_payment_amount', 'finance_notes',
      'hr_exit_interview_completed', 'hr_certificate_of_service_issued',
      'hr_reference_letter_issued', 'hr_personal_files_archived', 'hr_benefits_terminated',
      'hr_nhf_notified', 'hr_pension_transfer_initiated', 'hr_notes',
      'dept_knowledge_transfer_completed', 'dept_handover_document_received',
      'dept_projects_reassigned', 'dept_clients_notified', 'dept_notes',
      'physical_keys_returned', 'physical_parking_pass_returned',
      'physical_uniform_returned', 'physical_locker_cleared', 'physical_notes',
      'status'
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

    // If status is being set to completed
    if (updates.status === 'completed') {
      fields.push(`completed_at = NOW()`);
      fields.push(`completed_by = $${paramIdx++}`);
      values.push(userId);
    }

    fields.push('updated_at = NOW()');
    values.push(id, tenantId);

    const result = await pool.query(`
      UPDATE exit_checklists
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exit checklist not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating exit checklist:', error);
    res.status(500).json({ success: false, error: 'Failed to update exit checklist' });
  }
});

// ============================================================================
// EXIT INTERVIEWS
// ============================================================================

// GET /api/exit/interviews - List exit interviews
router.get('/interviews', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, status } = req.query;

    let query = `
      SELECT
        ei.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        c.trading_name as company_name
      FROM exit_interviews ei
      JOIN employees e ON ei.employee_id = e.id
      JOIN companies c ON ei.company_id = c.id
      WHERE ei.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND ei.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (status) {
      query += ` AND ei.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY ei.interview_date DESC NULLS LAST';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching exit interviews:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exit interviews' });
  }
});

// GET /api/exit/interviews/:id - Get exit interview
router.get('/interviews/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        ei.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.hire_date,
        i.first_name || ' ' || i.last_name as interviewer_full_name
      FROM exit_interviews ei
      JOIN employees e ON ei.employee_id = e.id
      LEFT JOIN users i ON ei.interviewer_id = i.id
      WHERE ei.id = $1 AND ei.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exit interview not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching exit interview:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exit interview' });
  }
});

// PUT /api/exit/interviews/:id - Update exit interview (conduct interview)
router.put('/interviews/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'interview_date', 'interviewer_id', 'interviewer_name', 'interview_method',
      'primary_reason', 'reason_career_growth', 'reason_compensation',
      'reason_work_life_balance', 'reason_management', 'reason_company_culture',
      'reason_job_satisfaction', 'reason_other',
      'overall_experience_rating', 'would_recommend_company', 'would_return_to_company',
      'feedback_management', 'feedback_team', 'feedback_role',
      'feedback_compensation', 'feedback_training', 'feedback_work_environment',
      'improvement_suggestions', 'best_aspects_of_company', 'worst_aspects_of_company',
      'additional_comments', 'confidential_comments', 'status'
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

    if (updates.status === 'completed') {
      fields.push(`completed_at = NOW()`);
    }

    fields.push('updated_at = NOW()');
    values.push(id, tenantId);

    const result = await pool.query(`
      UPDATE exit_interviews
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Exit interview not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating exit interview:', error);
    res.status(500).json({ success: false, error: 'Failed to update exit interview' });
  }
});

// ============================================================================
// HANDOVER RECORDS
// ============================================================================

// GET /api/exit/handovers - List handover records
router.get('/handovers', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, status } = req.query;

    let query = `
      SELECT
        hr.*,
        e.first_name || ' ' || e.last_name as departing_employee_name,
        e.job_title,
        e.department,
        r.first_name || ' ' || r.last_name as receiving_employee_name,
        c.trading_name as company_name
      FROM handover_records hr
      JOIN employees e ON hr.employee_id = e.id
      JOIN companies c ON hr.company_id = c.id
      LEFT JOIN employees r ON hr.handover_to_id = r.id
      WHERE hr.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND hr.company_id = $${paramIdx++}`;
      params.push(company_id);
    }
    if (status) {
      query += ` AND hr.status = $${paramIdx++}`;
      params.push(status);
    }

    query += ' ORDER BY hr.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching handover records:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch handover records' });
  }
});

// GET /api/exit/handovers/:id - Get handover record
router.get('/handovers/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        hr.*,
        e.first_name || ' ' || e.last_name as departing_employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.email as departing_employee_email,
        r.first_name || ' ' || r.last_name as receiving_employee_full_name,
        r.email as receiving_employee_email
      FROM handover_records hr
      JOIN employees e ON hr.employee_id = e.id
      LEFT JOIN employees r ON hr.handover_to_id = r.id
      WHERE hr.id = $1 AND hr.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Handover record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching handover record:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch handover record' });
  }
});

// PUT /api/exit/handovers/:id - Update handover record
router.put('/handovers/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const updates = req.body;

    const allowedFields = [
      'handover_to_id', 'handover_to_name', 'handover_start_date', 'handover_end_date',
      'tasks_responsibilities', 'projects', 'key_contacts', 'systems_access',
      'documentation_location', 'important_files_location', 'passwords_transferred',
      'departing_employee_signoff', 'departing_employee_signoff_date',
      'receiving_employee_signoff', 'receiving_employee_signoff_date',
      'manager_signoff', 'manager_signoff_date',
      'status', 'completion_percentage', 'notes'
    ];

    const fields = [];
    const values = [];
    let paramIdx = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        let value = updates[field];
        // JSON fields
        if (['tasks_responsibilities', 'projects', 'key_contacts', 'systems_access'].includes(field)) {
          value = JSON.stringify(value);
        }
        fields.push(`${field} = $${paramIdx++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    fields.push('updated_at = NOW()');
    values.push(id, tenantId);

    const result = await pool.query(`
      UPDATE handover_records
      SET ${fields.join(', ')}
      WHERE id = $${paramIdx++} AND tenant_id = $${paramIdx}
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Handover record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating handover record:', error);
    res.status(500).json({ success: false, error: 'Failed to update handover record' });
  }
});

// ============================================================================
// EXIT ANALYTICS / SUMMARY
// ============================================================================

// GET /api/exit/summary - Exit analytics
router.get('/summary', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, year } = req.query;
    const targetYear = year || new Date().getFullYear();

    let companyFilter = '';
    const params = [tenantId, targetYear];
    if (company_id) {
      companyFilter = ' AND er.company_id = $3';
      params.push(company_id);
    }

    // Exit counts by type
    const byTypeResult = await pool.query(`
      SELECT request_type, COUNT(*) as count
      FROM exit_requests er
      WHERE er.tenant_id = $1
        AND EXTRACT(YEAR FROM er.request_date) = $2
        ${companyFilter}
      GROUP BY request_type
    `, params);

    // Exit counts by reason (for resignations)
    const byReasonResult = await pool.query(`
      SELECT resignation_reason, COUNT(*) as count
      FROM exit_requests er
      WHERE er.tenant_id = $1
        AND EXTRACT(YEAR FROM er.request_date) = $2
        AND er.request_type = 'resignation'
        AND er.resignation_reason IS NOT NULL
        ${companyFilter}
      GROUP BY resignation_reason
    `, params);

    // Monthly trend
    const monthlyResult = await pool.query(`
      SELECT
        EXTRACT(MONTH FROM request_date) as month,
        COUNT(*) as count
      FROM exit_requests er
      WHERE er.tenant_id = $1
        AND EXTRACT(YEAR FROM er.request_date) = $2
        ${companyFilter}
      GROUP BY EXTRACT(MONTH FROM request_date)
      ORDER BY month
    `, params);

    // Average ratings from exit interviews
    const ratingsResult = await pool.query(`
      SELECT
        AVG(overall_experience_rating) as avg_experience,
        AVG(reason_career_growth) as avg_career_growth,
        AVG(reason_compensation) as avg_compensation,
        AVG(reason_work_life_balance) as avg_work_life_balance,
        AVG(reason_management) as avg_management,
        COUNT(*) FILTER (WHERE would_recommend_company = true) as would_recommend_count,
        COUNT(*) FILTER (WHERE would_return_to_company = true) as would_return_count,
        COUNT(*) as total_interviews
      FROM exit_interviews ei
      WHERE ei.tenant_id = $1
        AND EXTRACT(YEAR FROM ei.interview_date) = $2
        AND ei.status = 'completed'
        ${company_id ? ' AND ei.company_id = $3' : ''}
    `, params);

    res.json({
      success: true,
      data: {
        byType: byTypeResult.rows,
        byReason: byReasonResult.rows,
        monthly: monthlyResult.rows,
        interviewRatings: ratingsResult.rows[0]
      }
    });
  } catch (error) {
    console.error('Error fetching exit summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch exit summary' });
  }
});

module.exports = router;
