-- Test Employee User Account
-- Migration: 011_test_employee_user.sql
-- Purpose: Create a user account for Adaeze Okonkwo so she can log in as an employee

-- Password: Employee123! (bcrypt hashed)
-- This is the same password format used in the E2E tests

-- Create user account for Adaeze Okonkwo
INSERT INTO users (
    id,
    tenant_id,
    email,
    password_hash,
    first_name,
    last_name,
    user_type,
    company_id,
    employee_id,
    is_active
) VALUES (
    'u0000001-0000-0000-0000-000000000001',
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',  -- meHR tenant
    'adaeze.okonkwo@teamace.ng',
    '$2a$10$CSZobTMK6St/NvkY/5O2nevksZb4mxHhBbnyLvFDiiKWmtuLi9Ca6',  -- Employee123!
    'Adaeze',
    'Okonkwo',
    'employee',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',  -- TeamACE company
    'e0000001-0000-0000-0000-000000000001',  -- Adaeze's employee record
    true
)
ON CONFLICT (email) DO UPDATE SET
    user_type = 'employee',
    company_id = EXCLUDED.company_id,
    employee_id = EXCLUDED.employee_id,
    password_hash = EXCLUDED.password_hash;

-- Update employee record to link back to user
UPDATE employees
SET user_id = 'u0000001-0000-0000-0000-000000000001',
    ess_enabled = true,
    ess_activated_at = NOW()
WHERE id = 'e0000001-0000-0000-0000-000000000001';

-- Verification
SELECT
    u.email,
    u.first_name,
    u.last_name,
    u.user_type,
    e.job_title,
    e.department,
    c.trading_name as company
FROM users u
JOIN employees e ON u.employee_id = e.id
JOIN companies c ON e.company_id = c.id
WHERE u.email = 'adaeze.okonkwo@teamace.ng';
