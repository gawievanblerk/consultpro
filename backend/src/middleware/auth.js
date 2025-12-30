const jwt = require('jsonwebtoken');
const pool = require('../utils/db');

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'corehr_docker_demo_secret_key_2025_standalone';

/**
 * Authentication middleware for CoreHR
 * Validates JWT token and attaches user data to request
 * In DEMO_MODE, validates JWT locally without external auth server
 *
 * User Types Hierarchy:
 * 1. superadmin - Platform admin (all tenants)
 * 2. consultant - HR consulting firm admin (all client companies)
 * 3. staff - Consultant's deployed worker (deployed companies only)
 * 4. company_admin - Company's own HR admin (own company only)
 * 5. employee - Company employee (self-service only)
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'No authorization header provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'No token provided'
      });
    }

    let user;

    if (DEMO_MODE) {
      // Standalone JWT verification for Docker demo
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        user = {
          id: decoded.sub,
          email: decoded.email,
          org: decoded.org,
          role: decoded.role,
          user_type: decoded.user_type || 'consultant',  // Default for backwards compatibility
          company_id: decoded.company_id || null,
          employee_id: decoded.employee_id || null,
          staff_id: decoded.staff_id || null,
          products: decoded.products || ['corehr'],
          limits: decoded.limits || {
            corehr: {
              clients: 1000,
              leads: 5000,
              invoices: 10000,
              staff: 500
            }
          }
        };
      } catch (jwtError) {
        console.error('JWT verification failed:', jwtError.message);
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token'
        });
      }
    } else {
      // For future SSO integration with auth server
      return res.status(500).json({
        success: false,
        error: 'SSO mode not implemented - use DEMO_MODE=true'
      });
    }

    // Attach user data to request
    req.user = user;
    req.tenant_id = user.org;

    // For staff users, fetch their deployed company IDs
    if (user.user_type === 'staff' && user.staff_id) {
      try {
        const deployments = await pool.query(`
          SELECT company_id, access_type FROM staff_company_access
          WHERE staff_id = $1 AND status = 'active'
          AND (end_date IS NULL OR end_date >= CURRENT_DATE)
        `, [user.staff_id]);

        req.deployedCompanyIds = deployments.rows.map(d => d.company_id);
        req.deployedCompanies = deployments.rows;
      } catch (err) {
        // Table might not exist yet, default to empty
        req.deployedCompanyIds = [];
        req.deployedCompanies = [];
      }
    }

    // Helper: Can this user access this company?
    req.canAccessCompany = (companyId) => {
      if (!companyId) return false;
      if (user.user_type === 'consultant') return true; // All under consultant
      if (user.user_type === 'staff') return req.deployedCompanyIds?.includes(companyId);
      if (user.user_type === 'company_admin') return user.company_id === companyId;
      if (user.user_type === 'employee') return user.company_id === companyId;
      return false;
    };

    // Helper: Is this user an admin (consultant, staff with deployment, or company_admin)?
    req.isAdmin = () => {
      return ['consultant', 'staff', 'company_admin'].includes(user.user_type);
    };

    // Helper: Can this user manage employees?
    req.canManageEmployees = (companyId) => {
      if (user.user_type === 'consultant') return true;
      if (user.user_type === 'staff') return req.deployedCompanyIds?.includes(companyId);
      if (user.user_type === 'company_admin') return user.company_id === companyId;
      return false;
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message: error.message
    });
  }
}

module.exports = authenticate;
