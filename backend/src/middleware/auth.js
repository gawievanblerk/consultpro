const jwt = require('jsonwebtoken');

const DEMO_MODE = process.env.DEMO_MODE === 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'consultpro_docker_demo_secret_key_2025_standalone';

/**
 * Authentication middleware for ConsultPro
 * Validates JWT token and attaches user data to request
 * In DEMO_MODE, validates JWT locally without external auth server
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
          products: decoded.products || ['consultpro'],
          limits: decoded.limits || {
            consultpro: {
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
