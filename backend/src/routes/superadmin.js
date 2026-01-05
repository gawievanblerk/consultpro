const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, param, query: queryValidator, validationResult } = require('express-validator');
const { query } = require('../utils/db');
const {
  authenticateSuperadmin,
  loginSuperadmin,
  logSuperadminAction
} = require('../middleware/superadminAuth');
const { sendConsultantInviteEmail } = require('../utils/email');

// ============================================================================
// AUTHENTICATION ROUTES
// ============================================================================

/**
 * POST /api/superadmin/auth/login
 * Super admin login
 */
router.post('/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await loginSuperadmin(email, password);

    if (!result.success) {
      return res.status(401).json({ success: false, error: result.error });
    }

    // Log the login
    await logSuperadminAction(result.superadmin.id, 'login', 'superadmin', result.superadmin.id, {}, req);

    res.json(result);
  } catch (error) {
    console.error('Super admin login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

/**
 * GET /api/superadmin/auth/me
 * Get current super admin profile
 */
router.get('/auth/me', authenticateSuperadmin, async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.superadmin
    });
  } catch (error) {
    console.error('Get super admin profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to get profile' });
  }
});

// ============================================================================
// DASHBOARD ROUTES
// ============================================================================

/**
 * GET /api/superadmin/dashboard
 * Platform overview statistics
 */
router.get('/dashboard', authenticateSuperadmin, async (req, res) => {
  try {
    // Get consultant counts
    const consultantsResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE subscription_status = 'active') as active,
        COUNT(*) FILTER (WHERE subscription_status = 'trial') as trial,
        COUNT(*) FILTER (WHERE subscription_status = 'suspended') as suspended
      FROM consultants
    `);

    // Get company counts
    const companiesResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'onboarding') as onboarding
      FROM companies WHERE deleted_at IS NULL
    `);

    // Get employee counts
    const employeesResult = await query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ess_enabled = true) as ess_enabled
      FROM employees WHERE deleted_at IS NULL
    `);

    // Get recent activity
    const recentActivityResult = await query(`
      SELECT action, entity_type, created_at, details
      FROM superadmin_audit_logs
      ORDER BY created_at DESC
      LIMIT 10
    `);

    // Get consultants by tier
    const tierBreakdownResult = await query(`
      SELECT tier, COUNT(*) as count
      FROM consultants
      WHERE is_active = true
      GROUP BY tier
    `);

    res.json({
      success: true,
      data: {
        consultants: consultantsResult.rows[0],
        companies: companiesResult.rows[0],
        employees: employeesResult.rows[0],
        recentActivity: recentActivityResult.rows,
        tierBreakdown: tierBreakdownResult.rows
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to load dashboard' });
  }
});

// ============================================================================
// CONSULTANT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/superadmin/consultants
 * List all consultants with filtering and pagination
 */
router.get('/consultants', authenticateSuperadmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      tier,
      type,
      search
    } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND subscription_status = $${paramIndex++}`;
      params.push(status);
    }

    if (tier) {
      whereClause += ` AND tier = $${paramIndex++}`;
      params.push(tier);
    }

    if (type) {
      whereClause += ` AND consultant_type = $${paramIndex++}`;
      params.push(type);
    }

    if (search) {
      whereClause += ` AND (company_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM consultants ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get consultants
    params.push(limit, offset);
    const result = await query(`
      SELECT
        c.*,
        (SELECT COUNT(*) FROM companies WHERE consultant_id = c.id AND deleted_at IS NULL) as company_count,
        (SELECT COUNT(*) FROM employees e
         JOIN companies co ON e.company_id = co.id
         WHERE co.consultant_id = c.id AND e.deleted_at IS NULL) as employee_count
      FROM consultants c
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
    console.error('List consultants error:', error);
    res.status(500).json({ success: false, error: 'Failed to list consultants' });
  }
});

/**
 * GET /api/superadmin/consultants/:id
 * Get consultant details
 */
