-- ============================================================================
-- Migration: 008_policy_and_training_lms.sql
-- Description: Policy Repository and Compliance Training LMS
-- Author: CoreHR Development Team
-- Date: December 2024
-- ============================================================================

-- Ensure UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- POLICY CATEGORIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    company_id UUID, -- NULL = applies to all consultant's companies

    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,

    is_system BOOLEAN DEFAULT FALSE, -- Predefined categories
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,

    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    UNIQUE(tenant_id, company_id, code)
);

-- ============================================================================
-- POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    company_id UUID, -- NULL = applies to all companies
    category_id UUID NOT NULL REFERENCES policy_categories(id),

    -- Policy Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    version_notes TEXT,
    effective_date DATE,
    expiry_date DATE,

    -- Document
    document_type VARCHAR(50) DEFAULT 'pdf', -- pdf, video, link, html
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    external_url VARCHAR(500), -- For external links
    content_html TEXT, -- For inline HTML content

    -- Compliance Requirements
    requires_acknowledgment BOOLEAN DEFAULT TRUE,
    requires_training BOOLEAN DEFAULT FALSE,
    training_module_id UUID, -- Link to training module (set after module created)

    -- Deadlines
    new_hire_due_days INTEGER DEFAULT 30, -- Days after hire to complete
    renewal_frequency_months INTEGER DEFAULT 12, -- 0 = one-time only

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMP,
    published_by UUID,

    -- Metadata
    tags TEXT[],
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================================================
-- POLICY VERSIONS (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_id UUID NOT NULL REFERENCES policies(id) ON DELETE CASCADE,

    version VARCHAR(20) NOT NULL,
    version_notes TEXT,
    document_snapshot JSONB, -- Snapshot of policy at this version
    file_path VARCHAR(500),

    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRAINING MODULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    company_id UUID, -- NULL = applies to all companies
    category_id UUID REFERENCES policy_categories(id),

    -- Module Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    objectives TEXT[], -- Learning objectives array

    -- Duration & Settings
    estimated_duration_minutes INTEGER DEFAULT 30,
    passing_score INTEGER DEFAULT 70, -- Quiz pass threshold %
    max_attempts INTEGER DEFAULT 3, -- Quiz retake limit, 0 = unlimited
    allow_skip BOOLEAN DEFAULT FALSE, -- Allow skipping sections

    -- Content Structure (JSON for ordering)
    content_order JSONB DEFAULT '[]', -- Array of {type, id} for ordering lessons/quizzes

    -- Requirements
    is_mandatory BOOLEAN DEFAULT TRUE,
    prerequisites UUID[], -- Module IDs that must be completed first

    -- Deadlines
    new_hire_due_days INTEGER DEFAULT 30,
    renewal_frequency_months INTEGER DEFAULT 12,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
    published_at TIMESTAMP,
    published_by UUID,

    -- Thumbnail/Cover
    thumbnail_url VARCHAR(500),

    -- Metadata
    tags TEXT[],
    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Add foreign key for training_module_id in policies
ALTER TABLE policies ADD CONSTRAINT fk_policies_training_module
    FOREIGN KEY (training_module_id) REFERENCES training_modules(id) ON DELETE SET NULL;

-- ============================================================================
-- TRAINING LESSONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,

    -- Lesson Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    lesson_type VARCHAR(50) NOT NULL, -- video, reading, document, interactive

    -- Content
    content_html TEXT, -- For reading materials
    video_url VARCHAR(500), -- YouTube, Vimeo, or uploaded
    video_provider VARCHAR(50), -- youtube, vimeo, uploaded
    video_duration_seconds INTEGER,
    document_path VARCHAR(500), -- For PDF/Doc attachments

    -- Settings
    is_required BOOLEAN DEFAULT TRUE,
    min_view_time_seconds INTEGER DEFAULT 0, -- Minimum time before marking complete

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRAINING QUIZZES
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,

    -- Quiz Details
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Settings
    time_limit_minutes INTEGER DEFAULT 0, -- 0 = no limit
    passing_score INTEGER DEFAULT 70,
    randomize_questions BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT FALSE, -- Show after submission
    questions_to_show INTEGER DEFAULT 0, -- 0 = show all, N = random N questions

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- QUIZ QUESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,

    -- Question
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- multiple_choice, true_false, multi_select

    -- Options (JSONB array)
    options JSONB NOT NULL DEFAULT '[]', -- [{id, text, is_correct}]

    -- Scoring
    points INTEGER DEFAULT 1,

    -- Explanation shown after answering
    explanation TEXT,

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EMPLOYEE POLICY ACKNOWLEDGMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_acknowledgments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    policy_id UUID NOT NULL REFERENCES policies(id),
    policy_version VARCHAR(20) NOT NULL,

    -- Acknowledgment
    acknowledged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Signature (optional electronic signature)
    signature_data TEXT, -- Base64 encoded signature image

    -- Due date tracking
    due_date DATE,
    was_overdue BOOLEAN DEFAULT FALSE,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(employee_id, policy_id, policy_version)
);

