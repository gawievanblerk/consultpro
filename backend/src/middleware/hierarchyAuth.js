const jwt = require('jsonwebtoken');
const { query } = require('../utils/db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Hierarchy-aware authentication middleware
 * Extends basic auth to include consultant/company/employee context
 */
const authenticateHierarchy = async (req, res, next) => {
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
      decoded = jwt.verify(token, JWT_SECRET);
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

    // Fetch user with hierarchy context
    const result = await query(`
      SELECT
        u.*,
        c.id as consultant_id,
        c.company_name as consultant_name,
        c.tier as consultant_tier,
        c.max_companies,
        c.max_employees_per_company,
        co.id as company_id,
        co.legal_name as company_name,
        e.id as employee_id
      FROM users u
      LEFT JOIN consultants c ON u.consultant_id = c.id
      LEFT JOIN companies co ON u.company_id = co.id
      LEFT JOIN employees e ON u.employee_id = e.id
      WHERE u.id = $1 AND u.is_active = true
    `, [decoded.sub]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'User not found or inactive'
      });
    }

    const user = result.rows[0];

    // Attach full context to request
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      userType: user.user_type || decoded.userType || 'tenant_user'
    };

    // Attach hierarchy context
    req.consultant = user.consultant_id ? {
      id: user.consultant_id,
      name: user.consultant_name,
      tier: user.consultant_tier,
      maxCompanies: user.max_companies,
      maxEmployeesPerCompany: user.max_employees_per_company
    } : null;

    req.company = user.company_id ? {
      id: user.company_id,
      name: user.company_name
    } : null;

    req.employee = user.employee_id ? {
      id: user.employee_id
    } : null;

    // For backward compatibility with tenant-based code
    req.tenant_id = decoded.org || user.tenant_id;

    // Helper methods for access validation
    req.canAccessConsultant = (consultantId) => {
      return req.consultant && req.consultant.id === consultantId;
    };

    req.canAccessCompany = async (companyId) => {
      if (!companyId) return false;

      // If user is directly linked to company
      if (req.company && req.company.id === companyId) return true;

      // If user is a consultant, check if company belongs to them
      if (req.consultant) {
        const companyCheck = await query(
          'SELECT id FROM companies WHERE id = $1 AND consultant_id = $2 AND deleted_at IS NULL',
          [companyId, req.consultant.id]
        );
        return companyCheck.rows.length > 0;
      }

      return false;
    };

    req.canAccessEmployee = async (employeeId) => {
      if (!employeeId) return false;

      // If user is the employee
      if (req.employee && req.employee.id === employeeId) return true;

      // Check through company access
      const employeeResult = await query(
        'SELECT company_id FROM employees WHERE id = $1 AND deleted_at IS NULL',
        [employeeId]
      );

      if (employeeResult.rows.length === 0) return false;

      return req.canAccessCompany(employeeResult.rows[0].company_id);
    };

    next();
  } catch (error) {
    console.error('Hierarchy authentication error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
};

/**
 * Require specific user type
 */
const requireUserType = (...allowedTypes) => {
  return (req, res, next) => {
    if (!req.user || !allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required user type: ${allowedTypes.join(' or ')}`
      });
    }
    next();
  };
};

/**
 * Require consultant access
 */
const requireConsultant = (req, res, next) => {
  if (!req.consultant) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Consultant access required.'
    });
  }
  next();
};

/**
 * Require consultant role
 */
const requireConsultantRole = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.consultant) {
      return res.status(403).json({
        success: false,
        error: 'Consultant access required'
      });
    }

    const result = await query(
      'SELECT role FROM consultant_users WHERE consultant_id = $1 AND user_id = $2',
      [req.consultant.id, req.user.id]
    );

    if (result.rows.length === 0 || !allowedRoles.includes(result.rows[0].role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }

    req.consultantRole = result.rows[0].role;
    next();
  };
};

/**
 * Require company access (either direct or through consultant)
 */
const requireCompanyAccess = (req, res, next) => {
  if (!req.company && !req.consultant) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Company access required.'
    });
  }
  next();
};

/**
 * Extract and validate company context from request
 * For consultants: from query param or body
 * For company admins/employees: from their user record
 */
const extractCompanyContext = async (req, res, next) => {
  try {
    let companyId = req.query.company_id || req.body.company_id || req.params.companyId;

    // If user is directly linked to a company, use that
    if (req.company) {
      companyId = req.company.id;
    }

    if (!companyId && req.consultant) {
      // For consultants, company_id might be required in certain routes
      // Let the route handler decide
      return next();
    }

    if (companyId) {
      // Validate access
      const canAccess = await req.canAccessCompany(companyId);
      if (!canAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this company'
        });
      }

      // Load full company context
      const result = await query(
        'SELECT * FROM companies WHERE id = $1 AND deleted_at IS NULL',
        [companyId]
      );

      if (result.rows.length > 0) {
        req.currentCompany = result.rows[0];
      }
    }

    next();
  } catch (error) {
    console.error('Extract company context error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to load company context'
    });
  }
};

/**
 * Generate JWT token with hierarchy context
 */
const generateHierarchyToken = (user, expiresIn = '24h') => {
  const payload = {
    sub: user.id,
    email: user.email,
    userType: user.user_type || 'tenant_user',
    role: user.role,
    org: user.tenant_id
  };

  if (user.consultant_id) {
    payload.consultantId = user.consultant_id;
  }

  if (user.company_id) {
    payload.companyId = user.company_id;
  }

  if (user.employee_id) {
    payload.employeeId = user.employee_id;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

module.exports = {
  authenticateHierarchy,
  requireUserType,
  requireConsultant,
  requireConsultantRole,
  requireCompanyAccess,
  extractCompanyContext,
  generateHierarchyToken
};
