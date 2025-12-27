const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const { query } = require('../utils/db');
const {
  authenticateHierarchy,
  requireConsultant,
  requireCompanyAccess,
  extractCompanyContext
} = require('../middleware/hierarchyAuth');

// All routes require authentication
router.use(authenticateHierarchy);

// ============================================================================
// COMPANY LISTING (For Consultants)
// ============================================================================

/**
 * GET /api/companies
 * List companies for current consultant
 */
router.get('/', requireConsultant, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE consultant_id = $1 AND deleted_at IS NULL';
    const params = [req.consultant.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (search) {
      whereClause += ` AND (legal_name ILIKE $${paramIndex} OR trading_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM companies ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get companies with employee count
    params.push(limit, offset);
    const result = await query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM employees WHERE company_id = c.id AND deleted_at IS NULL) as employee_count,
        (SELECT COUNT(*) FROM employees WHERE company_id = c.id AND ess_enabled = true AND deleted_at IS NULL) as ess_enabled_count
      FROM companies c
      ${whereClause}
      ORDER BY c.created_at DESC
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
    console.error('List companies error:', error);
    res.status(500).json({ success: false, error: 'Failed to list companies' });
  }
});

/**
 * POST /api/companies
 * Create a new company (Consultant only)
 */
router.post('/', [
  requireConsultant,
  body('legalName').notEmpty().trim(),
  body('tradingName').optional().trim(),
  body('companyType').optional().isIn(['llc', 'plc', 'partnership', 'sole_proprietor', 'ngo']),
  body('industry').optional().trim(),
  body('email').optional().isEmail(),
  body('phone').optional().trim(),
  body('tin').optional().trim(),
  body('rcNumber').optional().trim(),
  body('payFrequency').optional().isIn(['weekly', 'bi-weekly', 'monthly']),
  body('payDay').optional().isInt({ min: 1, max: 31 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Check company limit
    const countResult = await query(
      'SELECT COUNT(*) FROM companies WHERE consultant_id = $1 AND deleted_at IS NULL',
      [req.consultant.id]
    );
    const currentCount = parseInt(countResult.rows[0].count);

    if (currentCount >= req.consultant.maxCompanies) {
      return res.status(400).json({
        success: false,
        error: `Company limit reached. Your plan allows ${req.consultant.maxCompanies} companies.`
      });
    }

    const {
      legalName,
      tradingName,
      companyType,
      industry,
      employeeCountRange,
      email,
      phone,
      website,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      tin,
      rcNumber,
      pensionCode,
      nhfCode,
      nhisCode,
      itfCode,
      nsitfCode,
      defaultCurrency = 'NGN',
      payFrequency = 'monthly',
      payrollCutoffDay = 25,
      payDay = 28
    } = req.body;

    const result = await query(`
      INSERT INTO companies (
        consultant_id, legal_name, trading_name, company_type, industry,
        employee_count_range, email, phone, website,
        address_line1, address_line2, city, state, postal_code,
        tin, rc_number, pension_code, nhf_code, nhis_code, itf_code, nsitf_code,
        default_currency, pay_frequency, payroll_cutoff_day, pay_day,
        status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25,
        'onboarding', $26
      )
      RETURNING *
    `, [
      req.consultant.id,
      legalName,
      tradingName,
      companyType,
      industry,
      employeeCountRange,
      email,
      phone,
      website,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      tin,
      rcNumber,
      pensionCode,
      nhfCode,
      nhisCode,
      itfCode,
      nsitfCode,
      defaultCurrency,
      payFrequency,
      payrollCutoffDay,
      payDay,
      req.user.id
    ]);

    // Log activity
    await query(`
      INSERT INTO activity_feed (consultant_id, company_id, user_id, activity_type, title, actor_type, reference_type, reference_id)
      VALUES ($1, $2, $3, 'company_created', $4, 'consultant', 'company', $2)
    `, [req.consultant.id, result.rows[0].id, req.user.id, `Created company: ${legalName}`]);

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create company error:', error);
    res.status(500).json({ success: false, error: 'Failed to create company' });
  }
});

/**
 * GET /api/companies/:id
 * Get company details
 */
router.get('/:id', [
  param('id').isUUID(),
  extractCompanyContext
], async (req, res) => {
  try {
    const { id } = req.params;

    // Verify access
    const canAccess = await req.canAccessCompany(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM employees WHERE company_id = c.id AND deleted_at IS NULL) as employee_count,
        (SELECT COUNT(*) FROM employees WHERE company_id = c.id AND ess_enabled = true AND deleted_at IS NULL) as ess_enabled_count,
        (SELECT COUNT(*) FROM company_admins WHERE company_id = c.id) as admin_count
      FROM companies c
      WHERE c.id = $1 AND c.deleted_at IS NULL
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    // Get admins
    const adminsResult = await query(`
      SELECT u.id, u.email, u.first_name, u.last_name, ca.role, ca.is_primary
      FROM company_admins ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.company_id = $1
      ORDER BY ca.is_primary DESC, u.first_name
    `, [id]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        admins: adminsResult.rows
      }
    });
  } catch (error) {
    console.error('Get company error:', error);
    res.status(500).json({ success: false, error: 'Failed to get company' });
  }
});

/**
 * PUT /api/companies/:id
 * Update company details
 */
router.put('/:id', [
  param('id').isUUID(),
  body('legalName').optional().notEmpty().trim(),
  body('status').optional().isIn(['onboarding', 'active', 'suspended', 'offboarded'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;

    // Verify access
    const canAccess = await req.canAccessCompany(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const allowedFields = [
      'legal_name', 'trading_name', 'company_type', 'industry', 'employee_count_range',
      'email', 'phone', 'website', 'address_line1', 'address_line2', 'city', 'state', 'postal_code',
      'tin', 'rc_number', 'pension_code', 'nhf_code', 'nhis_code', 'itf_code', 'nsitf_code',
      'default_currency', 'pay_frequency', 'payroll_cutoff_day', 'pay_day', 'status'
    ];

    const updates = [];
    const params = [];
    let paramIndex = 1;

    // Map camelCase to snake_case
    const fieldMap = {
      legalName: 'legal_name',
      tradingName: 'trading_name',
      companyType: 'company_type',
      employeeCountRange: 'employee_count_range',
      addressLine1: 'address_line1',
      addressLine2: 'address_line2',
      postalCode: 'postal_code',
      rcNumber: 'rc_number',
      pensionCode: 'pension_code',
      nhfCode: 'nhf_code',
      nhisCode: 'nhis_code',
      itfCode: 'itf_code',
      nsitfCode: 'nsitf_code',
      defaultCurrency: 'default_currency',
      payFrequency: 'pay_frequency',
      payrollCutoffDay: 'payroll_cutoff_day',
      payDay: 'pay_day'
    };

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

    // Handle status change to active
    if (req.body.status === 'active') {
      updates.push(`onboarding_completed_at = COALESCE(onboarding_completed_at, NOW())`);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(`
      UPDATE companies
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex} AND deleted_at IS NULL
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update company error:', error);
    res.status(500).json({ success: false, error: 'Failed to update company' });
  }
});

