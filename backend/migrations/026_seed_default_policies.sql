-- ============================================================================
-- Migration 026: Seed Default Policies for All Tenants
-- Creates sample policies that employees can acknowledge
-- Seeds for ALL tenants that have policy_categories set up
-- ============================================================================

-- First, let's create a helper function to seed policies for a tenant
DO $$
DECLARE
    r_tenant RECORD;
    v_category_id UUID;
BEGIN
    -- Loop through all distinct tenants that have policy_categories
    FOR r_tenant IN
        SELECT DISTINCT tenant_id FROM policy_categories WHERE deleted_at IS NULL
    LOOP
        RAISE NOTICE 'Seeding policies for tenant: %', r_tenant.tenant_id;

        -- Code of Conduct Policy
        SELECT id INTO v_category_id FROM policy_categories
        WHERE tenant_id = r_tenant.tenant_id AND code = 'CODE_OF_CONDUCT' AND deleted_at IS NULL LIMIT 1;

        IF v_category_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM policies WHERE tenant_id = r_tenant.tenant_id AND title = 'Employee Code of Conduct' AND deleted_at IS NULL
        ) THEN
            INSERT INTO policies (tenant_id, category_id, title, description, version, document_type, content_html,
                requires_acknowledgment, new_hire_due_days, status, published_at)
            VALUES (r_tenant.tenant_id, v_category_id, 'Employee Code of Conduct',
                'Standards of professional behavior and ethics expected from all employees',
                '1.0', 'html',
                '<h1>Employee Code of Conduct</h1>
<h2>1. Purpose</h2>
<p>This Code of Conduct establishes the standards of ethical behavior and professional conduct expected from all employees of the organization.</p>

<h2>2. Core Values</h2>
<ul>
<li><strong>Integrity:</strong> Act honestly and ethically in all business dealings</li>
<li><strong>Respect:</strong> Treat colleagues, clients, and partners with dignity and respect</li>
<li><strong>Accountability:</strong> Take responsibility for your actions and decisions</li>
<li><strong>Excellence:</strong> Strive for quality and continuous improvement</li>
</ul>

<h2>3. Professional Behavior</h2>
<p>Employees are expected to:</p>
<ul>
<li>Maintain professional relationships with colleagues and clients</li>
<li>Dress appropriately for the workplace</li>
<li>Be punctual and reliable</li>
<li>Use company resources responsibly</li>
<li>Protect confidential information</li>
</ul>

<h2>4. Prohibited Conduct</h2>
<p>The following behaviors are strictly prohibited:</p>
<ul>
<li>Harassment or discrimination of any kind</li>
<li>Theft, fraud, or dishonesty</li>
<li>Violence or threats of violence</li>
<li>Substance abuse in the workplace</li>
<li>Conflicts of interest</li>
</ul>

<h2>5. Reporting Violations</h2>
<p>Employees who witness violations of this Code should report them to their supervisor or HR department. All reports will be treated confidentially.</p>

<h2>6. Acknowledgment</h2>
<p>By acknowledging this policy, I confirm that I have read, understood, and agree to comply with this Code of Conduct.</p>',
                TRUE, 7, 'published', NOW());
            RAISE NOTICE '  - Created: Employee Code of Conduct';
        END IF;

        -- Anti-Harassment Policy
        SELECT id INTO v_category_id FROM policy_categories
        WHERE tenant_id = r_tenant.tenant_id AND code = 'SEXUAL_HARASSMENT' AND deleted_at IS NULL LIMIT 1;

        IF v_category_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM policies WHERE tenant_id = r_tenant.tenant_id AND title = 'Anti-Harassment Policy' AND deleted_at IS NULL
        ) THEN
            INSERT INTO policies (tenant_id, category_id, title, description, version, document_type, content_html,
                requires_acknowledgment, new_hire_due_days, status, published_at)
            VALUES (r_tenant.tenant_id, v_category_id, 'Anti-Harassment Policy',
                'Policy prohibiting all forms of workplace harassment',
                '1.0', 'html',
                '<h1>Anti-Harassment Policy</h1>
<h2>1. Policy Statement</h2>
<p>The organization is committed to providing a work environment free from harassment of any kind. All forms of harassment are strictly prohibited.</p>

<h2>2. Definition of Harassment</h2>
<p>Harassment includes but is not limited to:</p>
<ul>
<li>Unwelcome sexual advances or requests for sexual favors</li>
<li>Verbal or physical conduct of a sexual nature</li>
<li>Offensive comments related to race, religion, gender, or disability</li>
<li>Intimidation or bullying behavior</li>
<li>Display of offensive materials</li>
</ul>

<h2>3. Reporting Procedures</h2>
<p>Any employee who experiences or witnesses harassment should:</p>
<ol>
<li>Document the incident(s) with dates, times, and witnesses</li>
<li>Report to their supervisor, HR department, or designated officer</li>
<li>Cooperate with any investigation</li>
</ol>

<h2>4. Investigation Process</h2>
<p>All complaints will be investigated promptly and thoroughly. The organization will maintain confidentiality to the extent possible.</p>

<h2>5. Consequences</h2>
<p>Employees found to have engaged in harassment will face disciplinary action up to and including termination.</p>

<h2>6. No Retaliation</h2>
<p>Retaliation against anyone who reports harassment or participates in an investigation is strictly prohibited.</p>',
                TRUE, 7, 'published', NOW());
            RAISE NOTICE '  - Created: Anti-Harassment Policy';
        END IF;

        -- IT Security Policy
        SELECT id INTO v_category_id FROM policy_categories
        WHERE tenant_id = r_tenant.tenant_id AND code = 'IT_SECURITY' AND deleted_at IS NULL LIMIT 1;

        IF v_category_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM policies WHERE tenant_id = r_tenant.tenant_id AND title = 'IT Security & Acceptable Use Policy' AND deleted_at IS NULL
        ) THEN
            INSERT INTO policies (tenant_id, category_id, title, description, version, document_type, content_html,
                requires_acknowledgment, new_hire_due_days, status, published_at)
            VALUES (r_tenant.tenant_id, v_category_id, 'IT Security & Acceptable Use Policy',
                'Guidelines for secure and appropriate use of company IT resources',
                '1.0', 'html',
                '<h1>IT Security & Acceptable Use Policy</h1>
<h2>1. Purpose</h2>
<p>This policy establishes guidelines for the secure and appropriate use of company IT resources including computers, networks, email, and internet access.</p>

<h2>2. Password Security</h2>
<ul>
<li>Use strong passwords with minimum 12 characters</li>
<li>Include uppercase, lowercase, numbers, and special characters</li>
<li>Change passwords every 90 days</li>
<li>Never share passwords with others</li>
<li>Use different passwords for different systems</li>
</ul>

<h2>3. Email Usage</h2>
<ul>
<li>Use company email for business purposes only</li>
<li>Do not open suspicious attachments or links</li>
<li>Report phishing attempts to IT department</li>
<li>Do not send confidential information via unencrypted email</li>
</ul>

<h2>4. Internet Usage</h2>
<ul>
<li>Internet access is provided for business purposes</li>
<li>Limited personal use is acceptable during breaks</li>
<li>Downloading unauthorized software is prohibited</li>
<li>Accessing inappropriate websites is prohibited</li>
</ul>

<h2>5. Data Protection</h2>
<ul>
<li>Lock your computer when leaving your desk</li>
<li>Store sensitive data in approved locations only</li>
<li>Do not copy company data to personal devices</li>
<li>Report any data breaches immediately</li>
</ul>

<h2>6. Consequences</h2>
<p>Violations of this policy may result in disciplinary action including termination and legal proceedings.</p>',
                TRUE, 7, 'published', NOW());
            RAISE NOTICE '  - Created: IT Security & Acceptable Use Policy';
        END IF;

        -- Data Protection (NDPR) Policy
        SELECT id INTO v_category_id FROM policy_categories
        WHERE tenant_id = r_tenant.tenant_id AND code = 'NDPR' AND deleted_at IS NULL LIMIT 1;

        IF v_category_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM policies WHERE tenant_id = r_tenant.tenant_id AND title = 'Data Protection Policy (NDPR)' AND deleted_at IS NULL
        ) THEN
            INSERT INTO policies (tenant_id, category_id, title, description, version, document_type, content_html,
                requires_acknowledgment, new_hire_due_days, status, published_at)
            VALUES (r_tenant.tenant_id, v_category_id, 'Data Protection Policy (NDPR)',
                'Compliance with Nigeria Data Protection Regulation',
                '1.0', 'html',
                '<h1>Data Protection Policy (NDPR Compliance)</h1>
<h2>1. Introduction</h2>
<p>This policy outlines our commitment to protecting personal data in compliance with the Nigeria Data Protection Regulation (NDPR) 2019.</p>

<h2>2. Scope</h2>
<p>This policy applies to all employees who handle personal data of employees, customers, suppliers, or any other individuals.</p>

<h2>3. Data Protection Principles</h2>
<p>Personal data must be:</p>
<ul>
<li>Processed lawfully, fairly, and transparently</li>
<li>Collected for specified, explicit, and legitimate purposes</li>
<li>Adequate, relevant, and limited to what is necessary</li>
<li>Accurate and kept up to date</li>
<li>Stored only for as long as necessary</li>
<li>Processed securely</li>
</ul>

<h2>4. Employee Responsibilities</h2>
<ul>
<li>Only access personal data needed for your job</li>
<li>Keep personal data secure and confidential</li>
<li>Report any data breaches immediately</li>
<li>Do not share personal data without authorization</li>
</ul>

<h2>5. Data Subject Rights</h2>
<p>Individuals have the right to:</p>
<ul>
<li>Access their personal data</li>
<li>Correct inaccurate data</li>
<li>Request deletion of their data</li>
<li>Object to processing</li>
</ul>

<h2>6. Reporting Breaches</h2>
<p>Any suspected data breach must be reported to the Data Protection Officer within 24 hours.</p>',
                TRUE, 7, 'published', NOW());
            RAISE NOTICE '  - Created: Data Protection Policy (NDPR)';
        END IF;

        -- Health & Safety Policy
        SELECT id INTO v_category_id FROM policy_categories
        WHERE tenant_id = r_tenant.tenant_id AND code = 'HEALTH_SAFETY' AND deleted_at IS NULL LIMIT 1;

        IF v_category_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM policies WHERE tenant_id = r_tenant.tenant_id AND title = 'Health & Safety Policy' AND deleted_at IS NULL
        ) THEN
            INSERT INTO policies (tenant_id, category_id, title, description, version, document_type, content_html,
                requires_acknowledgment, new_hire_due_days, status, published_at)
            VALUES (r_tenant.tenant_id, v_category_id, 'Health & Safety Policy',
                'Workplace health and safety guidelines',
                '1.0', 'html',
                '<h1>Health & Safety Policy</h1>
<h2>1. Policy Statement</h2>
<p>The organization is committed to providing a safe and healthy work environment for all employees, contractors, and visitors.</p>

<h2>2. Employer Responsibilities</h2>
<ul>
<li>Provide safe working conditions and equipment</li>
<li>Conduct regular safety training</li>
<li>Maintain emergency procedures</li>
<li>Investigate all accidents and incidents</li>
</ul>

<h2>3. Employee Responsibilities</h2>
<ul>
<li>Follow all safety rules and procedures</li>
<li>Report hazards and unsafe conditions</li>
<li>Use provided safety equipment</li>
<li>Participate in safety training</li>
<li>Report all accidents and near-misses</li>
</ul>

<h2>4. Emergency Procedures</h2>
<ul>
<li>Know the location of emergency exits</li>
<li>Know the location of fire extinguishers and first aid kits</li>
<li>Follow evacuation procedures during emergencies</li>
<li>Report to designated assembly points</li>
</ul>

<h2>5. First Aid</h2>
<p>First aid kits are located in designated areas. Report any injuries immediately and seek medical attention when necessary.</p>

<h2>6. Reporting</h2>
<p>All accidents, incidents, and near-misses must be reported to the Health & Safety Officer immediately.</p>',
                TRUE, 7, 'published', NOW());
            RAISE NOTICE '  - Created: Health & Safety Policy';
        END IF;

        -- Leave Policy
        SELECT id INTO v_category_id FROM policy_categories
        WHERE tenant_id = r_tenant.tenant_id AND code = 'LEAVE_POLICY' AND deleted_at IS NULL LIMIT 1;

        IF v_category_id IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM policies WHERE tenant_id = r_tenant.tenant_id AND title = 'Leave & Time-Off Policy' AND deleted_at IS NULL
        ) THEN
            INSERT INTO policies (tenant_id, category_id, title, description, version, document_type, content_html,
                requires_acknowledgment, new_hire_due_days, status, published_at)
            VALUES (r_tenant.tenant_id, v_category_id, 'Leave & Time-Off Policy',
                'Annual leave, sick leave, and other time-off entitlements',
                '1.0', 'html',
                '<h1>Leave & Time-Off Policy</h1>
<h2>1. Annual Leave</h2>
<ul>
<li>Employees are entitled to 20 working days of annual leave per year</li>
<li>Leave must be requested at least 2 weeks in advance</li>
<li>Maximum of 5 days can be carried forward to the next year</li>
<li>Unused leave beyond the carry-forward limit will be forfeited</li>
</ul>

<h2>2. Sick Leave</h2>
<ul>
<li>Employees are entitled to 10 days of sick leave per year</li>
<li>Medical certificate required for absences exceeding 2 days</li>
<li>Notify your supervisor as early as possible on the first day of illness</li>
</ul>

<h2>3. Maternity/Paternity Leave</h2>
<ul>
<li>Maternity leave: 16 weeks with full pay</li>
<li>Paternity leave: 2 weeks with full pay</li>
<li>Written notice required at least 4 weeks before expected leave</li>
</ul>

<h2>4. Other Leave Types</h2>
<ul>
<li>Bereavement leave: 3-5 days depending on relationship</li>
<li>Study leave: As approved by management</li>
<li>Compassionate leave: Granted at management discretion</li>
</ul>

<h2>5. Leave Application Process</h2>
<ol>
<li>Submit leave request through the HR system</li>
<li>Await approval from your supervisor</li>
<li>Ensure proper handover of responsibilities</li>
</ol>',
                TRUE, 14, 'published', NOW());
            RAISE NOTICE '  - Created: Leave & Time-Off Policy';
        END IF;

    END LOOP;
END $$;

SELECT 'Migration 026 complete: Default policies seeded for all tenants' as status;
