-- Migration 021: Seed Policy Categories for CoreHR Tenant
-- Direct insert for tenant 701e2f84-9cae-47b7-87e8-1954a23c46e1

-- First, ensure the tenant exists in tenants table
INSERT INTO tenants (id, name, slug, is_active)
VALUES ('701e2f84-9cae-47b7-87e8-1954a23c46e1', 'CoreHR Consulting', 'corehr', true)
ON CONFLICT (id) DO NOTHING;

-- Code of Conduct
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Code of Conduct', 'CODE_OF_CONDUCT', 'Employee behavior and ethics guidelines', TRUE, 1
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'CODE_OF_CONDUCT' AND deleted_at IS NULL);

-- Leave Policy
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Leave Policy', 'LEAVE_POLICY', 'Annual, sick, and other leave entitlements', TRUE, 2
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'LEAVE_POLICY' AND deleted_at IS NULL);

-- Sexual Harassment
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Sexual Harassment', 'SEXUAL_HARASSMENT', 'Anti-harassment policies and reporting procedures', TRUE, 3
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'SEXUAL_HARASSMENT' AND deleted_at IS NULL);

-- IT Security
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'IT Security', 'IT_SECURITY', 'Information security and acceptable use policies', TRUE, 4
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'IT_SECURITY' AND deleted_at IS NULL);

-- Health & Safety
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Health & Safety', 'HEALTH_SAFETY', 'Workplace health and safety guidelines', TRUE, 5
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'HEALTH_SAFETY' AND deleted_at IS NULL);

-- Data Protection (NDPR)
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Data Protection (NDPR)', 'NDPR', 'Nigeria Data Protection Regulation compliance', TRUE, 6
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'NDPR' AND deleted_at IS NULL);

-- Pension Compliance
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Pension Compliance', 'PENSION', 'Contributory pension scheme policies', TRUE, 7
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'PENSION' AND deleted_at IS NULL);

-- NHF Compliance
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'NHF Compliance', 'NHF', 'National Housing Fund obligations', TRUE, 8
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'NHF' AND deleted_at IS NULL);

-- Labour Act
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Labour Act', 'LABOUR_ACT', 'Nigerian Labour Act compliance', TRUE, 9
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'LABOUR_ACT' AND deleted_at IS NULL);

-- Remote Work
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Remote Work', 'REMOTE_WORK', 'Work from home and remote work policies', TRUE, 10
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'REMOTE_WORK' AND deleted_at IS NULL);

-- Expense Policy
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Expense Policy', 'EXPENSE', 'Expense reimbursement guidelines', TRUE, 11
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'EXPENSE' AND deleted_at IS NULL);

-- Onboarding
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT '701e2f84-9cae-47b7-87e8-1954a23c46e1', 'Onboarding', 'ONBOARDING', 'New employee orientation materials', TRUE, 12
WHERE NOT EXISTS (SELECT 1 FROM policy_categories WHERE tenant_id = '701e2f84-9cae-47b7-87e8-1954a23c46e1' AND code = 'ONBOARDING' AND deleted_at IS NULL);
