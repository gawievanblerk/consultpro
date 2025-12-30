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
// Temporary: Seed Employee User (for testing)
// ============================================================================
app.get('/seed-employee-user', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const passwordHash = await bcrypt.hash('Demo123!', 10);
    const tenantId = '11111111-1111-1111-1111-111111111111';

    // Get or create consultant for TeamACE tenant
    let consultantResult = await pool.query(`
      SELECT id FROM consultants WHERE tenant_id = $1 LIMIT 1
    `, [tenantId]);

    let consultantId;
    if (consultantResult.rows.length === 0) {
      // Create consultant
      const newConsultantId = uuidv4();
      await pool.query(`
        INSERT INTO consultants (id, tenant_id, company_name, trading_name, email, tier, subscription_status)
        VALUES ($1, $2, 'TeamACE HR Consulting', 'TeamACE HR', 'consulting@teamace.ng', 'professional', 'active')
      `, [newConsultantId, tenantId]);
      consultantId = newConsultantId;
    } else {
      consultantId = consultantResult.rows[0].id;
    }

    // Get or create company
    let companyResult = await pool.query(`
      SELECT id FROM companies WHERE consultant_id = $1 LIMIT 1
    `, [consultantId]);

    let companyId;
    if (companyResult.rows.length === 0) {
      // Create company
      const newCompanyId = uuidv4();
      await pool.query(`
        INSERT INTO companies (id, consultant_id, legal_name, trading_name, company_type, industry, email, city, state, country)
        VALUES ($1, $2, 'TeamACE Nigeria Limited', 'TeamACE', 'Private', 'Human Resources', 'hr@teamace.ng', 'Lagos', 'Lagos', 'Nigeria')
      `, [newCompanyId, consultantId]);
      companyId = newCompanyId;
    } else {
      companyId = companyResult.rows[0].id;
    }

    // Get company details for response
    const companyDetails = await pool.query('SELECT legal_name FROM companies WHERE id = $1', [companyId]);

    // Create employee with dynamic IDs
    const newEmployeeId = uuidv4();
    const newUserId = uuidv4();

    // Check if employee already exists
    let empResult = await pool.query(`SELECT id FROM employees WHERE email = 'adaeze.okonkwo@teamace.ng'`);
    let finalEmployeeId;

    if (empResult.rows.length === 0) {
      // Create new employee
      const insertResult = await pool.query(`
        INSERT INTO employees (id, company_id, employee_number, first_name, last_name, email, job_title, department, employment_type, employment_status, hire_date, salary, salary_currency, ess_enabled)
        VALUES ($1, $2, 'EMP-2024-0001', 'Adaeze', 'Okonkwo', 'adaeze.okonkwo@teamace.ng', 'HR Manager', 'Human Resources', 'full_time', 'active', '2021-01-15', 650000, 'NGN', true)
        RETURNING id
      `, [newEmployeeId, companyId]);
      finalEmployeeId = insertResult.rows[0].id;
    } else {
      // Update existing employee
      finalEmployeeId = empResult.rows[0].id;
      await pool.query(`UPDATE employees SET employment_status = 'active', company_id = $1 WHERE id = $2`, [companyId, finalEmployeeId]);
    }

    // Create employee user
    await pool.query(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, user_type, employee_id, company_id, is_active)
      VALUES (
        $1,
        '11111111-1111-1111-1111-111111111111',
        'adaeze.okonkwo@teamace.ng',
        $2,
        'Adaeze',
        'Okonkwo',
        'user',
        'employee',
        $3,
        $4,
        true
      )
      ON CONFLICT (email, tenant_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        user_type = 'employee',
        employee_id = EXCLUDED.employee_id,
        company_id = EXCLUDED.company_id
    `, [newUserId, passwordHash, finalEmployeeId, companyId]);

    res.json({
      success: true,
      message: 'Employee user created',
      company: companyDetails.rows[0]?.legal_name,
      credentials: {
        email: 'adaeze.okonkwo@teamace.ng',
        password: 'Demo123!',
        userType: 'employee'
      }
    });
  } catch (error) {
    console.error('Error seeding employee user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

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
// Leave Management Module Routes (Phase 1)
// ============================================================================
app.use('/api/leave-types', require('./routes/leaveTypes'));
app.use('/api/leave-requests', require('./routes/leaveRequests'));
app.use('/api/leave-balances', require('./routes/leaveBalances'));

// ============================================================================
// Finance Module Routes (Module 1.4)
// ============================================================================
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/payments', require('./routes/payments'));

// ============================================================================
// Payroll Module Routes (Nigeria PAYE Calculator)
// ============================================================================
app.use('/api/payroll', require('./routes/payroll'));

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
// Policy & Training LMS Routes
// ============================================================================
app.use('/api/policy-categories', require('./routes/policyCategories'));
app.use('/api/policies', require('./routes/policies'));
app.use('/api/training-modules', require('./routes/trainingModules'));
app.use('/api/training-progress', require('./routes/trainingProgress'));
app.use('/api/compliance', require('./routes/compliance'));
app.use('/api/certificates', require('./routes/certificates'));

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
