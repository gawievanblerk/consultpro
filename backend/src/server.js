require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authenticate = require('./middleware/auth');
const tenantMiddleware = require('./middleware/tenant');
const pool = require('./utils/db');

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
    service: 'consultpro-backend',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
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
    console.log(`ConsultPro Backend running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Demo Mode: ${DEMO_MODE}`);
    console.log(`   Database: ${process.env.DATABASE_NAME || 'consultpro_dev'}`);
  });
}

module.exports = app;