-- ============================================================================
-- TRAINING COMPLETIONS (Define before assignments for FK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    assignment_id UUID, -- Set after assignments table created
    employee_id UUID NOT NULL,
    module_id UUID NOT NULL REFERENCES training_modules(id),

    -- Completion Details
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Quiz Results (best attempt)
    quiz_score DECIMAL(5,2),
    quiz_passed BOOLEAN,
    quiz_attempt_id UUID, -- Set after quiz_attempts table

    -- Time
    total_time_seconds INTEGER DEFAULT 0,

    -- Due date tracking
    due_date DATE,
    was_overdue BOOLEAN DEFAULT FALSE,

    -- Certificate
    certificate_number VARCHAR(50),
    certificate_issued_at TIMESTAMP,
    certificate_url VARCHAR(500),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EMPLOYEE TRAINING ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    module_id UUID NOT NULL REFERENCES training_modules(id),

    -- Assignment Details
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID,
    due_date DATE NOT NULL,
    is_renewal BOOLEAN DEFAULT FALSE, -- True if this is a renewal assignment
    previous_completion_id UUID REFERENCES training_completions(id),

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, overdue, expired

    -- Reminder tracking
    reminder_sent_at TIMESTAMP,
    reminder_count INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(employee_id, module_id, due_date)
);

-- Add FK to training_completions
ALTER TABLE training_completions ADD CONSTRAINT fk_completions_assignment
    FOREIGN KEY (assignment_id) REFERENCES training_assignments(id) ON DELETE SET NULL;

-- ============================================================================
-- TRAINING PROGRESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES training_lessons(id) ON DELETE CASCADE,

    -- Progress
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,

    -- Video progress (for video lessons)
    video_progress_seconds INTEGER DEFAULT 0,
    video_completed BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(assignment_id, lesson_id)
);

-- ============================================================================
-- QUIZ ATTEMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,

    -- Attempt Details
    attempt_number INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP,

    -- Scoring
    score DECIMAL(5,2), -- Percentage
    points_earned INTEGER,
    points_possible INTEGER,
    passed BOOLEAN,

    -- Answers (JSONB)
    answers JSONB DEFAULT '[]', -- [{question_id, selected_options, is_correct, points}]

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add FK to training_completions for quiz_attempt
ALTER TABLE training_completions ADD CONSTRAINT fk_completions_quiz_attempt
    FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE SET NULL;

