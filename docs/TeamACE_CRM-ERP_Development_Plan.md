---
header-includes: |
  \usepackage{tikz}
  \usepackage{fancyhdr}
  \usepackage{xcolor}
  \definecolor{titleblue}{RGB}{26,54,93}
  \pagestyle{fancy}
  \fancyhf{}
  \fancyhead[L]{\small TeamACE CRM-ERP Development Plan}
  \fancyhead[R]{\small Rozitech}
  \fancyfoot[C]{\thepage}
  \renewcommand{\headrulewidth}{0.4pt}
---

# Document Information

| Field | Value |
|-------|-------|
| **Document Title** | TeamACE CRM-ERP Development Plan |
| **Version** | 1.0 |
| **Date** | November 29, 2025 |
| **Prepared by** | Rozitech Development Team |
| **Status** | Draft for Partner Review |

\newpage

## Executive Summary

This document outlines the development plan for building a comprehensive CRM-ERP system for TeamACE, a Nigerian HR consulting/outsourcing firm. The plan maximizes reuse of existing Rozitech applications (Workforce, InvoiceFlow, ExpenseTrack) to significantly reduce development effort.

**Team Composition:**
- 1 Dev Lead/PM/BA (Gawie)
- 2 Developers
- 1 QA/DevOps Engineer

**Development Approach:** Module-by-module, phased delivery aligned with partner's technical roadmap.

---

## Reuse Analysis Summary

| Existing App | Reusable For | Reuse Level |
|--------------|--------------|-------------|
| **Workforce** | HR Outsourcing, Payroll, Recruitment, Performance | 70-80% |
| **InvoiceFlow** | Finance/Invoicing, Client Management, Payments | 60-70% |
| **ExpenseTrack** | Document OCR, Expense Tracking | 40-50% |
| **Auth Server** | Multi-tenant auth, Role-based access | 90% |

**Estimated Overall Reuse: 50-60%** of total functionality already exists.

---

## Phase 1: Foundation Modules

*These establish root-level entities that all other modules depend on.*

### Module 1.1: Core CRM & Client Management
**Priority:** CRITICAL - Build First
**Effort:** 3-4 sprints
**Reuse:** InvoiceFlow client model (60%)

