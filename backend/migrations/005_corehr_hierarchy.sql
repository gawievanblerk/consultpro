-- CoreHR Multi-Level Hierarchy Schema
-- Migration: 005_corehr_hierarchy.sql
-- Purpose: Implement Super Admin → Consultant → Company → Employee hierarchy

-- ============================================================================
-- SUPER ADMIN (Platform Level - Not Tenant Scoped)
-- ============================================================================

-- Super Admins (Rozitech Platform Staff)
CREATE TABLE IF NOT EXISTS superadmins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_superadmins_email ON superadmins(email);

-- Super Admin Audit Logs
CREATE TABLE IF NOT EXISTS superadmin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    superadmin_id UUID REFERENCES superadmins(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_superadmin_audit_admin ON superadmin_audit_logs(superadmin_id);
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_created ON superadmin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_superadmin_audit_action ON superadmin_audit_logs(action);

-- ============================================================================
-- CONSULTANTS (HR Consulting Firms)
-- ============================================================================

-- Consultants (Links to existing tenants table)
CREATE TABLE IF NOT EXISTS consultants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID UNIQUE REFERENCES tenants(id),

    -- Consultant Details
    company_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    consultant_type VARCHAR(50) DEFAULT 'HR',
    tier VARCHAR(50) DEFAULT 'starter',

    -- Contact Info
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',
    postal_code VARCHAR(20),

    -- Nigeria Compliance
    tin VARCHAR(50),
    rc_number VARCHAR(50),

    -- Subscription & Limits
    max_companies INTEGER DEFAULT 10,
    max_employees_per_company INTEGER DEFAULT 100,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,

    -- Branding (White-label)
    logo_url VARCHAR(500),
    primary_color VARCHAR(20),
    secondary_color VARCHAR(20),

    -- Metadata
    provisioned_by UUID REFERENCES superadmins(id),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultants_tenant ON consultants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consultants_type ON consultants(consultant_type);
CREATE INDEX IF NOT EXISTS idx_consultants_tier ON consultants(tier);
CREATE INDEX IF NOT EXISTS idx_consultants_status ON consultants(subscription_status);

-- Consultant Invitations (Super Admin to Consultant)
CREATE TABLE IF NOT EXISTS consultant_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    consultant_type VARCHAR(50) DEFAULT 'HR',
    tier VARCHAR(50) DEFAULT 'starter',
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by_consultant_id UUID REFERENCES consultants(id),
    provisioned_by UUID REFERENCES superadmins(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultant_invitations_token ON consultant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_consultant_invitations_email ON consultant_invitations(email);

-- Consultant Users (Staff within consultant firms)
CREATE TABLE IF NOT EXISTS consultant_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'user',
    is_primary BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(consultant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_consultant_users_consultant ON consultant_users(consultant_id);
CREATE INDEX IF NOT EXISTS idx_consultant_users_user ON consultant_users(user_id);

-- ============================================================================
-- COMPANIES (Client Companies Managed by Consultants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID NOT NULL REFERENCES consultants(id) ON DELETE CASCADE,

    -- Company Details
    legal_name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    company_type VARCHAR(50),
    industry VARCHAR(100),
    employee_count_range VARCHAR(50),

    -- Contact Info
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',
    postal_code VARCHAR(20),

    -- Nigeria Compliance
    tin VARCHAR(50),
    rc_number VARCHAR(50),
    pension_code VARCHAR(50),
    nhf_code VARCHAR(50),
    nhis_code VARCHAR(50),
    itf_code VARCHAR(50),
    nsitf_code VARCHAR(50),

    -- Payroll Settings
    default_currency VARCHAR(3) DEFAULT 'NGN',
    pay_frequency VARCHAR(50) DEFAULT 'monthly',
    payroll_cutoff_day INTEGER DEFAULT 25,
    pay_day INTEGER DEFAULT 28,

    -- Status
    status VARCHAR(50) DEFAULT 'onboarding',
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_companies_consultant ON companies(consultant_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_deleted ON companies(deleted_at) WHERE deleted_at IS NULL;

-- Company Admins (HR Managers at client companies)
CREATE TABLE IF NOT EXISTS company_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'admin',
    is_primary BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_admins_company ON company_admins(company_id);
CREATE INDEX IF NOT EXISTS idx_company_admins_user ON company_admins(user_id);

-- ============================================================================
-- EMPLOYEES (End Users in Client Companies)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),

    -- Employee Details
    employee_number VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),

    -- Personal Info
    date_of_birth DATE,
    gender VARCHAR(20),
    marital_status VARCHAR(50),
    nationality VARCHAR(100) DEFAULT 'Nigerian',
    state_of_origin VARCHAR(100),
    lga_of_origin VARCHAR(100),

    -- Address
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state_of_residence VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',

    -- Employment
    employment_type VARCHAR(50) DEFAULT 'full_time',
    employment_status VARCHAR(50) DEFAULT 'active',
    job_title VARCHAR(100),
    department VARCHAR(100),
    reports_to UUID REFERENCES employees(id),
    hire_date DATE,
    confirmation_date DATE,
    termination_date DATE,
    termination_reason TEXT,

    -- Compensation
    salary DECIMAL(15,2),
    salary_currency VARCHAR(3) DEFAULT 'NGN',
    pay_frequency VARCHAR(50) DEFAULT 'monthly',

    -- Bank Details
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(255),
    bank_code VARCHAR(20),

    -- Nigeria IDs
    nin VARCHAR(20),
    bvn VARCHAR(20),
    tax_id VARCHAR(50),

    -- Pension
    pension_pin VARCHAR(50),
    pension_pfa VARCHAR(100),
    pension_pfa_code VARCHAR(20),

    -- Other Statutory
    nhf_number VARCHAR(50),
    nhis_number VARCHAR(50),

    -- ESS Status
    ess_enabled BOOLEAN DEFAULT false,
    ess_invitation_sent_at TIMESTAMP WITH TIME ZONE,
    ess_activated_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(employment_status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_deleted ON employees(deleted_at) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_number_company ON employees(company_id, employee_number) WHERE employee_number IS NOT NULL AND deleted_at IS NULL;

-- Employee Invitations (ESS Activation)
CREATE TABLE IF NOT EXISTS employee_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    resend_count INTEGER DEFAULT 0,
    last_resent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON employee_invitations(token);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_employee ON employee_invitations(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_company ON employee_invitations(company_id);

-- ============================================================================
-- USERS TABLE EXTENSIONS
-- ============================================================================

-- Add hierarchy context columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_type VARCHAR(50) DEFAULT 'tenant_user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS consultant_id UUID REFERENCES consultants(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_consultant ON users(consultant_id);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_employee ON users(employee_id);

-- ============================================================================
-- ACTIVITY FEED (Audit Trail for All Actions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultant_id UUID REFERENCES consultants(id),
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES users(id),

    activity_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    actor_type VARCHAR(50),
    reference_type VARCHAR(50),
    reference_id UUID,

    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_feed_consultant ON activity_feed(consultant_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_company ON activity_feed(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_user ON activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created ON activity_feed(created_at DESC);

-- ============================================================================
-- SEED DATA: Default Super Admin
-- ============================================================================

-- Insert default super admin (password: Admin123!)
INSERT INTO superadmins (email, password_hash, first_name, last_name, is_active)
VALUES (
    'admin@rozitech.com',
    '$2a$10$SCGdATx1ZYk/CRSQqiJ5D.GTuBNI57sLaWwrBvDFLCVS/wcr4XLdy',
    'Rozitech',
    'Admin',
    true
) ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE superadmins IS 'Platform-level administrators (Rozitech staff)';
COMMENT ON TABLE consultants IS 'HR consulting firms that manage client companies';
COMMENT ON TABLE consultant_invitations IS 'Invitations sent by super admin to onboard consultants';
COMMENT ON TABLE consultant_users IS 'Staff members working for a consultant firm';
COMMENT ON TABLE companies IS 'Client companies managed by HR consultants';
COMMENT ON TABLE company_admins IS 'HR managers and admins at client companies';
COMMENT ON TABLE employees IS 'Employee records within client companies';
COMMENT ON TABLE employee_invitations IS 'ESS activation invitations for employees';
COMMENT ON TABLE activity_feed IS 'Audit trail for all system activities';

COMMENT ON COLUMN consultants.consultant_type IS 'Type of consultant: HR, Tax, Legal (future)';
COMMENT ON COLUMN consultants.tier IS 'Subscription tier: starter, professional, enterprise';
COMMENT ON COLUMN companies.status IS 'Company status: onboarding, active, suspended, offboarded';
COMMENT ON COLUMN employees.employment_status IS 'Employee status: active, on_leave, suspended, terminated';
COMMENT ON COLUMN users.user_type IS 'User type: consultant, company_admin, employee, tenant_user';
