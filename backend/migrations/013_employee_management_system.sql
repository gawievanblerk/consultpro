-- Employee Management System (EMS) Complete Implementation
-- Migration: 013_employee_management_system.sql
-- Purpose: Implement all 6 EMS stages for Nigerian HR compliance

-- ============================================================================
-- STAGE 2: ONBOARDING & POLICY ACKNOWLEDGEMENT
-- ============================================================================

-- Onboarding Checklists (Welcome checklist for new employees)
CREATE TABLE IF NOT EXISTS onboarding_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Checklist Items (JSONB for flexibility)
    items JSONB DEFAULT '[]',
    -- Example: [{"item": "Submit bank details", "completed": true, "completed_at": "...", "completed_by": "..."}]

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company ON onboarding_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_employee ON onboarding_checklists(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_status ON onboarding_checklists(status);

-- Policy Acknowledgements (Employee sign-off on company policies)
CREATE TABLE IF NOT EXISTS policy_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    policy_id UUID NOT NULL REFERENCES policies(id),

    -- Acknowledgement Details
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledgement_method VARCHAR(50) DEFAULT 'digital', -- digital, physical
    ip_address VARCHAR(45),
    signature_data TEXT, -- Base64 signature or "I agree" confirmation

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, acknowledged, expired
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_policy_ack_company ON policy_acknowledgements(company_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_employee ON policy_acknowledgements(employee_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_policy ON policy_acknowledgements(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_status ON policy_acknowledgements(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_policy_ack_unique ON policy_acknowledgements(employee_id, policy_id);

-- ============================================================================
-- STAGE 3: PROBATION & CONFIRMATION
-- ============================================================================

-- Update employees table with probation fields
ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_period_months INTEGER DEFAULT 3;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_start_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_end_date DATE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS probation_status VARCHAR(50) DEFAULT 'pending';
-- Values: pending, in_progress, extended, confirmed, terminated

-- Probation Reviews
CREATE TABLE IF NOT EXISTS probation_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Review Details
    review_type VARCHAR(50) NOT NULL, -- mid_probation, end_probation, extension
    review_date DATE NOT NULL,
    review_period_start DATE,
    review_period_end DATE,

    -- Reviewer Info
    reviewer_id UUID REFERENCES employees(id),
    reviewer_name VARCHAR(255),
    reviewer_title VARCHAR(100),

    -- Assessment Areas (Nigerian standard format)
    job_knowledge_score INTEGER CHECK (job_knowledge_score BETWEEN 1 AND 5),
    job_knowledge_comments TEXT,

    quality_of_work_score INTEGER CHECK (quality_of_work_score BETWEEN 1 AND 5),
    quality_of_work_comments TEXT,

    productivity_score INTEGER CHECK (productivity_score BETWEEN 1 AND 5),
    productivity_comments TEXT,

    attendance_punctuality_score INTEGER CHECK (attendance_punctuality_score BETWEEN 1 AND 5),
    attendance_punctuality_comments TEXT,

    communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
    communication_comments TEXT,

    teamwork_score INTEGER CHECK (teamwork_score BETWEEN 1 AND 5),
    teamwork_comments TEXT,

    initiative_score INTEGER CHECK (initiative_score BETWEEN 1 AND 5),
    initiative_comments TEXT,

    adaptability_score INTEGER CHECK (adaptability_score BETWEEN 1 AND 5),
    adaptability_comments TEXT,

    -- Overall Assessment
    overall_score DECIMAL(3,2),
    overall_rating VARCHAR(50), -- excellent, good, satisfactory, needs_improvement, unsatisfactory
    strengths TEXT,
    areas_for_improvement TEXT,

    -- Recommendation
    recommendation VARCHAR(50) NOT NULL, -- confirm, extend, terminate
    extension_months INTEGER, -- If extended
    extension_reason TEXT,
    recommendation_comments TEXT,

    -- Status & Workflow
    status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, approved, rejected
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Employee Acknowledgement
    employee_acknowledged BOOLEAN DEFAULT false,
    employee_acknowledged_at TIMESTAMP WITH TIME ZONE,
    employee_comments TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_probation_reviews_company ON probation_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_probation_reviews_employee ON probation_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_probation_reviews_status ON probation_reviews(status);
CREATE INDEX IF NOT EXISTS idx_probation_reviews_type ON probation_reviews(review_type);

-- Confirmation Letters (Generated after successful probation)
CREATE TABLE IF NOT EXISTS confirmation_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    probation_review_id UUID REFERENCES probation_reviews(id),

    -- Letter Details
    letter_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    letter_reference VARCHAR(100),

    -- Revised Terms (if any)
    new_salary DECIMAL(15,2),
    new_job_title VARCHAR(100),
    new_department VARCHAR(100),

    -- Letter Content
    letter_content TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, generated, sent, acknowledged
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_method VARCHAR(50), -- email, physical, both

    -- Employee Acknowledgement
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledgement_signature TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_confirmation_letters_company ON confirmation_letters(company_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_letters_employee ON confirmation_letters(employee_id);
CREATE INDEX IF NOT EXISTS idx_confirmation_letters_status ON confirmation_letters(status);

-- ============================================================================
-- STAGE 4: ACTIVE EMPLOYEE MANAGEMENT (Extensions)
-- ============================================================================

-- Disciplinary Actions
CREATE TABLE IF NOT EXISTS disciplinary_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Incident Details
    incident_date DATE NOT NULL,
    incident_description TEXT NOT NULL,
    incident_location VARCHAR(255),
    witnesses TEXT,

    -- Action Type
    action_type VARCHAR(50) NOT NULL, -- verbal_warning, written_warning, final_warning, suspension, termination
    action_date DATE NOT NULL,

    -- Warning Letter Details (if applicable)
    warning_letter_reference VARCHAR(100),
    warning_letter_content TEXT,

    -- Investigation
    investigation_conducted BOOLEAN DEFAULT false,
    investigation_date DATE,
    investigation_findings TEXT,
    investigation_panel TEXT, -- JSON or text list of panel members

    -- Employee Response
    employee_explanation TEXT,
    employee_response_date DATE,

    -- Suspension Details (if applicable)
    suspension_start_date DATE,
    suspension_end_date DATE,
    suspension_with_pay BOOLEAN,

    -- Outcome
    outcome VARCHAR(50), -- upheld, overturned, reduced, pending
    outcome_date DATE,
    outcome_notes TEXT,

    -- Appeal
    appeal_submitted BOOLEAN DEFAULT false,
    appeal_date DATE,
    appeal_reason TEXT,
    appeal_outcome VARCHAR(50),
    appeal_outcome_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, closed, appealed

    -- Acknowledgements
    employee_acknowledged BOOLEAN DEFAULT false,
    employee_acknowledged_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    issued_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_company ON disciplinary_actions(company_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_employee ON disciplinary_actions(employee_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_type ON disciplinary_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_disciplinary_status ON disciplinary_actions(status);

-- Grievances
CREATE TABLE IF NOT EXISTS grievances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Grievance Details
    grievance_reference VARCHAR(100),
    grievance_date DATE NOT NULL,
    category VARCHAR(100), -- harassment, discrimination, working_conditions, management, pay, other
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    -- Against (if applicable)
    against_employee_id UUID REFERENCES employees(id),
    against_department VARCHAR(100),
    against_description TEXT,

    -- Expected Resolution
    expected_resolution TEXT,

    -- Investigation
    assigned_to UUID REFERENCES users(id),
    investigation_start_date DATE,
    investigation_notes TEXT,

    -- Resolution
    resolution_date DATE,
    resolution_description TEXT,
    resolution_outcome VARCHAR(50), -- resolved, partially_resolved, unresolved, withdrawn

    -- Employee Satisfaction
    employee_satisfied BOOLEAN,
    employee_feedback TEXT,

    -- Appeal
    appeal_submitted BOOLEAN DEFAULT false,
    appeal_date DATE,
    appeal_reason TEXT,
    appeal_outcome TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'submitted', -- submitted, under_review, investigating, resolved, closed, appealed

    -- Confidentiality
    is_confidential BOOLEAN DEFAULT true,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grievances_company ON grievances(company_id);
CREATE INDEX IF NOT EXISTS idx_grievances_employee ON grievances(employee_id);
CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_grievances_category ON grievances(category);

-- Employee Change Requests (Promotions, Transfers, etc.)
CREATE TABLE IF NOT EXISTS employee_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Change Type
    change_type VARCHAR(50) NOT NULL, -- promotion, transfer, demotion, salary_change, title_change, department_change
    effective_date DATE NOT NULL,

    -- Before Values
    previous_job_title VARCHAR(100),
    previous_department VARCHAR(100),
    previous_salary DECIMAL(15,2),
    previous_reports_to UUID REFERENCES employees(id),
    previous_location VARCHAR(255),

    -- After Values
    new_job_title VARCHAR(100),
    new_department VARCHAR(100),
    new_salary DECIMAL(15,2),
    new_reports_to UUID REFERENCES employees(id),
    new_location VARCHAR(255),

    -- Justification
    reason TEXT,
    supporting_documents JSONB DEFAULT '[]',

    -- Approval Workflow
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    requested_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Notification
    employee_notified BOOLEAN DEFAULT false,
    employee_notified_at TIMESTAMP WITH TIME ZONE,
    notification_method VARCHAR(50),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_changes_company ON employee_changes(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_changes_employee ON employee_changes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_changes_type ON employee_changes(change_type);
CREATE INDEX IF NOT EXISTS idx_employee_changes_status ON employee_changes(status);

-- ============================================================================
-- STAGE 5: PERFORMANCE & DEVELOPMENT
-- ============================================================================

-- Performance Review Cycles
CREATE TABLE IF NOT EXISTS performance_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),

    -- Cycle Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    cycle_type VARCHAR(50) NOT NULL, -- annual, bi_annual, quarterly

    -- Period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_deadline DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, active, completed, cancelled

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_cycles_company ON performance_cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_cycles_status ON performance_cycles(status);

-- Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    cycle_id UUID REFERENCES performance_cycles(id),

    -- Review Period
    review_period_start DATE NOT NULL,
    review_period_end DATE NOT NULL,
    review_date DATE,

    -- Reviewer Info
    reviewer_id UUID REFERENCES employees(id),
    reviewer_name VARCHAR(255),
    reviewer_title VARCHAR(100),

    -- KPI Achievements (linked separately)
    kpi_score DECIMAL(5,2),

    -- Competency Ratings (Nigerian standard format)
    job_knowledge_score INTEGER CHECK (job_knowledge_score BETWEEN 1 AND 5),
    job_knowledge_comments TEXT,

    quality_of_work_score INTEGER CHECK (quality_of_work_score BETWEEN 1 AND 5),
    quality_of_work_comments TEXT,

    productivity_score INTEGER CHECK (productivity_score BETWEEN 1 AND 5),
    productivity_comments TEXT,

    communication_score INTEGER CHECK (communication_score BETWEEN 1 AND 5),
    communication_comments TEXT,

    teamwork_score INTEGER CHECK (teamwork_score BETWEEN 1 AND 5),
    teamwork_comments TEXT,

    leadership_score INTEGER CHECK (leadership_score BETWEEN 1 AND 5),
    leadership_comments TEXT,

    problem_solving_score INTEGER CHECK (problem_solving_score BETWEEN 1 AND 5),
    problem_solving_comments TEXT,

    initiative_score INTEGER CHECK (initiative_score BETWEEN 1 AND 5),
    initiative_comments TEXT,

    attendance_score INTEGER CHECK (attendance_score BETWEEN 1 AND 5),
    attendance_comments TEXT,

    -- Overall Assessment
    overall_score DECIMAL(3,2),
    overall_rating VARCHAR(50), -- outstanding, exceeds_expectations, meets_expectations, needs_improvement, unsatisfactory

    -- Narrative Sections
    key_achievements TEXT,
    areas_of_strength TEXT,
    areas_for_development TEXT,

    -- Goals
    goals_for_next_period TEXT,
    development_plan TEXT,
    training_recommendations TEXT,

    -- Recommendations
    salary_increase_recommended BOOLEAN DEFAULT false,
    salary_increase_percentage DECIMAL(5,2),
    promotion_recommended BOOLEAN DEFAULT false,
    promotion_details TEXT,

    -- Employee Self-Assessment
    self_assessment_completed BOOLEAN DEFAULT false,
    self_assessment_date DATE,
    self_assessment_achievements TEXT,
    self_assessment_challenges TEXT,
    self_assessment_goals TEXT,

    -- Status & Workflow
    status VARCHAR(50) DEFAULT 'pending', -- pending, self_assessment, manager_review, calibration, completed
    submitted_at TIMESTAMP WITH TIME ZONE,

    -- Approvals
    manager_approved BOOLEAN DEFAULT false,
    manager_approved_at TIMESTAMP WITH TIME ZONE,
    hr_approved BOOLEAN DEFAULT false,
    hr_approved_at TIMESTAMP WITH TIME ZONE,
    hr_approved_by UUID REFERENCES users(id),

    -- Employee Acknowledgement
    employee_acknowledged BOOLEAN DEFAULT false,
    employee_acknowledged_at TIMESTAMP WITH TIME ZONE,
    employee_comments TEXT,
    employee_agrees BOOLEAN,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_reviews_company ON performance_reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_employee ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_cycle ON performance_reviews(cycle_id);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_status ON performance_reviews(status);
CREATE INDEX IF NOT EXISTS idx_performance_reviews_reviewer ON performance_reviews(reviewer_id);

-- KPIs (Key Performance Indicators)
CREATE TABLE IF NOT EXISTS performance_kpis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    review_id UUID REFERENCES performance_reviews(id),

    -- KPI Details
    kpi_name VARCHAR(255) NOT NULL,
    kpi_description TEXT,
    category VARCHAR(100), -- financial, customer, process, learning

    -- Target
    target_value VARCHAR(255),
    target_unit VARCHAR(50), -- percentage, number, currency, rating
    weight DECIMAL(5,2) DEFAULT 0, -- Weight in overall score (0-100)

    -- Achievement
    actual_value VARCHAR(255),
    achievement_percentage DECIMAL(5,2),
    achievement_date DATE,

    -- Assessment
    score INTEGER CHECK (score BETWEEN 1 AND 5),
    comments TEXT,
    evidence TEXT,

    -- Status
    status VARCHAR(50) DEFAULT 'active', -- active, achieved, not_achieved, cancelled

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_performance_kpis_company ON performance_kpis(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_kpis_employee ON performance_kpis(employee_id);
CREATE INDEX IF NOT EXISTS idx_performance_kpis_review ON performance_kpis(review_id);
CREATE INDEX IF NOT EXISTS idx_performance_kpis_status ON performance_kpis(status);

-- ============================================================================
-- STAGE 6: EMPLOYEE MOVEMENT & EXIT
-- ============================================================================

-- Exit Requests
CREATE TABLE IF NOT EXISTS exit_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Request Details
    request_type VARCHAR(50) NOT NULL, -- resignation, retirement, termination, redundancy, end_of_contract
    request_date DATE NOT NULL,
    requested_last_day DATE NOT NULL,
    actual_last_day DATE,

    -- Resignation Details (if applicable)
    resignation_letter TEXT,
    resignation_reason VARCHAR(100), -- better_opportunity, personal, relocation, further_studies, health, other
    resignation_reason_details TEXT,

    -- Termination Details (if applicable)
    termination_reason VARCHAR(100), -- performance, misconduct, redundancy, restructuring, probation_fail, other
    termination_reason_details TEXT,
    termination_with_cause BOOLEAN,

    -- Notice Period
    notice_period_days INTEGER,
    notice_period_waived BOOLEAN DEFAULT false,
    notice_period_buyout BOOLEAN DEFAULT false,
    notice_period_buyout_amount DECIMAL(15,2),

    -- Garden Leave
    garden_leave BOOLEAN DEFAULT false,
    garden_leave_start DATE,
    garden_leave_end DATE,

    -- Approval Workflow
    status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, withdrawn, completed
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- HR Processing
    hr_processed BOOLEAN DEFAULT false,
    hr_processed_by UUID REFERENCES users(id),
    hr_processed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exit_requests_company ON exit_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_exit_requests_employee ON exit_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_requests_status ON exit_requests(status);
CREATE INDEX IF NOT EXISTS idx_exit_requests_type ON exit_requests(request_type);

-- Exit Interviews
CREATE TABLE IF NOT EXISTS exit_interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    exit_request_id UUID REFERENCES exit_requests(id),

    -- Interview Details
    interview_date DATE,
    interviewer_id UUID REFERENCES users(id),
    interviewer_name VARCHAR(255),
    interview_method VARCHAR(50), -- in_person, video, phone, written

    -- Reasons for Leaving (Multiple choice + rating)
    primary_reason VARCHAR(100),
    reason_career_growth INTEGER CHECK (reason_career_growth BETWEEN 1 AND 5),
    reason_compensation INTEGER CHECK (reason_compensation BETWEEN 1 AND 5),
    reason_work_life_balance INTEGER CHECK (reason_work_life_balance BETWEEN 1 AND 5),
    reason_management INTEGER CHECK (reason_management BETWEEN 1 AND 5),
    reason_company_culture INTEGER CHECK (reason_company_culture BETWEEN 1 AND 5),
    reason_job_satisfaction INTEGER CHECK (reason_job_satisfaction BETWEEN 1 AND 5),
    reason_other TEXT,

    -- Company Experience
    overall_experience_rating INTEGER CHECK (overall_experience_rating BETWEEN 1 AND 5),
    would_recommend_company BOOLEAN,
    would_return_to_company BOOLEAN,

    -- Feedback Areas
    feedback_management TEXT,
    feedback_team TEXT,
    feedback_role TEXT,
    feedback_compensation TEXT,
    feedback_training TEXT,
    feedback_work_environment TEXT,

    -- Suggestions
    improvement_suggestions TEXT,
    best_aspects_of_company TEXT,
    worst_aspects_of_company TEXT,

    -- Additional Comments
    additional_comments TEXT,
    confidential_comments TEXT, -- HR eyes only

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, completed, cancelled, declined
    completed_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exit_interviews_company ON exit_interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_exit_interviews_employee ON exit_interviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_interviews_status ON exit_interviews(status);

-- Exit Checklists
CREATE TABLE IF NOT EXISTS exit_checklists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    exit_request_id UUID REFERENCES exit_requests(id),

    -- IT Items
    it_laptop_returned BOOLEAN DEFAULT false,
    it_laptop_returned_date DATE,
    it_laptop_condition TEXT,
    it_phone_returned BOOLEAN DEFAULT false,
    it_phone_returned_date DATE,
    it_access_cards_returned BOOLEAN DEFAULT false,
    it_email_deactivated BOOLEAN DEFAULT false,
    it_systems_access_revoked BOOLEAN DEFAULT false,
    it_data_backup_completed BOOLEAN DEFAULT false,
    it_notes TEXT,

    -- Finance Items
    finance_final_salary_calculated BOOLEAN DEFAULT false,
    finance_leave_balance_paid BOOLEAN DEFAULT false,
    finance_leave_days_remaining DECIMAL(5,2),
    finance_loans_outstanding DECIMAL(15,2),
    finance_loans_deducted BOOLEAN DEFAULT false,
    finance_advances_cleared BOOLEAN DEFAULT false,
    finance_expense_claims_settled BOOLEAN DEFAULT false,
    finance_pension_notified BOOLEAN DEFAULT false,
    finance_final_payment_processed BOOLEAN DEFAULT false,
    finance_final_payment_date DATE,
    finance_final_payment_amount DECIMAL(15,2),
    finance_notes TEXT,

    -- HR Items
    hr_exit_interview_completed BOOLEAN DEFAULT false,
    hr_certificate_of_service_issued BOOLEAN DEFAULT false,
    hr_reference_letter_issued BOOLEAN DEFAULT false,
    hr_personal_files_archived BOOLEAN DEFAULT false,
    hr_benefits_terminated BOOLEAN DEFAULT false,
    hr_nhf_notified BOOLEAN DEFAULT false,
    hr_pension_transfer_initiated BOOLEAN DEFAULT false,
    hr_notes TEXT,

    -- Department Items
    dept_knowledge_transfer_completed BOOLEAN DEFAULT false,
    dept_handover_document_received BOOLEAN DEFAULT false,
    dept_projects_reassigned BOOLEAN DEFAULT false,
    dept_clients_notified BOOLEAN DEFAULT false,
    dept_notes TEXT,

    -- Physical Items
    physical_keys_returned BOOLEAN DEFAULT false,
    physical_parking_pass_returned BOOLEAN DEFAULT false,
    physical_uniform_returned BOOLEAN DEFAULT false,
    physical_locker_cleared BOOLEAN DEFAULT false,
    physical_notes TEXT,

    -- Overall Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exit_checklists_company ON exit_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_exit_checklists_employee ON exit_checklists(employee_id);
CREATE INDEX IF NOT EXISTS idx_exit_checklists_status ON exit_checklists(status);

-- Handover Records
CREATE TABLE IF NOT EXISTS handover_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id), -- Departing employee
    exit_request_id UUID REFERENCES exit_requests(id),

    -- Handover Details
    handover_to_id UUID REFERENCES employees(id),
    handover_to_name VARCHAR(255),
    handover_start_date DATE,
    handover_end_date DATE,

    -- Tasks & Responsibilities
    tasks_responsibilities JSONB DEFAULT '[]',
    -- Example: [{"task": "Monthly report", "status": "transferred", "notes": "..."}]

    -- Projects
    projects JSONB DEFAULT '[]',
    -- Example: [{"project": "Website redesign", "status": "ongoing", "handover_notes": "..."}]

    -- Key Contacts
    key_contacts JSONB DEFAULT '[]',
    -- Example: [{"name": "John Doe", "company": "ABC Corp", "relationship": "client", "contact_info": "..."}]

    -- Systems & Access
    systems_access JSONB DEFAULT '[]',
    -- Example: [{"system": "CRM", "access_level": "admin", "credentials_transferred": true}]

    -- Documentation
    documentation_location TEXT,
    important_files_location TEXT,
    passwords_transferred BOOLEAN DEFAULT false,

    -- Sign-offs
    departing_employee_signoff BOOLEAN DEFAULT false,
    departing_employee_signoff_date DATE,
    receiving_employee_signoff BOOLEAN DEFAULT false,
    receiving_employee_signoff_date DATE,
    manager_signoff BOOLEAN DEFAULT false,
    manager_signoff_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed
    completion_percentage INTEGER DEFAULT 0,

    -- Notes
    notes TEXT,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_handover_records_company ON handover_records(company_id);
CREATE INDEX IF NOT EXISTS idx_handover_records_employee ON handover_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_handover_records_status ON handover_records(status);

-- ============================================================================
-- DOCUMENT TEMPLATES
-- ============================================================================

-- Document Templates (for generating letters, forms, etc.)
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id), -- NULL for system templates

    -- Template Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(100) NOT NULL, -- offer_letter, contract, confirmation_letter, warning_letter, termination_letter, etc.
    category VARCHAR(100), -- recruitment, onboarding, disciplinary, exit, general

    -- Content
    content TEXT NOT NULL, -- HTML or Markdown with placeholders like {{employee_name}}
    placeholders JSONB DEFAULT '[]', -- List of available placeholders

    -- Settings
    is_active BOOLEAN DEFAULT true,
    is_system_template BOOLEAN DEFAULT false, -- System templates can't be deleted
    version INTEGER DEFAULT 1,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_templates_company ON document_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active);

-- Generated Documents (instances of templates)
CREATE TABLE IF NOT EXISTS generated_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID REFERENCES employees(id),
    template_id UUID REFERENCES document_templates(id),

    -- Document Details
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    reference_number VARCHAR(100),

    -- Content
    content TEXT NOT NULL, -- Rendered content with placeholders filled

    -- Related Entity
    related_entity_type VARCHAR(100), -- probation_review, exit_request, etc.
    related_entity_id UUID,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, final, sent, acknowledged

    -- Delivery
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_to VARCHAR(255),
    sent_method VARCHAR(50), -- email, print, both

    -- Acknowledgement
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by_employee BOOLEAN DEFAULT false,

    -- Storage
    file_path VARCHAR(500),
    file_size INTEGER,

    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generated_documents_company ON generated_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_employee ON generated_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_generated_documents_type ON generated_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_generated_documents_status ON generated_documents(status);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE onboarding_checklists IS 'Stage 2: Welcome checklists for new employee onboarding';
COMMENT ON TABLE policy_acknowledgements IS 'Stage 2: Employee sign-offs on company policies';
COMMENT ON TABLE probation_reviews IS 'Stage 3: Probation period assessment reviews';
COMMENT ON TABLE confirmation_letters IS 'Stage 3: Confirmation letters after successful probation';
COMMENT ON TABLE disciplinary_actions IS 'Stage 4: Disciplinary incidents and warnings';
COMMENT ON TABLE grievances IS 'Stage 4: Employee grievance submissions';
COMMENT ON TABLE employee_changes IS 'Stage 4: Promotions, transfers, and other changes';
COMMENT ON TABLE performance_cycles IS 'Stage 5: Performance review cycles';
COMMENT ON TABLE performance_reviews IS 'Stage 5: Annual/periodic performance reviews';
COMMENT ON TABLE performance_kpis IS 'Stage 5: Individual KPI tracking';
COMMENT ON TABLE exit_requests IS 'Stage 6: Resignation/termination requests';
COMMENT ON TABLE exit_interviews IS 'Stage 6: Exit interview records';
COMMENT ON TABLE exit_checklists IS 'Stage 6: Exit clearance checklists';
COMMENT ON TABLE handover_records IS 'Stage 6: Knowledge transfer and handover';
COMMENT ON TABLE document_templates IS 'Reusable document templates for HR letters';
COMMENT ON TABLE generated_documents IS 'Generated instances of document templates';
