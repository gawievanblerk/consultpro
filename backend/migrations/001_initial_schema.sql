-- ConsultPro Phase 1 Database Schema
-- TeamACE HR/Consulting Platform MVP

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Tenants (Organizations)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE(tenant_id, email)
);

-- ============================================================================
-- MODULE 1.1: CRM & CLIENT MANAGEMENT
-- ============================================================================

-- Clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    website VARCHAR(255),
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Nigeria',
    postal_code VARCHAR(20),
    -- Nigeria compliance
    tin VARCHAR(50), -- Tax Identification Number
    rc_number VARCHAR(50), -- CAC Registration Number
    -- Classification
    client_type VARCHAR(50) DEFAULT 'prospect', -- prospect, active, inactive
    client_tier VARCHAR(50), -- enterprise, mid-market, sme
    -- Financial
    credit_limit DECIMAL(15,2),
    payment_terms INTEGER DEFAULT 30, -- days
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID REFERENCES clients(id),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    job_title VARCHAR(100),
    department VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    is_decision_maker BOOLEAN DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Engagements (Projects/Contracts)
CREATE TABLE engagements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    engagement_type VARCHAR(50), -- consulting, hr_outsourcing, recruitment, training
    status VARCHAR(50) DEFAULT 'active', -- draft, active, on_hold, completed, cancelled
    start_date DATE,
    end_date DATE,
    contract_value DECIMAL(15,2),
    billing_type VARCHAR(50), -- fixed, hourly, monthly, milestone
    billing_rate DECIMAL(15,2),
    -- Contract details
    contract_number VARCHAR(100),
    contract_signed_date DATE,
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    entity_type VARCHAR(50) NOT NULL, -- client, engagement, staff, invoice
    entity_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    category VARCHAR(100), -- contract, proposal, invoice, report, other
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Activity Logs
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    activity_type VARCHAR(50) NOT NULL, -- call, email, meeting, note, status_change
    description TEXT,
    metadata JSONB DEFAULT '{}',
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MODULE 1.2: BUSINESS DEVELOPMENT
-- ============================================================================