**New Entities:**
- `clients` - Company profiles (extend InvoiceFlow's client table)
- `contacts` - Key contact persons per client
- `engagements` - Projects/contracts with clients
- `documents` - Centralized document storage
- `activity_logs` - All interactions logged

**Key Features:**
1. Client company profiles with industry, size, contract terms
2. Multiple contacts per client with roles
3. Engagement/project tracking linked to clients
4. Document management with version control
5. Activity timeline per client
6. Role-based visibility

**Reuse from InvoiceFlow:**
- Client CRUD patterns
- Client search/filter logic
- Multi-tenant isolation pattern

**New Development:**
- Contact management (one-to-many with clients)
- Engagement entity and lifecycle
- Activity logging framework
- Client org chart/relationship tree

---

### Module 1.2: Business Development Essentials
**Priority:** HIGH
**Effort:** 3-4 sprints
**Reuse:** Workforce recruitment pipeline (50%)

**New Entities:**
- `leads` - Potential clients from various sources
- `pipeline_stages` - Customizable deal stages
- `proposals` - Proposal/pitch tracking
- `opportunities` - Deal value and probability
- `communication_logs` - Emails, calls, meetings

**Key Features:**
1. Lead capture from multiple sources (web, referral, LinkedIn)
2. Visual sales pipeline (Kanban-style)
3. Proposal creation and tracking
4. Win/loss analysis
5. Revenue forecasting by stage
6. Bulk email/messaging (birthday, campaigns)

**Reuse from Workforce:**
- Pipeline stage pattern
- Candidate → Lead pattern adaptation
- Interview scheduling → Meeting scheduling
- Application workflow → Proposal workflow

**New Development:**
- Lead scoring algorithm
- Proposal templates with document generation
- Revenue forecasting calculations
- Email/SMS integration hooks
- Bulk messaging system

---

### Module 1.3: HR Outsourcing Essentials
**Priority:** HIGH
**Effort:** 2-3 sprints
**Reuse:** Workforce HRIS (80%)

**Extends Workforce With:**
- `client_staff_assignments` - Link employees to clients
- `deployments` - Where staff are deployed
- `contract_documents` - Client-specific contracts
- `service_logs` - Services rendered per client

**Key Features:**
1. Client company profiles linked to outsourced staff
2. Staff deployment tracking by client/location
3. Employee lifecycle per client (hire, confirm, redeploy, exit)
4. Contract management with renewal alerts
5. Timesheet/attendance by client
6. Client-based payroll grouping

**Reuse from Workforce:**
- Complete employee management
- Leave management with approvals
- Attendance tracking
- Onboarding workflow
- Document uploads

**New Development:**
- Client-staff assignment entity
- Multi-client deployment tracking
- Client-specific payroll groups
- Service log tracking

---

### Module 1.4: Finance Light (Invoicing + Receivables)
**Priority:** HIGH
**Effort:** 2-3 sprints
**Reuse:** InvoiceFlow (70%)

**Entities from InvoiceFlow:**
- `invoices` - Client billing
- `invoice_items` - Line items
- `payments` - Payment tracking
- `tax_rates` - Nigeria tax rates

**Key Features:**
1. Invoice generation from CRM
2. Multiple billing types (retainer, milestone, time-based)
3. Payment tracking and reconciliation
4. Receivables aging report
5. Basic financial dashboard
6. Integration hooks for accounting systems

**Reuse from InvoiceFlow:**
- Complete invoice CRUD
- Payment tracking and status updates
- Client linking
- Multi-currency support
- Tax calculations

**New Development:**
- Link invoices to engagements/projects
- Billing schedule automation
- Finance tags for clients
- Receivables aging calculations
- QuickBooks/Xero integration stubs

---

### Module 1.5: Collaboration & Workflow Layer
**Priority:** CRITICAL - Cross-cutting
**Effort:** 2-3 sprints
**Reuse:** Workforce approval patterns (40%)

**New Entities:**
- `notes` - Internal notes on any entity
- `comments` - Threaded comments
- `approvals` - Universal approval workflow
- `notifications` - Bell + email notifications
- `tasks` - Assigned tasks with due dates

**Key Features:**
1. Notes/comments on any record (polymorphic)
2. Multi-step approval workflows (configurable)
3. Notification engine (in-app + email)
4. Task management with assignments
5. Audit trail for all changes
6. Escalation paths

**Reuse from Workforce:**
- Leave approval pattern
- Payroll approval workflow
- Notification aggregation
- Audit logging structure

**New Development:**
- Generic approval engine (any entity)
- Configurable workflow steps
- Email notification integration
- Task management system
- Escalation rules

---

## Phase 2: Operational Modules

*Depend on Phase 1 entities for data integrity.*

### Module 2.1: Payroll (Internal + Outsourced)
**Priority:** HIGH
**Effort:** 1-2 sprints (mostly reuse)
**Reuse:** Workforce Payroll (90%)

**Direct Reuse:**
- Salary components and structures
- Payroll periods with approval workflow
- Payslip generation with PDF export
- Nigeria PAYE, pension, NHF calculations
- Employee self-service payslip view

**Extensions Needed:**
- Client-based payroll groups
- Outsourced staff separate payroll runs
- Client billing reconciliation
- Exit pay calculations

---

### Module 2.2: Tax Module
**Priority:** MEDIUM
**Effort:** 3-4 sprints
**Reuse:** Workforce Nigeria tax logic (30%)

**New Entities:**
- `client_tax_profiles` - TIN, tax types, filing frequency
- `tax_calendar` - Filing deadlines
- `tax_filings` - Filing status and history
- `tax_payments` - Remittance tracking

**Key Features:**
1. Client tax profile management (TIN, VAT, WHT, PAYE, CIT)
2. Tax calendar with automated reminders
3. Filing and payment tracking
4. Document storage for tax docs
5. Risk flagging for non-compliance
6. Integration with Finance for WHT tracking

**Reuse:**
- PAYE calculation logic from Workforce
- Document upload patterns
- Reminder/notification system

---

### Module 2.3: Recruitment & Verification
**Priority:** MEDIUM
**Effort:** 2-3 sprints
**Reuse:** Workforce Talent (80%)

**Direct Reuse:**
- Job postings and requisitions
- Candidate database with skills/education
- Pipeline stages and tracking
- Interview scheduling with feedback
- Offer management

**Extensions for Verification:**
- Verification task checklist per candidate
- Status tracking (Pending → Verified → Flagged)
- Document evidence upload per check
- Turnaround time monitoring
- Verification report generation

---

### Module 2.4: In-House HR
**Priority:** MEDIUM
**Effort:** 1-2 sprints (mostly reuse)
**Reuse:** Workforce HRIS (90%)

**Direct Reuse:**
- Employee records and lifecycle
- Leave management
- Attendance tracking
- Performance management (goals, reviews)
- Onboarding workflow
- Learning & Development tracking

**Extensions:**
- Employee relations (grievance tracking)
- Engagement activities calendar
- Policy acknowledgment tracking
- Offboarding workflow enhancement

---

### Module 2.5: Social Media Tracking
**Priority:** LOW
**Effort:** 2-3 sprints
**Reuse:** Minimal (new module)

**New Entities:**
- `campaigns` - Social media campaigns
- `campaign_content` - Posts/content per campaign
- `lead_sources` - Attribution tracking
- `content_assets` - Creative library

**Key Features:**
1. Campaign creation and tracking
2. Content calendar integration
3. Lead source attribution
4. Performance metrics dashboard
5. Asset/content library

---

## Phase 3: Enterprise Modules

*Require mature operational data from Phase 1-2.*

### Module 3.1: Compliance Dashboard
**Priority:** MEDIUM
**Effort:** 3-4 sprints

**Key Features:**
1. Cross-department compliance status
2. SLA monitoring per client
3. Regulatory deadline tracking
4. Compliance checklists by department
5. Automated alerts and escalations
6. Audit-ready reporting

---

### Module 3.2: IT Asset & Helpdesk
**Priority:** LOW
**Effort:** 2-3 sprints

**Key Features:**
1. IT asset inventory with lifecycle
2. Helpdesk ticketing system
3. User access management
4. License tracking with renewal alerts

---

### Module 3.3: Admin & Vendor Management
**Priority:** LOW
**Effort:** 2-3 sprints

**Key Features:**
1. Vendor database and contracts
2. Facility/resource management
3. Administrative task tracking
4. Office supplies inventory

---

## Phase 4: Intelligence Layer

*Requires stable schemas and historical data.*

### Module 4.1: Automation Engine
- Configurable workflow triggers
- Auto-reminders and escalations
- Status change automation

### Module 4.2: Analytics & Reporting
- Cross-module dashboards
- Custom report builder
- Export to Excel/PDF

### Module 4.3: External Integrations
- QuickBooks/Xero/Sage
- Email (Outlook/Gmail sync)
- SMS gateway
- Calendar integration

---

## Technical Architecture

### Stack (Consistent with Existing Apps)
- **Backend:** Node.js + Express.js
- **Database:** PostgreSQL 14+ with UUID, JSONB
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Auth:** JWT with multi-tenant support
- **Deployment:** Docker + Render.com (or PM2 on VPS)

### Multi-Tenant Strategy
- Schema separation per tenant (PostgreSQL schemas)
- Organization ID on all tables
- JWT contains org ID and permissions

### Module Structure
```
apps/teamace-crm/
+-- backend/
|   +-- src/
|   |   +-- routes/          # API endpoints by module
|   |   +-- controllers/     # Business logic
|   |   +-- models/          # Database models
|   |   +-- middleware/      # Auth, tenant, validation
|   |   +-- services/        # Shared services
|   |   +-- utils/           # Helpers
|   +-- migrations/          # Database migrations
|   +-- docker/              # Docker config
+-- frontend/
|   +-- src/
|   |   +-- pages/           # Page components by module
|   |   +-- components/      # Reusable UI components
|   |   +-- context/         # React context (auth, etc.)
|   |   +-- utils/           # API, helpers
|   +-- public/
+-- tests/
```

---

## Sprint Planning Recommendation

### Sprint Duration: 2 weeks

### Phase 1 Sprints (Foundation)

| Sprint | Module | Deliverables |
|--------|--------|--------------|
| 1-2 | Core CRM Base | Client, Contact entities + CRUD |
| 3-4 | Core CRM + BD | Engagement, Activity, Lead capture |
| 5-6 | BD Pipeline | Pipeline, Proposals, Forecasting |
| 7-8 | HR Outsourcing | Client-staff assignment, Deployment |
| 9-10 | Finance Light | Invoicing, Payments, Receivables |
| 11-12 | Workflow Layer | Approvals, Notifications, Tasks |

**Phase 1 Duration: ~24 weeks (6 months)**

### Phase 2 Sprints (Operations)

| Sprint | Module | Deliverables |
|--------|--------|--------------|
| 13-14 | Payroll | Extend for outsourced staff |
| 15-17 | Tax Module | Client tax profiles, Calendar, Filings |
| 18-19 | Recruitment | Verification workflow |
| 20-21 | In-House HR | Extensions and enhancements |
| 22-23 | Social Media | Campaign tracking |

**Phase 2 Duration: ~22 weeks (5.5 months)**

### Phase 3-4: ~20 weeks (5 months)

**Total Estimated Duration: 16-18 months**

---

## Resource Allocation

### Dev Lead/PM/BA (Gawie)
- Sprint planning and backlog management
- Requirements clarification with partner
- Code reviews and architecture decisions
- Stakeholder communication

### Developer 1 (Backend Focus)
- API development
- Database design and migrations
- Business logic implementation
- Integration development

### Developer 2 (Frontend Focus)
- React component development
- Page implementation
- API integration
- UI/UX implementation

### QA/DevOps
- Test automation (Playwright)
- CI/CD pipeline setup
- Docker configuration
- Deployment to Render.com
- Environment management

---

## Whitelabeling Strategy

The application will be built as a whitelabel-ready platform:

### Configurable Elements
1. **Branding:** Logo, app name, color scheme (Tailwind CSS variables)
2. **Company Info:** Name, address, contact details
3. **Email Templates:** Customizable email branding
4. **PDF Reports:** Logo and company details in headers

### Configuration Approach
- Environment variables for deployment-time config
- Database settings table for runtime config
- Tailwind CSS custom properties for colors

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Scope creep | Phase-based delivery with clear boundaries |
| Integration complexity | Start with stubs, iterate |
| Performance issues | Design for scale from start |
| Partner feedback delays | Weekly demos, async communication |

---

## Next Steps

1. **Partner Review:** Share this plan for alignment
2. **Prioritization:** Confirm Phase 1 module order
3. **Team Onboarding:** Brief developers on codebase
4. **Environment Setup:** Create TeamACE app scaffold
5. **Sprint 1 Kickoff:** Begin Core CRM development

---

*Document prepared by Rozitech Development Team*
