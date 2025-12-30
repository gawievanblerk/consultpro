-- CoreHR Client Onboarding from CRM
-- Migration: 007_client_onboarding.sql
-- Purpose: Link CRM clients to HR companies, enable client admin invitations

-- ============================================================================
-- LINK CLIENTS TO COMPANIES
-- ============================================================================

-- Add client_id to companies table to link with CRM clients
ALTER TABLE companies ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_client ON companies(client_id) WHERE client_id IS NOT NULL;

-- ============================================================================
-- CLIENT ONBOARDING FIELDS
-- ============================================================================

-- Add onboarding status fields to clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarding_status VARCHAR(50) DEFAULT 'not_started';
-- Values: not_started, invited, active, failed
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS onboarded_by UUID REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_clients_onboarding_status ON clients(onboarding_status);

-- ============================================================================
-- COMPANY ADMIN INVITATIONS
-- ============================================================================

-- Invitations for client company admins (HR managers at the client)
CREATE TABLE IF NOT EXISTS company_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    consultant_id UUID NOT NULL REFERENCES consultants(id),
    client_id UUID REFERENCES clients(id),

    -- Invitation Details
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'admin', -- admin, manager, user

    -- Token Management
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Status
    sent_at TIMESTAMP WITH TIME ZONE,
    resend_count INTEGER DEFAULT 0,
    last_resent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,

    -- Audit
    invited_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company ON company_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invitations_consultant ON company_invitations(consultant_id);

-- ============================================================================
-- MIGRATE EXISTING ACTIVE CLIENTS TO COMPANIES
-- ============================================================================

-- Only run if there are active clients without corresponding companies
-- This creates company records for existing active clients

INSERT INTO companies (
    id,
    consultant_id,
    legal_name,
    trading_name,
    industry,
    email,
    phone,
    website,
    address_line1,
    address_line2,
    city,
    state,
    country,
    tin,
    rc_number,
    client_id,
    status,
    created_at
)
SELECT
    gen_random_uuid() as id,
    c.id as consultant_id,
    cl.company_name as legal_name,
    cl.company_name as trading_name,
    cl.industry,
    cl.email,
    cl.phone,
    cl.website,
    cl.address_line1,
    cl.address_line2,
    cl.city,
    cl.state,
    cl.country,
    cl.tin,
    cl.rc_number,
    cl.id as client_id,
    'active' as status,
    cl.created_at
FROM clients cl
JOIN consultants c ON cl.tenant_id = c.tenant_id
WHERE cl.client_type = 'active'
  AND cl.deleted_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM companies co WHERE co.client_id = cl.id
  );

-- Update migrated clients to show they're onboarded
UPDATE clients
SET onboarding_status = 'active',
    onboarded_at = NOW()
WHERE client_type = 'active'
  AND deleted_at IS NULL
  AND EXISTS (
      SELECT 1 FROM companies co WHERE co.client_id = clients.id
  );

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN companies.client_id IS 'Links company to CRM client record';
COMMENT ON COLUMN clients.onboarding_status IS 'Client onboarding status: not_started, invited, active, failed';
COMMENT ON COLUMN clients.onboarded_at IS 'When client was onboarded to HR platform';
COMMENT ON TABLE company_invitations IS 'Invitations for client company administrators';