-- Pipeline Stages
CREATE TABLE pipeline_stages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    position INTEGER NOT NULL,
    probability INTEGER DEFAULT 0, -- 0-100%
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leads
CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    industry VARCHAR(100),
    -- Lead details
    source VARCHAR(100), -- website, referral, cold_call, event, linkedin
    status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, unqualified, converted
    pipeline_stage_id UUID REFERENCES pipeline_stages(id),
    -- Opportunity
    estimated_value DECIMAL(15,2),
    probability INTEGER DEFAULT 0,
    expected_close_date DATE,
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    -- Conversion
    converted_to_client_id UUID REFERENCES clients(id),
    converted_at TIMESTAMP,
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Proposals
CREATE TABLE proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    lead_id UUID REFERENCES leads(id),
    client_id UUID REFERENCES clients(id),
    proposal_number VARCHAR(50) UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    -- Financial
    subtotal DECIMAL(15,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 7.5,
    vat_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired
    valid_until DATE,
    sent_at TIMESTAMP,
    viewed_at TIMESTAMP,
    responded_at TIMESTAMP,
    -- Content
    content JSONB, -- Structured proposal content
    terms TEXT,
    -- Conversion
    converted_to_engagement_id UUID REFERENCES engagements(id),
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================================================
-- MODULE 1.3: HR OUTSOURCING
-- ============================================================================

-- Staff (Outsourced Personnel Pool)
CREATE TABLE staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    employee_id VARCHAR(50),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    -- Personal
    date_of_birth DATE,
    gender VARCHAR(20),
    marital_status VARCHAR(50),
    nationality VARCHAR(100) DEFAULT 'Nigerian',
    state_of_origin VARCHAR(100),
    -- Professional
    job_title VARCHAR(100),
    department VARCHAR(100),
    skills TEXT[], -- Array of skills
    years_experience INTEGER,
    education_level VARCHAR(100),
    certifications TEXT[],
    -- Employment
    employment_type VARCHAR(50), -- permanent, contract, temporary
    hire_date DATE,
    -- Compensation
    salary DECIMAL(15,2),
    salary_currency VARCHAR(3) DEFAULT 'NGN',
    -- Nigeria compliance
    nin VARCHAR(20), -- National ID Number
    bvn VARCHAR(20), -- Bank Verification Number
    pension_pin VARCHAR(50),
    tax_id VARCHAR(50),
    -- Bank details
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    bank_account_name VARCHAR(255),
    -- Status
    is_available BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active', -- active, on_leave, deployed, terminated
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Deployments (Staff assignments to clients)
CREATE TABLE deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    staff_id UUID NOT NULL REFERENCES staff(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    engagement_id UUID REFERENCES engagements(id),
    -- Assignment details
    role_title VARCHAR(100),
    location VARCHAR(255),
    start_date DATE NOT NULL,
    end_date DATE,
    -- Billing
    billing_rate DECIMAL(15,2),
    billing_type VARCHAR(50) DEFAULT 'monthly', -- hourly, daily, monthly
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- pending, active, completed, terminated
    termination_reason TEXT,
    -- Metadata
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================================================
-- MODULE 1.4: FINANCE
-- ============================================================================

-- Invoices
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    client_id UUID NOT NULL REFERENCES clients(id),
    engagement_id UUID REFERENCES engagements(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    -- Dates
    invoice_date DATE NOT NULL,
    due_date DATE,
    payment_date DATE,
    -- Amounts
    subtotal DECIMAL(15,2) NOT NULL,
    vat_rate DECIMAL(5,2) DEFAULT 0, -- Nigeria VAT 7.5%
    vat_amount DECIMAL(15,2) DEFAULT 0,
    wht_rate DECIMAL(5,2) DEFAULT 0, -- WHT 5% or 10%
    wht_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, partial, paid, overdue, cancelled
    sent_at TIMESTAMP,
    -- Content
    notes TEXT,
    terms TEXT,
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Invoice Items
CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15,2) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    invoice_id UUID NOT NULL REFERENCES invoices(id),
    amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50), -- bank_transfer, cash, check, card
    reference_number VARCHAR(100),
    bank_name VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================================================
-- MODULE 1.5: COLLABORATION
-- ============================================================================

-- Tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    -- Relations
    client_id UUID REFERENCES clients(id),
    engagement_id UUID REFERENCES engagements(id),
    lead_id UUID REFERENCES leads(id),
    -- Assignment
    assigned_to UUID REFERENCES users(id),
    -- Status
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    due_date TIMESTAMP,
    completed_at TIMESTAMP,
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Notes
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    entity_type VARCHAR(50) NOT NULL, -- client, engagement, lead, staff, task
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Tenant isolation indexes (critical for performance)
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_clients_tenant ON clients(tenant_id);
CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_engagements_tenant ON engagements(tenant_id);
CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_staff_tenant ON staff(tenant_id);
CREATE INDEX idx_deployments_tenant ON deployments(tenant_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_payments_tenant ON payments(tenant_id);
CREATE INDEX idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX idx_notes_tenant ON notes(tenant_id);

-- Common query indexes
CREATE INDEX idx_clients_type ON clients(tenant_id, client_type);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_stage ON leads(tenant_id, pipeline_stage_id);
CREATE INDEX idx_staff_available ON staff(tenant_id, is_available);
CREATE INDEX idx_deployments_status ON deployments(tenant_id, status);
CREATE INDEX idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_due ON invoices(tenant_id, due_date);
CREATE INDEX idx_tasks_assigned ON tasks(tenant_id, assigned_to);
CREATE INDEX idx_tasks_status ON tasks(tenant_id, status);

-- Entity lookups
CREATE INDEX idx_contacts_client ON contacts(client_id);
CREATE INDEX idx_engagements_client ON engagements(client_id);
CREATE INDEX idx_deployments_staff ON deployments(staff_id);
CREATE INDEX idx_deployments_client ON deployments(client_id);
CREATE INDEX idx_invoices_client ON invoices(client_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX idx_activity_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_documents_entity ON documents(entity_type, entity_id);
