-- Migration 020: Seed Policy Categories for All Tenants
-- Re-runs the policy category seeding to ensure all tenants have default categories

-- ============================================================================
-- SEED DATA: Default Policy Categories for ALL Tenants
-- Uses NOT EXISTS to avoid duplicates (no unique constraint on table)
-- ============================================================================

-- Code of Conduct
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Code of Conduct' as name,
    'CODE_OF_CONDUCT' as code,
    'Employee behavior and ethics guidelines' as description,
    TRUE as is_system,
    1 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'CODE_OF_CONDUCT' AND pc.deleted_at IS NULL
);

-- Leave Policy
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Leave Policy' as name,
    'LEAVE_POLICY' as code,
    'Annual, sick, and other leave entitlements' as description,
    TRUE as is_system,
    2 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'LEAVE_POLICY' AND pc.deleted_at IS NULL
);

-- Sexual Harassment
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Sexual Harassment' as name,
    'SEXUAL_HARASSMENT' as code,
    'Anti-harassment policies and reporting procedures' as description,
    TRUE as is_system,
    3 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'SEXUAL_HARASSMENT' AND pc.deleted_at IS NULL
);

-- IT Security
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'IT Security' as name,
    'IT_SECURITY' as code,
    'Information security and acceptable use policies' as description,
    TRUE as is_system,
    4 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'IT_SECURITY' AND pc.deleted_at IS NULL
);

-- Health & Safety
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Health & Safety' as name,
    'HEALTH_SAFETY' as code,
    'Workplace health and safety guidelines' as description,
    TRUE as is_system,
    5 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'HEALTH_SAFETY' AND pc.deleted_at IS NULL
);

-- Data Protection (NDPR)
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Data Protection (NDPR)' as name,
    'NDPR' as code,
    'Nigeria Data Protection Regulation compliance' as description,
    TRUE as is_system,
    6 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'NDPR' AND pc.deleted_at IS NULL
);

-- Pension Compliance
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Pension Compliance' as name,
    'PENSION' as code,
    'Contributory pension scheme policies' as description,
    TRUE as is_system,
    7 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'PENSION' AND pc.deleted_at IS NULL
);

-- NHF Compliance
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'NHF Compliance' as name,
    'NHF' as code,
    'National Housing Fund obligations' as description,
    TRUE as is_system,
    8 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'NHF' AND pc.deleted_at IS NULL
);

-- Labour Act
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Labour Act' as name,
    'LABOUR_ACT' as code,
    'Nigerian Labour Act compliance' as description,
    TRUE as is_system,
    9 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'LABOUR_ACT' AND pc.deleted_at IS NULL
);

-- Remote Work
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Remote Work' as name,
    'REMOTE_WORK' as code,
    'Work from home and remote work policies' as description,
    TRUE as is_system,
    10 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'REMOTE_WORK' AND pc.deleted_at IS NULL
);

-- Expense Policy
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Expense Policy' as name,
    'EXPENSE' as code,
    'Expense reimbursement guidelines' as description,
    TRUE as is_system,
    11 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'EXPENSE' AND pc.deleted_at IS NULL
);

-- Onboarding
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    t.id as tenant_id,
    'Onboarding' as name,
    'ONBOARDING' as code,
    'New employee orientation materials' as description,
    TRUE as is_system,
    12 as sort_order
FROM tenants t
WHERE t.deleted_at IS NULL
AND NOT EXISTS (
    SELECT 1 FROM policy_categories pc
    WHERE pc.tenant_id = t.id AND pc.code = 'ONBOARDING' AND pc.deleted_at IS NULL
);
