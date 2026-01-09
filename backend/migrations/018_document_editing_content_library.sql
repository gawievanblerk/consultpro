-- Migration 018: Document Editing and Content Library
-- Adds signature source tracking, content library, and document version history

-- ============================================================================
-- SIGNATURE ENHANCEMENTS
-- ============================================================================

-- Track signature source (canvas drawing vs uploaded image)
ALTER TABLE onboarding_documents
ADD COLUMN IF NOT EXISTS signature_source VARCHAR(20) DEFAULT 'canvas';
-- Values: 'canvas', 'upload'

-- ============================================================================
-- CONTENT LIBRARY TABLES
-- ============================================================================

-- Content Library Categories
CREATE TABLE IF NOT EXISTS content_library_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id), -- NULL = tenant-wide

    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50), -- Icon identifier for UI (e.g., 'briefcase', 'chart-bar')
    sort_order INTEGER DEFAULT 0,

    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique index for category names per tenant/company
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_lib_cat_unique_name
ON content_library_categories (tenant_id, COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

-- Content Library Items
CREATE TABLE IF NOT EXISTS content_library_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    company_id UUID REFERENCES companies(id), -- NULL = tenant-wide
    category_id UUID REFERENCES content_library_categories(id) ON DELETE SET NULL,

    -- Item Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL,
    -- Types: job_description, kpi, task, clause, snippet, boilerplate

    -- Content (HTML)
    content TEXT NOT NULL,

    -- Metadata
    tags TEXT[], -- Searchable tags
    is_system BOOLEAN DEFAULT false, -- System items cannot be deleted
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0, -- Track popularity

    -- Versioning
    version INTEGER DEFAULT 1,

    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DOCUMENT VERSION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),

    -- Document Reference (polymorphic - can reference different document tables)
    document_type VARCHAR(50) NOT NULL,
    -- Types: generated_document, onboarding_document
    document_id UUID NOT NULL,

    -- Version Info
    version_number INTEGER NOT NULL,

    -- Content Snapshot
    content_snapshot TEXT NOT NULL, -- Full HTML content at this version

    -- Change Details
    change_summary VARCHAR(500), -- Brief description of changes

    -- Actor
    created_by UUID REFERENCES users(id),
    created_by_name VARCHAR(255), -- Denormalized for history display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Indexes for efficient querying
    UNIQUE(document_type, document_id, version_number)
);

-- ============================================================================
-- EXTEND EXISTING DOCUMENT TABLES
-- ============================================================================

-- Add editing and version tracking to generated_documents
ALTER TABLE generated_documents
ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Add editing and version tracking to onboarding_documents
ALTER TABLE onboarding_documents
ADD COLUMN IF NOT EXISTS is_editable BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS current_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_edited_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Content Library Categories
CREATE INDEX IF NOT EXISTS idx_content_lib_cat_tenant ON content_library_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_lib_cat_company ON content_library_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_content_lib_cat_active ON content_library_categories(is_active);

-- Content Library Items
CREATE INDEX IF NOT EXISTS idx_content_lib_items_tenant ON content_library_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_content_lib_items_company ON content_library_items(company_id);
CREATE INDEX IF NOT EXISTS idx_content_lib_items_category ON content_library_items(category_id);
CREATE INDEX IF NOT EXISTS idx_content_lib_items_type ON content_library_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_lib_items_active ON content_library_items(is_active);
CREATE INDEX IF NOT EXISTS idx_content_lib_items_tags ON content_library_items USING GIN(tags);

-- Document Versions
CREATE INDEX IF NOT EXISTS idx_doc_versions_doc ON document_versions(document_type, document_id);
CREATE INDEX IF NOT EXISTS idx_doc_versions_created ON document_versions(created_at DESC);

-- ============================================================================
-- SEED DEFAULT CONTENT LIBRARY CATEGORIES
-- ============================================================================

-- Insert default categories for each tenant
INSERT INTO content_library_categories (tenant_id, name, description, icon, sort_order, is_active)
SELECT
    t.id as tenant_id,
    category.name,
    category.description,
    category.icon,
    category.sort_order,
    true