router.get('/consultants/:id', [
  authenticateSuperadmin,
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT
        c.*,
        s.first_name as provisioned_by_first_name,
        s.last_name as provisioned_by_last_name
      FROM consultants c
      LEFT JOIN superadmins s ON c.provisioned_by = s.id
      WHERE c.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consultant not found' });
    }

    // Get consultant users
    const usersResult = await query(`
      SELECT u.id, u.email, u.first_name, u.last_name, cu.role, cu.is_primary
      FROM consultant_users cu
      JOIN users u ON cu.user_id = u.id
      WHERE cu.consultant_id = $1
      ORDER BY cu.is_primary DESC, u.first_name
    `, [id]);

    // Get companies
    const companiesResult = await query(`
      SELECT id, legal_name, status, industry, created_at,
        (SELECT COUNT(*) FROM employees WHERE company_id = companies.id AND deleted_at IS NULL) as employee_count
      FROM companies
      WHERE consultant_id = $1 AND deleted_at IS NULL
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        users: usersResult.rows,
        companies: companiesResult.rows
      }
    });
  } catch (error) {
    console.error('Get consultant error:', error);
    res.status(500).json({ success: false, error: 'Failed to get consultant' });
  }
});

/**
 * POST /api/superadmin/consultants/invite
 * Send invitation to new consultant
 */
router.post('/consultants/invite', [
  authenticateSuperadmin,
  body('email').isEmail().normalizeEmail(),
  body('companyName').notEmpty().trim(),
  body('tier').optional().isIn(['starter', 'professional', 'enterprise']),
  body('consultantType').optional().isIn(['HR', 'Tax', 'Legal'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      email,
      companyName,
      tier = 'starter',
      consultantType = 'HR'
    } = req.body;

    // Check if consultant already exists
    const existingConsultant = await query(
      'SELECT id FROM consultants WHERE email = $1',
      [email]
    );

    if (existingConsultant.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A consultant with this email already exists'
      });
    }

    // Check for pending invitation
    const existingInvite = await query(
      `SELECT id FROM consultant_invitations
       WHERE email = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
      [email]
    );

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'An invitation is already pending for this email'
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation
    const result = await query(`
      INSERT INTO consultant_invitations
      (email, company_name, consultant_type, tier, token, expires_at, sent_at, provisioned_by)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)
      RETURNING *
    `, [email, companyName, consultantType, tier, token, expiresAt, req.superadmin.id]);

    // Log action
    await logSuperadminAction(
      req.superadmin.id,
      'invite_consultant',
      'consultant_invitation',
      result.rows[0].id,
      { email, companyName, tier, consultantType },
      req
    );

    // Send invitation email
    const invitationLink = `${process.env.FRONTEND_URL || 'https://corehr.africa'}/onboard/consultant?token=${token}`;
    console.log('Consultant invitation link:', invitationLink);

    try {
      await sendConsultantInviteEmail(email, token, companyName, tier);
      console.log('Consultant invitation email sent to:', email);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Continue even if email fails - invitation is still created
    }

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        id: result.rows[0].id,
        email,
        companyName,
        expiresAt,
        invitationLink // Include for testing/debugging
      }
    });
  } catch (error) {
    console.error('Invite consultant error:', error);
    res.status(500).json({ success: false, error: 'Failed to send invitation' });
  }
});

/**
 * PUT /api/superadmin/consultants/:id
 * Update consultant details
 */
