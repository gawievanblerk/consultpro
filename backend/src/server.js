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
// Database Migrations API
// ============================================================================
const fs = require('fs');
const path = require('path');

// Available migrations with their descriptions
const MIGRATIONS = {
  '001_initial_schema': 'Core database schema',
  '002_seed_data': 'Demo data for testing',
  '003_phase1_features': 'Phase 1 feature enhancements',
  '004_password_reset_invites': 'Password reset and invitation system',
  '005_corehr_hierarchy': 'CoreHR organizational hierarchy',
  '006_leave_management': 'Leave management system',
  '007_client_onboarding': 'Client onboarding workflow',
  '008_policy_and_training_lms': 'Policy and training LMS',
  '009_teamace_employees_seed': 'TeamACE demo employees',
  '010_user_role_cleanup': 'User role structure cleanup',
  '011_test_employee_user': 'Test employee user data',
  '012_payroll_system': 'Payroll processing system',
  '013_employee_management_system': 'Employee lifecycle management (EMS)',
  '014_company_preferences': 'Company selector preferences',
  '015_statutory_remittances': 'Statutory remittance tracking (PAYE, Pension, NHF)'
};

// GET /run-migrations - List available migrations
app.get('/run-migrations', async (req, res) => {
  try {
    // Create migration tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Get executed migrations
    const executed = await pool.query('SELECT name, executed_at FROM _migrations ORDER BY id');
    const executedNames = new Set(executed.rows.map(r => r.name));

    const migrations = Object.entries(MIGRATIONS).map(([name, description]) => ({
      name,
      description,
      status: executedNames.has(name) ? 'executed' : 'pending',
      executed_at: executed.rows.find(r => r.name === name)?.executed_at || null
    }));

    res.json({
      success: true,
      message: 'Available migrations',
      data: migrations,
      usage: {
        run_all: 'GET /run-migrations/all',
        run_specific: 'GET /run-migrations/:name',
        examples: [
          '/run-migrations/013_employee_management_system',
          '/run-migrations/014_company_preferences'
        ]
      }
    });
  } catch (error) {
    console.error('Error listing migrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /run-migrations/all - Run all pending migrations
app.get('/run-migrations/all', async (req, res) => {
  try {
    // Create migration tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Get executed migrations
    const executed = await pool.query('SELECT name FROM _migrations');
    const executedNames = new Set(executed.rows.map(r => r.name));

    const results = [];
    const migrationsDir = path.join(__dirname, '../migrations');

    for (const [name, description] of Object.entries(MIGRATIONS)) {
      if (executedNames.has(name)) {
        results.push({ name, status: 'skipped', message: 'Already executed' });
        continue;
      }

      const filePath = path.join(migrationsDir, `${name}.sql`);
      if (!fs.existsSync(filePath)) {
        results.push({ name, status: 'error', message: 'Migration file not found' });
        continue;
      }

      try {
        const sql = fs.readFileSync(filePath, 'utf8');
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [name]);
        results.push({ name, status: 'success', message: description });
      } catch (err) {
        results.push({ name, status: 'error', message: err.message });
        // Stop on first error
        break;
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const errorCount = results.filter(r => r.status === 'error').length;

    res.json({
      success: errorCount === 0,
      message: `Migrations: ${successCount} executed, ${skippedCount} skipped, ${errorCount} errors`,
      data: results
    });
  } catch (error) {
    console.error('Error running all migrations:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /run-migrations/:name - Run specific migration
app.get('/run-migrations/:name', async (req, res) => {
  const { name } = req.params;
  const force = req.query.force === 'true';

  try {
    // Validate migration name
    if (!MIGRATIONS[name]) {
      return res.status(400).json({
        success: false,
        error: `Unknown migration: ${name}`,
        available: Object.keys(MIGRATIONS)
      });
    }

    // Create migration tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Check if already executed
    if (!force) {
      const check = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [name]);
      if (check.rows.length > 0) {
        return res.json({
          success: true,
          message: `Migration ${name} already executed. Use ?force=true to re-run.`
        });
      }
    }

    // Run migration
    const migrationsDir = path.join(__dirname, '../migrations');
    const filePath = path.join(migrationsDir, `${name}.sql`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: `Migration file not found: ${name}.sql`
      });
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    await pool.query(sql);

    // Record migration
    await pool.query(
      'INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO UPDATE SET executed_at = NOW()',
      [name]
    );

    res.json({
      success: true,
      message: `Migration ${name} executed successfully`,
      description: MIGRATIONS[name]
    });
  } catch (error) {
    console.error(`Error running migration ${name}:`, error);
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
// Temporary: Seed Company HR Admin User (for testing)
// ============================================================================
app.get('/seed-company-admin', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const passwordHash = await bcrypt.hash('Demo123!', 10);
    const tenantId = '11111111-1111-1111-1111-111111111111';

    // Get existing consultant
    const consultantResult = await pool.query(`
      SELECT id FROM consultants WHERE tenant_id = $1 LIMIT 1
    `, [tenantId]);

    if (consultantResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No consultant found. Run /seed-employee-user first.' });
    }
    const consultantId = consultantResult.rows[0].id;

    // Get existing company
    let companyResult = await pool.query(`
      SELECT id, legal_name FROM companies WHERE consultant_id = $1 LIMIT 1
    `, [consultantId]);

    if (companyResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No company found. Run /seed-employee-user first.' });
    }
    const companyId = companyResult.rows[0].id;
    const companyName = companyResult.rows[0].legal_name;

    // Create company HR admin user
    const newUserId = uuidv4();
    await pool.query(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, user_type, company_id, is_active)
      VALUES ($1, $2, 'hr@teamace.ng', $3, 'HR', 'Manager', 'admin', 'company_admin', $4, true)
      ON CONFLICT (email, tenant_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        user_type = 'company_admin',
        company_id = EXCLUDED.company_id,
        role = 'admin'
    `, [newUserId, tenantId, passwordHash, companyId]);

    res.json({
      success: true,
      message: 'Company HR Admin user created',
      company: companyName,
      credentials: {
        email: 'hr@teamace.ng',
        password: 'Demo123!',
        userType: 'company_admin',
        role: 'admin'
      }
    });
  } catch (error) {
    console.error('Error seeding company admin:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Temporary: List All Users (for debugging)
// ============================================================================
app.get('/list-users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.email, u.first_name, u.last_name, u.role, u.user_type,
             t.name as tenant_name, c.legal_name as company_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.is_active = true
      ORDER BY u.user_type, u.role, u.email
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Temporary: Cleanup Production Users
// ============================================================================
app.get('/cleanup-users', async (req, res) => {
  try {
    const results = [];

    // 1. Fix admin@teamace.ng to be consultant (firm admin)
    const updateAdmin = await pool.query(`
      UPDATE users
      SET user_type = 'consultant', company_id = NULL
      WHERE email = 'admin@teamace.ng'
      RETURNING email, user_type
    `);
    if (updateAdmin.rows.length > 0) {
      results.push({ action: 'updated', email: 'admin@teamace.ng', newUserType: 'consultant' });
    }

    // 2. Deactivate legacy sales user (can't delete due to FK constraints)
    const deactivateSales = await pool.query(`
      UPDATE users SET is_active = false, user_type = 'employee'
      WHERE email = 'sales@teamace.ng'
      RETURNING email
    `);
    if (deactivateSales.rows.length > 0) {
      results.push({ action: 'deactivated', email: 'sales@teamace.ng' });
    }

    const removeDuplicate = await pool.query(`
      DELETE FROM users WHERE email = 'gawievanblerk@me.com' AND user_type = 'tenant_user'
      RETURNING email
    `);
    if (removeDuplicate.rows.length > 0) {
      results.push({ action: 'removed', email: 'gawievanblerk@me.com (tenant_user)' });
    }

    // 3. Convert hr@teamace.ng to staff user_type (deployed staff to TeamACE company)
    const updateHr = await pool.query(`
      UPDATE users
      SET user_type = 'staff'
      WHERE email = 'hr@teamace.ng' AND user_type = 'company_admin'
      RETURNING email, user_type
    `);
    if (updateHr.rows.length > 0) {
      results.push({ action: 'updated', email: 'hr@teamace.ng', newUserType: 'staff' });
    }

    res.json({
      success: true,
      message: 'User cleanup completed',
      changes: results
    });
  } catch (error) {
    console.error('Error cleaning up users:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Temporary: Create Staff User with Company Deployment
// ============================================================================
app.get('/seed-staff-user', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const passwordHash = await bcrypt.hash('Demo123!', 10);
    const tenantId = '11111111-1111-1111-1111-111111111111';

    // Get existing consultant
    const consultantResult = await pool.query(`
      SELECT id FROM consultants WHERE tenant_id = $1 LIMIT 1
    `, [tenantId]);

    if (consultantResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No consultant found. Run /seed-employee-user first.' });
    }
    const consultantId = consultantResult.rows[0].id;

    // Get existing company
    const companyResult = await pool.query(`
      SELECT id, legal_name FROM companies WHERE consultant_id = $1 LIMIT 1
    `, [consultantId]);

    if (companyResult.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'No company found. Run /seed-employee-user first.' });
    }
    const companyId = companyResult.rows[0].id;
    const companyName = companyResult.rows[0].legal_name;

    // Find or create staff member (Oluwaseun Adeyemi)
    let staffResult = await pool.query(`
      SELECT id FROM staff WHERE email = 'oluwaseun.adeyemi@teamace.ng'
    `);

    let staffId;
    if (staffResult.rows.length === 0) {
      // Create staff member
      const newStaffId = uuidv4();
      await pool.query(`
        INSERT INTO staff (id, tenant_id, first_name, last_name, email, phone, employee_id, department, job_title, status, employment_type, hire_date)
        VALUES ($1, $2, 'Oluwaseun', 'Adeyemi', 'oluwaseun.adeyemi@teamace.ng', '+2348012345678', 'STF-001', 'Consulting', 'HR Consultant', 'available', 'full_time', '2022-03-15')
      `, [newStaffId, tenantId]);
      staffId = newStaffId;
    } else {
      staffId = staffResult.rows[0].id;
    }

    // Create staff user account
    const newUserId = uuidv4();
    await pool.query(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, user_type, staff_id, is_active)
      VALUES ($1, $2, 'oluwaseun.adeyemi@teamace.ng', $3, 'Oluwaseun', 'Adeyemi', 'user', 'staff', $4, true)
      ON CONFLICT (email, tenant_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        user_type = 'staff',
        staff_id = EXCLUDED.staff_id
    `, [newUserId, tenantId, passwordHash, staffId]);

    // Check if staff_company_access table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'staff_company_access'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      // Create deployment access to company
      const accessId = uuidv4();
      await pool.query(`
        INSERT INTO staff_company_access (id, staff_id, company_id, consultant_id, access_type, status, start_date)
        VALUES ($1, $2, $3, $4, 'full_admin', 'active', CURRENT_DATE)
        ON CONFLICT (staff_id, company_id, status) DO NOTHING
      `, [accessId, staffId, companyId, consultantId]);
    }

    res.json({
      success: true,
      message: 'Staff user created with company deployment',
      staffId: staffId,
      deployedTo: companyName,
      credentials: {
        email: 'oluwaseun.adeyemi@teamace.ng',
        password: 'Demo123!',
        userType: 'staff'
      }
    });
  } catch (error) {
    console.error('Error seeding staff user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// DANGER: Reset System to Virgin State (Superadmin only)
// ============================================================================
app.get('/reset-system', async (req, res) => {
  try {
    const results = [];
    const skipped = [];

    // Helper to safely delete from table
    const safeDelete = async (table) => {
      try {
        await pool.query(`DELETE FROM ${table}`);
        results.push(table);
      } catch (err) {
        if (err.message.includes('does not exist')) {
          skipped.push(table);
        } else {
          throw err;
        }
      }
    };

    // Helper to safely truncate table
    const safeTruncate = async (table) => {
      try {
        await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
        results.push(table);
      } catch (err) {
        if (err.message.includes('does not exist')) {
          skipped.push(table);
        } else {
          throw err;
        }
      }
    };

    // Truncate all tables with CASCADE (order doesn't matter with CASCADE)
    const tables = [
      'activity_feed', 'training_progress', 'certificates', 'policy_acknowledgments',
      'leave_requests', 'leave_balances', 'staff_company_access', 'deployments',
      'activities', 'notes', 'tasks', 'payments', 'invoice_items', 'invoices',
      'proposals', 'documents', 'engagements', 'contacts', 'leads', 'opportunities',
      'training_modules', 'policies', 'policy_categories', 'leave_types', 'public_holidays',
      'user_invites', 'password_reset_tokens', 'notifications', 'audit_logs', 'approvals',
      'users', 'employees', 'staff', 'clients', 'companies', 'consultants', 'tenants'
    ];

    for (const table of tables) {
      await safeTruncate(table);
    }

    res.json({
      success: true,
      message: 'System reset to virgin state. Only superadmin remains.',
      tablesCleared: results,
      tablesSkipped: skipped,
      nextStep: 'Login as superadmin at /superadmin/login to create your first consultant/tenant'
    });
  } catch (error) {
    console.error('Error resetting system:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Temporary: Seed Demo Tenant with Consultant User
// ============================================================================
app.get('/seed-demo-tenant', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { v4: uuidv4 } = require('uuid');
    const passwordHash = await bcrypt.hash('Demo123!', 10);
    const tenantId = '11111111-1111-1111-1111-111111111111';

    // 1. Create tenant if not exists
    await pool.query(`
      INSERT INTO tenants (id, name, slug, settings)
      VALUES ($1, 'TeamACE Nigeria', 'teamace', '{"timezone": "Africa/Lagos", "currency": "NGN"}')
      ON CONFLICT (id) DO NOTHING
    `, [tenantId]);

    // 2. Create consultant
    const consultantId = uuidv4();
    await pool.query(`
      INSERT INTO consultants (id, tenant_id, company_name, trading_name, email, tier, subscription_status)
      VALUES ($1, $2, 'TeamACE HR Consulting', 'TeamACE HR', 'consulting@teamace.ng', 'professional', 'active')
      ON CONFLICT DO NOTHING
    `, [consultantId, tenantId]);

    // Get the consultant ID (might be existing)
    const consultResult = await pool.query(`SELECT id FROM consultants WHERE tenant_id = $1 LIMIT 1`, [tenantId]);
    const finalConsultantId = consultResult.rows[0]?.id || consultantId;

    // 3. Create company
    const companyId = uuidv4();
    await pool.query(`
      INSERT INTO companies (id, consultant_id, legal_name, trading_name, company_type, industry, email, city, state, country)
      VALUES ($1, $2, 'TeamACE Nigeria Limited', 'TeamACE', 'Private', 'Human Resources', 'hr@teamace.ng', 'Lagos', 'Lagos', 'Nigeria')
      ON CONFLICT DO NOTHING
    `, [companyId, finalConsultantId]);

    // Get the company ID (might be existing)
    const companyResult = await pool.query(`SELECT id FROM companies WHERE consultant_id = $1 LIMIT 1`, [finalConsultantId]);
    const finalCompanyId = companyResult.rows[0]?.id || companyId;

    // 4. Create consultant user
    const userId = uuidv4();
    await pool.query(`
      INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, user_type, consultant_id, is_active)
      VALUES ($1, $2, 'admin@teamace.ng', $3, 'Admin', 'User', 'admin', 'consultant', $4, true)
      ON CONFLICT (email, tenant_id) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        user_type = 'consultant',
        consultant_id = EXCLUDED.consultant_id,
        is_active = true
    `, [userId, tenantId, passwordHash, finalConsultantId]);

    // 5. Create sample employees with salaries for payroll testing
    const employees = [
      { fn: 'Adaeze', ln: 'Okonkwo', email: 'adaeze.okonkwo@teamace.ng', title: 'HR Manager', dept: 'Human Resources', salary: 650000 },
      { fn: 'Chinedu', ln: 'Eze', email: 'chinedu.eze@teamace.ng', title: 'Software Engineer', dept: 'Engineering', salary: 850000 },
      { fn: 'Ngozi', ln: 'Okafor', email: 'ngozi.okafor@teamace.ng', title: 'Accountant', dept: 'Finance', salary: 550000 }
    ];

    const createdEmployees = [];
    for (const emp of employees) {
      // Check if employee already exists
      const existingEmp = await pool.query(`SELECT id FROM employees WHERE email = $1`, [emp.email]);
      let empId;

      if (existingEmp.rows.length > 0) {
        empId = existingEmp.rows[0].id;
      } else {
        empId = uuidv4();
        await pool.query(`
          INSERT INTO employees (id, company_id, employee_number, first_name, last_name, email, job_title, department, employment_type, employment_status, hire_date, salary, salary_currency, ess_enabled)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'full_time', 'active', '2023-01-15', $9, 'NGN', true)
        `, [empId, finalCompanyId, 'EMP-' + emp.fn.substring(0,3).toUpperCase(), emp.fn, emp.ln, emp.email, emp.title, emp.dept, emp.salary]);
      }

      // Create user account for employee (for ESS login)
      const empUserId = uuidv4();
      await pool.query(`
        INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role, user_type, employee_id, company_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, 'user', 'employee', $7, $8, true)
        ON CONFLICT (email, tenant_id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          user_type = 'employee',
          employee_id = EXCLUDED.employee_id,
          company_id = EXCLUDED.company_id,
          is_active = true
      `, [empUserId, tenantId, emp.email, passwordHash, emp.fn, emp.ln, empId, finalCompanyId]);

      createdEmployees.push({ email: emp.email, employeeId: empId });
    }

    res.json({
      success: true,
      message: 'Demo tenant, consultant, company, and employees created',
      credentials: {
        consultant: {
          email: 'admin@teamace.ng',
          password: 'Demo123!',
          userType: 'consultant (full access)'
        },
        employees: employees.map(e => ({
          email: e.email,
          password: 'Demo123!',
          userType: 'employee (ESS)'
        }))
      },
      data: {
        tenantId,
        consultantId: finalConsultantId,
        companyId: finalCompanyId,
        employeesCreated: createdEmployees
      }
    });
  } catch (error) {
    console.error('Error seeding demo tenant:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Temporary: Check user exists (debug)
// ============================================================================
app.get('/check-user/:email', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const email = req.params.email.toLowerCase();
    const result = await pool.query(`
      SELECT id, email, user_type, employee_id, company_id, is_active, tenant_id, password_hash
      FROM users WHERE LOWER(email) = $1
    `, [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      const testPassword = 'Demo123!';
      const passwordMatch = await bcrypt.compare(testPassword, user.password_hash);
      delete user.password_hash; // Don't expose hash
      res.json({ found: true, user, passwordMatchesDemo123: passwordMatch });
    } else {
      res.json({ found: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Temporary: Cleanup duplicate companies
// ============================================================================
app.get('/cleanup-duplicates', async (req, res) => {
  try {
    // Delete duplicate companies, keeping only the oldest one per consultant
    const result = await pool.query(`
      DELETE FROM companies
      WHERE id NOT IN (
        SELECT DISTINCT ON (consultant_id, trading_name) id
        FROM companies
        ORDER BY consultant_id, trading_name, created_at ASC
      )
      RETURNING id, trading_name
    `);

    // Delete duplicate employees, keeping only the oldest one per email
    const empResult = await pool.query(`
      DELETE FROM employees
      WHERE id NOT IN (
        SELECT DISTINCT ON (company_id, email) id
        FROM employees
        ORDER BY company_id, email, created_at ASC
      )
      RETURNING id, email
    `);

    res.json({
      success: true,
      companiesDeleted: result.rows,
      employeesDeleted: empResult.rows
    });
  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Apply auth middleware to all other /api routes (except superadmin, auth, onboard)
// ============================================================================
const skipAuthPaths = ['/api/superadmin', '/api/auth', '/api/onboard'];
app.use('/api', (req, res, next) => {
  // Skip auth middleware for certain paths
  if (skipAuthPaths.some(path => req.originalUrl.startsWith(path))) {
    return next();
  }
  authenticate(req, res, (err) => {
    if (err) return next(err);
    tenantMiddleware(req, res, next);
  });
});

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
app.use('/api/salary-components', require('./routes/salaryComponents'));
app.use('/api/remittances', require('./routes/remittances'));

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
// Employee Management System (EMS) Routes
// ============================================================================
app.use('/api/probation', require('./routes/probation'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/exit', require('./routes/exit'));
app.use('/api/disciplinary', require('./routes/disciplinary'));
app.use('/api/onboarding-checklist', require('./routes/onboardingChecklist'));

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
