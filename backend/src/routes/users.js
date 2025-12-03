/**
 * User Management Routes
 * Admin-only access for managing users within a tenant
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../utils/db');
const auth = require('../middleware/auth');
const tenant = require('../middleware/tenant');
const { sendInviteEmail } = require('../utils/email');

// Apply auth and tenant middleware to all routes
router.use(auth);
router.use(tenant);

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

// GET /api/users - List all users in tenant
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { search, role, status, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT id, email, first_name, last_name, role, is_active,
             last_login, created_at, updated_at
      FROM users
      WHERE tenant_id = $1 AND deleted_at IS NULL
    `;
    const params = [req.tenantId];
    let paramIndex = 2;

    if (search) {
      query += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (role) {
      query += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    if (status === 'active') {
      query += ` AND is_active = true`;
    } else if (status === 'inactive') {
      query += ` AND is_active = false`;
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT id, email, first_name, last_name, role, is_active, last_login, created_at, updated_at',
      'SELECT COUNT(*)'
    );
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: result.rows.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list users'
    });
  }
});

// GET /api/users/:id - Get single user
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, first_name, last_name, role, is_active,
              last_login, created_at, updated_at
       FROM users
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        lastLogin: user.last_login,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
});

// POST /api/users - Create new user
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be: admin, manager, or user'
      });
    }

    // Check if email already exists in tenant
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [email.toLowerCase().trim(), req.tenantId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, tenant_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, email, first_name, last_name, role, is_active, created_at`,
      [
        email.toLowerCase().trim(),
        passwordHash,
        firstName || '',
        lastName || '',
        role,
        req.tenantId
      ]
    );

    const user = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, role, isActive } = req.body;

    // Check user exists and belongs to tenant
    const existingUser = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenantId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Prevent self-demotion from admin
    if (req.params.id === req.user.id && role && role !== 'admin') {
      return res.status(400).json({
        success: false,
        error: 'You cannot change your own admin role'
      });
    }

    // Prevent self-deactivation
    if (req.params.id === req.user.id && isActive === false) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account'
      });
    }

    // Validate role if provided
    if (role) {
      const validRoles = ['admin', 'manager', 'user'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role. Must be: admin, manager, or user'
        });
      }
    }

    // Build update query dynamically
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (firstName !== undefined) {
      updates.push(`first_name = $${paramIndex}`);
      params.push(firstName);
      paramIndex++;
    }

    if (lastName !== undefined) {
      updates.push(`last_name = $${paramIndex}`);
      params.push(lastName);
      paramIndex++;
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);

    params.push(req.params.id);
    params.push(req.tenantId);

    const result = await pool.query(
      `UPDATE users
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
       RETURNING id, email, first_name, last_name, role, is_active, updated_at`,
      params
    );

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        updatedAt: user.updated_at
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// PUT /api/users/:id/password - Reset user password (admin)
router.put('/:id/password', requireAdmin, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      });
    }

    // Check user exists and belongs to tenant
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenantId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3`,
      [passwordHash, req.params.id, req.tenantId]
    );

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

// DELETE /api/users/:id - Soft delete user
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account'
      });
    }

    // Check user exists and belongs to tenant
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenantId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Soft delete
    await pool.query(
      `UPDATE users SET deleted_at = NOW(), is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [req.params.id, req.tenantId]
    );

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// GET /api/users/roles/list - Get available roles
router.get('/roles/list', requireAdmin, async (req, res) => {
  res.json({
    success: true,
    data: [
      { value: 'admin', label: 'Administrator', description: 'Full access to all features including user management' },
      { value: 'manager', label: 'Manager', description: 'Can manage clients, leads, staff, and view reports' },
      { value: 'user', label: 'User', description: 'Basic access to assigned tasks and limited features' }
    ]
  });
});

// ============================================================================
// User Invitations
// ============================================================================

// POST /api/users/invite - Send invitation email
router.post('/invite', requireAdmin, async (req, res) => {
  try {
    const { email, role = 'user' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Validate role
    const validRoles = ['admin', 'manager', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be: admin, manager, or user'
      });
    }

    // Check if email already exists as a user
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [email.toLowerCase().trim(), req.tenantId]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email already exists'
      });
    }

    // Check for existing pending invite
    const existingInvite = await pool.query(
      `SELECT id FROM user_invites
       WHERE email = $1 AND tenant_id = $2 AND accepted_at IS NULL AND expires_at > NOW()`,
      [email.toLowerCase().trim(), req.tenantId]
    );

    if (existingInvite.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'An invitation has already been sent to this email'
      });
    }

    // Get tenant info and inviter name
    const tenantResult = await pool.query(
      'SELECT name FROM tenants WHERE id = $1',
      [req.tenantId]
    );
    const organizationName = tenantResult.rows[0]?.name || 'ConsultPro';

    const inviterName = req.user.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : req.user.email;

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invite
    const result = await pool.query(
      `INSERT INTO user_invites (tenant_id, email, role, token, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, expires_at, created_at`,
      [req.tenantId, email.toLowerCase().trim(), role, token, req.user.id, expiresAt]
    );

    // Send invitation email
    try {
      await sendInviteEmail(email, token, inviterName, organizationName, role);
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Delete the invite if email fails
      await pool.query('DELETE FROM user_invites WHERE id = $1', [result.rows[0].id]);
      return res.status(500).json({
        success: false,
        error: 'Failed to send invitation email'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        role: result.rows[0].role,
        expiresAt: result.rows[0].expires_at,
        createdAt: result.rows[0].created_at
      }
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send invitation'
    });
  }
});

// GET /api/users/invites - List pending invitations
router.get('/invites', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ui.id, ui.email, ui.role, ui.expires_at, ui.created_at,
              u.first_name as inviter_first_name, u.last_name as inviter_last_name
       FROM user_invites ui
       LEFT JOIN users u ON ui.invited_by = u.id
       WHERE ui.tenant_id = $1 AND ui.accepted_at IS NULL
       ORDER BY ui.created_at DESC`,
      [req.tenantId]
    );

    res.json({
      success: true,
      data: result.rows.map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expiresAt: invite.expires_at,
        createdAt: invite.created_at,
        invitedBy: invite.inviter_first_name
          ? `${invite.inviter_first_name} ${invite.inviter_last_name || ''}`.trim()
          : 'Unknown',
        isExpired: new Date(invite.expires_at) < new Date()
      }))
    });

  } catch (error) {
    console.error('Error listing invitations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list invitations'
    });
  }
});

// DELETE /api/users/invites/:id - Cancel/delete an invitation
router.delete('/invites/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM user_invites WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [req.params.id, req.tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    res.json({
      success: true,
      message: 'Invitation cancelled'
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel invitation'
    });
  }
});

// POST /api/users/invites/:id/resend - Resend an invitation
router.post('/invites/:id/resend', requireAdmin, async (req, res) => {
  try {
    // Get the invite
    const inviteResult = await pool.query(
      `SELECT ui.*, t.name as organization_name
       FROM user_invites ui
       JOIN tenants t ON ui.tenant_id = t.id
       WHERE ui.id = $1 AND ui.tenant_id = $2 AND ui.accepted_at IS NULL`,
      [req.params.id, req.tenantId]
    );

    if (inviteResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invitation not found'
      });
    }

    const invite = inviteResult.rows[0];

    // Generate new token and extend expiry
    const newToken = crypto.randomBytes(32).toString('hex');
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE user_invites SET token = $1, expires_at = $2 WHERE id = $3',
      [newToken, newExpiresAt, invite.id]
    );

    const inviterName = req.user.firstName
      ? `${req.user.firstName} ${req.user.lastName || ''}`.trim()
      : req.user.email;

    // Resend email
    try {
      await sendInviteEmail(invite.email, newToken, inviterName, invite.organization_name, invite.role);
    } catch (emailError) {
      console.error('Failed to resend invitation email:', emailError);
      return res.status(500).json({
        success: false,
        error: 'Failed to send invitation email'
      });
    }

    res.json({
      success: true,
      message: 'Invitation resent successfully'
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend invitation'
    });
  }
});

module.exports = router;