router.put('/consultants/:id', [
  authenticateSuperadmin,
  param('id').isUUID(),
  body('tier').optional().isIn(['starter', 'professional', 'enterprise']),
  body('maxCompanies').optional().isInt({ min: 1 }),
  body('maxEmployeesPerCompany').optional().isInt({ min: 1 }),
  body('subscriptionStatus').optional().isIn(['trial', 'active', 'suspended', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const {
      tier,
      maxCompanies,
      maxEmployeesPerCompany,
      subscriptionStatus,
      notes
    } = req.body;

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (tier) {
      updates.push(`tier = $${paramIndex++}`);
      params.push(tier);
    }
    if (maxCompanies) {
      updates.push(`max_companies = $${paramIndex++}`);
      params.push(maxCompanies);
    }
    if (maxEmployeesPerCompany) {
      updates.push(`max_employees_per_company = $${paramIndex++}`);
      params.push(maxEmployeesPerCompany);
    }
    if (subscriptionStatus) {
      updates.push(`subscription_status = $${paramIndex++}`);
      params.push(subscriptionStatus);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(`
      UPDATE consultants
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consultant not found' });
    }

    // Log action
    await logSuperadminAction(
      req.superadmin.id,
      'update_consultant',
      'consultant',
      id,
      req.body,
      req
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Update consultant error:', error);
    res.status(500).json({ success: false, error: 'Failed to update consultant' });
  }
});

/**
 * PUT /api/superadmin/consultants/:id/suspend
 * Suspend a consultant
 */
router.put('/consultants/:id/suspend', [
  authenticateSuperadmin,
  param('id').isUUID(),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const result = await query(`
      UPDATE consultants
      SET subscription_status = 'suspended',
          notes = COALESCE(notes, '') || E'\n[SUSPENDED] ' || $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, reason || 'No reason provided']);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consultant not found' });
    }

    // Log action
    await logSuperadminAction(
      req.superadmin.id,
      'suspend_consultant',
      'consultant',
      id,
      { reason },
      req
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Suspend consultant error:', error);
    res.status(500).json({ success: false, error: 'Failed to suspend consultant' });
  }
});

/**
 * PUT /api/superadmin/consultants/:id/activate
 * Activate a suspended consultant
 */
router.put('/consultants/:id/activate', [
  authenticateSuperadmin,
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      UPDATE consultants
      SET subscription_status = 'active',
          is_active = true,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consultant not found' });
    }

    // Log action
    await logSuperadminAction(
      req.superadmin.id,
      'activate_consultant',
      'consultant',
      id,
      {},
      req
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Activate consultant error:', error);
    res.status(500).json({ success: false, error: 'Failed to activate consultant' });
  }
});

// ============================================================================
// INVITATION MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /api/superadmin/invitations
 * List all pending consultant invitations
 */
router.get('/invitations', authenticateSuperadmin, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    let whereClause = '';
    if (status === 'pending') {
      whereClause = 'WHERE accepted_at IS NULL AND expires_at > NOW()';
    } else if (status === 'expired') {
      whereClause = 'WHERE accepted_at IS NULL AND expires_at <= NOW()';
    } else if (status === 'accepted') {
      whereClause = 'WHERE accepted_at IS NOT NULL';
    }

    const result = await query(`
      SELECT ci.*, s.first_name as provisioned_by_first_name, s.last_name as provisioned_by_last_name
      FROM consultant_invitations ci
      LEFT JOIN superadmins s ON ci.provisioned_by = s.id
      ${whereClause}
      ORDER BY ci.created_at DESC
    `);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('List invitations error:', error);
    res.status(500).json({ success: false, error: 'Failed to list invitations' });
  }
});

/**
 * DELETE /api/superadmin/invitations/:id
 * Cancel a pending invitation
 */
router.delete('/invitations/:id', [
  authenticateSuperadmin,
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      'DELETE FROM consultant_invitations WHERE id = $1 AND accepted_at IS NULL RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found or already accepted'
      });
    }

    // Log action
    await logSuperadminAction(
      req.superadmin.id,
      'cancel_invitation',
      'consultant_invitation',
      id,
      { email: result.rows[0].email },
      req
    );

    res.json({ success: true, message: 'Invitation cancelled' });
  } catch (error) {
    console.error('Cancel invitation error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel invitation' });
  }
});

/**
 * POST /api/superadmin/invitations/:id/resend
 * Resend an invitation with new token
 */
router.post('/invitations/:id/resend', [
  authenticateSuperadmin,
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;

    // Generate new token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const result = await query(`
      UPDATE consultant_invitations
      SET token = $2, expires_at = $3, sent_at = NOW()
      WHERE id = $1 AND accepted_at IS NULL
      RETURNING *
    `, [id, token, expiresAt]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found or already accepted'
      });
    }

    // Log action
    await logSuperadminAction(
      req.superadmin.id,
      'resend_invitation',
      'consultant_invitation',
      id,
      { email: result.rows[0].email },
      req
    );

    // TODO: Send email
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:5020'}/onboard/consultant?token=${token}`;
    console.log('Resent invitation link:', invitationLink);

    res.json({
      success: true,
      message: 'Invitation resent',
      data: { ...result.rows[0], invitationLink }
    });
  } catch (error) {
    console.error('Resend invitation error:', error);
    res.status(500).json({ success: false, error: 'Failed to resend invitation' });
  }
});

