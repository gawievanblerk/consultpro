const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

// Use separate secret for super admin tokens
const SUPERADMIN_JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || process.env.JWT_SECRET || 'superadmin-secret-key';
const SUPERADMIN_JWT_EXPIRES = process.env.SUPERADMIN_JWT_EXPIRES || '8h';

/**
 * Authenticate Super Admin
 * Validates JWT token and attaches superadmin to request
 */
const authenticateSuperadmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'No authorization token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, SUPERADMIN_JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token has expired'
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    // Verify this is a superadmin token
    if (!decoded.isSuperAdmin || decoded.userType !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Super admin privileges required.'
      });
    }

    // Fetch superadmin from database
    const result = await query(
      'SELECT id, email, first_name, last_name, is_active FROM superadmins WHERE id = $1',
      [decoded.sub]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Super admin not found'
      });
    }

    const superadmin = result.rows[0];

    if (!superadmin.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Super admin account is deactivated'
      });
    }

    // Attach superadmin to request
    req.superadmin = superadmin;
    req.isSuperAdmin = true;

    next();
  } catch (error) {
    console.error('Super admin authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Generate Super Admin JWT Token
 */
const generateSuperadminToken = (superadmin) => {
  return jwt.sign(
    {
      sub: superadmin.id,
      email: superadmin.email,
      userType: 'superadmin',
      isSuperAdmin: true
    },
    SUPERADMIN_JWT_SECRET,
    { expiresIn: SUPERADMIN_JWT_EXPIRES }
  );
};

/**
 * Login Super Admin
 * Validates credentials and returns JWT token
 */
const loginSuperadmin = async (email, password) => {
  const bcrypt = require('bcryptjs');

  const result = await query(
    'SELECT * FROM superadmins WHERE email = $1',
    [email.toLowerCase()]
  );

  if (result.rows.length === 0) {
    return { success: false, error: 'Invalid credentials' };
  }

  const superadmin = result.rows[0];

  if (!superadmin.is_active) {
    return { success: false, error: 'Account is deactivated' };
  }

  const isValidPassword = await bcrypt.compare(password, superadmin.password_hash);

  if (!isValidPassword) {
    return { success: false, error: 'Invalid credentials' };
  }

  // Update login stats
  await query(
    `UPDATE superadmins
     SET last_login = NOW(), login_count = COALESCE(login_count, 0) + 1, updated_at = NOW()
     WHERE id = $1`,
    [superadmin.id]
  );

  const token = generateSuperadminToken(superadmin);

  return {
    success: true,
    token,
    superadmin: {
      id: superadmin.id,
      email: superadmin.email,
      firstName: superadmin.first_name,
      lastName: superadmin.last_name
    }
  };
};

/**
 * Log Super Admin Action
 * Records all superadmin actions for audit trail
 */
const logSuperadminAction = async (superadminId, action, entityType, entityId, details, req) => {
  try {
    await query(
      `INSERT INTO superadmin_audit_logs
       (superadmin_id, action, entity_type, entity_id, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        superadminId,
        action,
        entityType,
        entityId,
        JSON.stringify(details || {}),
        req?.ip || req?.connection?.remoteAddress || null,
        req?.headers?.['user-agent'] || null
      ]
    );
  } catch (error) {
    console.error('Failed to log superadmin action:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
};

module.exports = {
  authenticateSuperadmin,
  generateSuperadminToken,
  loginSuperadmin,
  logSuperadminAction,
  SUPERADMIN_JWT_SECRET
};