-- ============================================================================
-- CERTIFICATE TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS certificate_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,

    name VARCHAR(255) NOT NULL,
    template_html TEXT NOT NULL, -- HTML template with placeholders
    is_default BOOLEAN DEFAULT FALSE,

    -- Styling
    background_image_url VARCHAR(500),
    logo_position VARCHAR(50) DEFAULT 'top', -- top, bottom, left, right

    created_by UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ISSUED CERTIFICATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS issued_certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,

    -- Certificate Details
    certificate_number VARCHAR(50) UNIQUE NOT NULL,
    employee_id UUID NOT NULL,
    completion_id UUID REFERENCES training_completions(id),
    template_id UUID REFERENCES certificate_templates(id),

    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issue_date DATE NOT NULL,
    expiry_date DATE, -- NULL = never expires

    -- Generated PDF
    pdf_path VARCHAR(500),

    -- Verification
    verification_code VARCHAR(100) UNIQUE NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COMPLIANCE REMINDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS compliance_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,

    -- Target
    employee_id UUID,
    company_id UUID, -- For company-wide reminders

    -- Reference
    reference_type VARCHAR(50) NOT NULL, -- policy, training
    reference_id UUID NOT NULL,

    -- Reminder Details
    reminder_type VARCHAR(50) NOT NULL, -- due_soon, overdue, renewal_due
    due_date DATE NOT NULL,
    days_before INTEGER, -- Days before due date for reminder

    -- Status
    sent_at TIMESTAMP,
    read_at TIMESTAMP,

    -- Message
    message TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Policy Categories
