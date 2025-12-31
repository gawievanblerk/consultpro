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
// Temporary: Run Leave Management Migration
// ============================================================================
app.get('/run-leave-migration', async (req, res) => {
  try {
    // Check if tables already exist
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'leave_types'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      // Tables exist - check if employee_id columns need to be added
      const colCheck = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'leave_balances' AND column_name = 'employee_id'
      `);

      if (colCheck.rows.length === 0) {
        // Add employee_id columns to existing tables
        await pool.query(`ALTER TABLE leave_balances ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id)`);
        await pool.query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_leave_balances_employee ON leave_balances(employee_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_employee ON leave_requests(employee_id) WHERE deleted_at IS NULL`);
        return res.json({ success: true, message: 'Added employee_id columns to leave tables' });
      }

      return res.json({ success: true, message: 'Leave tables already exist with employee support' });
    }

    // Create leave_types table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20) NOT NULL,
        description TEXT,
        days_allowed INTEGER NOT NULL DEFAULT 0,
        carry_forward BOOLEAN DEFAULT FALSE,
        max_carry_forward INTEGER DEFAULT 0,
        requires_approval BOOLEAN DEFAULT TRUE,
        requires_documentation BOOLEAN DEFAULT FALSE,
        is_paid BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        min_service_months INTEGER DEFAULT 0,
        gender_restriction VARCHAR(20),
        color VARCHAR(7) DEFAULT '#3B82F6',
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        UNIQUE(tenant_id, code)
      )
    `);

    // Create leave_balances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        staff_id UUID REFERENCES staff(id),
        employee_id UUID REFERENCES employees(id),
        leave_type_id UUID NOT NULL REFERENCES leave_types(id),
        year INTEGER NOT NULL,
        entitled_days DECIMAL(5,2) NOT NULL DEFAULT 0,
        carried_forward DECIMAL(5,2) DEFAULT 0,
        adjustment_days DECIMAL(5,2) DEFAULT 0,
        adjustment_reason TEXT,
        used_days DECIMAL(5,2) DEFAULT 0,
        pending_days DECIMAL(5,2) DEFAULT 0,
        available_days DECIMAL(5,2) GENERATED ALWAYS AS (
          entitled_days + carried_forward + adjustment_days - used_days - pending_days
        ) STORED,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create leave_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID NOT NULL REFERENCES tenants(id),
        staff_id UUID REFERENCES staff(id),
        employee_id UUID REFERENCES employees(id),
        leave_type_id UUID NOT NULL REFERENCES leave_types(id),
        leave_balance_id UUID REFERENCES leave_balances(id),
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        days_requested DECIMAL(5,2) NOT NULL,
        is_half_day BOOLEAN DEFAULT FALSE,
        half_day_period VARCHAR(20),
        reason TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        approver_id UUID REFERENCES users(id),
        approved_at TIMESTAMP,
        rejection_reason TEXT,
        cancelled_at TIMESTAMP,
        cancelled_by UUID REFERENCES users(id),
        cancellation_reason TEXT,
        supporting_document_url TEXT,
        requested_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `);

    // Create public_holidays table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public_holidays (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tenant_id UUID REFERENCES tenants(id),
        name VARCHAR(200) NOT NULL,
        date DATE NOT NULL,
        year INTEGER NOT NULL,
        is_recurring BOOLEAN DEFAULT FALSE,
        recurring_month INTEGER,
        recurring_day INTEGER,
        country VARCHAR(100) DEFAULT 'Nigeria',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_leave_types_tenant ON leave_types(tenant_id) WHERE deleted_at IS NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_leave_balances_staff ON leave_balances(staff_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_staff ON leave_requests(staff_id) WHERE deleted_at IS NULL`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(tenant_id, status) WHERE deleted_at IS NULL`);

    // Seed default leave types
    await pool.query(`
      INSERT INTO leave_types (tenant_id, name, code, description, days_allowed, carry_forward, max_carry_forward, requires_approval, requires_documentation, is_paid, min_service_months, gender_restriction, color, sort_order)
      SELECT
        id as tenant_id,
        lt.name, lt.code, lt.description, lt.days_allowed, lt.carry_forward, lt.max_carry_forward,
        lt.requires_approval, lt.requires_documentation, lt.is_paid, lt.min_service_months,
        lt.gender_restriction, lt.color, lt.sort_order
      FROM tenants, (VALUES
        ('Annual Leave', 'ANNUAL', 'Standard annual leave entitlement', 21, true, 5, true, false, true, 12, NULL, '#10B981', 1),
        ('Sick Leave', 'SICK', 'Leave for illness with medical certificate', 12, false, 0, true, true, true, 0, NULL, '#EF4444', 2),
        ('Maternity Leave', 'MATERNITY', '12 weeks maternity leave', 84, false, 0, true, true, true, 0, 'female', '#EC4899', 3),
        ('Paternity Leave', 'PATERNITY', 'Leave for new fathers', 10, false, 0, true, true, true, 0, 'male', '#8B5CF6', 4),
        ('Compassionate Leave', 'COMPASSIONATE', 'Leave for bereavement or emergency', 5, false, 0, true, false, true, 0, NULL, '#6B7280', 5)
      ) AS lt(name, code, description, days_allowed, carry_forward, max_carry_forward, requires_approval, requires_documentation, is_paid, min_service_months, gender_restriction, color, sort_order)
      WHERE tenants.deleted_at IS NULL
      ON CONFLICT (tenant_id, code) DO NOTHING
    `);

    // Seed Nigerian public holidays
    await pool.query(`
      INSERT INTO public_holidays (name, date, year, is_recurring, country)
      VALUES
        ('New Year''s Day', '2025-01-01', 2025, true, 'Nigeria'),
        ('Workers'' Day', '2025-05-01', 2025, true, 'Nigeria'),
        ('Democracy Day', '2025-06-12', 2025, true, 'Nigeria'),
        ('Independence Day', '2025-10-01', 2025, true, 'Nigeria'),
        ('Christmas Day', '2025-12-25', 2025, true, 'Nigeria'),
        ('Boxing Day', '2025-12-26', 2025, true, 'Nigeria')
      ON CONFLICT DO NOTHING
    `);

    res.json({ success: true, message: 'Leave management tables created and seeded' });
  } catch (error) {
    console.error('Error running leave migration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Temporary: Run User Role Structure Migration
// ============================================================================
app.get('/run-role-migration', async (req, res) => {
  try {
    // Check if staff_company_access table already exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'staff_company_access'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      return res.json({ success: true, message: 'staff_company_access table already exists' });
    }

    // 1. Add staff_id to users table
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id)`);

    // 2. Create staff-to-company deployment access table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS staff_company_access (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        consultant_id UUID NOT NULL REFERENCES consultants(id),
        access_type VARCHAR(50) DEFAULT 'full_admin',
        start_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by UUID REFERENCES users(id),
        UNIQUE(staff_id, company_id, status)
      )
    `);

    // 3. Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_company_access_staff ON staff_company_access(staff_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_company_access_company ON staff_company_access(company_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_company_access_consultant ON staff_company_access(consultant_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_staff_company_access_active ON staff_company_access(status) WHERE status = 'active'`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id) WHERE staff_id IS NOT NULL`);

    res.json({ success: true, message: 'User role structure migration completed' });
  } catch (error) {
    console.error('Error running role migration:', error);
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
// Temporary: Run Payroll System Migration
// ============================================================================
app.get('/run-payroll-migration', async (req, res) => {
  try {
    // Check if tables already exist
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables WHERE table_name = 'payroll_runs'
      ) as exists
    `);

    if (tableCheck.rows[0].exists) {
      return res.json({ success: true, message: 'Payroll tables already exist' });
    }

    // Create salary_components table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS salary_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        component_type VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        amount DECIMAL(15,2) NOT NULL DEFAULT 0,
        is_taxable BOOLEAN DEFAULT TRUE,
        is_pension_applicable BOOLEAN DEFAULT TRUE,
        effective_date DATE DEFAULT CURRENT_DATE,
        end_date DATE,
        notes TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create payroll_runs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payroll_runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        pay_period_month INTEGER NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
        pay_period_year INTEGER NOT NULL CHECK (pay_period_year >= 2020),
        pay_period_start DATE NOT NULL,
        pay_period_end DATE NOT NULL,
        payment_date DATE NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        total_gross DECIMAL(15,2) DEFAULT 0,
        total_net DECIMAL(15,2) DEFAULT 0,
        total_paye DECIMAL(15,2) DEFAULT 0,
        total_pension_employee DECIMAL(15,2) DEFAULT 0,
        total_pension_employer DECIMAL(15,2) DEFAULT 0,
        total_nhf DECIMAL(15,2) DEFAULT 0,
        total_nsitf DECIMAL(15,2) DEFAULT 0,
        total_itf DECIMAL(15,2) DEFAULT 0,
        employee_count INTEGER DEFAULT 0,
        processed_by UUID REFERENCES users(id),
        processed_at TIMESTAMP,
        approved_by UUID REFERENCES users(id),
        approved_at TIMESTAMP,
        paid_by UUID REFERENCES users(id),
        paid_at TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create payslips table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payslips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        employee_name VARCHAR(255) NOT NULL,
        employee_id_number VARCHAR(50),
        department VARCHAR(100),
        job_title VARCHAR(100),
        bank_name VARCHAR(100),
        bank_account_number VARCHAR(50),
        bank_account_name VARCHAR(255),
        basic_salary DECIMAL(15,2) DEFAULT 0,
        housing_allowance DECIMAL(15,2) DEFAULT 0,
        transport_allowance DECIMAL(15,2) DEFAULT 0,
        meal_allowance DECIMAL(15,2) DEFAULT 0,
        utility_allowance DECIMAL(15,2) DEFAULT 0,
        leave_allowance DECIMAL(15,2) DEFAULT 0,
        thirteenth_month DECIMAL(15,2) DEFAULT 0,
        other_allowances DECIMAL(15,2) DEFAULT 0,
        gross_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
        annual_gross DECIMAL(15,2) DEFAULT 0,
        annual_taxable DECIMAL(15,2) DEFAULT 0,
        paye_tax DECIMAL(15,2) DEFAULT 0,
        pension_employee DECIMAL(15,2) DEFAULT 0,
        pension_employer DECIMAL(15,2) DEFAULT 0,
        nhf DECIMAL(15,2) DEFAULT 0,
        consolidated_relief DECIMAL(15,2) DEFAULT 0,
        loan_deduction DECIMAL(15,2) DEFAULT 0,
        salary_advance DECIMAL(15,2) DEFAULT 0,
        other_deductions DECIMAL(15,2) DEFAULT 0,
        total_deductions DECIMAL(15,2) DEFAULT 0,
        net_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
        employer_pension DECIMAL(15,2) DEFAULT 0,
        employer_nsitf DECIMAL(15,2) DEFAULT 0,
        employer_itf DECIMAL(15,2) DEFAULT 0,
        calculation_details JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_salary_components_employee ON salary_components(employee_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payroll_runs_company ON payroll_runs(company_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payslips_employee ON payslips(employee_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_payslips_payroll_run ON payslips(payroll_run_id)`);

    res.json({ success: true, message: 'Payroll tables created successfully' });
  } catch (error) {
    console.error('Error running payroll migration:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// Temporary: Run EMS Migration
// ============================================================================
app.get('/run-ems-migration', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '../migrations/013_employee_management_system.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await pool.query(sql);

    res.json({ success: true, message: 'EMS migration completed successfully' });
  } catch (error) {
    // Check if it's a "table already exists" error
    if (error.message.includes('already exists')) {
      return res.json({ success: true, message: 'EMS tables already exist' });
    }
    console.error('Error running EMS migration:', error);
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
app.use('/api/salary-components', require('./routes/salaryComponents'));

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
