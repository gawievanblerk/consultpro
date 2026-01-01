-- ============================================================================
-- Migration 015: Statutory Remittances Tracking
-- ============================================================================
-- Tracks PAYE, Pension, NHF, NSITF, ITF remittances to government agencies
-- ============================================================================

-- Statutory remittances table
CREATE TABLE IF NOT EXISTS statutory_remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Remittance details
    remittance_type VARCHAR(20) NOT NULL CHECK (remittance_type IN ('paye', 'pension', 'nhf', 'nsitf', 'itf')),
    pay_period_month INTEGER NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
    pay_period_year INTEGER NOT NULL,

    -- Amounts
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    employee_contribution DECIMAL(15, 2) DEFAULT 0,
    employer_contribution DECIMAL(15, 2) DEFAULT 0,

    -- Agency details
    agency_name VARCHAR(200),
    agency_account_number VARCHAR(50),
    agency_bank VARCHAR(100),
    reference_number VARCHAR(100),

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'paid', 'confirmed', 'overdue')),
    due_date DATE,
    payment_date DATE,
    confirmation_date DATE,

    -- Payment details
    payment_reference VARCHAR(100),
    payment_method VARCHAR(50),
    payment_bank VARCHAR(100),
    receipt_number VARCHAR(100),
    receipt_url VARCHAR(500),

    -- Linked payroll run (optional)
    payroll_run_id UUID REFERENCES payroll_runs(id),

    -- Audit
    created_by UUID,
    confirmed_by UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for statutory remittances
CREATE INDEX IF NOT EXISTS idx_remittances_tenant ON statutory_remittances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_remittances_company ON statutory_remittances(company_id);
CREATE INDEX IF NOT EXISTS idx_remittances_type ON statutory_remittances(remittance_type);
CREATE INDEX IF NOT EXISTS idx_remittances_period ON statutory_remittances(pay_period_year, pay_period_month);
CREATE INDEX IF NOT EXISTS idx_remittances_status ON statutory_remittances(status);
CREATE INDEX IF NOT EXISTS idx_remittances_due_date ON statutory_remittances(due_date);

-- Unique constraint for one remittance per type per period per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_remittances_unique_period
ON statutory_remittances(tenant_id, company_id, remittance_type, pay_period_year, pay_period_month);

-- Pension Fund Administrators (PFAs) reference table
CREATE TABLE IF NOT EXISTS pension_fund_administrators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    code VARCHAR(20) UNIQUE,
    rsa_prefix VARCHAR(10),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    sort_code VARCHAR(20),
    email VARCHAR(200),
    phone VARCHAR(50),
    address TEXT,
    website VARCHAR(200),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Seed Nigerian PFAs
INSERT INTO pension_fund_administrators (name, code, rsa_prefix) VALUES
    ('ARM Pension Managers Limited', 'ARM', '001'),
    ('Crusader Sterling Pensions Limited', 'CRUSADER', '002'),
    ('FCMB Pensions Limited', 'FCMB', '003'),
    ('Fidelity Pension Managers', 'FIDELITY', '004'),
    ('First Guarantee Pension Limited', 'FGP', '005'),
    ('IEI-Anchor Pension Managers Limited', 'IEI', '006'),
    ('Investment One Pension Managers Limited', 'INVESTMENT_ONE', '007'),
    ('Leadway Pensure PFA Limited', 'LEADWAY', '008'),
    ('NLPC Pension Fund Administrators Limited', 'NLPC', '009'),
    ('NPF Pensions Limited', 'NPF', '010'),
    ('OAK Pensions Limited', 'OAK', '011'),
    ('Pensions Alliance Limited', 'PAL', '012'),
    ('Premium Pension Limited', 'PREMIUM', '013'),
    ('Radix Pension Managers Limited', 'RADIX', '014'),
    ('Sigma Pensions Limited', 'SIGMA', '015'),
    ('Stanbic IBTC Pension Managers Limited', 'STANBIC', '016'),
    ('Tangerine APT Pensions Limited', 'TANGERINE', '017'),
    ('Trustfund Pensions Plc', 'TRUSTFUND', '018'),
    ('Veritas Glanvills Pensions Limited', 'VERITAS', '019')
ON CONFLICT (code) DO NOTHING;

-- Employee PFA assignments
CREATE TABLE IF NOT EXISTS employee_pfa_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pfa_id UUID NOT NULL REFERENCES pension_fund_administrators(id),
    rsa_pin VARCHAR(20) NOT NULL,
    effective_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emp_pfa_employee ON employee_pfa_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_pfa_pfa ON employee_pfa_assignments(pfa_id);

-- Remittance schedule templates
CREATE TABLE IF NOT EXISTS remittance_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    remittance_type VARCHAR(20) NOT NULL,

    -- Schedule settings
    due_day_of_month INTEGER DEFAULT 10, -- e.g., 10th of following month
    reminder_days_before INTEGER DEFAULT 3,
    auto_generate BOOLEAN DEFAULT true,

    -- Agency defaults
    agency_name VARCHAR(200),
    agency_account_number VARCHAR(50),
    agency_bank VARCHAR(100),

    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_unique
ON remittance_schedules(tenant_id, company_id, remittance_type);

-- Remittance audit log
CREATE TABLE IF NOT EXISTS remittance_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remittance_id UUID NOT NULL REFERENCES statutory_remittances(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    user_id UUID,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_remit_audit_remittance ON remittance_audit_log(remittance_id);
