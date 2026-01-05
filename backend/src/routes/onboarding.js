const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, param, validationResult } = require('express-validator');
const { query, pool } = require('../utils/db');
const { generateHierarchyToken } = require('../middleware/hierarchyAuth');

// ============================================================================
// CONSULTANT ONBOARDING (Public Routes)
// ============================================================================

/**
 * GET /api/onboard/consultant/verify/:token
 * Verify consultant invitation token
 */
router.get('/consultant/verify/:token', [
  param('token').isLength({ min: 64, max: 64 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid token format' });
    }

    const { token } = req.params;

    const result = await query(`
      SELECT id, email, company_name, consultant_type, tier, expires_at, accepted_at
      FROM consultant_invitations
      WHERE token = $1
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    const invitation = result.rows[0];

    if (invitation.accepted_at) {
      return res.status(400).json({
        success: false,
        error: 'This invitation has already been accepted'
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'This invitation has expired. Please contact the administrator for a new invitation.'
      });
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        companyName: invitation.company_name,
        consultantType: invitation.consultant_type,
        tier: invitation.tier
      }
    });
  } catch (error) {
    console.error('Verify consultant token error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

/**
 * POST /api/onboard/consultant/complete
 * Complete consultant registration
 */
router.post('/consultant/complete', [
  body('token').isLength({ min: 64, max: 64 }),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').optional().trim(),
  body('addressLine1').optional().trim(),
  body('addressLine2').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('tin').optional().trim(),
  body('rcNumber').optional().trim()
], async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      token,
      password,
      firstName,
      lastName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      tin,
      rcNumber,
      website,
      primaryColor,
      secondaryColor
    } = req.body;

    await client.query('BEGIN');

    // Validate invitation with lock
    const inviteResult = await client.query(`
      SELECT * FROM consultant_invitations
      WHERE token = $1 AND accepted_at IS NULL
      FOR UPDATE
    `, [token]);

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invalid or already used invitation'
      });
    }

    const invitation = inviteResult.rows[0];

    if (new Date(invitation.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'This invitation has expired'
      });
    }

    // Create tenant
    const tenantSlug = invitation.company_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

    const tenantResult = await client.query(`
      INSERT INTO tenants (name, slug, settings)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [
      invitation.company_name,
      tenantSlug,
      JSON.stringify({ consultantType: invitation.consultant_type })
    ]);

    const tenantId = tenantResult.rows[0].id;

    // Create consultant
    const consultantResult = await client.query(`
      INSERT INTO consultants (
        tenant_id, company_name, consultant_type, tier, email, phone,
        address_line1, address_line2, city, state, country,
        tin, rc_number, website, primary_color, secondary_color,
        provisioned_by, subscription_status, subscription_expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Nigeria',
        $11, $12, $13, $14, $15, $16, 'trial',
        NOW() + INTERVAL '30 days'
      )
      RETURNING id
    `, [
      tenantId,
      invitation.company_name,
      invitation.consultant_type,
      invitation.tier,
      invitation.email,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      tin,
      rcNumber,
      website,
      primaryColor || '#0d2865',
      secondaryColor || '#41d8d1',
      invitation.provisioned_by
    ]);

    const consultantId = consultantResult.rows[0].id;

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await client.query(`
      INSERT INTO users (
        tenant_id, email, password_hash, first_name, last_name,
        role, user_type, consultant_id, is_active
      ) VALUES ($1, $2, $3, $4, $5, 'admin', 'consultant', $6, true)
      RETURNING id, email, first_name, last_name, role, user_type, tenant_id, consultant_id
    `, [tenantId, invitation.email, passwordHash, firstName, lastName, consultantId]);

    const user = userResult.rows[0];

    // Create consultant_users link
    await client.query(`
      INSERT INTO consultant_users (consultant_id, user_id, role, is_primary)
      VALUES ($1, $2, 'owner', true)
    `, [consultantId, user.id]);

    // Mark invitation as accepted
    await client.query(`
      UPDATE consultant_invitations
      SET accepted_at = NOW(), accepted_by_consultant_id = $2
      WHERE id = $1
    `, [invitation.id, consultantId]);

    // Log activity
    await client.query(`
      INSERT INTO activity_feed (consultant_id, user_id, activity_type, title, description, actor_type)
      VALUES ($1, $2, 'consultant_onboarded', 'Consultant account created', $3, 'system')
    `, [consultantId, user.id, `${invitation.company_name} has been onboarded`]);

    await client.query('COMMIT');

    // Generate token
    const authToken = generateHierarchyToken(user);

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          userType: user.user_type
        },
        consultant: {
          id: consultantId,
          name: invitation.company_name,
          tier: invitation.tier
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete consultant registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  } finally {
    client.release();
  }
});

