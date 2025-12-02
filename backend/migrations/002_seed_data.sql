-- ConsultPro Demo Data
-- TeamACE HR/Consulting Platform MVP

-- ============================================================================
-- DEMO TENANT AND USERS
-- ============================================================================

-- Insert demo tenant
INSERT INTO tenants (id, name, slug, settings) VALUES
('11111111-1111-1111-1111-111111111111', 'TeamACE Nigeria', 'teamace', '{"timezone": "Africa/Lagos", "currency": "NGN", "vat_rate": 7.5}');

-- Insert demo users (password: Demo123!)
-- bcrypt hash for 'Demo123!' generated with bcryptjs (cost 10)
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, role) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'admin@teamace.ng', '$2a$10$Yz3.UU8qNy04JEzwCF8SIe9Rhc7T4LbxJ6PU69bxXJkTB8weeUSX6', 'Admin', 'User', 'admin'),
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'sales@teamace.ng', '$2a$10$Yz3.UU8qNy04JEzwCF8SIe9Rhc7T4LbxJ6PU69bxXJkTB8weeUSX6', 'Sales', 'Manager', 'sales'),
('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'hr@teamace.ng', '$2a$10$Yz3.UU8qNy04JEzwCF8SIe9Rhc7T4LbxJ6PU69bxXJkTB8weeUSX6', 'HR', 'Manager', 'hr');

-- ============================================================================
-- PIPELINE STAGES
-- ============================================================================

INSERT INTO pipeline_stages (id, tenant_id, name, description, position, probability) VALUES
('55555555-5555-5555-5555-555555555551', '11111111-1111-1111-1111-111111111111', 'Lead', 'Initial contact or inquiry', 1, 10),
('55555555-5555-5555-5555-555555555552', '11111111-1111-1111-1111-111111111111', 'Qualification', 'Assessing fit and budget', 2, 25),
('55555555-5555-5555-5555-555555555553', '11111111-1111-1111-1111-111111111111', 'Proposal', 'Proposal submitted', 3, 50),
('55555555-5555-5555-5555-555555555554', '11111111-1111-1111-1111-111111111111', 'Negotiation', 'Terms discussion', 4, 75),
('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'Closed Won', 'Deal completed', 5, 100);

-- ============================================================================
-- DEMO CLIENTS
-- ============================================================================

INSERT INTO clients (id, tenant_id, company_name, industry, email, phone, address_line1, city, state, tin, rc_number, client_type, client_tier, payment_terms, created_by) VALUES
('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', 'First Bank Nigeria Plc', 'Banking & Finance', 'hr@firstbanknigeria.com', '+234 1 905 2000', '35 Isaac John Street, GRA', 'Ikeja', 'Lagos', 'TIN-12345678', 'RC-12345', 'active', 'enterprise', 30, '22222222-2222-2222-2222-222222222222'),
('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', 'Dangote Industries Ltd', 'Manufacturing', 'procurement@dangote.com', '+234 1 448 0815', '1 Alfred Rewane Road', 'Ikoyi', 'Lagos', 'TIN-23456789', 'RC-23456', 'active', 'enterprise', 45, '22222222-2222-2222-2222-222222222222'),
('66666666-6666-6666-6666-666666666663', '11111111-1111-1111-1111-111111111111', 'MTN Nigeria', 'Telecommunications', 'vendors@mtnnigeria.net', '+234 803 123 4567', 'MTN Plaza, Falomo', 'Ikoyi', 'Lagos', 'TIN-34567890', 'RC-34567', 'active', 'enterprise', 30, '22222222-2222-2222-2222-222222222222'),
('66666666-6666-6666-6666-666666666664', '11111111-1111-1111-1111-111111111111', 'Total Nigeria Plc', 'Oil & Gas', 'contracts@total.ng', '+234 1 270 8200', '4 Afribank Street', 'Victoria Island', 'Lagos', 'TIN-45678901', 'RC-45678', 'active', 'enterprise', 60, '22222222-2222-2222-2222-222222222222'),
('66666666-6666-6666-6666-666666666665', '11111111-1111-1111-1111-111111111111', 'Andela Nigeria', 'Technology', 'partners@andela.com', '+234 1 888 9999', '235 Ikorodu Road', 'Yaba', 'Lagos', 'TIN-56789012', 'RC-56789', 'active', 'mid-market', 15, '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- DEMO CONTACTS
-- ============================================================================

INSERT INTO contacts (id, tenant_id, client_id, first_name, last_name, email, phone, job_title, department, is_primary, is_decision_maker, created_by) VALUES
('77777777-7777-7777-7777-777777777771', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', 'Adaeze', 'Okonkwo', 'adaeze.okonkwo@firstbank.ng', '+234 802 111 2222', 'Head of HR', 'Human Resources', true, true, '22222222-2222-2222-2222-222222222222'),
('77777777-7777-7777-7777-777777777772', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666662', 'Emeka', 'Nwachukwu', 'emeka.n@dangote.com', '+234 803 222 3333', 'Group HR Director', 'Human Resources', true, true, '22222222-2222-2222-2222-222222222222'),
('77777777-7777-7777-7777-777777777773', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666663', 'Funke', 'Adeyemi', 'funke.adeyemi@mtn.ng', '+234 804 333 4444', 'Procurement Manager', 'Procurement', true, false, '22222222-2222-2222-2222-222222222222'),
('77777777-7777-7777-7777-777777777774', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666664', 'Ibrahim', 'Mohammed', 'ibrahim.m@total.ng', '+234 805 444 5555', 'HR Business Partner', 'Human Resources', true, true, '22222222-2222-2222-2222-222222222222'),
('77777777-7777-7777-7777-777777777775', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666665', 'Nneka', 'Eze', 'nneka@andela.com', '+234 806 555 6666', 'Talent Acquisition Lead', 'People Ops', true, true, '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- DEMO ENGAGEMENTS
-- ============================================================================

INSERT INTO engagements (id, tenant_id, client_id, name, description, engagement_type, status, start_date, end_date, contract_value, billing_type, contract_number, created_by) VALUES
('88888888-8888-8888-8888-888888888881', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', 'Branch Operations Support - Lagos', 'Staff augmentation for 10 branch locations', 'hr_outsourcing', 'active', '2024-01-01', '2024-12-31', 45000000.00, 'monthly', 'FBN-2024-001', '22222222-2222-2222-2222-222222222222'),
('88888888-8888-8888-8888-888888888882', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666662', 'Executive Recruitment - C-Suite', 'Search for CFO and CHRO positions', 'recruitment', 'active', '2024-06-01', '2024-09-30', 25000000.00, 'fixed', 'DAN-2024-002', '22222222-2222-2222-2222-222222222222'),
('88888888-8888-8888-8888-888888888883', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666663', 'Customer Service Team Outsourcing', 'Full team of 25 customer service agents', 'hr_outsourcing', 'active', '2024-03-01', '2025-02-28', 120000000.00, 'monthly', 'MTN-2024-003', '22222222-2222-2222-2222-222222222222'),
('88888888-8888-8888-8888-888888888884', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666664', 'HR Consulting - Policy Review', 'Review and update of HR policies and procedures', 'consulting', 'active', '2024-07-01', '2024-10-31', 8500000.00, 'fixed', 'TOT-2024-004', '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- DEMO LEADS
-- ============================================================================

INSERT INTO leads (id, tenant_id, company_name, contact_name, email, phone, industry, source, status, pipeline_stage_id, estimated_value, probability, expected_close_date, assigned_to, created_by) VALUES
('99999999-9999-9999-9999-999999999991', '11111111-1111-1111-1111-111111111111', 'Access Bank Plc', 'Chioma Okoro', 'chioma.okoro@accessbank.ng', '+234 807 666 7777', 'Banking & Finance', 'referral', 'qualified', '55555555-5555-5555-5555-555555555553', 35000000.00, 50, '2024-10-31', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),
('99999999-9999-9999-9999-999999999992', '11111111-1111-1111-1111-111111111111', 'Guaranty Trust Bank', 'Yemi Alade', 'yemi.alade@gtbank.com', '+234 808 777 8888', 'Banking & Finance', 'cold_call', 'contacted', '55555555-5555-5555-5555-555555555552', 28000000.00, 25, '2024-11-30', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),
('99999999-9999-9999-9999-999999999993', '11111111-1111-1111-1111-111111111111', 'Nestle Nigeria', 'Tunde Bakare', 'tunde.bakare@nestle.ng', '+234 809 888 9999', 'FMCG', 'linkedin', 'new', '55555555-5555-5555-5555-555555555551', 55000000.00, 10, '2025-01-31', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333'),
('99999999-9999-9999-9999-999999999994', '11111111-1111-1111-1111-111111111111', 'Shell Nigeria', 'Amaka Obi', 'amaka.obi@shell.ng', '+234 810 999 0000', 'Oil & Gas', 'event', 'qualified', '55555555-5555-5555-5555-555555555554', 85000000.00, 75, '2024-09-30', '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333');

-- ============================================================================
-- DEMO STAFF
-- ============================================================================

INSERT INTO staff (id, tenant_id, employee_id, first_name, last_name, email, phone, job_title, department, skills, years_experience, employment_type, hire_date, salary, is_available, status, created_by) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'TA-001', 'Oluwaseun', 'Adeyemi', 'oluwaseun@teamace.ng', '+234 811 111 1111', 'Senior HR Consultant', 'Consulting', ARRAY['HRIS', 'Performance Management', 'L&D'], 8, 'permanent', '2020-03-15', 450000.00, false, 'deployed', '22222222-2222-2222-2222-222222222222'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'TA-002', 'Ngozi', 'Okafor', 'ngozi@teamace.ng', '+234 812 222 2222', 'Recruitment Specialist', 'Recruitment', ARRAY['Executive Search', 'Interviewing', 'Assessment'], 5, 'permanent', '2021-06-01', 350000.00, true, 'active', '22222222-2222-2222-2222-222222222222'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'TA-003', 'Ahmed', 'Bello', 'ahmed@teamace.ng', '+234 813 333 3333', 'Customer Service Agent', 'Operations', ARRAY['Customer Support', 'CRM', 'Call Center'], 3, 'contract', '2022-01-10', 180000.00, false, 'deployed', '22222222-2222-2222-2222-222222222222'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', 'TA-004', 'Blessing', 'Uche', 'blessing@teamace.ng', '+234 814 444 4444', 'HR Analyst', 'Analytics', ARRAY['Data Analysis', 'Excel', 'Power BI', 'HRIS'], 4, 'permanent', '2021-09-20', 280000.00, true, 'active', '22222222-2222-2222-2222-222222222222'),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', 'TA-005', 'Chinedu', 'Eze', 'chinedu@teamace.ng', '+234 815 555 5555', 'Training Coordinator', 'L&D', ARRAY['Training Facilitation', 'Curriculum Design', 'E-Learning'], 6, 'permanent', '2020-08-01', 320000.00, true, 'active', '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- DEMO DEPLOYMENTS
-- ============================================================================

INSERT INTO deployments (id, tenant_id, staff_id, client_id, engagement_id, role_title, location, start_date, end_date, billing_rate, billing_type, status, created_by) VALUES
('ffffffff-ffff-ffff-ffff-ffffffffffff', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666661', '88888888-8888-8888-8888-888888888881', 'HR Business Partner', 'First Bank HQ, Lagos', '2024-01-15', '2024-12-31', 850000.00, 'monthly', 'active', '22222222-2222-2222-2222-222222222222'),
('11111111-2222-3333-4444-555555555555', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '66666666-6666-6666-6666-666666666663', '88888888-8888-8888-8888-888888888883', 'Customer Service Lead', 'MTN Connect Centre, Ikoyi', '2024-03-01', '2025-02-28', 380000.00, 'monthly', 'active', '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- DEMO INVOICES
-- ============================================================================

INSERT INTO invoices (id, tenant_id, client_id, engagement_id, invoice_number, invoice_date, due_date, subtotal, vat_rate, vat_amount, wht_rate, wht_amount, total_amount, paid_amount, status, created_by) VALUES
('11111111-aaaa-bbbb-cccc-dddddddddddd', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', '88888888-8888-8888-8888-888888888881', 'INV-2024-00001', '2024-07-01', '2024-07-31', 3750000.00, 7.5, 281250.00, 5, 187500.00, 3843750.00, 3843750.00, 'paid', '22222222-2222-2222-2222-222222222222'),
('22222222-aaaa-bbbb-cccc-dddddddddddd', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666663', '88888888-8888-8888-8888-888888888883', 'INV-2024-00002', '2024-07-01', '2024-07-31', 10000000.00, 7.5, 750000.00, 5, 500000.00, 10250000.00, 10250000.00, 'paid', '22222222-2222-2222-2222-222222222222'),
('33333333-aaaa-bbbb-cccc-dddddddddddd', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666661', '88888888-8888-8888-8888-888888888881', 'INV-2024-00003', '2024-08-01', '2024-08-31', 3750000.00, 7.5, 281250.00, 5, 187500.00, 3843750.00, 0.00, 'sent', '22222222-2222-2222-2222-222222222222'),
('44444444-aaaa-bbbb-cccc-dddddddddddd', '11111111-1111-1111-1111-111111111111', '66666666-6666-6666-6666-666666666664', '88888888-8888-8888-8888-888888888884', 'INV-2024-00004', '2024-08-15', '2024-09-14', 4250000.00, 7.5, 318750.00, 10, 425000.00, 4143750.00, 2000000.00, 'partial', '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- DEMO INVOICE ITEMS
-- ============================================================================

INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, amount) VALUES
(uuid_generate_v4(), '11111111-aaaa-bbbb-cccc-dddddddddddd', 'HR Outsourcing Services - July 2024', 1, 3750000.00, 3750000.00),
(uuid_generate_v4(), '22222222-aaaa-bbbb-cccc-dddddddddddd', 'Customer Service Team - July 2024 (25 agents)', 25, 400000.00, 10000000.00),
(uuid_generate_v4(), '33333333-aaaa-bbbb-cccc-dddddddddddd', 'HR Outsourcing Services - August 2024', 1, 3750000.00, 3750000.00),
(uuid_generate_v4(), '44444444-aaaa-bbbb-cccc-dddddddddddd', 'HR Consulting - Phase 1 (Policy Review)', 1, 4250000.00, 4250000.00);

-- ============================================================================
-- DEMO PAYMENTS
-- ============================================================================

INSERT INTO payments (id, tenant_id, invoice_id, amount, payment_date, payment_method, reference_number, bank_name, created_by) VALUES
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', '11111111-aaaa-bbbb-cccc-dddddddddddd', 3843750.00, '2024-07-25', 'bank_transfer', 'FBN-TRF-20240725-001', 'First Bank Nigeria', '22222222-2222-2222-2222-222222222222'),
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', '22222222-aaaa-bbbb-cccc-dddddddddddd', 10250000.00, '2024-07-28', 'bank_transfer', 'MTN-TRF-20240728-001', 'Zenith Bank', '22222222-2222-2222-2222-222222222222'),
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', '44444444-aaaa-bbbb-cccc-dddddddddddd', 2000000.00, '2024-08-20', 'bank_transfer', 'TOT-TRF-20240820-001', 'Access Bank', '22222222-2222-2222-2222-222222222222');

-- ============================================================================
-- DEMO TASKS
-- ============================================================================

INSERT INTO tasks (id, tenant_id, title, description, client_id, engagement_id, assigned_to, priority, status, due_date, created_by) VALUES
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Send proposal to Access Bank', 'Prepare and send HR outsourcing proposal based on qualification call', NULL, NULL, '33333333-3333-3333-3333-333333333333', 'high', 'in_progress', '2024-09-05 17:00:00', '33333333-3333-3333-3333-333333333333'),
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Follow up Shell Nigeria negotiation', 'Schedule final negotiation meeting with procurement team', NULL, NULL, '33333333-3333-3333-3333-333333333333', 'urgent', 'pending', '2024-09-02 10:00:00', '33333333-3333-3333-3333-333333333333'),
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Monthly performance review - First Bank', 'Conduct monthly review of deployed staff performance', '66666666-6666-6666-6666-666666666661', '88888888-8888-8888-8888-888888888881', '44444444-4444-4444-4444-444444444444', 'medium', 'pending', '2024-09-10 14:00:00', '22222222-2222-2222-2222-222222222222'),
(uuid_generate_v4(), '11111111-1111-1111-1111-111111111111', 'Invoice follow-up - August', 'Follow up on pending August invoice payment', '66666666-6666-6666-6666-666666666661', '88888888-8888-8888-8888-888888888881', '22222222-2222-2222-2222-222222222222', 'medium', 'pending', '2024-09-08 12:00:00', '22222222-2222-2222-2222-222222222222');
