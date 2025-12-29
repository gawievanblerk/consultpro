require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authenticate = require('./middleware/auth');
const tenantMiddleware = require('./middleware/tenant');
const pool = require('./utils/db');
const { geoMiddleware } = require('./utils/geo');

const app = express();
const PORT = process.env.PORT || 4020;
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// CORS - allow all origins for now
app.use(cors());
app.options('*', cors());

// Helmet with relaxed settings
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Make pool available to routes
app.set('pool', pool);

// Health endpoint (BEFORE auth middleware)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'corehr-backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// ============================================================================
// Public Routes (No auth required)
// ============================================================================

// Geo detection endpoint for currency selection
app.get('/api/geo', geoMiddleware, (req, res) => {
  res.json({
    success: true,
    data: req.geo
  });
});

// Public plans/pricing endpoint
app.get('/api/plans', (req, res) => {
  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for small consulting practices',
      price_usd: 49,
      price_zar: 899,
      price_ngn: 75000,
      price_usd_yearly: 470,
      price_zar_yearly: 8630,
      price_ngn_yearly: 720000,
      max_clients: 50,
      max_users: 3,
      features: ['Basic CRM', 'Invoice generation', 'Email support']
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For growing consulting firms',
      price_usd: 149,
      price_zar: 2699,
      price_ngn: 225000,
      price_usd_yearly: 1430,
      price_zar_yearly: 25910,
      price_ngn_yearly: 2160000,
      max_clients: -1, // unlimited
      max_users: 10,
      popular: true,
      features: ['Full CRM & BD tools', 'HR management', 'Financial reporting', 'Priority support']
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      price_usd: 399,
      price_zar: 7199,
      price_ngn: 600000,
      price_usd_yearly: 3830,
      price_zar_yearly: 69110,
      price_ngn_yearly: 5760000,
      max_clients: -1,
      max_users: -1,
      features: ['Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'On-premise option']
    }
  ];

  res.json({
    success: true,
    data: plans
  });
});

// ============================================================================
// Auth Routes (Standalone for Docker Demo)
// ============================================================================
if (DEMO_MODE) {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('Running in DEMO_MODE - using standalone authentication');
} else {
  console.log('SSO mode not implemented - use DEMO_MODE=true');
}

// ============================================================================
// Super Admin Routes (Separate auth - platform level)
// ============================================================================
app.use('/api/superadmin', require('./routes/superadmin'));

// ============================================================================
// Public Onboarding Routes (No auth required)
// ============================================================================
app.use('/api/onboard', require('./routes/onboarding'));

// ============================================================================
// Apply auth middleware to all other /api routes
// ============================================================================
app.use('/api', authenticate, tenantMiddleware);

// ============================================================================
// Dashboard Routes (aggregated stats)
// ============================================================================
app.use('/api/dashboard', require('./routes/dashboard'));

// ============================================================================
// CRM Module Routes (Module 1.1)
// ============================================================================
app.use('/api/clients', require('./routes/clients'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/engagements', require('./routes/engagements'));
app.use('/api/documents', require('./routes/documents'));
app.use('/api/activities', require('./routes/activities'));

// ============================================================================
// Business Development Module Routes (Module 1.2)
// ============================================================================
app.use('/api/leads', require('./routes/leads'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/proposals', require('./routes/proposals'));
app.use('/api/opportunities', require('./routes/opportunities'));

// ============================================================================
// HR Outsourcing Module Routes (Module 1.3)
// ============================================================================
app.use('/api/staff', require('./routes/staff'));
app.use('/api/deployments', require('./routes/deployments'));

// ============================================================================
// Finance Module Routes (Module 1.4)
// ============================================================================
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));

// ============================================================================
// Collaboration Module Routes (Module 1.5)
// ============================================================================
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/audit', require('./routes/audit'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/approvals', require('./routes/approvals'));

// ============================================================================
// Admin/Settings Routes
// ============================================================================
app.use('/api/users', require('./routes/users'));

// ============================================================================
// CoreHR Hierarchy Routes (Consultant → Company → Employee)
// ============================================================================
app.use('/api/companies', require('./routes/companies'));
app.use('/api/employees', require('./routes/employees'));

// ============================================================================
// Error Handlers
// ============================================================================

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server only if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`CoreHR Backend running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Demo Mode: ${DEMO_MODE}`);
    console.log(`   Database: ${process.env.DATABASE_NAME || 'corehr_dev'}`);
  });
}

module.exports = app;
