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

// Seed TeamACE employees (temporary endpoint - remove after use)
app.post('/seed-teamace-employees', async (req, res) => {
  const { secret } = req.body;
  if (secret !== 'corehr-seed-2024') {
    return res.status(403).json({ success: false, error: 'Invalid secret' });
  }

  try {
    // Create meHR tenant if not exists
    await pool.query(`
      INSERT INTO tenants (id, name, slug, settings)
      VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'meHR', 'mehr', '{"timezone": "Africa/Lagos", "currency": "NGN"}')
      ON CONFLICT (id) DO NOTHING
    `);

    // Create meHR consultant record
    await pool.query(`
      INSERT INTO consultants (id, tenant_id, company_name, trading_name, email, phone, tier, max_companies, max_employees_per_company, subscription_status)
      VALUES (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        'meHR Consulting', 'meHR', 'info@mehr.ng', '+234 800 000 0001',
        'professional', 50, 500, 'active'
      )
      ON CONFLICT (tenant_id) DO UPDATE SET company_name = EXCLUDED.company_name
    `);

    // Create TeamACE company
    await pool.query(`
      INSERT INTO companies (id, consultant_id, legal_name, trading_name, company_type, industry, email, phone, city, state, country)
      VALUES (
        'dddddddd-dddd-dddd-dddd-dddddddddddd',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'TeamACE Nigeria Limited', 'TeamACE', 'Private', 'Human Resources',
        'hr@teamace.ng', '+234 800 000 0002', 'Lagos', 'Lagos', 'Nigeria'
      )
      ON CONFLICT (id) DO UPDATE SET legal_name = EXCLUDED.legal_name
    `);

    // Update admin user with company_id
    await pool.query(`
      UPDATE users SET company_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd', user_type = 'company_admin'
      WHERE email = 'admin@teamace.ng'
    `);

    // Insert demo employees
    const employees = [
      { id: 'e0000001-0000-0000-0000-000000000001', num: 'EMP-2024-0001', first: 'Adaeze', last: 'Okonkwo', email: 'adaeze.okonkwo@teamace.ng', phone: '+234 802 111 2221', dob: '1988-03-15', gender: 'Female', title: 'HR Manager', dept: 'Human Resources', type: 'full_time', status: 'active', hire: '2021-01-15', salary: 650000 },
      { id: 'e0000002-0000-0000-0000-000000000002', num: 'EMP-2024-0002', first: 'Emeka', last: 'Nwachukwu', email: 'emeka.nwachukwu@teamace.ng', phone: '+234 803 222 3331', dob: '1985-07-22', gender: 'Male', title: 'Senior HR Consultant', dept: 'Consulting', type: 'full_time', status: 'active', hire: '2020-06-01', salary: 850000 },
      { id: 'e0000003-0000-0000-0000-000000000003', num: 'EMP-2024-0003', first: 'Funke', last: 'Adeyemi', email: 'funke.adeyemi@teamace.ng', phone: '+234 804 333 4441', dob: '1990-11-08', gender: 'Female', title: 'Recruitment Lead', dept: 'Talent Acquisition', type: 'full_time', status: 'active', hire: '2022-03-01', salary: 550000 },
      { id: 'e0000004-0000-0000-0000-000000000004', num: 'EMP-2024-0004', first: 'Ibrahim', last: 'Mohammed', email: 'ibrahim.mohammed@teamace.ng', phone: '+234 805 444 5551', dob: '1992-05-30', gender: 'Male', title: 'Training Coordinator', dept: 'Learning & Development', type: 'full_time', status: 'active', hire: '2023-01-10', salary: 450000 },
      { id: 'e0000005-0000-0000-0000-000000000005', num: 'EMP-2024-0005', first: 'Nneka', last: 'Eze', email: 'nneka.eze@teamace.ng', phone: '+234 806 555 6661', dob: '1994-09-12', gender: 'Female', title: 'Payroll Officer', dept: 'Finance', type: 'full_time', status: 'active', hire: '2023-06-15', salary: 380000 },
      { id: 'e0000006-0000-0000-0000-000000000006', num: 'EMP-2024-0006', first: 'Chukwudi', last: 'Okoro', email: 'chukwudi.okoro@teamace.ng', phone: '+234 807 666 7771', dob: '1996-12-03', gender: 'Male', title: 'HR Assistant', dept: 'Human Resources', type: 'full_time', status: 'probation', hire: '2024-11-01', salary: 280000 },
      { id: 'e0000007-0000-0000-0000-000000000007', num: 'EMP-2024-0007', first: 'Amina', last: 'Yusuf', email: 'amina.yusuf@teamace.ng', phone: '+234 808 777 8881', dob: '1991-04-18', gender: 'Female', title: 'Administrative Officer', dept: 'Administration', type: 'full_time', status: 'active', hire: '2022-09-01', salary: 320000 },
      { id: 'e0000008-0000-0000-0000-000000000008', num: 'EMP-2024-0008', first: 'Oluwole', last: 'Adekunle', email: 'oluwole.adekunle@teamace.ng', phone: '+234 809 888 9991', dob: '1993-08-25', gender: 'Male', title: 'IT Support Specialist', dept: 'IT', type: 'contract', status: 'active', hire: '2024-06-01', salary: 400000 }
    ];

    for (const emp of employees) {
      await pool.query(`
        INSERT INTO employees (id, company_id, employee_number, first_name, last_name, email, phone, date_of_birth, gender, job_title, department, employment_type, employment_status, hire_date, salary, salary_currency, nationality, ess_enabled)
        VALUES ($1, 'dddddddd-dddd-dddd-dddd-dddddddddddd', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'NGN', 'Nigerian', false)
        ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name
      `, [emp.id, emp.num, emp.first, emp.last, emp.email, emp.phone, emp.dob, emp.gender, emp.title, emp.dept, emp.type, emp.status, emp.hire, emp.salary]);
    }

    // Count employees
    const countResult = await pool.query(`SELECT COUNT(*) FROM employees WHERE company_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd'`);

    res.json({
      success: true,
      message: 'TeamACE employees seeded successfully!',
      employeeCount: parseInt(countResult.rows[0].count)
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
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
