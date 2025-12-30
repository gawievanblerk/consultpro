-- CoreHR Leave Management Module
-- Phase 1 Feature: Leave Types, Balances, and Requests

-- ============================================================================
-- LEAVE TYPES
-- ============================================================================
-- Configurable leave types per tenant (Annual, Sick, Maternity, etc.)

CREATE TABLE leave_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL, -- e.g., 'ANNUAL', 'SICK', 'MATERNITY'
    description TEXT,
    days_allowed INTEGER NOT NULL DEFAULT 0, -- Default annual entitlement
    carry_forward BOOLEAN DEFAULT FALSE, -- Can unused days carry to next year?
    max_carry_forward INTEGER DEFAULT 0, -- Maximum days that can carry forward
    requires_approval BOOLEAN DEFAULT TRUE,
    requires_documentation BOOLEAN DEFAULT FALSE, -- e.g., medical certificate for sick leave
    is_paid BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    -- Eligibility
    min_service_months INTEGER DEFAULT 0, -- Minimum months of service required
    gender_restriction VARCHAR(20), -- NULL=all, 'male', 'female'
    -- Display
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for calendar display
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(tenant_id, code)
);

-- ============================================================================
-- LEAVE BALANCES
-- ============================================================================
-- Tracks leave entitlement and usage per employee per year

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    staff_id UUID NOT NULL REFERENCES staff(id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    year INTEGER NOT NULL,
    -- Entitlements
    entitled_days DECIMAL(5,2) NOT NULL DEFAULT 0, -- Can be fractional for pro-rata
    carried_forward DECIMAL(5,2) DEFAULT 0,
    adjustment_days DECIMAL(5,2) DEFAULT 0, -- Manual adjustments (+/-)
    adjustment_reason TEXT,
    -- Usage
    used_days DECIMAL(5,2) DEFAULT 0,
    pending_days DECIMAL(5,2) DEFAULT 0, -- Days in pending requests
    -- Calculated fields (updated by triggers/application)
    available_days DECIMAL(5,2) GENERATED ALWAYS AS (
        entitled_days + carried_forward + adjustment_days - used_days - pending_days
    ) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, leave_type_id, year)
);

-- ============================================================================
-- LEAVE REQUESTS
-- ============================================================================
-- Individual leave request records with approval workflow

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    staff_id UUID NOT NULL REFERENCES staff(id),
    leave_type_id UUID NOT NULL REFERENCES leave_types(id),
    leave_balance_id UUID REFERENCES leave_balances(id),
    -- Request details
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(5,2) NOT NULL,
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_period VARCHAR(20), -- 'morning' or 'afternoon'
    reason TEXT,
    -- Workflow
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled, withdrawn
    -- Approval chain
    approver_id UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    -- Cancellation
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    -- Documentation
    supporting_document_url TEXT,
    -- Metadata
    requested_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================================================
-- PUBLIC HOLIDAYS
-- ============================================================================
-- Nigerian public holidays for accurate leave day calculations