CREATE INDEX IF NOT EXISTS idx_policy_categories_tenant ON policy_categories(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policy_categories_company ON policy_categories(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policy_categories_code ON policy_categories(code);

-- Policies
CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policies_company ON policies(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policies_category ON policies(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status) WHERE deleted_at IS NULL;

-- Policy Versions
CREATE INDEX IF NOT EXISTS idx_policy_versions_policy ON policy_versions(policy_id);

-- Training Modules
CREATE INDEX IF NOT EXISTS idx_training_modules_tenant ON training_modules(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_modules_company ON training_modules(company_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_training_modules_status ON training_modules(status) WHERE deleted_at IS NULL;

-- Training Lessons
CREATE INDEX IF NOT EXISTS idx_training_lessons_module ON training_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_training_lessons_order ON training_lessons(module_id, sort_order);

-- Training Quizzes
CREATE INDEX IF NOT EXISTS idx_training_quizzes_module ON training_quizzes(module_id);

-- Quiz Questions
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_order ON quiz_questions(quiz_id, sort_order);

-- Policy Acknowledgments
CREATE INDEX IF NOT EXISTS idx_policy_ack_employee ON policy_acknowledgments(employee_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_policy ON policy_acknowledgments(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_tenant ON policy_acknowledgments(tenant_id);

-- Training Assignments
CREATE INDEX IF NOT EXISTS idx_training_assign_employee ON training_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_assign_module ON training_assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_training_assign_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_assign_due ON training_assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_training_assign_tenant ON training_assignments(tenant_id);

-- Training Progress
CREATE INDEX IF NOT EXISTS idx_training_progress_assignment ON training_progress(assignment_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_lesson ON training_progress(lesson_id);

-- Quiz Attempts
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_assignment ON quiz_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- Training Completions
CREATE INDEX IF NOT EXISTS idx_training_completions_employee ON training_completions(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_module ON training_completions(module_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_tenant ON training_completions(tenant_id);

-- Issued Certificates
CREATE INDEX IF NOT EXISTS idx_issued_certificates_employee ON issued_certificates(employee_id);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_verify ON issued_certificates(verification_code);
CREATE INDEX IF NOT EXISTS idx_issued_certificates_number ON issued_certificates(certificate_number);

-- Compliance Reminders
CREATE INDEX IF NOT EXISTS idx_compliance_reminders_employee ON compliance_reminders(employee_id);
CREATE INDEX IF NOT EXISTS idx_compliance_reminders_due ON compliance_reminders(due_date);
CREATE INDEX IF NOT EXISTS idx_compliance_reminders_ref ON compliance_reminders(reference_type, reference_id);

-- ============================================================================
-- SEED DATA: Default Policy Categories
-- ============================================================================

-- Insert system-wide default categories for each tenant
INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Code of Conduct' as name,
    'CODE_OF_CONDUCT' as code,
    'Employee behavior and ethics guidelines' as description,
    TRUE as is_system,
    1 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Leave Policy' as name,
    'LEAVE_POLICY' as code,
    'Annual, sick, and other leave entitlements' as description,
    TRUE as is_system,
    2 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Sexual Harassment' as name,
    'SEXUAL_HARASSMENT' as code,
    'Anti-harassment policies and reporting procedures' as description,
    TRUE as is_system,
    3 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'IT Security' as name,
    'IT_SECURITY' as code,
    'Information security and acceptable use policies' as description,
    TRUE as is_system,
    4 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Health & Safety' as name,
    'HEALTH_SAFETY' as code,
    'Workplace health and safety guidelines' as description,
    TRUE as is_system,
    5 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Data Protection (NDPR)' as name,
    'NDPR' as code,
    'Nigeria Data Protection Regulation compliance' as description,
    TRUE as is_system,
    6 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Pension Compliance' as name,
    'PENSION' as code,
    'Contributory pension scheme policies' as description,
    TRUE as is_system,
    7 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'NHF Compliance' as name,
    'NHF' as code,
    'National Housing Fund obligations' as description,
    TRUE as is_system,
    8 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Labour Act' as name,
    'LABOUR_ACT' as code,
    'Nigerian Labour Act compliance' as description,
    TRUE as is_system,
    9 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Remote Work' as name,
    'REMOTE_WORK' as code,
    'Work from home and remote work policies' as description,
    TRUE as is_system,
    10 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Expense Policy' as name,
    'EXPENSE' as code,
    'Expense reimbursement guidelines' as description,
    TRUE as is_system,
    11 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

INSERT INTO policy_categories (tenant_id, name, code, description, is_system, sort_order)
SELECT
    id as tenant_id,
    'Onboarding' as name,
    'ONBOARDING' as code,
    'New employee orientation materials' as description,
    TRUE as is_system,
    12 as sort_order
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT (tenant_id, company_id, code) DO NOTHING;

-- ============================================================================
-- SEED DATA: Default Certificate Template
-- ============================================================================

INSERT INTO certificate_templates (tenant_id, name, template_html, is_default)
SELECT
    id as tenant_id,
    'Default Certificate' as name,
    '<!DOCTYPE html>
<html>
<head>
    <style>
        .certificate {
            width: 800px;
            padding: 40px;
            border: 4px double #0d2865;
            text-align: center;
            font-family: Georgia, serif;
            background: linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%);
        }
        .logo { max-height: 80px; margin-bottom: 20px; }
        h1 { color: #0d2865; font-size: 32px; margin: 20px 0; }
        .name { color: #41d8d1; font-size: 28px; border-bottom: 2px solid #41d8d1; display: inline-block; padding-bottom: 5px; }
        .module { font-size: 22px; color: #333; margin: 20px 0; }
        .date { font-size: 16px; color: #666; }
        .footer { margin-top: 40px; font-size: 12px; color: #999; }
        .cert-number { font-family: monospace; }
    </style>
</head>
<body>
    <div class="certificate">
        <img src="{{COMPANY_LOGO}}" alt="Logo" class="logo" />
        <h1>Certificate of Completion</h1>
        <p>This is to certify that</p>
        <h2 class="name">{{EMPLOYEE_NAME}}</h2>
        <p>has successfully completed the training program</p>
        <p class="module">{{MODULE_TITLE}}</p>
        <p class="date">Completed on: {{COMPLETION_DATE}}</p>
        <div class="footer">
            <p class="cert-number">Certificate #: {{CERTIFICATE_NUMBER}}</p>
            <p>Verify at: {{VERIFICATION_URL}}</p>
            <p>Valid until: {{EXPIRY_DATE}}</p>
        </div>
    </div>
</body>
</html>' as template_html,
    TRUE as is_default
FROM tenants WHERE deleted_at IS NULL
ON CONFLICT DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