/**
 * DELETE /api/companies/:id
 * Soft delete (offboard) a company
 */
router.delete('/:id', [
  requireConsultant,
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    // Verify consultant owns this company
    const canAccess = await req.canAccessCompany(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(`
      UPDATE companies
      SET deleted_at = NOW(), status = 'offboarded', updated_at = NOW()
      WHERE id = $1 AND consultant_id = $2 AND deleted_at IS NULL
      RETURNING id, legal_name
    `, [id, req.consultant.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    // Log activity
    await query(`
      INSERT INTO activity_feed (consultant_id, company_id, user_id, activity_type, title, actor_type)
      VALUES ($1, $2, $3, 'company_offboarded', $4, 'consultant')
    `, [req.consultant.id, id, req.user.id, `Offboarded company: ${result.rows[0].legal_name}`]);

    res.json({ success: true, message: 'Company offboarded successfully' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete company' });
  }
});

// ============================================================================
// COMPANY ADMIN MANAGEMENT
// ============================================================================

/**
 * GET /api/companies/:id/admins
 * List company admins
 */
router.get('/:id/admins', [
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    const canAccess = await req.canAccessCompany(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await query(`
      SELECT
        ca.id, ca.role, ca.is_primary, ca.created_at,
        u.id as user_id, u.email, u.first_name, u.last_name
      FROM company_admins ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.company_id = $1
      ORDER BY ca.is_primary DESC, u.first_name
    `, [id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List company admins error:', error);
    res.status(500).json({ success: false, error: 'Failed to list admins' });
  }
});

/**
 * POST /api/companies/:id/admins/invite
 * Invite a company admin
 */
router.post('/:id/admins/invite', [
  param('id').isUUID(),
  body('email').isEmail().normalizeEmail(),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('role').optional().isIn(['admin', 'hr_manager', 'payroll_admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { email, firstName, lastName, role = 'hr_manager' } = req.body;

    const canAccess = await req.canAccessCompany(id);
    if (!canAccess) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Get company and consultant info
    const companyResult = await query(
      'SELECT consultant_id FROM companies WHERE id = $1',
      [id]
    );
    const consultantId = companyResult.rows[0].consultant_id;

    // Get consultant's tenant_id
    const consultantResult = await query(
      'SELECT tenant_id FROM consultants WHERE id = $1',
      [consultantId]
    );
    const tenantId = consultantResult.rows[0].tenant_id;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [email, tenantId]
    );

    if (existingUser.rows.length > 0) {
      // Check if already an admin
      const existingAdmin = await query(
        'SELECT id FROM company_admins WHERE company_id = $1 AND user_id = $2',
        [id, existingUser.rows[0].id]
      );

      if (existingAdmin.rows.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'This user is already an admin for this company'
        });
      }
    }

    // Create user invite (reuse existing user_invites table)
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await query(`
      INSERT INTO user_invites (tenant_id, email, role, token, invited_by, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [tenantId, email, role, token, req.user.id, expiresAt]);

    // TODO: Send email with invitation link
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5020'}/accept-invite?token=${token}&company=${id}`;
    console.log('Company admin invitation link:', invitationLink);

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: { email, invitationLink }
    });
  } catch (error) {
    console.error('Invite company admin error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

module.exports = router;
