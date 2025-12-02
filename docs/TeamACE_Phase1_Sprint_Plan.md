# TeamACE CRM-ERP Platform
## Phase 1: Sprint Plan (90-Day Lean Delivery)

**Document Version:** 3.0
**Date:** December 1, 2025
**Prepared by:** Rozitech (Pty) Ltd
**Methodology:** Agile Scrum (2-week sprints)
**Timeline:** 90 Days (6 Sprints)
**Capacity Model:** Lean Team (60% allocation)

---

## Table of Contents

1. [Sprint Overview](#1-sprint-overview)
2. [Epic Summary](#2-epic-summary)
3. [Sprint 1: Core CRM Foundation](#3-sprint-1-core-crm-foundation)
4. [Sprint 2: CRM Enhancement + Engagements](#4-sprint-2-crm-enhancement--engagements)
5. [Sprint 3: Business Development - Leads](#5-sprint-3-business-development---leads)
6. [Sprint 4: Business Development - Pipeline](#6-sprint-4-business-development---pipeline)
7. [Sprint 5: Finance Basics - Invoicing](#7-sprint-5-finance-basics---invoicing)
8. [Sprint 6: Finance + Integration + UAT](#8-sprint-6-finance--integration--uat)
9. [Definition of Done](#9-definition-of-done)
10. [Phase 2 Deferred Items](#10-phase-2-deferred-items)

---

## 1. Sprint Overview

### 1.1 Lean Team Capacity Model

| Resource | Allocation | Weekly Hours | Sprint Hours |
|----------|------------|--------------|--------------|
| Tech Lead (PM/BA/Dev) | 60% | 24 | 240 |
| Intermediate Developer | 60% | 24 | 240 |
| **Total** | **60%** | **48** | **480** |

**AI-Assisted Development:** Claude MAX (2 seats) providing +40% productivity boost

### 1.2 Sprint Schedule (90 Days)

| Sprint | Days | Dates* | Module Focus | Story Points | Milestone |
|--------|------|--------|--------------|--------------|-----------|
| 1 | 1-14 | Dec 2-13, 2025 | Core CRM Foundation | 40 | |
| 2 | 15-28 | Dec 16-27, 2025 | CRM Enhancement + Engagements | 42 | **Day 30: M1** |
| 3 | 29-42 | Dec 30-Jan 10, 2026 | BD: Lead Management | 38 | |
| 4 | 43-56 | Jan 13-24, 2026 | BD: Pipeline Basics | 40 | **Day 60: M2** |
| 5 | 57-70 | Jan 27-Feb 7, 2026 | Finance: Invoicing | 42 | |
| 6 | 71-90 | Feb 10-28, 2026 | Finance: Payments + UAT | 48 | **Day 90: M3** |
| **Total** | **90 days** | | | **250 SP** | |

*Dates are indicative and subject to project start date confirmation.

### 1.3 Velocity Assumptions

- **Team Velocity:** 38-48 story points per sprint (reduced capacity)
- **Sprint Duration:** 2 weeks (10 working days)
- **Ceremonies:** Planning (2h), Daily Standups (15min), Review (1h), Retro (1h)
- **Code Reuse Boost:** 60% average reuse from Rozitech Central accelerates delivery
- **AI Productivity:** +40% coding efficiency with Claude MAX

### 1.4 Story Point Scale

| Points | Complexity | Typical Duration | Reuse Impact |
|--------|------------|------------------|--------------|
| 1 | Trivial | < 2 hours | Config only |
| 2 | Simple | 2-4 hours | 80%+ reuse |
| 3 | Moderate | 4-8 hours | 60% reuse |
| 5 | Complex | 1-2 days | 40% reuse |
| 8 | Very Complex | 2-3 days | 20% reuse |

---

## 2. Epic Summary

### Module 1.1: Core CRM & Client Management (Sprints 1-2)

| Epic ID | Epic Name | Total SP | Reuse Source |
|---------|-----------|----------|--------------|
| E-CRM-01 | Client Management | 25 | Workforce patterns |
| E-CRM-02 | Contact Management | 18 | Workforce patterns |
| E-CRM-03 | Engagement Management | 20 | Custom |
| E-CRM-04 | Document Management | 12 | ExpenseTrack |
| E-CRM-05 | Activity Logging | 10 | Workforce audit logs |

### Module 1.2: Business Development Basics (Sprints 3-4)

| Epic ID | Epic Name | Total SP | Reuse Source |
|---------|-----------|----------|--------------|
| E-BD-01 | Lead Management | 22 | Custom |
| E-BD-02 | Opportunity Pipeline (Basic) | 25 | AgileFlow kanban |
| E-BD-03 | BD Dashboard | 12 | TimeTrack reports |

### Module 1.3: Finance Basics (Sprints 5-6)

| Epic ID | Epic Name | Total SP | Reuse Source |
|---------|-----------|----------|--------------|
| E-FIN-01 | Invoice Management | 30 | InvoiceFlow |
| E-FIN-02 | Payment Tracking | 22 | InvoiceFlow |
| E-FIN-03 | Finance Dashboard | 10 | InvoiceFlow |

---

## 3. Sprint 1: Core CRM Foundation

**Sprint Goal:** Establish core client and contact management with CRUD operations and basic UI.

**Days:** 1-14 | **Capacity:** 40 Story Points | **Reuse:** 65%

### User Stories

---

#### US-1.1: Client List View
**Story Points:** 3 | **Reuse:** Workforce list patterns

> As an Account Manager, I want to view a list of all clients with key information at a glance.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Paginated list of clients with company name, type, industry, status |
| AC2 | Column sorting and search by company name |
| AC3 | Filter by client type and status |

---

#### US-1.2: Create New Client
**Story Points:** 5 | **Reuse:** Workforce CRUD patterns

> As an Account Manager, I want to create a new client record with company details.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Client creation form with required fields (company name, client type) |
| AC2 | Validation and duplicate registration number check |
| AC3 | Auto-generated client number (CLI-YYYYMM-XXXX) |
| AC4 | Redirect to client detail view on success |

---

#### US-1.3: View/Edit Client Details
**Story Points:** 5 | **Reuse:** Workforce detail views

> As an Account Manager, I want to view and edit comprehensive client details.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Detail page with all client information |
| AC2 | Tabs: Overview, Contacts, Documents, Activities |
| AC3 | Edit functionality with audit logging |
| AC4 | Soft delete/archive functionality |

---

#### US-1.4: Client Database Schema & API
**Story Points:** 5 | **Reuse:** Workforce schema patterns

> As a Developer, I want the client infrastructure implemented.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Clients table with multi-tenant support (organization_id) |
| AC2 | RESTful API: GET, POST, PUT, DELETE with JWT auth |
| AC3 | Proper indexes and soft delete support |

---

#### US-1.5: Contact List & Create
**Story Points:** 5 | **Reuse:** Workforce contacts

> As an Account Manager, I want to manage contacts for each client.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Contact list within client context |
| AC2 | Create contact with name, email, phone, role |
| AC3 | Primary contact flag |
| AC4 | Contact API endpoints |

---

#### US-1.6: Contact Edit & Delete
**Story Points:** 3 | **Reuse:** Workforce contacts

> As an Account Manager, I want to edit and remove contacts.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Edit contact details |
| AC2 | Soft delete with confirmation |
| AC3 | Activity logging on changes |

---

#### US-1.7: Activity Logging System
**Story Points:** 5 | **Reuse:** Workforce audit logs

> As a User, I want significant actions automatically logged.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Automatic logging on entity create/update/delete |
| AC2 | Activity timeline view |
| AC3 | Activity API with entity reference |

---

#### US-1.8: Document Upload Basic
**Story Points:** 5 | **Reuse:** ExpenseTrack uploads

> As an Account Manager, I want to upload documents to clients.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | File upload (PDF, DOC, XLS, images) up to 10MB |
| AC2 | Document list with name, type, date |
| AC3 | Download functionality |

---

#### US-1.9: UI Component Library Setup
**Story Points:** 4 | **Reuse:** Rozitech design system

> As a Developer, I want reusable UI components configured.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Tailwind CSS configured with Rozitech theme |
| AC2 | Common components: tables, forms, modals, badges |
| AC3 | Responsive layout patterns |

---

**Sprint 1 Total: 40 Story Points**

---

## 4. Sprint 2: CRM Enhancement + Engagements

**Sprint Goal:** Complete CRM polish and implement engagement tracking.

**Days:** 15-28 | **Capacity:** 42 Story Points | **Milestone:** M1 (Day 30)

### User Stories

---

#### US-2.1: Client Search Enhancement
**Story Points:** 3 | **Reuse:** Workforce search

> As an Account Manager, I want improved search capabilities.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Search matches company name, trading name, email |
| AC2 | Combined filters with AND logic |

---

#### US-2.2: CRM Dashboard Widgets
**Story Points:** 5 | **Reuse:** TimeTrack dashboard

> As an Account Manager, I want CRM metrics on my dashboard.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Clients Overview widget (total, active, new this month) |
| AC2 | My Recent Activity |
| AC3 | Clickable widgets navigate to filtered lists |

---

#### US-2.3: Engagement List View
**Story Points:** 5 | **Reuse:** 40% (custom logic)

> As an Account Manager, I want to view engagements.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Engagement list with status badges |
| AC2 | Filter by client and status |
| AC3 | Search by engagement name |

---

#### US-2.4: Create Engagement
**Story Points:** 5 | **Reuse:** 30% (custom)

> As an Account Manager, I want to create engagements for clients.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Create engagement with name, type, dates, value |
| AC2 | Link to client and primary contact |
| AC3 | Auto-generated engagement number (ENG-YYYYMM-XXXX) |

---

#### US-2.5: Engagement Detail View
**Story Points:** 5 | **Reuse:** 30% (custom)

> As an Account Manager, I want to view engagement details.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Detail view with contract info, financials |
| AC2 | Status display with color coding |
| AC3 | Activity timeline |

---

#### US-2.6: Engagement Status Workflow
**Story Points:** 5 | **Reuse:** 30% (custom workflow)

> As an Account Manager, I want to manage engagement lifecycle.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Status transitions: draft→active→on_hold→completed/cancelled |
| AC2 | Required fields for status changes |
| AC3 | Activity logging on status changes |

---

#### US-2.7: Engagement Database Schema & API
**Story Points:** 5 | **Reuse:** 50% (patterns)

> As a Developer, I want engagement infrastructure.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Engagements table with multi-tenant support |
| AC2 | RESTful API with status validation |
| AC3 | Link to clients and contacts |

---

#### US-2.8: Document Categories
**Story Points:** 3 | **Reuse:** ExpenseTrack

> As an Account Manager, I want to categorize documents.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Document categories: contract, proposal, report, other |
| AC2 | Filter documents by category |

---

#### US-2.9: Global Contact Search
**Story Points:** 3 | **Reuse:** Workforce

> As an Account Manager, I want to search contacts across all clients.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Global contact search by name or email |
| AC2 | Results show associated client |

---

#### US-2.10: Manual Activity Entry
**Story Points:** 3 | **Reuse:** Workforce

> As an Account Manager, I want to log manual activities.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Add activity: call, meeting, note |
| AC2 | Set date, description |
| AC3 | Link to client or engagement |

---

**Sprint 2 Total: 42 Story Points**

**M1 Deliverable:** Core CRM fully functional (Clients, Contacts, Engagements, Documents, Activities)

---

## 5. Sprint 3: Business Development - Leads

**Sprint Goal:** Implement lead capture and management.

**Days:** 29-42 | **Capacity:** 38 Story Points

### User Stories

---

#### US-3.1: Lead List View
**Story Points:** 3 | **Reuse:** 40% (custom)

> As a BD Manager, I want to view and filter leads.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Paginated lead list with company, contact, source, status |
| AC2 | Status color-coded badges |
| AC3 | Filter by status |

---

#### US-3.2: Capture New Lead
**Story Points:** 5 | **Reuse:** 40% (custom)

> As a BD Manager, I want to capture new leads with source tracking.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Lead form with company, contact, email, phone, source |
| AC2 | Source options: website, referral, event, cold call, other |
| AC3 | Auto-generated lead number (LEAD-YYYYMM-XXXX) |

---

#### US-3.3: Lead Detail View
**Story Points:** 3 | **Reuse:** 40% (custom)

> As a BD Manager, I want to view lead details.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Detail view with all lead information |
| AC2 | Activity timeline |
| AC3 | Edit functionality |

---

#### US-3.4: Lead Status Workflow
**Story Points:** 5 | **Reuse:** 40% (custom)

> As a BD Manager, I want to track lead progress.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Status transitions: new→contacted→qualified→converted/lost |
| AC2 | Required lost_reason for lost leads |
| AC3 | Activity logging on all changes |

---

#### US-3.5: Convert Lead to Client
**Story Points:** 5 | **Reuse:** 30% (custom)

> As a BD Manager, I want to convert qualified leads to clients.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Conversion dialog to create client |
| AC2 | Pre-fill data from lead |
| AC3 | Lead status changes to "converted" |

---

#### US-3.6: Lead Assignment
**Story Points:** 3 | **Reuse:** Workforce assignment

> As a BD Manager, I want to assign leads to team members.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Assign lead to team member |
| AC2 | "My Leads" filter view |

---

#### US-3.7: Lead Database Schema & API
**Story Points:** 5 | **Reuse:** 50% (patterns)

> As a Developer, I want lead infrastructure implemented.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Leads table with multi-tenant support |
| AC2 | RESTful API with conversion endpoint |
| AC3 | Status validation |

---

#### US-3.8: BD Dashboard - Lead Metrics
**Story Points:** 5 | **Reuse:** TimeTrack reports

> As a BD Manager, I want lead metrics on my dashboard.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Total Leads, New This Month |
| AC2 | Leads by Status breakdown |
| AC3 | Conversion rate |

---

#### US-3.9: Lead Notes
**Story Points:** 4 | **Reuse:** TeamSpace

> As a BD Manager, I want to add notes to leads.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Add notes with timestamp |
| AC2 | Notes displayed in timeline |

---

**Sprint 3 Total: 38 Story Points**

---

## 6. Sprint 4: Business Development - Pipeline

**Sprint Goal:** Implement opportunity pipeline with basic kanban view.

**Days:** 43-56 | **Capacity:** 40 Story Points | **Milestone:** M2 (Day 60)

### User Stories

---

#### US-4.1: Opportunity List View
**Story Points:** 3 | **Reuse:** 50% (patterns)

> As a BD Manager, I want to view opportunities.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | List with opportunity name, client, value, stage, owner |
| AC2 | Stage color-coded badges |
| AC3 | Filter by stage and owner |

---

#### US-4.2: Create Opportunity
**Story Points:** 5 | **Reuse:** 50% (patterns)

> As a BD Manager, I want to create opportunities.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Link to existing client |
| AC2 | Set name, estimated value, expected close date |
| AC3 | Auto-generated opportunity number (OPP-YYYYMM-XXXX) |

---

#### US-4.3: Opportunity Detail View
**Story Points:** 5 | **Reuse:** 50% (patterns)

> As a BD Manager, I want to manage opportunity details.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Detail view with client, contact, value, stage |
| AC2 | Edit functionality |
| AC3 | Activity timeline |

---

#### US-4.4: Pipeline Kanban Board
**Story Points:** 8 | **Reuse:** AgileFlow kanban

> As a BD Manager, I want a visual pipeline board.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Kanban columns: Qualification, Proposal, Negotiation, Won, Lost |
| AC2 | Column counts and value totals |
| AC3 | Drag-and-drop stage changes |
| AC4 | Opportunity cards show company, value, owner |

---

#### US-4.5: Stage Transitions
**Story Points:** 5 | **Reuse:** 40% (custom rules)

> As a BD Manager, I want stage transitions tracked.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | "Won" requires won_date and actual_value |
| AC2 | "Lost" requires lost_date and lost_reason |
| AC3 | Stage history tracking |

---

#### US-4.6: Opportunity Database Schema & API
**Story Points:** 5 | **Reuse:** 60% (patterns)

> As a Developer, I want opportunity infrastructure.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Opportunities table with stage_history |
| AC2 | Stage transition API with validation |
| AC3 | Pipeline data endpoint with stage grouping |

---

#### US-4.7: Pipeline Summary Dashboard
**Story Points:** 5 | **Reuse:** TimeTrack reports

> As a BD Manager, I want pipeline metrics.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Total pipeline value by stage |
| AC2 | Win rate percentage |
| AC3 | Opportunities closing this month |

---

#### US-4.8: Link Opportunity to Engagement
**Story Points:** 4 | **Reuse:** Custom

> As a BD Manager, I want to link won opportunities to engagements.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Create engagement from won opportunity |
| AC2 | Pre-fill engagement data from opportunity |

---

**Sprint 4 Total: 40 Story Points**

**M2 Deliverable:** CRM complete + BD module (Leads, Pipeline) functional

---

## 7. Sprint 5: Finance Basics - Invoicing

**Sprint Goal:** Implement invoice creation and management.

**Days:** 57-70 | **Capacity:** 42 Story Points

### User Stories

---

#### US-5.1: Invoice List View
**Story Points:** 5 | **Reuse:** InvoiceFlow list

> As a Finance Manager, I want to view and filter invoices.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | List with invoice number, client, amount, status, due date |
| AC2 | Status tabs: All, Draft, Sent, Paid, Overdue |
| AC3 | Summary totals, overdue highlighting |

---

#### US-5.2: Create Invoice
**Story Points:** 5 | **Reuse:** InvoiceFlow create

> As a Finance Manager, I want to create invoices.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Select client and optionally engagement |
| AC2 | Set invoice date and payment terms |
| AC3 | Auto-calculated due date |
| AC4 | Auto-generated invoice number (INV-YYYYMM-XXXX) |

---

#### US-5.3: Invoice Line Items
**Story Points:** 5 | **Reuse:** InvoiceFlow editor

> As a Finance Manager, I want to manage line items.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Add line items with description, quantity, unit price |
| AC2 | Auto-calculated line totals and subtotal |
| AC3 | Add/remove line items |

---

#### US-5.4: Invoice Detail View
**Story Points:** 3 | **Reuse:** InvoiceFlow

> As a Finance Manager, I want to view invoice details.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Detail view with all invoice information |
| AC2 | Line items with totals |
| AC3 | Payment history |

---

#### US-5.5: Invoice Edit
**Story Points:** 3 | **Reuse:** InvoiceFlow

> As a Finance Manager, I want to edit draft invoices.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Edit invoice details (draft only) |
| AC2 | Modify line items |
| AC3 | Recalculate totals |

---

#### US-5.6: Nigeria Tax Calculations
**Story Points:** 5 | **Reuse:** 60% (configurable)

> As a Finance Manager, I want VAT calculated.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Configurable VAT rate (default 7.5%) |
| AC2 | Total = Subtotal + VAT |
| AC3 | Clear tax breakdown display |

---

#### US-5.7: Invoice Status Workflow
**Story Points:** 5 | **Reuse:** InvoiceFlow

> As a Finance Manager, I want to manage invoice status.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Status: draft → sent → paid/overdue |
| AC2 | Mark as sent with date |
| AC3 | Auto-mark overdue based on due date |

---

#### US-5.8: Invoice Database Schema & API
**Story Points:** 5 | **Reuse:** InvoiceFlow schema

> As a Developer, I want invoice infrastructure.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Invoices and invoice_items tables |
| AC2 | RESTful API with status validation |
| AC3 | Multi-tenant support |

---

#### US-5.9: Link Invoice to Client/Engagement
**Story Points:** 3 | **Reuse:** InvoiceFlow

> As a Finance Manager, I want invoices linked to clients.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Invoice linked to client |
| AC2 | Optional link to engagement |
| AC3 | View invoices from client detail page |

---

#### US-5.10: Void Invoice
**Story Points:** 3 | **Reuse:** InvoiceFlow void

> As a Finance Manager, I want to void incorrect invoices.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Void with confirmation and required reason |
| AC2 | Status changes to "cancelled" |
| AC3 | Cannot be edited or paid after void |

---

**Sprint 5 Total: 42 Story Points**

---

## 8. Sprint 6: Finance + Integration + UAT

**Sprint Goal:** Complete payment tracking, integrate all modules, and conduct UAT.

**Days:** 71-90 | **Capacity:** 48 Story Points | **Milestone:** M3 (Day 90)

### User Stories

---

#### US-6.1: Record Payment
**Story Points:** 5 | **Reuse:** InvoiceFlow payments

> As a Finance Manager, I want to record payments.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Enter amount, date, payment method, reference |
| AC2 | Payment methods: bank transfer, cheque, cash |
| AC3 | Auto-update invoice status (paid/partial) |

---

#### US-6.2: Payment History
**Story Points:** 3 | **Reuse:** InvoiceFlow history

> As a Finance Manager, I want to view payment history.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Payment history with chronological list |
| AC2 | Total paid and balance remaining |
| AC3 | Edit/delete with audit trail |

---

#### US-6.3: Finance Dashboard Widgets
**Story Points:** 5 | **Reuse:** InvoiceFlow dashboard

> As a Finance Manager, I want financial metrics.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Total Outstanding amount |
| AC2 | Overdue Amount with count |
| AC3 | Collected This Month |
| AC4 | Invoiced This Month |

---

#### US-6.4: Receivables Summary
**Story Points:** 5 | **Reuse:** InvoiceFlow

> As a Finance Manager, I want to see receivables summary.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Amounts grouped: Current, 1-30, 31-60, 60+ days |
| AC2 | Breakdown by client |
| AC3 | Click-through to invoices |

---

#### US-6.5: Unified Dashboard
**Story Points:** 5 | **Reuse:** 60% (patterns)

> As a User, I want a unified dashboard with all modules.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | CRM, BD, Finance widgets combined |
| AC2 | Role-based widget visibility |
| AC3 | Configurable widget arrangement |

---

#### US-6.6: Cross-Module Navigation
**Story Points:** 5 | **Reuse:** 60% (patterns)

> As a User, I want seamless navigation between modules.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Hyperlinks between related entities |
| AC2 | Breadcrumb navigation |
| AC3 | Consistent back navigation |

---

#### US-6.7: Basic Search
**Story Points:** 5 | **Reuse:** Workforce

> As a User, I want to search across the application.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Search bar in header |
| AC2 | Search clients, contacts, invoices |
| AC3 | Grouped search results |

---

#### US-6.8: User Profile Settings
**Story Points:** 3 | **Reuse:** Auth patterns

> As a User, I want to manage my profile.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | Update name, email, phone |
| AC2 | Set timezone |
| AC3 | Immediate effect on save |

---

#### US-6.9: Integration Testing
**Story Points:** 5 | **Reuse:** Rozitech testing patterns

> As a Developer, I want integration tests.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | API endpoint tests |
| AC2 | Cross-module workflow tests |
| AC3 | Tests run in CI pipeline |

---

#### US-6.10: UAT Execution & Bug Fixes
**Story Points:** 7 | **Reuse:** N/A

> As a Project Team, we want UAT completed.

| # | Acceptance Criteria |
|---|---------------------|
| AC1 | UAT environment provisioned |
| AC2 | All UAT test cases executed |
| AC3 | Critical bugs resolved |
| AC4 | Basic user documentation complete |

---

**Sprint 6 Total: 48 Story Points**

**M3 Deliverable:** All Phase 1 modules (CRM, BD, Finance basics) complete, UAT signed off

---

## 9. Definition of Done

### User Story Level

A user story is considered DONE when:

- [ ] All acceptance criteria are met
- [ ] Code is peer-reviewed
- [ ] Unit tests are written and passing
- [ ] No critical bugs remain
- [ ] Code is merged to development branch
- [ ] Feature is deployed to staging environment

### Sprint Level

A sprint is considered DONE when:

- [ ] All committed user stories meet Definition of Done
- [ ] Sprint review completed with stakeholders
- [ ] Sprint retrospective completed
- [ ] No critical defects remain open

### Milestone Level (30/60/90 Days)

A milestone is considered DONE when:

- [ ] All sprint-level DoD criteria met
- [ ] Milestone acceptance criteria verified
- [ ] Stakeholder sign-off obtained
- [ ] Payment milestone triggered

### Release Level (Day 90)

A release is considered DONE when:

- [ ] All milestone criteria met
- [ ] Basic regression testing passed
- [ ] UAT sign-off obtained
- [ ] Production deployment successful
- [ ] Basic support documentation complete

---

## 10. Phase 2 Deferred Items

The following items are deferred to Phase 2 due to lean capacity model:

### HR Outsourcing Module (Full Sprint 4 from v2.0)
- Assignment Management
- Deployment Tracking
- Service Log Management
- HR Dashboard

### Advanced Business Development
- Proposal Management with PDF generation
- Revenue Forecasting
- BD Reporting & Analytics

### Advanced Finance
- Invoice PDF Generation
- Email Invoice Sending
- Client Statements
- Payment Reminders
- Aging Reports with Excel Export

### Workflow & Collaboration
- Approval Workflows (multi-step)
- Notification System (in-app + email)
- Task Management
- Notes & Comments with @mentions
- Approval Delegation

### Advanced Features
- Advanced Reporting
- Excel/PDF Exports
- Email Integration
- Calendar Views

---

## Appendix A: Story Point Summary by Sprint

| Sprint | Module Focus | Committed SP | Reuse % |
|--------|--------------|--------------|---------|
| 1 | Core CRM Foundation | 40 | 65% |
| 2 | CRM Enhancement + Engagements | 42 | 55% |
| 3 | BD: Lead Management | 38 | 45% |
| 4 | BD: Pipeline Basics | 40 | 55% |
| 5 | Finance: Invoicing | 42 | 70% |
| 6 | Finance: Payments + UAT | 48 | 60% |
| **Total** | | **250 SP** | **~58%** |

---

## Appendix B: Sprint Velocity Tracking Template

| Sprint | Committed SP | Completed SP | Velocity | Notes |
|--------|--------------|--------------|----------|-------|
| 1 | 40 | | | |
| 2 | 42 | | | Day 30 Milestone |
| 3 | 38 | | | |
| 4 | 40 | | | Day 60 Milestone |
| 5 | 42 | | | |
| 6 | 48 | | | Day 90 Milestone |

---

## Appendix C: Milestone Acceptance Criteria

### M1 (Day 30) - Core CRM Complete
- [ ] Client CRUD operations functional
- [ ] Contact management operational
- [ ] Engagement tracking working
- [ ] Document uploads functional
- [ ] Activity logging operational
- [ ] CRM Dashboard displaying metrics

### M2 (Day 60) - CRM + BD Complete
- [ ] All M1 criteria maintained
- [ ] Lead capture and management working
- [ ] Lead conversion to client functional
- [ ] Opportunity pipeline with kanban view
- [ ] Stage transitions with validation
- [ ] BD Dashboard with metrics

### M3 (Day 90) - Full Phase 1 Delivery
- [ ] All M2 criteria maintained
- [ ] Invoice creation and management working
- [ ] Payment recording functional
- [ ] Finance Dashboard with metrics
- [ ] Cross-module navigation working
- [ ] UAT completed and signed off
- [ ] Production deployment successful

---

**Document Version:** 3.0 (Lean Model)
**Date:** December 1, 2025
**Prepared by:** Rozitech (Pty) Ltd

*This document is confidential and intended for TeamACE and Rozitech use only.*
