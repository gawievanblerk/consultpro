/**
 * Standalone Authentication Routes for CoreHR Docker Demo
 * Uses local users table instead of central auth server
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../utils/db');
const { sendPasswordResetEmail } = require('../utils/email');

const JWT_SECRET = process.env.JWT_SECRET || 'corehr_docker_demo_secret_key_2025_standalone';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// POST /api/auth/login - Standalone login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Find user in local users table with tenant name
    const userResult = await pool.query(
      `SELECT u.*, t.name as organization_name
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      org: user.tenant_id,
      role: user.role,
      products: ['corehr'],
      limits: {
        corehr: {
          clients: 1000,
          leads: 5000,
          invoices: 10000,
          staff: 500
        }
      }
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Response format matching what frontend expects
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken: token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name || 'Demo',
          lastName: user.last_name || 'User',
          role: user.role,
          userType: user.user_type || 'consultant',
          organizationId: user.tenant_id,
          organizationName: user.organization_name || 'TeamACE Nigeria',
          products: ['corehr'],
          limits: tokenPayload.limits
        },
        organization: {
          id: user.tenant_id,
          name: user.organization_name || 'TeamACE Nigeria',
          products: ['corehr']
        },
        expiresIn: JWT_EXPIRES_IN
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during login'
    });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user with tenant name
    const userResult = await pool.query(
      `SELECT u.*, t.name as organization_name
       FROM users u
       LEFT JOIN tenants t ON u.tenant_id = t.id
       WHERE u.id = $1 AND u.is_active = true`,
      [decoded.sub]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        userType: user.user_type || 'consultant',
        organizationId: user.tenant_id,
        organizationName: user.organization_name || 'TeamACE Nigeria',
        products: ['corehr'],
        limits: {
          corehr: {
            clients: 1000,
            leads: 5000,
            invoices: 10000,
            staff: 500
          }
        }
      }
    });

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    console.error('Auth me error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

// POST /api/auth/register - Demo registration (for testing)
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Use TeamACE demo tenant
    const tenantId = '11111111-1111-1111-1111-111111111111';

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, tenant_id)
       VALUES ($1, $2, $3, $4, 'user', $5)
       RETURNING id, email, first_name, last_name, role, tenant_id`,
      [email.toLowerCase().trim(), passwordHash, firstName || 'Demo', lastName || 'User', tenantId]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = jwt.sign({
      sub: user.id,
      email: user.email,
      org: user.tenant_id,
      role: user.role,
      products: ['corehr']
    }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.tenant_id,
        organizationName: 'TeamACE Nigeria'
      },
      token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during registration'
    });
  }
});

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, first_name FROM users WHERE email = $1 AND is_active = true',
      [email.toLowerCase().trim()]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent'
      });
    }

    const user = userResult.rows[0];

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate any existing tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );

    // Create new token
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    // Send email
    try {
      await sendPasswordResetEmail(user.email, token, user.first_name);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Still return success - don't expose email sending failures
    }

    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Find valid token
    const tokenResult = await pool.query(
      `SELECT prt.*, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    const resetToken = tokenResult.rows[0];

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, resetToken.user_id]
    );

    // Mark token as used
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
      [resetToken.id]
    );

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

// GET /api/auth/verify-reset-token/:token - Verify reset token is valid
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const tokenResult = await pool.query(
      `SELECT prt.id, u.email
       FROM password_reset_tokens prt
       JOIN users u ON prt.user_id = u.id
       WHERE prt.token = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

    res.json({
      success: true,
      email: tokenResult.rows[0].email
    });

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

// ============================================================================
// User Invitation Routes (Public - no auth required)
// ============================================================================

// GET /api/auth/verify-invite/:token - Verify invite token is valid
router.get('/verify-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const inviteResult = await pool.query(
      `SELECT ui.id, ui.email, ui.role, ui.expires_at, t.name as organization_name
       FROM user_invites ui
       JOIN tenants t ON ui.tenant_id = t.id
       WHERE ui.token = $1
         AND ui.accepted_at IS NULL
         AND ui.expires_at > NOW()`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired invitation'
      });
    }

    const invite = inviteResult.rows[0];
    res.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        organizationName: invite.organization_name,
        expiresAt: invite.expires_at
      }
    });

  } catch (error) {
    console.error('Verify invite token error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

// POST /api/auth/accept-invite - Accept invitation and create account
router.post('/accept-invite', async (req, res) => {
  try {
    const { token, password, firstName, lastName } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Find valid invite
    const inviteResult = await pool.query(
      `SELECT ui.*, t.name as organization_name
       FROM user_invites ui
       JOIN tenants t ON ui.tenant_id = t.id
       WHERE ui.token = $1
         AND ui.accepted_at IS NULL
         AND ui.expires_at > NOW()`,
      [token]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired invitation'
      });
    }

    const invite = inviteResult.rows[0];

    // Check if active user already exists
    const existingActiveUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [invite.email, invite.tenant_id]
    );

    if (existingActiveUser.rows.length > 0) {
      // Mark invite as accepted even if user exists
      await pool.query(
        'UPDATE user_invites SET accepted_at = NOW() WHERE id = $1',
        [invite.id]
      );
      return res.status(400).json({
        success: false,
        error: 'An account with this email already exists'
      });
    }

    // Check if soft-deleted user exists (needs reactivation)
    const existingDeletedUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NOT NULL',
      [invite.email, invite.tenant_id]
    );

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    let user;

    if (existingDeletedUser.rows.length > 0) {
      // Reactivate soft-deleted user
      const reactivateResult = await pool.query(
        `UPDATE users
         SET password_hash = $1,
             first_name = $2,
             last_name = $3,
             role = $4,
             is_active = true,
             deleted_at = NULL,
             updated_at = NOW()
         WHERE id = $5
         RETURNING id, email, first_name, last_name, role, tenant_id`,
        [
          passwordHash,
          firstName || '',
          lastName || '',
          invite.role,
          existingDeletedUser.rows[0].id
        ]
      );
      user = reactivateResult.rows[0];
    } else {
      // Create new user
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, tenant_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         RETURNING id, email, first_name, last_name, role, tenant_id`,
        [
          invite.email,
          passwordHash,
          firstName || '',
          lastName || '',
          invite.role,
          invite.tenant_id
        ]
      );
      user = userResult.rows[0];
    }

    // Mark invite as accepted
    await pool.query(
      'UPDATE user_invites SET accepted_at = NOW() WHERE id = $1',
      [invite.id]
    );

    // Generate JWT token
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      org: user.tenant_id,
      role: user.role,
      products: ['corehr'],
      limits: {
        corehr: {
          clients: 1000,
          leads: 5000,
          invoices: 10000,
          staff: 500
        }
      }
    };

    const jwtToken = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        accessToken: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          organizationId: user.tenant_id,
          organizationName: invite.organization_name,
          products: ['corehr']
        },
        organization: {
          id: user.tenant_id,
          name: invite.organization_name,
          products: ['corehr']
        },
        expiresIn: JWT_EXPIRES_IN
      }
    });

  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred'
    });
  }
});

module.exports = router;
