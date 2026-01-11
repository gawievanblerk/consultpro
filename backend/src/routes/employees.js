const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const { query, pool } = require('../utils/db');
const { sendESSInviteEmail } = require('../utils/email');
const {
  authenticateHierarchy,
  requireCompanyAccess,
  extractCompanyContext
} = require('../middleware/hierarchyAuth');

// All routes require authentication
router.use(authenticateHierarchy);

// ============================================================================
// EMPLOYEE CRUD OPERATIONS
// ============================================================================

/**
 * GET /api/employees
 * List employees for a company
 */
router.get('/', [
  requireCompanyAccess,
  extractCompanyContext
], async (req, res) => {
  try {
    const { page = 1, limit = 50, status, department, search, company_id } = req.query;
    const offset = (page - 1) * limit;

    // Determine company filter
    let companyId = company_id || (req.currentCompany ? req.currentCompany.id : null);

    if (!companyId && req.consultant) {
      // Return employees from all companies for this consultant
      let whereClause = `
        WHERE e.company_id IN (
          SELECT id FROM companies WHERE consultant_id = $1 AND deleted_at IS NULL
        ) AND e.deleted_at IS NULL
      `;
      const params = [req.consultant.id];
      let paramIndex = 2;

      if (status) {
        whereClause += ` AND e.employment_status = $${paramIndex++}`;
        params.push(status);
      }

      if (department) {
        whereClause += ` AND e.department = $${paramIndex++}`;
        params.push(department);
      }

      if (search) {
        whereClause += ` AND (e.first_name ILIKE $${paramIndex} OR e.last_name ILIKE $${paramIndex} OR e.email ILIKE $${paramIndex} OR e.employee_number ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      const countResult = await query(`SELECT COUNT(*) FROM employees e ${whereClause}`, params);
      const total = parseInt(countResult.rows[0].count);

      params.push(limit, offset);
      const result = await query(`
        SELECT e.*, c.legal_name as company_name
        FROM employees e
        JOIN companies c ON e.company_id = c.id
        ${whereClause}
        ORDER BY e.last_name, e.first_name
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `, params);

      return res.json({
        success: true,
        data: result.rows,
        pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) }
      });
    }

    if (!companyId) {
      return res.status(400).json({ success: false, error: 'Company ID required' });
    }

    // Verify access
    const canAccess = await req.canAccessCompany(companyId);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    let whereClause = 'WHERE company_id = $1 AND deleted_at IS NULL';
    const params = [companyId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND employment_status = $${paramIndex++}`;
      params.push(status);
    }

    if (department) {
      whereClause += ` AND department = $${paramIndex++}`;
      params.push(department);
    }

    if (search) {
      whereClause += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex} OR employee_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await query(`SELECT COUNT(*) FROM employees ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await query(`
      SELECT * FROM employees
      ${whereClause}
      ORDER BY last_name, first_name
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List employees error:', error);
    res.status(500).json({ success: false, error: 'Failed to list employees' });
  }
});

/**
 * POST /api/employees
 * Create a new employee
 */
router.post('/', [
  requireCompanyAccess,
  body('companyId').isUUID(),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').optional().isEmail(),
  body('employmentType').optional().isIn(['full_time', 'part_time', 'contract', 'intern']),
  body('employmentStatus').optional().isIn(['preboarding', 'active', 'probation', 'on_leave', 'suspended', 'terminated'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { companyId } = req.body;

    // Verify access
    const canAccess = await req.canAccessCompany(companyId);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied to this company' });
    }

    // Check employee limit if consultant
    if (req.consultant) {
      const countResult = await query(
        'SELECT COUNT(*) FROM employees WHERE company_id = $1 AND deleted_at IS NULL',
        [companyId]
      );
      const currentCount = parseInt(countResult.rows[0].count);

      if (currentCount >= req.consultant.maxEmployeesPerCompany) {
        return res.status(400).json({
          success: false,
          error: `Employee limit reached. Your plan allows ${req.consultant.maxEmployeesPerCompany} employees per company.`
        });
      }
    }

    // Generate employee number
    const yearPrefix = new Date().getFullYear();
    const countResult = await query(
      `SELECT COUNT(*) FROM employees WHERE company_id = $1 AND employee_number LIKE $2`,
      [companyId, `EMP-${yearPrefix}-%`]
    );
    const nextNumber = parseInt(countResult.rows[0].count) + 1;
    const employeeNumber = `EMP-${yearPrefix}-${nextNumber.toString().padStart(4, '0')}`;

    const {
      firstName,
      lastName,
      middleName,
      email,
      phone,
      dateOfBirth,
      gender,
      maritalStatus,
      nationality = 'Nigerian',
      stateOfOrigin,
      lgaOfOrigin,
      addressLine1,
      addressLine2,
      city,
      stateOfResidence,
      employmentType = 'full_time',
      employmentStatus = 'active',
      jobTitle,
      department,
      departmentId,
      reportsTo,
      hireDate,
      confirmationDate,
      salary,
      salaryCurrency = 'NGN',
      payFrequency = 'monthly',
      bankName,
      bankAccountNumber,
      bankAccountName,
      bankCode,
      nin,
      bvn,
      taxId,
      pensionPin,
      pensionPfa,
      pensionPfaCode,
      nhfNumber,
      nhisNumber,
      essEnabled = false
    } = req.body;

    const result = await query(`
      INSERT INTO employees (
        company_id, employee_number, first_name, last_name, middle_name,
        email, phone, date_of_birth, gender, marital_status,
        nationality, state_of_origin, lga_of_origin,
        address_line1, address_line2, city, state_of_residence,
        employment_type, employment_status, job_title, department, department_id, reports_to,
        hire_date, confirmation_date, salary, salary_currency, pay_frequency,
        bank_name, bank_account_number, bank_account_name, bank_code,
        nin, bvn, tax_id, pension_pin, pension_pfa, pension_pfa_code,
        nhf_number, nhis_number, ess_enabled, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31,
        $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42
      )
      RETURNING *
    `, [
      companyId, employeeNumber, firstName, lastName, middleName,
      email, phone, dateOfBirth, gender, maritalStatus,
      nationality, stateOfOrigin, lgaOfOrigin,
      addressLine1, addressLine2, city, stateOfResidence,
      employmentType, employmentStatus, jobTitle, department, departmentId || null, reportsTo,
      hireDate, confirmationDate, salary, salaryCurrency, payFrequency,
      bankName, bankAccountNumber, bankAccountName, bankCode,
      nin, bvn, taxId, pensionPin, pensionPfa, pensionPfaCode,
      nhfNumber, nhisNumber, essEnabled, req.user.id
    ]);

    // Log activity
    const consultantId = req.consultant ? req.consultant.id : null;
    await query(`
      INSERT INTO activity_feed (consultant_id, company_id, user_id, activity_type, title, actor_type, reference_type, reference_id)
      VALUES ($1, $2, $3, 'employee_created', $4, $5, 'employee', $6)
    `, [consultantId, companyId, req.user.id, `Added employee: ${firstName} ${lastName}`, req.user.userType, result.rows[0].id]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to create employee' });
  }
});

/**
 * GET /api/employees/:id
 * Get employee details
 */
router.get('/:id', [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT e.*, c.legal_name as company_name
      FROM employees e
      JOIN companies c ON e.company_id = c.id
      WHERE e.id = $1 AND e.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    // Verify access
    const canAccess = await req.canAccessEmployee(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to get employee' });
  }
});

/**
 * PUT /api/employees/:id
 * Update employee details
 */
router.put('/:id', [
  param('id').isUUID(),
  body('employmentStatus').optional().isIn(['preboarding', 'active', 'probation', 'on_leave', 'suspended', 'terminated'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;

    // Verify access
    const canAccess = await req.canAccessEmployee(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const allowedFields = [
      'first_name', 'last_name', 'middle_name', 'email', 'phone',
      'date_of_birth', 'gender', 'marital_status', 'nationality',
      'state_of_origin', 'lga_of_origin', 'address_line1', 'address_line2',
      'city', 'state_of_residence', 'employment_type', 'employment_status',
      'job_title', 'department', 'department_id', 'reports_to', 'hire_date', 'confirmation_date',
      'termination_date', 'termination_reason', 'salary', 'salary_currency',
      'pay_frequency', 'bank_name', 'bank_account_number', 'bank_account_name',
      'bank_code', 'nin', 'bvn', 'tax_id', 'pension_pin', 'pension_pfa',
      'pension_pfa_code', 'nhf_number', 'nhis_number'
    ];

    const fieldMap = {
      firstName: 'first_name', lastName: 'last_name', middleName: 'middle_name',
      dateOfBirth: 'date_of_birth', maritalStatus: 'marital_status',
      stateOfOrigin: 'state_of_origin', lgaOfOrigin: 'lga_of_origin',
      addressLine1: 'address_line1', addressLine2: 'address_line2',
      stateOfResidence: 'state_of_residence', employmentType: 'employment_type',
      employmentStatus: 'employment_status', jobTitle: 'job_title',
      departmentId: 'department_id',
      reportsTo: 'reports_to', hireDate: 'hire_date', confirmationDate: 'confirmation_date',
      terminationDate: 'termination_date', terminationReason: 'termination_reason',
      salaryCurrency: 'salary_currency', payFrequency: 'pay_frequency',
      bankName: 'bank_name', bankAccountNumber: 'bank_account_number',
      bankAccountName: 'bank_account_name', bankCode: 'bank_code',
      taxId: 'tax_id', pensionPin: 'pension_pin', pensionPfa: 'pension_pfa',
      pensionPfaCode: 'pension_pfa_code', nhfNumber: 'nhf_number', nhisNumber: 'nhis_number'
    };

    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(req.body)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(`
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to update employee' });
  }
});

/**
 * DELETE /api/employees/:id
 * Soft delete (terminate) employee
 */
router.delete('/:id', [
  param('id').isUUID(),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    // Verify access
    const canAccess = await req.canAccessEmployee(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(`
      UPDATE employees
      SET deleted_at = NOW(),
          employment_status = 'terminated',
          termination_date = CURRENT_DATE,
          termination_reason = $2,
          updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING id, first_name, last_name
    `, [id, reason || 'Terminated']);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    res.json({ success: true, message: 'Employee terminated successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete employee' });
  }
});

// ============================================================================
// ESS (Employee Self-Service) MANAGEMENT
// ============================================================================

/**
 * POST /api/employees/:id/ess/invite
 * Send ESS invitation to employee
 */
router.post('/:id/ess/invite', [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    // Get employee and verify access
    const employeeResult = await query(`
      SELECT e.*, c.consultant_id, c.legal_name as company_name
      FROM employees e
      JOIN companies c ON e.company_id = c.id
      WHERE e.id = $1 AND e.deleted_at IS NULL
    `, [id]);

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const employee = employeeResult.rows[0];

    const canAccess = await req.canAccessEmployee(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!employee.email) {
      return res.status(400).json({
        success: false,
        error: 'Employee does not have an email address'
      });
    }

    if (employee.ess_activated_at) {
      return res.status(400).json({
        success: false,
        error: 'Employee has already activated their ESS account'
      });
    }

    // Check for existing pending invitation
    const existingInvite = await query(`
      SELECT id FROM employee_invitations
      WHERE employee_id = $1 AND accepted_at IS NULL
    `, [id]);

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (existingInvite.rows.length > 0) {
      // Update existing invitation with new token (resend)
      await query(`
        UPDATE employee_invitations
        SET token = $2, expires_at = $3, sent_at = NOW(), resend_count = COALESCE(resend_count, 0) + 1, last_resent_at = NOW()
        WHERE id = $1
      `, [existingInvite.rows[0].id, token, expiresAt]);
      console.log('Updated existing invitation for employee:', id);
    } else {
      // Create new invitation
      await query(`
        INSERT INTO employee_invitations (employee_id, company_id, email, token, expires_at, sent_at, created_by)
        VALUES ($1, $2, $3, $4, $5, NOW(), $6)
      `, [id, employee.company_id, employee.email, token, expiresAt, req.user.id]);
    }

    // Update employee
    await query(`
      UPDATE employees SET ess_enabled = true, ess_invitation_sent_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Send invitation email
    const invitationLink = `${process.env.FRONTEND_URL || 'https://corehr.africa'}/onboard/ess?token=${token}`;
    const employeeName = `${employee.first_name} ${employee.last_name}`.trim();

    try {
      await sendESSInviteEmail(employee.email, token, employeeName, employee.company_name);
      console.log('ESS invitation email sent to:', employee.email);
    } catch (emailError) {
      console.error('Failed to send ESS invitation email:', emailError);
      // Continue even if email fails - invitation is still created
    }

    res.status(201).json({
      success: true,
      message: 'ESS invitation sent successfully',
      data: { email: employee.email, invitationLink }
    });
  } catch (error) {
    console.error('Send ESS invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

/**
 * POST /api/employees/:id/ess/resend
 * Resend ESS invitation
 */
router.post('/:id/ess/resend', [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    const canAccess = await req.canAccessEmployee(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Get existing invitation with employee and company info
    const inviteResult = await query(`
      SELECT ei.*, e.email as employee_email, e.first_name, e.last_name, c.legal_name as company_name
      FROM employee_invitations ei
      JOIN employees e ON ei.employee_id = e.id
      JOIN companies c ON e.company_id = c.id
      WHERE ei.employee_id = $1 AND ei.accepted_at IS NULL
      ORDER BY ei.created_at DESC
      LIMIT 1
    `, [id]);

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No pending invitation found. Please send a new invitation.'
      });
    }

    const invitation = inviteResult.rows[0];

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(`
      UPDATE employee_invitations
      SET token = $2, expires_at = $3, sent_at = NOW(), resend_count = resend_count + 1, last_resent_at = NOW()
      WHERE id = $1
    `, [invitation.id, token, expiresAt]);

    // Send invitation email
    const invitationLink = `${process.env.FRONTEND_URL || 'https://corehr.africa'}/onboard/ess?token=${token}`;
    const employeeName = `${invitation.first_name} ${invitation.last_name}`.trim();

    try {
      await sendESSInviteEmail(invitation.employee_email, token, employeeName, invitation.company_name);
      console.log('ESS invitation email resent to:', invitation.employee_email);
    } catch (emailError) {
      console.error('Failed to resend ESS invitation email:', emailError);
    }

    res.json({
      success: true,
      message: 'ESS invitation resent successfully',
      data: { email: invitation.employee_email, invitationLink }
    });
  } catch (error) {
    console.error('Resend ESS invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to resend invitation' });
  }
});

/**
 * POST /api/employees/ess/bulk-invite
 * Send ESS invitations to multiple employees
 */
router.post('/ess/bulk-invite', async (req, res) => {
  try {
    const { employee_ids } = req.body;

    if (!employee_ids || !Array.isArray(employee_ids) || employee_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'employee_ids array is required'
      });
    }

    const results = {
      success: [],
      skipped: [],
      failed: []
    };

    for (const employeeId of employee_ids) {
      try {
        // Get employee and verify access
        const employeeResult = await query(`
          SELECT e.*, c.consultant_id, c.legal_name as company_name
          FROM employees e
          JOIN companies c ON e.company_id = c.id
          WHERE e.id = $1 AND e.deleted_at IS NULL
        `, [employeeId]);

        if (employeeResult.rows.length === 0) {
          results.skipped.push({ id: employeeId, reason: 'Employee not found' });
          continue;
        }

        const employee = employeeResult.rows[0];
        const employeeName = `${employee.first_name} ${employee.last_name}`;

        // Verify access
        const canAccess = await req.canAccessEmployee(employeeId);
        if (!canAccess) {
          results.skipped.push({ id: employeeId, name: employeeName, reason: 'Access denied' });
          continue;
        }

        // Skip if no email
        if (!employee.email) {
          results.skipped.push({ id: employeeId, name: employeeName, reason: 'No email address' });
          continue;
        }

        // Skip if already activated
        if (employee.ess_activated_at) {
          results.skipped.push({ id: employeeId, name: employeeName, reason: 'ESS already activated' });
          continue;
        }

        // Check for existing pending invitation
        const existingInvite = await query(`
          SELECT id FROM employee_invitations
          WHERE employee_id = $1 AND accepted_at IS NULL
        `, [employeeId]);

        // Generate token
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        if (existingInvite.rows.length > 0) {
          // Update existing invitation with new token (resend)
          await query(`
            UPDATE employee_invitations
            SET token = $2, expires_at = $3, sent_at = NOW(), resend_count = COALESCE(resend_count, 0) + 1, last_resent_at = NOW()
            WHERE id = $1
          `, [existingInvite.rows[0].id, token, expiresAt]);
        } else {
          // Create new invitation
          await query(`
            INSERT INTO employee_invitations (employee_id, company_id, email, token, expires_at, sent_at, created_by)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6)
          `, [employeeId, employee.company_id, employee.email, token, expiresAt, req.user.id]);
        }

        // Update employee record
        await query(`
          UPDATE employees
          SET ess_enabled = true, ess_invitation_sent_at = NOW(), updated_at = NOW()
          WHERE id = $1
        `, [employeeId]);

        const invitationLink = `${process.env.FRONTEND_URL || 'https://corehr.africa'}/onboard/ess?token=${token}`;

        // Send email with rate limiting (Resend free tier: 2 emails/second)
        try {
          await sendESSInviteEmail(employee.email, token, employeeName, employee.company_name);
          console.log(`ESS invitation email sent to ${employee.email}`);
          // Add delay to respect Resend rate limit (600ms = ~1.6 emails/second, safely under 2/second)
          await new Promise(resolve => setTimeout(resolve, 600));
        } catch (emailError) {
          console.error(`Failed to send ESS email to ${employee.email}:`, emailError);
          // Still add delay even on error to avoid hammering the API
          await new Promise(resolve => setTimeout(resolve, 600));
        }

        results.success.push({
          id: employeeId,
          name: employeeName,
          email: employee.email,
          invitationLink
        });

      } catch (err) {
        console.error(`Failed to process employee ${employeeId}:`, err);
        results.failed.push({ id: employeeId, reason: err.message });
      }
    }

    res.json({
      success: true,
      message: `Processed ${employee_ids.length} employees`,
      data: {
        total: employee_ids.length,
        sent: results.success.length,
        skipped: results.skipped.length,
        failed: results.failed.length,
        results
      }
    });
  } catch (error) {
    console.error('Bulk ESS invite error:', error);
    res.status(500).json({ success: false, error: 'Failed to process bulk invitations' });
  }
});

// ============================================================================
// BULK IMPORT
// ============================================================================

/**
 * GET /api/employees/import/template
 * Download CSV import template
 */
router.get('/import/template', (req, res) => {
  const headers = [
    'first_name*', 'last_name*', 'middle_name', 'email', 'phone',
    'date_of_birth', 'gender', 'marital_status', 'nationality',
    'state_of_origin', 'lga_of_origin', 'address_line1', 'address_line2',
    'city', 'state_of_residence', 'employment_type', 'job_title',
    'department', 'hire_date', 'salary', 'salary_currency',
    'bank_name', 'bank_account_number', 'bank_account_name',
    'nin', 'bvn', 'tax_id', 'pension_pin', 'pension_pfa',
    'nhf_number', 'nhis_number', 'enable_ess'
  ];

  const csv = headers.join(',') + '\n' +
    'John,Doe,Michael,john.doe@email.com,08012345678,1990-01-15,Male,Single,Nigerian,Lagos,Ikeja,123 Main St,,Lagos,Lagos,full_time,Software Engineer,Engineering,2024-01-01,500000,NGN,Access Bank,1234567890,John Doe,12345678901,22345678901,TIN123456,PEN123456,ARM Pension,NHF123456,NHIS123456,yes';

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=employee_import_template.csv');
  res.send(csv);
});

/**
 * POST /api/employees/import
 * Bulk import employees from CSV
 */
router.post('/import', [
  requireCompanyAccess,
  body('companyId').isUUID(),
  body('employees').isArray({ min: 1, max: 500 })
], async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { companyId, employees, sendEssInvites = false } = req.body;

    // Verify access
    const canAccess = await req.canAccessCompany(companyId);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await client.query('BEGIN');

    const results = {
      success: [],
      errors: []
    };

    // Get current employee count for number generation
    const countResult = await client.query(
      `SELECT COUNT(*) FROM employees WHERE company_id = $1 AND employee_number LIKE $2`,
      [companyId, `EMP-${new Date().getFullYear()}-%`]
    );
    let nextNumber = parseInt(countResult.rows[0].count) + 1;

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      try {
        // Validate required fields
        if (!emp.first_name || !emp.last_name) {
          results.errors.push({ row: i + 1, error: 'First name and last name are required' });
          continue;
        }

        const employeeNumber = `EMP-${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`;
        nextNumber++;

        const insertResult = await client.query(`
          INSERT INTO employees (
            company_id, employee_number, first_name, last_name, middle_name,
            email, phone, date_of_birth, gender, marital_status,
            nationality, state_of_origin, lga_of_origin,
            address_line1, address_line2, city, state_of_residence,
            employment_type, employment_status, job_title, department,
            hire_date, salary, salary_currency,
            bank_name, bank_account_number, bank_account_name,
            nin, bvn, tax_id, pension_pin, pension_pfa,
            nhf_number, nhis_number, ess_enabled, created_by
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, 'active', $19, $20, $21, $22, $23, $24, $25, $26,
            $27, $28, $29, $30, $31, $32, $33, $34, $35
          )
          RETURNING id, first_name, last_name, email, employee_number
        `, [
          companyId, employeeNumber,
          emp.first_name, emp.last_name, emp.middle_name || null,
          emp.email || null, emp.phone || null,
          emp.date_of_birth || null, emp.gender || null, emp.marital_status || null,
          emp.nationality || 'Nigerian', emp.state_of_origin || null, emp.lga_of_origin || null,
          emp.address_line1 || null, emp.address_line2 || null, emp.city || null, emp.state_of_residence || null,
          emp.employment_type || 'full_time', emp.job_title || null, emp.department || null,
          emp.hire_date || null, emp.salary || null, emp.salary_currency || 'NGN',
          emp.bank_name || null, emp.bank_account_number || null, emp.bank_account_name || null,
          emp.nin || null, emp.bvn || null, emp.tax_id || null, emp.pension_pin || null, emp.pension_pfa || null,
          emp.nhf_number || null, emp.nhis_number || null,
          sendEssInvites && emp.email ? true : false,
          req.user.id
        ]);

        const newEmployee = insertResult.rows[0];
        results.success.push(newEmployee);

        // Create ESS invitation if requested
        if (sendEssInvites && emp.email && (emp.enable_ess === 'yes' || emp.enable_ess === true)) {
          const token = crypto.randomBytes(32).toString('hex');
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

          await client.query(`
            INSERT INTO employee_invitations (employee_id, company_id, email, token, expires_at, sent_at, created_by)
            VALUES ($1, $2, $3, $4, $5, NOW(), $6)
          `, [newEmployee.id, companyId, emp.email, token, expiresAt, req.user.id]);

          await client.query(`
            UPDATE employees SET ess_invitation_sent_at = NOW() WHERE id = $1
          `, [newEmployee.id]);
        }
      } catch (err) {
        results.errors.push({ row: i + 1, error: err.message, data: emp });
      }
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: `Imported ${results.success.length} employees. ${results.errors.length} errors.`,
      data: results
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Bulk import error:', error);
    res.status(500).json({ success: false, error: 'Import failed' });
  } finally {
    client.release();
  }
});

// ============================================================================
// EMPLOYEE SELF-SERVICE (ESS) ROUTES
// ============================================================================

/**
 * GET /api/employees/ess/profile
 * Employee views their own profile
 */
router.get('/ess/profile', async (req, res) => {
  try {
    if (req.user.userType !== 'employee' || !req.employee) {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is for employees only'
      });
    }

    const result = await query(`
      SELECT
        e.id, e.employee_number, e.first_name, e.last_name, e.middle_name,
        e.email, e.phone, e.date_of_birth, e.gender, e.marital_status,
        e.nin, e.tax_id, e.bvn,
        e.address_line1, e.address_line2, e.city, e.state_of_residence, e.country,
        e.bank_name, e.bank_account_number, e.bank_account_name,
        e.job_title, e.department, e.hire_date, e.employment_type,
        c.legal_name as company_name
      FROM employees e
      JOIN companies c ON e.company_id = c.id
      WHERE e.id = $1 AND e.deleted_at IS NULL
    `, [req.employee.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Get ESS profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

/**
 * PUT /api/employees/ess/profile
 * Employee updates their profile for onboarding completion
 */
router.put('/ess/profile', [
  body('phone').optional().trim(),
  body('dateOfBirth').optional(),
  body('gender').optional().trim(),
  body('maritalStatus').optional().trim(),
  body('nin').optional().trim(),
  body('addressLine1').optional().trim(),
  body('addressLine2').optional().trim(),
  body('city').optional().trim(),
  body('stateOfResidence').optional().trim(),
  body('country').optional().trim(),
  body('bankName').optional().trim(),
  body('bankAccountNumber').optional().trim(),
  body('bankAccountName').optional().trim(),
  body('bvn').optional().trim(),
  body('taxId').optional().trim()
], async (req, res) => {
  try {
    if (req.user.userType !== 'employee' || !req.employee) {
      return res.status(403).json({
        success: false,
        error: 'This endpoint is for employees only'
      });
    }

    // Fields employees can update for profile completion
    const allowedFields = [
      'phone', 'date_of_birth', 'gender', 'marital_status', 'nin',
      'address_line1', 'address_line2', 'city', 'state_of_residence', 'country',
      'bank_name', 'bank_account_number', 'bank_account_name', 'bvn', 'tax_id'
    ];
    const fieldMap = {
      dateOfBirth: 'date_of_birth',
      maritalStatus: 'marital_status',
      addressLine1: 'address_line1',
      addressLine2: 'address_line2',
      stateOfResidence: 'state_of_residence',
      bankName: 'bank_name',
      bankAccountNumber: 'bank_account_number',
      bankAccountName: 'bank_account_name',
      taxId: 'tax_id'
    };

    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(req.body)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates.push(`${dbField} = $${paramIndex++}`);
        params.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(req.employee.id);

    const result = await query(`
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING id, phone, date_of_birth, gender, marital_status, nin,
        address_line1, address_line2, city, state_of_residence, country,
        bank_name, bank_account_number, bank_account_name, bvn, tax_id
    `, params);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update ESS profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

module.exports = router;
