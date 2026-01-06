-- Migration 016: Onboarding Workflow System
-- BFI HRIS Onboarding with 5 phases, hard gates, medical info, and probation check-ins

-- ============================================================================
-- PHASE 1: Alter existing tables
-- ============================================================================

-- Add 'preboarding' as default status for new employees
-- Note: We'll handle this in application code since PostgreSQL doesn't support
-- ALTER TYPE ADD VALUE IF NOT EXISTS in a transaction-safe way

-- Add new columns to employees table
ALTER TABLE employees ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS profile_completion_percentage INTEGER DEFAULT 0;

-- Add new columns to policies table for department filtering and annual renewal
ALTER TABLE policies ADD COLUMN IF NOT EXISTS applies_to_departments TEXT[];
ALTER TABLE policies ADD COLUMN IF NOT EXISTS is_general BOOLEAN DEFAULT true;
ALTER TABLE policies ADD COLUMN IF NOT EXISTS annual_renewal_required BOOLEAN DEFAULT false;

-- ============================================================================
-- PHASE 2: Create new tables
-- ============================================================================

-- Onboarding workflow templates
CREATE TABLE IF NOT EXISTS onboarding_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id),

    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Phase configurations (JSONB for flexibility)
    -- Example: {"phase1": {"due_days": 2, "hard_gate": true}, "phase2": {"due_days": 3}, ...}
    phase_config JSONB DEFAULT '{
        "phase1": {"name": "Required Documents", "due_days": 2, "hard_gate": true},
        "phase2": {"name": "Role Clarity", "due_days": 3, "hard_gate": false},
        "phase3": {"name": "Employee File", "due_days": 5, "hard_gate": true},
        "phase4": {"name": "Policies", "due_days": 5, "hard_gate": false},
        "phase5": {"name": "Probation Setup", "due_days": 7, "hard_gate": false}
    }'::jsonb,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Employee onboarding instance tracking
CREATE TABLE IF NOT EXISTS employee_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES onboarding_workflows(id),

    -- Status tracking
    current_phase INTEGER DEFAULT 1,
    overall_status VARCHAR(50) DEFAULT 'not_started',
    -- Values: not_started, in_progress, blocked, completed

    -- Phase statuses (JSONB)
    -- Example: {"phase1": {"status": "completed", "completed_at": "2025-01-15T10:00:00Z", "blocked": false}}
    phase_statuses JSONB DEFAULT '{
        "phase1": {"status": "pending", "completed_at": null, "blocked": false},
        "phase2": {"status": "locked", "completed_at": null, "blocked": true},
        "phase3": {"status": "locked", "completed_at": null, "blocked": true},
        "phase4": {"status": "locked", "completed_at": null, "blocked": true},
        "phase5": {"status": "locked", "completed_at": null, "blocked": true}
    }'::jsonb,

    -- Timestamps
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,

    -- HR verification for employee file
    employee_file_complete BOOLEAN DEFAULT false,
    employee_file_verified_by UUID REFERENCES users(id),
    employee_file_verified_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(employee_id)
);