CREATE TABLE public_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id), -- NULL = applies to all tenants
    name VARCHAR(200) NOT NULL,
    date DATE NOT NULL,
    year INTEGER NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE, -- Same date every year
    recurring_month INTEGER,
    recurring_day INTEGER,
    country VARCHAR(100) DEFAULT 'Nigeria',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_leave_types_tenant ON leave_types(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_balances_staff ON leave_balances(staff_id);
CREATE INDEX idx_leave_balances_year ON leave_balances(tenant_id, year);
CREATE INDEX idx_leave_requests_staff ON leave_requests(staff_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_requests_status ON leave_requests(tenant_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leave_requests_dates ON leave_requests(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_public_holidays_date ON public_holidays(date);
CREATE INDEX idx_public_holidays_year ON public_holidays(year);

-- ============================================================================
-- SEED DATA: Default Nigerian Leave Types
-- ============================================================================

-- Insert default leave types for the demo tenant
INSERT INTO leave_types (tenant_id, name, code, description, days_allowed, carry_forward, max_carry_forward, requires_approval, requires_documentation, is_paid, min_service_months, gender_restriction, color, sort_order)
SELECT
    id as tenant_id,
    lt.name,
    lt.code,
    lt.description,
    lt.days_allowed,
    lt.carry_forward,
    lt.max_carry_forward,
    lt.requires_approval,
    lt.requires_documentation,
    lt.is_paid,
    lt.min_service_months,
    lt.gender_restriction,
    lt.color,
    lt.sort_order
FROM tenants, (VALUES
    ('Annual Leave', 'ANNUAL', 'Standard annual leave entitlement per Nigeria Labour Act', 21, true, 5, true, false, true, 12, NULL, '#10B981', 1),
    ('Sick Leave', 'SICK', 'Leave for illness with medical certificate', 12, false, 0, true, true, true, 0, NULL, '#EF4444', 2),
    ('Maternity Leave', 'MATERNITY', '12 weeks maternity leave (6 weeks post-delivery minimum)', 84, false, 0, true, true, true, 0, 'female', '#EC4899', 3),
    ('Paternity Leave', 'PATERNITY', 'Leave for new fathers (company discretion)', 10, false, 0, true, true, true, 0, 'male', '#8B5CF6', 4),
    ('Compassionate Leave', 'COMPASSIONATE', 'Leave for bereavement or family emergency', 5, false, 0, true, false, true, 0, NULL, '#6B7280', 5),
    ('Study Leave', 'STUDY', 'Leave for professional examinations', 5, false, 0, true, true, true, 6, NULL, '#F59E0B', 6),
    ('Unpaid Leave', 'UNPAID', 'Leave without pay', 30, false, 0, true, false, false, 0, NULL, '#9CA3AF', 7)
) AS lt(name, code, description, days_allowed, carry_forward, max_carry_forward, requires_approval, requires_documentation, is_paid, min_service_months, gender_restriction, color, sort_order)
WHERE tenants.deleted_at IS NULL;

-- ============================================================================
-- SEED DATA: Nigerian Public Holidays 2025
-- ============================================================================

INSERT INTO public_holidays (name, date, year, is_recurring, recurring_month, recurring_day, country)
VALUES
    ('New Year''s Day', '2025-01-01', 2025, true, 1, 1, 'Nigeria'),
    ('Eid-el-Maulud (Mawlid)', '2025-01-27', 2025, false, NULL, NULL, 'Nigeria'),
    ('Good Friday', '2025-04-18', 2025, false, NULL, NULL, 'Nigeria'),
    ('Easter Monday', '2025-04-21', 2025, false, NULL, NULL, 'Nigeria'),
    ('Workers'' Day', '2025-05-01', 2025, true, 5, 1, 'Nigeria'),
    ('Democracy Day', '2025-06-12', 2025, true, 6, 12, 'Nigeria'),
    ('Eid-el-Fitr', '2025-03-30', 2025, false, NULL, NULL, 'Nigeria'),
    ('Eid-el-Fitr Holiday', '2025-03-31', 2025, false, NULL, NULL, 'Nigeria'),
    ('Eid-el-Kabir', '2025-06-06', 2025, false, NULL, NULL, 'Nigeria'),
    ('Eid-el-Kabir Holiday', '2025-06-07', 2025, false, NULL, NULL, 'Nigeria'),
    ('Independence Day', '2025-10-01', 2025, true, 10, 1, 'Nigeria'),
    ('Christmas Day', '2025-12-25', 2025, true, 12, 25, 'Nigeria'),
    ('Boxing Day', '2025-12-26', 2025, true, 12, 26, 'Nigeria');

-- ============================================================================
-- SEED DATA: Sample Leave Balances for Demo Staff
-- ============================================================================

-- Create leave balances for all existing staff for current year
INSERT INTO leave_balances (tenant_id, staff_id, leave_type_id, year, entitled_days, carried_forward, used_days, pending_days)
SELECT
    s.tenant_id,
    s.id as staff_id,
    lt.id as leave_type_id,
    2025 as year,
    lt.days_allowed as entitled_days,
    CASE WHEN lt.code = 'ANNUAL' THEN FLOOR(RANDOM() * 3)::DECIMAL ELSE 0 END as carried_forward,
    CASE
        WHEN lt.code = 'ANNUAL' THEN FLOOR(RANDOM() * 10)::DECIMAL
        WHEN lt.code = 'SICK' THEN FLOOR(RANDOM() * 3)::DECIMAL
        ELSE 0
    END as used_days,
    0 as pending_days
FROM staff s
JOIN leave_types lt ON s.tenant_id = lt.tenant_id
WHERE s.deleted_at IS NULL
  AND lt.deleted_at IS NULL
  AND lt.is_active = true
  -- Respect gender restrictions
  AND (lt.gender_restriction IS NULL
       OR (lt.gender_restriction = 'female' AND s.gender = 'Female')
       OR (lt.gender_restriction = 'male' AND s.gender = 'Male'));

-- ============================================================================
-- SEED DATA: Sample Leave Requests
-- ============================================================================

-- Add a few sample leave requests for demo purposes
INSERT INTO leave_requests (tenant_id, staff_id, leave_type_id, start_date, end_date, days_requested, reason, status, created_at)
SELECT
    s.tenant_id,
    s.id as staff_id,
    lt.id as leave_type_id,
    '2025-01-15'::DATE as start_date,
    '2025-01-17'::DATE as end_date,
    3 as days_requested,
    'Family vacation' as reason,
    'approved' as status,
    NOW() - INTERVAL '30 days' as created_at
FROM staff s
JOIN leave_types lt ON s.tenant_id = lt.tenant_id AND lt.code = 'ANNUAL'
WHERE s.deleted_at IS NULL
LIMIT 1;

INSERT INTO leave_requests (tenant_id, staff_id, leave_type_id, start_date, end_date, days_requested, reason, status, created_at)
SELECT
    s.tenant_id,
    s.id as staff_id,
    lt.id as leave_type_id,
    '2025-02-10'::DATE as start_date,
    '2025-02-14'::DATE as end_date,
    5 as days_requested,
    'Annual family trip' as reason,
    'pending' as status,
    NOW() - INTERVAL '5 days' as created_at
FROM staff s
JOIN leave_types lt ON s.tenant_id = lt.tenant_id AND lt.code = 'ANNUAL'
WHERE s.deleted_at IS NULL
OFFSET 1 LIMIT 1;
