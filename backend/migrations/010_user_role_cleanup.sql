-- Migration 010: User Role Structure Cleanup
-- Establishes clear 5-level user hierarchy:
-- 1. superadmin - Platform admin (separate table)
-- 2. consultant - HR consulting firm admin
-- 3. staff - Consultant's deployed worker
-- 4. company_admin - Company's own HR admin
-- 5. employee - Company employee (self-service only)

-- 1. Add staff_id to users table to link staff users to their staff record
ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_id UUID REFERENCES staff(id);

-- 2. Create staff-to-company deployment access table
-- This tracks which staff members are deployed to which companies
CREATE TABLE IF NOT EXISTS staff_company_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES consultants(id),
    access_type VARCHAR(50) DEFAULT 'full_admin',  -- full_admin, read_only, limited
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,  -- NULL means ongoing
    status VARCHAR(50) DEFAULT 'active',  -- active, inactive, suspended
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    UNIQUE(staff_id, company_id, status)  -- Prevent duplicate active deployments
);

-- 3. Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_staff_company_access_staff ON staff_company_access(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_company_access_company ON staff_company_access(company_id);
CREATE INDEX IF NOT EXISTS idx_staff_company_access_consultant ON staff_company_access(consultant_id);
CREATE INDEX IF NOT EXISTS idx_staff_company_access_active ON staff_company_access(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_staff_company_access_dates ON staff_company_access(start_date, end_date);

-- 4. Add index on users.staff_id for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_staff_id ON users(staff_id) WHERE staff_id IS NOT NULL;

-- 5. Comment on table for documentation
COMMENT ON TABLE staff_company_access IS 'Tracks which consultant staff members are deployed to which client companies';
COMMENT ON COLUMN staff_company_access.access_type IS 'Level of access: full_admin (same as company_admin), read_only, limited';
COMMENT ON COLUMN staff_company_access.status IS 'Deployment status: active, inactive, suspended';
