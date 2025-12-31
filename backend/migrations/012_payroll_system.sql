-- Migration: 012_payroll_system.sql
-- Purpose: Create payroll processing tables for Nigerian payroll compliance
-- Date: 2025-12-31

-- ============================================================================
-- 1. SALARY COMPONENTS TABLE
-- Stores individual salary component breakdown per employee
-- ============================================================================
CREATE TABLE IF NOT EXISTS salary_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    component_type VARCHAR(50) NOT NULL, -- basic, housing, transport, meal, utility, leave, other
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
);

-- Component types enum-like constraint
ALTER TABLE salary_components
ADD CONSTRAINT chk_component_type
CHECK (component_type IN ('basic', 'housing', 'transport', 'meal', 'utility', 'leave', 'thirteenth_month', 'other'));

-- Index for fast employee lookup
CREATE INDEX idx_salary_components_employee ON salary_components(employee_id);
CREATE INDEX idx_salary_components_tenant ON salary_components(tenant_id);
CREATE INDEX idx_salary_components_active ON salary_components(employee_id)
    WHERE end_date IS NULL OR end_date >= CURRENT_DATE;

-- ============================================================================
-- 2. PAYROLL RUNS TABLE
-- Monthly payroll batch processing tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS payroll_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    -- Period details
    pay_period_month INTEGER NOT NULL CHECK (pay_period_month BETWEEN 1 AND 12),
    pay_period_year INTEGER NOT NULL CHECK (pay_period_year >= 2020),
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    payment_date DATE NOT NULL,
    -- Status workflow
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'calculated', 'approved', 'paid', 'cancelled')),
    -- Totals (populated after processing)
    total_gross DECIMAL(15,2) DEFAULT 0,
    total_net DECIMAL(15,2) DEFAULT 0,
    total_paye DECIMAL(15,2) DEFAULT 0,
    total_pension_employee DECIMAL(15,2) DEFAULT 0,
    total_pension_employer DECIMAL(15,2) DEFAULT 0,
    total_nhf DECIMAL(15,2) DEFAULT 0,
    total_nsitf DECIMAL(15,2) DEFAULT 0,
    total_itf DECIMAL(15,2) DEFAULT 0,
    employee_count INTEGER DEFAULT 0,
    -- Audit
    processed_by UUID REFERENCES users(id),
    processed_at TIMESTAMP,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    paid_by UUID REFERENCES users(id),
    paid_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: one payroll run per company per month
CREATE UNIQUE INDEX idx_payroll_runs_unique_period
ON payroll_runs(company_id, pay_period_month, pay_period_year)
WHERE status != 'cancelled';

-- Indexes
CREATE INDEX idx_payroll_runs_company ON payroll_runs(company_id);
CREATE INDEX idx_payroll_runs_tenant ON payroll_runs(tenant_id);
CREATE INDEX idx_payroll_runs_period ON payroll_runs(pay_period_year, pay_period_month);
CREATE INDEX idx_payroll_runs_status ON payroll_runs(status);