FROM tenants t
CROSS JOIN (VALUES
    ('Job Descriptions', 'Standard job descriptions and role definitions', 'briefcase', 1),
    ('KPIs & Metrics', 'Key performance indicators and measurement criteria', 'chart-bar', 2),
    ('Tasks & Responsibilities', 'Reusable task lists and responsibility definitions', 'clipboard-list', 3),
    ('Contract Clauses', 'Standard contract clauses and legal text', 'document-text', 4),
    ('Policy Snippets', 'Reusable policy content and guidelines', 'shield-check', 5),
    ('General Content', 'Other reusable content and boilerplate text', 'document-duplicate', 6)
) AS category(name, description, icon, sort_order)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED SAMPLE CONTENT LIBRARY ITEMS
-- ============================================================================

-- Insert sample content items for the first tenant
INSERT INTO content_library_items (tenant_id, category_id, name, description, content_type, content, tags)
SELECT
    cat.tenant_id,
    cat.id as category_id,
    item.name,
    item.description,
    item.content_type,
    item.content,
    item.tags::text[]
FROM content_library_categories cat
CROSS JOIN (VALUES
    -- Job Descriptions
    ('Job Descriptions', 'Software Developer Responsibilities', 'Standard software developer role responsibilities', 'job_description',
     '<ul><li>Design, develop, and maintain software applications</li><li>Write clean, maintainable, and efficient code</li><li>Participate in code reviews and technical discussions</li><li>Collaborate with cross-functional teams</li><li>Debug and resolve technical issues</li><li>Document code and technical specifications</li></ul>',
     ARRAY['developer', 'software', 'technical']),

    -- KPIs
    ('KPIs & Metrics', 'Sales Team KPIs', 'Standard sales performance indicators', 'kpi',
     '<ul><li><strong>Monthly Sales Target:</strong> Achieve 100% of assigned sales quota</li><li><strong>Customer Acquisition:</strong> Acquire minimum 5 new clients per month</li><li><strong>Customer Retention:</strong> Maintain 90% customer retention rate</li><li><strong>Lead Conversion:</strong> Convert 25% of qualified leads</li><li><strong>Customer Satisfaction:</strong> Maintain CSAT score above 4.5/5</li></ul>',
     ARRAY['sales', 'performance', 'targets']),

    -- Tasks
    ('Tasks & Responsibilities', 'Onboarding Checklist', 'New employee onboarding tasks', 'task',
     '<ol><li>Complete all required documentation</li><li>Set up workstation and equipment</li><li>Complete IT security training</li><li>Review company policies and handbook</li><li>Meet with team members and stakeholders</li><li>Complete department-specific training</li><li>Set 30-60-90 day goals with manager</li></ol>',
     ARRAY['onboarding', 'new hire', 'checklist']),

    -- Contract Clauses
    ('Contract Clauses', 'Confidentiality Clause', 'Standard confidentiality agreement clause', 'clause',
     '<p>The Employee agrees to maintain strict confidentiality regarding all proprietary information, trade secrets, business strategies, client lists, and other confidential information belonging to the Company. This obligation shall continue during employment and for a period of two (2) years following termination of employment, regardless of the reason for termination.</p>',
     ARRAY['confidentiality', 'nda', 'legal']),

    -- Policy Snippets
    ('Policy Snippets', 'Remote Work Guidelines', 'Remote work policy excerpt', 'snippet',
     '<h4>Remote Work Requirements</h4><ul><li>Maintain a dedicated workspace with reliable internet connection</li><li>Be available during core working hours (9 AM - 4 PM)</li><li>Respond to communications within 2 hours during working hours</li><li>Attend all mandatory virtual meetings with camera on</li><li>Ensure data security and use VPN for sensitive work</li><li>Track time and submit regular status updates</li></ul>',
     ARRAY['remote', 'work from home', 'policy']),

    -- General
    ('General Content', 'Company Mission Statement', 'Standard mission statement template', 'boilerplate',
     '<p>Our mission is to deliver exceptional value to our clients through innovative solutions, unwavering commitment to quality, and a culture of continuous improvement. We strive to be a trusted partner in our clients'' success while fostering an environment where our employees can grow and thrive.</p>',
     ARRAY['mission', 'about', 'company'])
) AS item(category_name, name, description, content_type, content, tags)
WHERE cat.name = item.category_name
  AND cat.tenant_id = (SELECT id FROM tenants ORDER BY created_at LIMIT 1)
ON CONFLICT DO NOTHING;