-- Onboarding document requirements and submissions
CREATE TABLE IF NOT EXISTS onboarding_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    onboarding_id UUID NOT NULL REFERENCES employee_onboarding(id) ON DELETE CASCADE,

    -- Document identification
    document_type VARCHAR(100) NOT NULL,
    -- Types: offer_letter, employment_contract, nda, ndpa_consent, code_of_conduct,
    --        job_description, org_chart, key_contacts, passport_photo,
    --        educational_cert, professional_cert, government_id
    document_category VARCHAR(50) NOT NULL,
    -- Categories: phase1_signing, phase2_acknowledgment, phase3_employee_file
    document_title VARCHAR(255),

    -- Phase association
    phase INTEGER NOT NULL,
    sort_order INTEGER DEFAULT 0,

    -- Requirements
    requires_signature BOOLEAN DEFAULT false,
    requires_acknowledgment BOOLEAN DEFAULT false,
    requires_upload BOOLEAN DEFAULT false,
    is_required BOOLEAN DEFAULT true,

    -- Template/source (for generated documents)
    template_id UUID REFERENCES document_templates(id),
    generated_document_id UUID REFERENCES generated_documents(id),
    policy_id UUID REFERENCES policies(id),

    -- Document content for generated docs (HTML)
    document_content TEXT,

    -- Submission tracking
    status VARCHAR(50) DEFAULT 'pending',
    -- Values: pending, viewed, uploaded, signed, acknowledged, verified, rejected

    -- File info (for uploads)
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),

    -- Signature/acknowledgment
    signature_data TEXT, -- Base64 encoded canvas signature
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    signed_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- HR verification (for uploads)
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,

    -- Due date tracking
    due_date DATE,
    was_overdue BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employee medical information (confidential)
CREATE TABLE IF NOT EXISTS employee_medical_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Medical information
    blood_group VARCHAR(10), -- A+, A-, B+, B-, O+, O-, AB+, AB-
    genotype VARCHAR(10), -- AA, AS, SS, AC, SC
    allergies TEXT,
    chronic_conditions TEXT,
    current_medications TEXT,
    emergency_medical_notes TEXT,

    -- Emergency contacts (separate from employee's standard emergency contact)
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(100),
    emergency_contact_address TEXT,

    -- NDPA consent tracking (required before accessing/storing medical data)
    ndpa_consent_given BOOLEAN DEFAULT false,
    ndpa_consent_at TIMESTAMP WITH TIME ZONE,
    ndpa_consent_ip VARCHAR(45),
    ndpa_consent_document_id UUID REFERENCES onboarding_documents(id),

    -- Audit
    last_updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(employee_id)
);

-- Probation check-in tasks (auto-scheduled)
CREATE TABLE IF NOT EXISTS probation_checkin_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,

    -- Check-in type and timing
    checkin_type VARCHAR(50) NOT NULL, -- 30_day, 60_day, 90_day, custom
    checkin_day INTEGER NOT NULL, -- Days after hire_date
    checkin_name VARCHAR(255), -- Display name, e.g., "30-Day Probation Check-in"

    -- Scheduling
    scheduled_date DATE NOT NULL,

    -- Assignees
    manager_id UUID REFERENCES employees(id), -- Line manager (reports_to)
    hr_assignee_id UUID REFERENCES users(id), -- HR user responsible

    -- Status tracking
    status VARCHAR(50) DEFAULT 'scheduled',
    -- Values: scheduled, reminder_sent, in_progress, completed, overdue, skipped, cancelled

    -- Completion tracking
    completed_at TIMESTAMP WITH TIME ZONE,
    completed_by UUID REFERENCES users(id),
    completion_notes TEXT,

    -- Link to probation review if one is created from this check-in
    probation_review_id UUID REFERENCES probation_reviews(id),

    -- Reminders and escalation
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,
    escalation_sent_at TIMESTAMP WITH TIME ZONE,
    escalated_to UUID REFERENCES users(id),

    -- Meeting details (optional)
    meeting_scheduled_at TIMESTAMP WITH TIME ZONE,
    meeting_location VARCHAR(255),
    meeting_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reporting line audit trail
CREATE TABLE IF NOT EXISTS reporting_line_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Change details
    previous_reports_to UUID REFERENCES employees(id),
    new_reports_to UUID REFERENCES employees(id),
    change_reason TEXT,
    effective_date DATE NOT NULL,

    -- Actor
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Policy renewal tracking (for annual re-acknowledgements)
CREATE TABLE IF NOT EXISTS policy_renewal_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id),
    policy_id UUID NOT NULL REFERENCES policies(id),
    employee_id UUID NOT NULL REFERENCES employees(id),

    -- Last acknowledgment tracking
    last_acknowledged_at TIMESTAMP WITH TIME ZONE,
    last_acknowledgment_id UUID REFERENCES policy_acknowledgments(id),

    -- Next renewal
    next_renewal_due DATE NOT NULL,
    renewal_status VARCHAR(50) DEFAULT 'pending',
    -- Values: pending, due_soon, overdue, completed

    -- Notification tracking
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    reminder_count INTEGER DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(policy_id, employee_id)
);