-- ============================================================================
-- 3. PAYSLIPS TABLE
-- Individual employee payroll records for each run
-- ============================================================================
CREATE TABLE IF NOT EXISTS payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payroll_run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    -- Employee snapshot (in case employee data changes)
    employee_name VARCHAR(255) NOT NULL,
    employee_id_number VARCHAR(50),
    department VARCHAR(100),
    job_title VARCHAR(100),
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(255),
    -- Earnings breakdown
    basic_salary DECIMAL(15,2) DEFAULT 0,
    housing_allowance DECIMAL(15,2) DEFAULT 0,
    transport_allowance DECIMAL(15,2) DEFAULT 0,
    meal_allowance DECIMAL(15,2) DEFAULT 0,
    utility_allowance DECIMAL(15,2) DEFAULT 0,
    leave_allowance DECIMAL(15,2) DEFAULT 0,
    thirteenth_month DECIMAL(15,2) DEFAULT 0,
    other_allowances DECIMAL(15,2) DEFAULT 0,
    gross_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- Annual equivalents (for PAYE calculation)
    annual_gross DECIMAL(15,2) DEFAULT 0,
    annual_taxable DECIMAL(15,2) DEFAULT 0,
    -- Nigerian statutory deductions
    paye_tax DECIMAL(15,2) DEFAULT 0,
    pension_employee DECIMAL(15,2) DEFAULT 0,
    pension_employer DECIMAL(15,2) DEFAULT 0,
    nhf DECIMAL(15,2) DEFAULT 0,
    -- Relief allowances
    consolidated_relief DECIMAL(15,2) DEFAULT 0,
    -- Other deductions
    loan_deduction DECIMAL(15,2) DEFAULT 0,
    salary_advance DECIMAL(15,2) DEFAULT 0,
    other_deductions DECIMAL(15,2) DEFAULT 0,
    -- Totals
    total_deductions DECIMAL(15,2) DEFAULT 0,
    net_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    -- Employer contributions (not deducted from employee)
    employer_pension DECIMAL(15,2) DEFAULT 0,
    employer_nsitf DECIMAL(15,2) DEFAULT 0,
    employer_itf DECIMAL(15,2) DEFAULT 0,
    -- Tax calculation details (JSON for audit trail)
    calculation_details JSONB,
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'void')),
    -- Audit
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint: one payslip per employee per payroll run
CREATE UNIQUE INDEX idx_payslips_unique ON payslips(payroll_run_id, employee_id);

-- Indexes
CREATE INDEX idx_payslips_employee ON payslips(employee_id);
CREATE INDEX idx_payslips_payroll_run ON payslips(payroll_run_id);
CREATE INDEX idx_payslips_tenant ON payslips(tenant_id);
CREATE INDEX idx_payslips_status ON payslips(status);

-- ============================================================================
-- 4. EMPLOYEE DEDUCTIONS TABLE
-- Recurring deductions (loans, advances, etc.) to be applied to payslips
-- ============================================================================
CREATE TABLE IF NOT EXISTS employee_deductions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    deduction_type VARCHAR(50) NOT NULL CHECK (deduction_type IN ('loan', 'salary_advance', 'other')),
    description VARCHAR(255) NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL,
    monthly_deduction DECIMAL(15,2) NOT NULL,
    amount_deducted DECIMAL(15,2) DEFAULT 0,
    amount_remaining DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended', 'cancelled')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_employee_deductions_employee ON employee_deductions(employee_id);
CREATE INDEX idx_employee_deductions_active ON employee_deductions(employee_id) WHERE status = 'active';

-- ============================================================================
-- 5. STATUTORY REMITTANCE TRACKING
-- Track remittances to statutory bodies (pension, tax, NHF)
-- ============================================================================
CREATE TABLE IF NOT EXISTS statutory_remittances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    payroll_run_id UUID REFERENCES payroll_runs(id),
    remittance_type VARCHAR(50) NOT NULL CHECK (remittance_type IN ('paye', 'pension', 'nhf', 'nsitf', 'itf')),
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    due_date DATE,
    remitted_date DATE,
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'remitted', 'overdue')),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_statutory_remittances_company ON statutory_remittances(company_id);
CREATE INDEX idx_statutory_remittances_period ON statutory_remittances(period_year, period_month);

-- ============================================================================
-- 6. UPDATE TRIGGER FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all new tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['salary_components', 'payroll_runs', 'payslips', 'employee_deductions', 'statutory_remittances'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
        EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END
$$;

-- ============================================================================
-- 7. SEED DEFAULT SALARY COMPONENT TEMPLATE
-- Note: Actual employee components should be set per employee
-- ============================================================================
COMMENT ON TABLE salary_components IS 'Stores salary breakdown per employee. Standard Nigerian components: Basic (40-50%), Housing (20-25%), Transport (10-15%), Utility (5-10%), Meal (5-10%)';
COMMENT ON TABLE payroll_runs IS 'Monthly payroll batches. One run per company per month.';
COMMENT ON TABLE payslips IS 'Individual employee payslips with full Nigerian tax compliance.';
COMMENT ON TABLE employee_deductions IS 'Recurring deductions like loans and salary advances.';
COMMENT ON TABLE statutory_remittances IS 'Track payments to FIRS (PAYE), PFA (Pension), FMBN (NHF), NSITF, ITF.';