// ============================================================================
// COMPANY ADMIN ONBOARDING (Public Routes)
// ============================================================================

/**
 * GET /api/onboard/company/verify/:token
 * Verify company admin invitation token
 */
router.get('/company/verify/:token', [
  param('token').isLength({ min: 64, max: 64 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid token format' });
    }

    const { token } = req.params;

    const result = await query(`
      SELECT
        ci.*,
        co.legal_name as company_name, co.trading_name,
        con.company_name as consultant_name,
        cl.company_name as client_name
      FROM company_invitations ci
      JOIN companies co ON ci.company_id = co.id
      JOIN consultants con ON ci.consultant_id = con.id
      LEFT JOIN clients cl ON ci.client_id = cl.id
      WHERE ci.token = $1
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    const invitation = result.rows[0];

    if (invitation.accepted_at) {
      return res.status(400).json({
        success: false,
        error: 'This invitation has already been accepted'
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'This invitation has expired. Please contact your HR consultant for a new invitation.'
      });
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        role: invitation.role,
        companyName: invitation.company_name,
        tradingName: invitation.trading_name,
        consultantName: invitation.consultant_name
      }
    });
  } catch (error) {
    console.error('Verify company token error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

/**
 * POST /api/onboard/company/complete
 * Complete company admin registration
 */
router.post('/company/complete', [
  body('token').isLength({ min: 64, max: 64 }),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').optional().trim()
], async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token, password, firstName, lastName, phone } = req.body;

    await client.query('BEGIN');

    // Validate invitation with lock
    const inviteResult = await client.query(`
      SELECT
        ci.*,
        co.legal_name as company_name,
        con.tenant_id
      FROM company_invitations ci
      JOIN companies co ON ci.company_id = co.id
      JOIN consultants con ON ci.consultant_id = con.id
      WHERE ci.token = $1 AND ci.accepted_at IS NULL
      FOR UPDATE
    `, [token]);

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invalid or already used invitation'
      });
    }

    const invitation = inviteResult.rows[0];

    if (new Date(invitation.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'This invitation has expired'
      });
    }

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [invitation.email, invitation.tenant_id]
    );

    let userId;
    const passwordHash = await bcrypt.hash(password, 10);

    // Map invitation role to user role
    const userRole = invitation.role === 'admin' ? 'admin' : 'manager';

    if (existingUser.rows.length > 0) {
      // Update existing user
      userId = existingUser.rows[0].id;

      await client.query(`
        UPDATE users
        SET password_hash = $2,
            first_name = $3,
            last_name = $4,
            phone = $5,
            user_type = 'company_admin',
            company_id = $6,
            consultant_id = $7,
            role = $8,
            is_active = true,
            updated_at = NOW()
        WHERE id = $1
      `, [userId, passwordHash, firstName, lastName, phone, invitation.company_id, invitation.consultant_id, userRole]);
    } else {
      // Create new user
      const userResult = await client.query(`
        INSERT INTO users (
          tenant_id, email, password_hash, first_name, last_name, phone,
          role, user_type, consultant_id, company_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'company_admin', $8, $9, true)
        RETURNING id, email, first_name, last_name, role, user_type, tenant_id, consultant_id, company_id
      `, [
        invitation.tenant_id,
        invitation.email,
        passwordHash,
        firstName,
        lastName,
        phone,
        userRole,
        invitation.consultant_id,
        invitation.company_id
      ]);

      userId = userResult.rows[0].id;
    }

    // Mark invitation as accepted
    await client.query(`
      UPDATE company_invitations
      SET accepted_at = NOW()
      WHERE id = $1
    `, [invitation.id]);

    // Update client onboarding status if linked
    if (invitation.client_id) {
      await client.query(`
        UPDATE clients
        SET onboarding_status = 'active',
            onboarded_at = NOW(),
            onboarded_by = $2,
            updated_at = NOW()
        WHERE id = $1
      `, [invitation.client_id, userId]);
    }

    // Log activity
    await client.query(`
      INSERT INTO activity_feed (consultant_id, company_id, user_id, activity_type, title, description, actor_type)
      VALUES ($1, $2, $3, 'company_admin_onboarded', 'Company admin activated', $4, 'system')
    `, [invitation.consultant_id, invitation.company_id, userId, `${firstName} ${lastName} joined as ${userRole}`]);

    await client.query('COMMIT');

    // Fetch full user for token generation
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // Generate token
    const authToken = generateHierarchyToken(user);

    res.status(201).json({
      success: true,
      message: 'Account activated successfully',
      data: {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          userType: 'company_admin'
        },
        company: {
          id: invitation.company_id,
          name: invitation.company_name
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete company admin registration error:', error);
    res.status(500).json({ success: false, error: error.message || 'Registration failed' });
  } finally {
    client.release();
  }
});

// ============================================================================
// EMPLOYEE ESS ONBOARDING (Public Routes)
// ============================================================================

/**
 * GET /api/onboard/ess/verify/:token
 * Verify employee ESS invitation token
 */
router.get('/ess/verify/:token', [
  param('token').isLength({ min: 64, max: 64 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Invalid token format' });
    }

    const { token } = req.params;

    const result = await query(`
      SELECT
        ei.*,
        e.first_name, e.last_name, e.job_title, e.department,
        c.legal_name as company_name,
        con.company_name as consultant_name
      FROM employee_invitations ei
      JOIN employees e ON ei.employee_id = e.id
      JOIN companies c ON ei.company_id = c.id
      JOIN consultants con ON c.consultant_id = con.id
      WHERE ei.token = $1
    `, [token]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    const invitation = result.rows[0];

    if (invitation.accepted_at) {
      return res.status(400).json({
        success: false,
        error: 'This invitation has already been accepted'
      });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'This invitation has expired. Please contact your HR administrator.'
      });
    }

    res.json({
      success: true,
      data: {
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        jobTitle: invitation.job_title,
        department: invitation.department,
        companyName: invitation.company_name,
        consultantName: invitation.consultant_name
      }
    });
  } catch (error) {
    console.error('Verify ESS token error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

/**
 * POST /api/onboard/ess/complete
 * Complete employee ESS activation
 */
router.post('/ess/complete', [
  body('token').isLength({ min: 64, max: 64 }),
  body('password').isLength({ min: 8 })
], async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { token, password } = req.body;

    await client.query('BEGIN');

    // Validate invitation with lock
    const inviteResult = await client.query(`
      SELECT
        ei.*,
        e.first_name, e.last_name, e.email as employee_email,
        c.consultant_id,
        con.tenant_id
      FROM employee_invitations ei
      JOIN employees e ON ei.employee_id = e.id
      JOIN companies c ON ei.company_id = c.id
      JOIN consultants con ON c.consultant_id = con.id
      WHERE ei.token = $1 AND ei.accepted_at IS NULL
      FOR UPDATE
    `, [token]);

    if (inviteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invalid or already used invitation'
      });
    }

    const invitation = inviteResult.rows[0];

    if (new Date(invitation.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'This invitation has expired'
      });
    }

    // Check if user already exists with this email
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
      [invitation.email, invitation.tenant_id]
    );

    let userId;

    if (existingUser.rows.length > 0) {
      // Update existing user
      userId = existingUser.rows[0].id;
      const passwordHash = await bcrypt.hash(password, 10);

      await client.query(`
        UPDATE users
        SET password_hash = $2,
            user_type = 'employee',
            company_id = $3,
            employee_id = $4,
            consultant_id = $5,
            updated_at = NOW()
        WHERE id = $1
      `, [userId, passwordHash, invitation.company_id, invitation.employee_id, invitation.consultant_id]);
    } else {
      // Create new user
      const passwordHash = await bcrypt.hash(password, 10);

      const userResult = await client.query(`
        INSERT INTO users (
          tenant_id, email, password_hash, first_name, last_name,
          role, user_type, consultant_id, company_id, employee_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, 'user', 'employee', $6, $7, $8, true)
        RETURNING id
      `, [
        invitation.tenant_id,
        invitation.email,
        passwordHash,
        invitation.first_name,
        invitation.last_name,
        invitation.consultant_id,
        invitation.company_id,
        invitation.employee_id
      ]);

      userId = userResult.rows[0].id;
    }

    // Update employee with user_id and ESS status
    await client.query(`
      UPDATE employees
      SET user_id = $2, ess_enabled = true, ess_activated_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `, [invitation.employee_id, userId]);

    // Mark invitation as accepted
    await client.query(`
      UPDATE employee_invitations
      SET accepted_at = NOW()
      WHERE id = $1
    `, [invitation.id]);

    // Log activity
    await client.query(`
      INSERT INTO activity_feed (consultant_id, company_id, user_id, activity_type, title, actor_type, reference_type, reference_id)
      VALUES ($1, $2, $3, 'ess_activated', 'Employee activated self-service', 'employee', 'employee', $4)
    `, [invitation.consultant_id, invitation.company_id, userId, invitation.employee_id]);

    await client.query('COMMIT');

    // Fetch full user for token generation
    const userResult = await query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = userResult.rows[0];

    // Generate token
    const authToken = generateHierarchyToken(user);

    res.status(201).json({
      success: true,
      message: 'Account activated successfully',
      data: {
        token: authToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userType: 'employee'
        }
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Complete ESS activation error:', error);
    res.status(500).json({ success: false, error: 'Activation failed' });
  } finally {
    client.release();
  }
});

module.exports = router;
