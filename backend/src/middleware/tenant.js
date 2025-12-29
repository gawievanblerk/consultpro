/**
 * Tenant middleware for CoreHR
 * Ensures tenant_id is available for all database queries
 * Must be applied AFTER authentication middleware
 */
function tenantMiddleware(req, res, next) {
  if (!req.tenant_id) {
    return res.status(400).json({
      success: false,
      error: 'Tenant ID not found in request'
    });
  }

  // Tenant ID is already set by auth middleware
  // This middleware just validates it's present
  next();
}

module.exports = tenantMiddleware;
