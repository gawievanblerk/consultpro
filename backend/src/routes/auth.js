/**
 * Standalone Authentication Routes for ConsultPro Docker Demo
 * Uses local users table instead of central auth server
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'consultpro_docker_demo_secret_key_2025_standalone';
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
      products: ['consultpro'],
      limits: {
        consultpro: {
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
          organizationId: user.tenant_id,
          organizationName: user.organization_name || 'TeamACE Nigeria',
          products: ['consultpro'],
          limits: tokenPayload.limits
        },
        organization: {
          id: user.tenant_id,
          name: user.organization_name || 'TeamACE Nigeria',
          products: ['consultpro']
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
        organizationId: user.tenant_id,
        organizationName: user.organization_name || 'TeamACE Nigeria',
        products: ['consultpro'],
        limits: {
          consultpro: {
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
      products: ['consultpro']
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

module.exports = router;
