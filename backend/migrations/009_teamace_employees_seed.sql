-- TeamACE Employee Seed Data
-- Migration: 009_teamace_employees_seed.sql
-- Purpose: Create TeamACE as a company with demo employees

-- ============================================================================
-- SETUP CONSULTANT (meHR)
-- ============================================================================

-- Create meHR tenant if not exists
INSERT INTO tenants (id, name, slug, settings)
VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'meHR', 'mehr', '{"timezone": "Africa/Lagos", "currency": "NGN"}')
ON CONFLICT (id) DO NOTHING;

-- Create meHR consultant record
INSERT INTO consultants (id, tenant_id, company_name, trading_name, email, phone, tier, max_companies, max_employees_per_company, subscription_status)
VALUES (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    'meHR Consulting',
    'meHR',
    'info@mehr.ng',
    '+234 800 000 0001',
    'professional',
    50,
    500,
    'active'
)
ON CONFLICT (tenant_id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    tier = EXCLUDED.tier,
    max_companies = EXCLUDED.max_companies,
    max_employees_per_company = EXCLUDED.max_employees_per_company;

-- ============================================================================
-- SETUP TEAMACE AS A COMPANY (managed by meHR consultant)
-- ============================================================================

INSERT INTO companies (id, consultant_id, legal_name, trading_name, company_type, industry, email, phone, city, state, country)
VALUES (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'TeamACE Nigeria Limited',
    'TeamACE',
    'Private',
    'Human Resources',
    'hr@teamace.ng',
    '+234 800 000 0002',
    'Lagos',
    'Lagos',
    'Nigeria'
)
ON CONFLICT (id) DO UPDATE SET
    legal_name = EXCLUDED.legal_name;

-- ============================================================================
-- LINK ADMIN USER TO COMPANY
-- ============================================================================

-- Update admin user with company_id
UPDATE users
SET company_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd',
    user_type = 'company_admin'
WHERE email = 'admin@teamace.ng';

-- ============================================================================
-- INSERT DEMO EMPLOYEES FOR TEAMACE
-- ============================================================================

INSERT INTO employees (
    id, company_id, employee_number, first_name, last_name, email, phone,
    date_of_birth, gender, job_title, department, employment_type, employment_status,
    hire_date, salary, salary_currency, nationality,
    nin, bvn, bank_name, bank_account_number, bank_account_name,
    ess_enabled
) VALUES
-- Employee 1: Adaeze Okonkwo - HR Manager
(
    'e0000001-0000-0000-0000-000000000001',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'EMP-2024-0001',
    'Adaeze', 'Okonkwo',
    'adaeze.okonkwo@teamace.ng',
    '+234 802 111 2221',
    '1988-03-15', 'Female',
    'HR Manager', 'Human Resources',
    'full_time', 'active',
    '2021-01-15',
    650000, 'NGN', 'Nigerian',
    '12345678901', '22345678901',
    'Access Bank', '0123456789', 'Adaeze Okonkwo',
    true
),
-- Employee 2: Emeka Nwachukwu - Senior Consultant
(
    'e0000002-0000-0000-0000-000000000002',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'EMP-2024-0002',
    'Emeka', 'Nwachukwu',
    'emeka.nwachukwu@teamace.ng',
    '+234 803 222 3331',
    '1985-07-22', 'Male',
    'Senior HR Consultant', 'Consulting',
    'full_time', 'active',
    '2020-06-01',
    850000, 'NGN', 'Nigerian',
    '23456789012', '33456789012',
    'GTBank', '0234567890', 'Emeka Nwachukwu',
    true
),
-- Employee 3: Funke Adeyemi - Recruitment Lead
(
    'e0000003-0000-0000-0000-000000000003',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'EMP-2024-0003',
    'Funke', 'Adeyemi',
    'funke.adeyemi@teamace.ng',
    '+234 804 333 4441',
    '1990-11-08', 'Female',
    'Recruitment Lead', 'Talent Acquisition',
    'full_time', 'active',
    '2022-03-01',
    550000, 'NGN', 'Nigerian',
    '34567890123', '44567890123',
    'UBA', '0345678901', 'Funke Adeyemi',
    true
),
-- Employee 4: Ibrahim Mohammed - Training Coordinator
(
    'e0000004-0000-0000-0000-000000000004',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'EMP-2024-0004',
    'Ibrahim', 'Mohammed',
    'ibrahim.mohammed@teamace.ng',
    '+234 805 444 5551',
    '1992-05-30', 'Male',
    'Training Coordinator', 'Learning & Development',
    'full_time', 'active',
    '2023-01-10',
    450000, 'NGN', 'Nigerian',
    '45678901234', '55678901234',
    'First Bank', '0456789012', 'Ibrahim Mohammed',
    false
),
-- Employee 5: Nneka Eze - Payroll Officer
(
    'e0000005-0000-0000-0000-000000000005',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'EMP-2024-0005',
    'Nneka', 'Eze',
    'nneka.eze@teamace.ng',
    '+234 806 555 6661',
    '1994-09-12', 'Female',
    'Payroll Officer', 'Finance',
    'full_time', 'active',
    '2023-06-15',
    380000, 'NGN', 'Nigerian',
    '56789012345', '66789012345',
    'Zenith Bank', '0567890123', 'Nneka Eze',
    false
),
-- Employee 6: Chukwudi Okoro - HR Assistant (Probation)
(
    'e0000006-0000-0000-0000-000000000006',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'EMP-2024-0006',
    'Chukwudi', 'Okoro',
    'chukwudi.okoro@teamace.ng',
    '+234 807 666 7771',
    '1996-12-03', 'Male',
    'HR Assistant', 'Human Resources',
    'full_time', 'probation',
    '2024-11-01',
    280000, 'NGN', 'Nigerian',
    NULL, NULL,
    'Stanbic IBTC', '0678901234', 'Chukwudi Okoro',
    false
),
-- Employee 7: Amina Yusuf - Admin Officer
(
    'e0000007-0000-0000-0000-000000000007',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'EMP-2024-0007',
    'Amina', 'Yusuf',
    'amina.yusuf@teamace.ng',
    '+234 808 777 8881',
    '1991-04-18', 'Female',
    'Administrative Officer', 'Administration',
    'full_time', 'active',
    '2022-09-01',
    320000, 'NGN', 'Nigerian',
    '67890123456', '77890123456',
    'Fidelity Bank', '0789012345', 'Amina Yusuf',
    true
),
-- Employee 8: Oluwole Adekunle - IT Support (Contract)
(
    'e0000008-0000-0000-0000-000000000008',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'EMP-2024-0008',
    'Oluwole', 'Adekunle',
    'oluwole.adekunle@teamace.ng',
    '+234 809 888 9991',
    '1993-08-25', 'Male',
    'IT Support Specialist', 'IT',
    'contract', 'active',
    '2024-06-01',
    400000, 'NGN', 'Nigerian',
    '78901234567', '88901234567',
    'Wema Bank', '0890123456', 'Oluwole Adekunle',
    false
)
ON CONFLICT (id) DO UPDATE SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    job_title = EXCLUDED.job_title,
    department = EXCLUDED.department;

-- Success message
SELECT 'TeamACE employees seeded successfully!' as message, COUNT(*) as employee_count FROM employees WHERE company_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