-- ============================================================================
-- PHASE 3: Create indexes
-- ============================================================================

-- Onboarding workflows indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_tenant ON onboarding_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_company ON onboarding_workflows(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_workflows_default ON onboarding_workflows(tenant_id, is_default) WHERE is_default = true;

-- Employee onboarding indexes
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_tenant ON employee_onboarding(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_company ON employee_onboarding(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_employee ON employee_onboarding(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_status ON employee_onboarding(overall_status);
CREATE INDEX IF NOT EXISTS idx_employee_onboarding_phase ON employee_onboarding(current_phase);

-- Onboarding documents indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_tenant ON onboarding_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_employee ON onboarding_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_onboarding ON onboarding_documents(onboarding_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_status ON onboarding_documents(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_phase ON onboarding_documents(phase);
CREATE INDEX IF NOT EXISTS idx_onboarding_documents_due ON onboarding_documents(due_date) WHERE status = 'pending';

-- Medical info indexes
CREATE INDEX IF NOT EXISTS idx_employee_medical_tenant ON employee_medical_info(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employee_medical_company ON employee_medical_info(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_medical_employee ON employee_medical_info(employee_id);

-- Probation check-in indexes
CREATE INDEX IF NOT EXISTS idx_probation_checkins_tenant ON probation_checkin_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_probation_checkins_employee ON probation_checkin_tasks(employee_id);
CREATE INDEX IF NOT EXISTS idx_probation_checkins_manager ON probation_checkin_tasks(manager_id);
CREATE INDEX IF NOT EXISTS idx_probation_checkins_status ON probation_checkin_tasks(status);
CREATE INDEX IF NOT EXISTS idx_probation_checkins_scheduled ON probation_checkin_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_probation_checkins_overdue ON probation_checkin_tasks(scheduled_date)
    WHERE status IN ('scheduled', 'reminder_sent');

-- Reporting line audit indexes
CREATE INDEX IF NOT EXISTS idx_reporting_audit_tenant ON reporting_line_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reporting_audit_employee ON reporting_line_audit(employee_id);
CREATE INDEX IF NOT EXISTS idx_reporting_audit_date ON reporting_line_audit(effective_date);

-- Policy renewal indexes
CREATE INDEX IF NOT EXISTS idx_policy_renewal_tenant ON policy_renewal_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policy_renewal_employee ON policy_renewal_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_policy_renewal_policy ON policy_renewal_schedules(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_renewal_due ON policy_renewal_schedules(next_renewal_due);
CREATE INDEX IF NOT EXISTS idx_policy_renewal_status ON policy_renewal_schedules(renewal_status);

-- ============================================================================
-- PHASE 4: Insert default workflow template
-- ============================================================================

-- Insert default onboarding workflow template for the demo tenant
INSERT INTO onboarding_workflows (
    tenant_id,
    name,
    description,
    is_default,
    is_active,
    phase_config
) VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Standard Onboarding Workflow',
    'Default 5-phase onboarding workflow with document signing, role clarity, employee file, policies, and probation setup',
    true,
    true,
    '{
        "phase1": {
            "name": "Required Documents",
            "description": "Sign offer letter, employment contract, NDA, NDPA consent, and Code of Conduct",
            "due_days": 2,
            "hard_gate": true,
            "documents": [
                {"type": "offer_letter", "title": "Offer Letter", "requires_signature": true},
                {"type": "employment_contract", "title": "Employment Contract", "requires_signature": true},
                {"type": "nda", "title": "Non-Disclosure Agreement", "requires_signature": true},
                {"type": "ndpa_consent", "title": "NDPA Notice & Data Protection Consent", "requires_acknowledgment": true},
                {"type": "code_of_conduct", "title": "Code of Conduct", "requires_acknowledgment": true}
            ]
        },
        "phase2": {
            "name": "Role Clarity",
            "description": "Review and acknowledge job description, org chart, and key contacts",
            "due_days": 3,
            "hard_gate": false,
            "documents": [
                {"type": "job_description", "title": "Job Description", "requires_acknowledgment": true},
                {"type": "org_chart", "title": "Organizational Chart & Reporting Line", "requires_acknowledgment": true},
                {"type": "key_contacts", "title": "Key Contacts & Escalation Map", "requires_acknowledgment": true}
            ]
        },
        "phase3": {
            "name": "Employee File",
            "description": "Complete profile and upload required documents",
            "due_days": 5,
            "hard_gate": true,
            "profile_sections": ["personal", "bank", "statutory", "medical"],
            "documents": [
                {"type": "passport_photo", "title": "Passport Photographs", "requires_upload": true},
                {"type": "educational_cert", "title": "Educational Certificates", "requires_upload": true},
                {"type": "professional_cert", "title": "Professional Certifications", "requires_upload": true, "is_required": false},
                {"type": "government_id", "title": "Government ID (NIN/Drivers License)", "requires_upload": true}
            ]
        },
        "phase4": {
            "name": "Policy Acknowledgment",
            "description": "Read and acknowledge company policies",
            "due_days": 5,
            "hard_gate": false,
            "use_policy_system": true
        },
        "phase5": {
            "name": "Probation Setup",
            "description": "Review probation period details and check-in schedule",
            "due_days": 7,
            "hard_gate": false,
            "create_checkins": true,
            "checkin_days": [30, 60, 90]
        }
    }'::jsonb
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- PHASE 5: Create trigger for reporting line audit
-- ============================================================================

-- Function to track reporting line changes
CREATE OR REPLACE FUNCTION track_reporting_line_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.reports_to IS DISTINCT FROM NEW.reports_to THEN
        INSERT INTO reporting_line_audit (
            tenant_id,
            company_id,
            employee_id,
            previous_reports_to,
            new_reports_to,
            effective_date
        ) VALUES (
            NEW.tenant_id,
            NEW.company_id,
            NEW.id,
            OLD.reports_to,
            NEW.reports_to,
            CURRENT_DATE
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_reporting_line_audit'
    ) THEN
        CREATE TRIGGER trigger_reporting_line_audit
        AFTER UPDATE ON employees
        FOR EACH ROW
        EXECUTE FUNCTION track_reporting_line_change();
    END IF;
END;
$$;

-- ============================================================================
-- PHASE 6: Add comments for documentation
-- ============================================================================

COMMENT ON TABLE onboarding_workflows IS 'Onboarding workflow templates with configurable phases';
COMMENT ON TABLE employee_onboarding IS 'Individual employee onboarding progress tracking';
COMMENT ON TABLE onboarding_documents IS 'Document requirements and submissions for onboarding';
COMMENT ON TABLE employee_medical_info IS 'Confidential employee medical information with NDPA consent';
COMMENT ON TABLE probation_checkin_tasks IS 'Auto-scheduled probation check-in tasks for managers and HR';
COMMENT ON TABLE reporting_line_audit IS 'Audit trail for changes to employee reporting lines';
COMMENT ON TABLE policy_renewal_schedules IS 'Tracking for annual policy re-acknowledgement requirements';

COMMENT ON COLUMN employee_onboarding.overall_status IS 'not_started, in_progress, blocked, completed';
COMMENT ON COLUMN onboarding_documents.status IS 'pending, viewed, uploaded, signed, acknowledged, verified, rejected';
COMMENT ON COLUMN probation_checkin_tasks.status IS 'scheduled, reminder_sent, in_progress, completed, overdue, skipped, cancelled';