// ============================================================================
// AUDIT LOG ROUTES
// ============================================================================

/**
 * GET /api/superadmin/audit-logs
 * Get audit logs with filtering
 */
router.get('/audit-logs', authenticateSuperadmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, entityType } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (action) {
      whereClause += ` AND action = $${paramIndex++}`;
      params.push(action);
    }

    if (entityType) {
      whereClause += ` AND entity_type = $${paramIndex++}`;
      params.push(entityType);
    }

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM superadmin_audit_logs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Get logs
    params.push(limit, offset);
    const result = await query(`
      SELECT sal.*, s.email as superadmin_email, s.first_name, s.last_name
      FROM superadmin_audit_logs sal
      LEFT JOIN superadmins s ON sal.superadmin_id = s.id
      ${whereClause}
      ORDER BY sal.created_at DESC
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
    console.error('Get audit logs error:', error);
    res.status(500).json({ success: false, error: 'Failed to get audit logs' });
  }
});

// ============================================================================
// IMPERSONATION ROUTES
// ============================================================================

/**
 * POST /api/superadmin/consultants/:id/impersonate
 * Generate impersonation token for a consultant
 */
router.post('/consultants/:id/impersonate', [
  authenticateSuperadmin,
  param('id').isUUID()
], async (req, res) => {
  try {
    const { id } = req.params;
    const jwt = require('jsonwebtoken');

    // Get consultant details
    const consultantResult = await query(
      'SELECT id, company_name, email FROM consultants WHERE id = $1',
      [id]
    );

    if (consultantResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Consultant not found' });
    }

    const consultant = consultantResult.rows[0];

    // Get primary user for this consultant
    const userResult = await query(`
      SELECT u.id, u.email, u.first_name, u.last_name, u.user_type
      FROM users u
      JOIN consultant_users cu ON u.id = cu.user_id
      WHERE cu.consultant_id = $1 AND cu.is_primary = true
      LIMIT 1
    `, [id]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No primary user found for this consultant. They may not have completed onboarding.'
      });
    }

    const user = userResult.rows[0];

    // Generate impersonation token (short-lived, 1 hour)
    // Must match auth.js expected fields: sub, email, org, role, user_type
    const impersonationToken = jwt.sign(
      {
        sub: user.id,
        email: user.email,
        org: id, // consultant_id is the tenant (org)
        role: 'admin',
        user_type: user.user_type || 'consultant',
        isImpersonation: true,
        impersonatedBy: {
          id: req.superadmin.id,
          email: req.superadmin.email,
          name: `${req.superadmin.first_name} ${req.superadmin.last_name}`
        }
      },
      process.env.JWT_SECRET || 'corehr_docker_demo_secret_key_2025_standalone',
      { expiresIn: '1h' }
    );

    // Log the impersonation action
    await logSuperadminAction(
      req.superadmin.id,
      'impersonate_consultant',
      'consultant',
      id,
      {
        consultantEmail: consultant.email,
        consultantCompany: consultant.company_name,
        impersonatedUserId: user.id,
        impersonatedUserEmail: user.email
      },
      req
    );

    res.json({
      success: true,
      data: {
        token: impersonationToken,
        consultant: {
          id: consultant.id,
          email: consultant.email,
          companyName: consultant.company_name
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        },
        redirectUrl: `/dashboard?impersonate=${impersonationToken}`
      }
    });
  } catch (error) {
    console.error('Impersonate consultant error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate impersonation token' });
  }
});

/**
 * GET /api/superadmin/impersonations
 * Get impersonation audit logs
 */
router.get('/impersonations', authenticateSuperadmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT sal.*, s.email as superadmin_email, s.first_name, s.last_name
      FROM superadmin_audit_logs sal
      LEFT JOIN superadmins s ON sal.superadmin_id = s.id
      WHERE sal.action = 'impersonate_consultant'
      ORDER BY sal.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query(
      "SELECT COUNT(*) FROM superadmin_audit_logs WHERE action = 'impersonate_consultant'"
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get impersonations error:', error);
    res.status(500).json({ success: false, error: 'Failed to get impersonation logs' });
  }
});

module.exports = router;
