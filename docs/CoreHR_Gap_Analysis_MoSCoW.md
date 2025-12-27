ok # CoreHR Nigeria - Gap Analysis & MoSCoW Prioritization

**Document Version:** 1.0
**Date:** 2025-12-27
**Purpose:** Rebrand ConsultPro to CoreHR for Nigerian HR Consulting Market

---

## Executive Summary

This document provides a comprehensive gap analysis comparing the current ConsultPro MVP against Nigerian HR consulting requirements, competitor features (KlevaHR), and reusable components from the taxpayHR platform. The analysis culminates in a MoSCoW prioritization to guide CoreHR development.

---

## Part 1: Nigerian HR Consulting Market Requirements

### 1.1 Regulatory Compliance Framework

| Requirement | Description | Deadline/Rate |
|-------------|-------------|---------------|
| **PAYE Tax** | Progressive tax 7%-24% on taxable income | 10th of following month |
| **Pension (PFA)** | Employer 10% + Employee 8% on Basic+Housing+Transport | 7 days after salary |
| **NHIS** | Employer 10% + Employee 5% (10+ employees) | Monthly |
| **NHF** | Employee 2.5% of basic (voluntary for private sector) | Monthly to FMBN |
| **NSITF** | Employer 1% of monthly payroll | 16th of following month |
| **ITF** | Employer 1% of annual payroll (5+ staff or ₦50M turnover) | Annual filing |
| **Minimum Wage** | ₦70,000/month (effective May 2024) | Mandatory |

### 1.2 Employment Documentation Requirements

**New Employee Onboarding Documents:**
- Employment contract (within 3 months of start)
- Tax Identification Number (TIN)
- National Identification Number (NIN)
- Bank Verification Number (BVN)
- Bank account details
- Pension Fund Administrator (PFA) details
- RSA PIN (Retirement Savings Account)
- Passport photographs
- Proof of address
- Educational certificates
- Medical fitness certificate
- Guarantor forms

### 1.3 Leave Entitlements (Labour Act)

| Leave Type | Entitlement |
|------------|-------------|
| Annual Leave | 6 working days (after 12 months service) |
| Sick Leave | 12 days (with medical certificate) |
| Maternity Leave | 12 weeks (6 weeks post-delivery, 50% pay minimum) |
| Paternity Leave | Not statutory (company discretion) |
| Public Holidays | ~13 days annually |

### 1.4 Payroll Processing Requirements

- **Payment Cycle:** Monthly (by last working day)
- **Payment Method:** Bank transfer (mandatory for compliance)
- **Record Keeping:** All wages, deductions, tax cards must be maintained
- **Payslip:** Must be provided to each employee
- **Tax Declaration:** Employees must complete for relief claims

---

## Part 2: Competitor Analysis (KlevaHR)

### 2.1 KlevaHR Feature Set

From the Safari.pdf analysis, KlevaHR offers:

| Module | Features | Status in ConsultPro |
|--------|----------|---------------------|
| **Payroll & Benefits** | Salary components, direct disbursement, auto payslips | ❌ Missing |
| **Performance Management** | 180°/360° feedback, OKR, KPI, goal tracking | ❌ Missing |
| **Leave Management** | Leave types, policies, approval workflow, withdrawal | ❌ Missing |
| **Employee Management/HRIS** | Single source of truth, cloud-based, access rights | ⚠️ Partial (Staff module) |
| **Disciplinary Management** | Offense types, query tracking, response system | ❌ Missing |
| **Employee Lifecycle** | Onboarding tracking, document collection, exit process | ❌ Missing |
| **Employee Self-Service** | Record updates, notifications, approvals | ❌ Missing |
| **Attendance Tracking** | Shifts, biometric, lateness/absenteeism tracking | ❌ Missing |
| **Reports & Analytics** | Historical data, export, graphical analytics | ⚠️ Partial (Dashboard) |
| **Recruitment** | Job posting, resource requests, CV bank, stages | ⚠️ Partial (Leads/Pipeline) |

### 2.2 KlevaHR Pricing Tiers

| Tier | Key Features |
|------|--------------|
| **Basic** | Employee mgmt, Leave, Performance (OKR/KPI), Lifecycle, Reports, Disciplinary |
| **Classic** | + Attendance (clock in/out), 180° performance |
| **Premium** | + Biometric, Direct disbursement, 360°, Recruitment, LMS, DMS, Survey |
| **Custom** | Tailored features |

---

## Part 3: Current State Analysis

### 3.1 ConsultPro MVP Features

| Module | Status | Description |
|--------|--------|-------------|
| Multi-tenant Architecture | ✅ Complete | Tenant isolation, row-level security |
| Authentication | ✅ Complete | JWT, demo mode, password reset |
| CRM (Clients) | ✅ Complete | Nigerian client profiles with TIN/RC |
| CRM (Contacts) | ✅ Complete | Decision-maker tracking |
| CRM (Engagements) | ✅ Complete | Project/contract management |
| Business Dev (Leads) | ✅ Complete | Lead scoring, import/export |
| Business Dev (Pipeline) | ✅ Complete | Kanban board with drag-drop |
| HR (Staff) | ✅ Complete | Basic staff profiles, skills, NIN/BVN |
| HR (Deployments) | ✅ Complete | Client assignments, billing rates |
| Finance (Invoices) | ✅ Complete | VAT 7.5%, WHT 5%/10% calculations |
| Finance (Payments) | ✅ Complete | Payment tracking, multiple methods |
| Tasks | ✅ Complete | Priority, status, assignment |
| Audit Trail | ✅ Complete | All CRUD operations logged |
| Multi-currency | ✅ Complete | NGN, USD, ZAR |

### 3.2 taxpayHR Reusable Components

| Component | Reusability | Adaptation Needed |
|-----------|-------------|-------------------|
| **Payroll Engine** | 85% | Remove tax-specific calculations |
| **Employee Management** | 90% | Add HR-specific fields |
| **ESS Portal** | 85% | Change UI branding |
| **PAYE Calculator** | 95% | Direct reuse |
| **Pension Calculator** | 95% | Direct reuse |
| **Payslip Generation** | 90% | Update template branding |
| **Mobile App (React Native)** | 70% | Replace tax screens with HR screens |
| **Document Storage** | 80% | Add HR document categories |
| **Notification System** | 90% | Update message templates |
| **API Infrastructure** | 95% | Direct reuse |
| **Audit Logging** | 95% | Direct reuse |

---

## Part 4: Gap Analysis

### 4.1 Critical Gaps (High Priority)

| Gap | Current State | Required State | Impact |
|-----|---------------|----------------|--------|
| **Payroll Module** | None | Full PAYE, pension, NHIS, NHF calculations | Critical for HR platform |
| **Leave Management** | None | Leave types, balances, approval workflow | Core HR function |
| **Employee Onboarding** | Basic staff form | Full checklist, document collection | Compliance requirement |
| **Payslip Generation** | None | PDF payslips with all deductions | Legal requirement |
| **PAYE Calculation** | None | 6-band progressive calculation | Tax compliance |
| **Pension Management** | None | PFA tracking, contribution calculation | Statutory requirement |

### 4.2 Significant Gaps (Medium Priority)

| Gap | Current State | Required State | Impact |
|-----|---------------|----------------|--------|
| **Performance Management** | None | Goals, appraisals, 180°/360° feedback | HR best practice |
| **Attendance Tracking** | None | Clock in/out, shift management | Workforce management |
| **Employee Self-Service** | None | Self-update profiles, view payslips | Employee experience |
| **Recruitment Pipeline** | Leads module (partial) | Job posting, candidate tracking, offer letters | Talent acquisition |
| **Disciplinary Management** | None | Query tracking, warnings, documentation | Legal compliance |

### 4.3 Enhancement Gaps (Lower Priority)

| Gap | Current State | Required State | Impact |
|-----|---------------|----------------|--------|
| **Biometric Integration** | None | Device API integration | Premium feature |
| **Learning Management** | None | Course assignment, completion tracking | Training compliance |
| **Survey Module** | None | Employee engagement surveys | HR analytics |
| **Mobile App** | None (taxpayHR has one) | Employee self-service app | Convenience |
| **FIRS/PENCOM Integration** | None | E-filing integration | Future automation |

---

## Part 5: MoSCoW Prioritization

### MUST HAVE (Phase 1 - MVP for CoreHR)

These features are essential for a viable Nigerian HR consulting platform:

| # | Feature | Source | Effort |
|---|---------|--------|--------|
| 1 | **Payroll Engine** | Port from taxpayHR | Medium |
| 2 | **PAYE Calculation** | Port from taxpayHR | Low |
| 3 | **Pension Contribution Calculation** | Port from taxpayHR | Low |
| 4 | **Payslip Generation (PDF)** | Port from taxpayHR | Low |
| 5 | **Employee Master Data** | Extend Staff module | Medium |
| 6 | **Leave Management** | New development | Medium |
| 7 | **Leave Approval Workflow** | New development | Medium |
| 8 | **Employee Onboarding Checklist** | New development | Medium |
| 9 | **Document Collection** | Extend existing | Low |
| 10 | **CoreHR Branding** | Update consultpro | Low |
| 11 | **NHIS/NHF/NSITF Calculations** | Port from taxpayHR | Low |

### SHOULD HAVE (Phase 2 - Enhanced HR)

These features significantly improve the platform but are not essential for launch:

| # | Feature | Source | Effort |
|---|---------|--------|--------|
| 1 | **Performance Management (Basic)** | New development | High |
| 2 | **Goal Setting & Tracking** | New development | Medium |
| 3 | **Employee Self-Service Portal** | Port ESS from taxpayHR | Medium |
| 4 | **Attendance Tracking (Manual)** | New development | Medium |
| 5 | **Disciplinary Management** | New development | Medium |
| 6 | **Employee Lifecycle Dashboard** | New development | Low |
| 7 | **Offboarding Checklist** | New development | Low |
| 8 | **Payroll Reports** | Port from taxpayHR | Low |
| 9 | **PAYE Schedules by State** | Port from taxpayHR | Low |
| 10 | **Pension Schedules by PFA** | Port from taxpayHR | Low |

### COULD HAVE (Phase 3 - Premium Features)

These features add value but can be deferred:

| # | Feature | Source | Effort |
|---|---------|--------|--------|
| 1 | **360° Performance Reviews** | New development | High |
| 2 | **Recruitment Module** | Extend BD module | High |
| 3 | **Mobile App (Employee)** | Port from taxpayHR | High |
| 4 | **Biometric Integration** | New development | High |
| 5 | **Learning Management System** | New development | High |
| 6 | **Employee Survey Module** | New development | Medium |
| 7 | **Org Chart Visualization** | New development | Medium |
| 8 | **Direct Bank Disbursement** | Integration work | High |
| 9 | **Contract Management** | Extend engagements | Medium |
| 10 | **Compliance Calendar** | New development | Low |

### WON'T HAVE (Future Roadmap)

These features are out of scope for initial phases:

| # | Feature | Reason |
|---|---------|--------|
| 1 | FIRS E-Filing Integration | Requires government partnership |
| 2 | PENCOM Direct Integration | Requires certification |
| 3 | Multi-country Support | Focus on Nigeria first |
| 4 | AI-powered Analytics | Future enhancement |
| 5 | Blockchain Credentials | Emerging technology |

---

## Part 6: Reusable Component Mapping

### From taxpayHR → CoreHR

```
taxpayHR/backend/src/routes/payroll.js      → CoreHR Payroll Engine
taxpayHR/backend/src/routes/employees.js    → CoreHR Employee Management
taxpayHR/backend/src/services/paye.js       → CoreHR PAYE Calculator
taxpayHR/backend/src/services/pension.js    → CoreHR Pension Calculator
taxpayHR/backend/src/routes/essInvitations.js → CoreHR ESS Portal
taxpayHR/backend/migrations/007_payroll.sql → CoreHR Payroll Schema
taxpayHR/mobile/                            → CoreHR Mobile App (Phase 3)
taxpayHR/backend/src/services/pdf.js        → CoreHR Payslip Generator
```

### From ConsultPro → CoreHR (Keep)

```
consultpro/backend/src/middleware/          → Keep all middleware
consultpro/backend/src/routes/staff.js      → Extend for Employee Master
consultpro/backend/src/routes/audit.js      → Keep for compliance
consultpro/frontend/src/components/         → Keep all UI components
consultpro/frontend/src/context/            → Keep all context providers
consultpro/docker-compose.yml               → Keep deployment config
consultpro/render.yaml                      → Keep cloud deployment
```

---

## Part 7: Database Schema Extensions

### New Tables Required

```sql
-- Leave Management
CREATE TABLE leave_types (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    days_allowed INTEGER NOT NULL,
    carry_forward BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE leave_balances (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    year INTEGER NOT NULL,
    entitled_days INTEGER NOT NULL,
    used_days INTEGER DEFAULT 0,
    carried_forward INTEGER DEFAULT 0
);

CREATE TABLE leave_requests (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    leave_type_id UUID NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
    approver_id UUID,
    approved_at TIMESTAMP,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payroll (from taxpayHR)
CREATE TABLE payroll_runs (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    period_month INTEGER NOT NULL,
    period_year INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    total_gross DECIMAL(15,2),
    total_net DECIMAL(15,2),
    total_paye DECIMAL(15,2),
    total_pension_employee DECIMAL(15,2),
    total_pension_employer DECIMAL(15,2),
    processed_by UUID,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payslips (
    id UUID PRIMARY KEY,
    payroll_run_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    basic_salary DECIMAL(15,2),
    housing_allowance DECIMAL(15,2),
    transport_allowance DECIMAL(15,2),
    other_allowances JSONB,
    gross_salary DECIMAL(15,2),
    paye_tax DECIMAL(15,2),
    pension_employee DECIMAL(15,2),
    pension_employer DECIMAL(15,2),
    nhis_employee DECIMAL(15,2),
    nhis_employer DECIMAL(15,2),
    nhf DECIMAL(15,2),
    other_deductions JSONB,
    net_salary DECIMAL(15,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Onboarding
CREATE TABLE onboarding_checklists (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    items JSONB NOT NULL, -- Array of checklist items
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE employee_onboarding (
    id UUID PRIMARY KEY,
    employee_id UUID NOT NULL,
    checklist_id UUID NOT NULL,
    completed_items JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'in_progress',
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Performance (Phase 2)
CREATE TABLE performance_cycles (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(200) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    review_type VARCHAR(50), -- self, 180, 360
    status VARCHAR(20) DEFAULT 'draft'
);

CREATE TABLE performance_reviews (
    id UUID PRIMARY KEY,
    cycle_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    reviewer_id UUID NOT NULL,
    reviewer_type VARCHAR(50), -- self, manager, peer, subordinate
    overall_rating INTEGER,
    comments TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    submitted_at TIMESTAMP
);
```

---

## Part 8: Implementation Roadmap

### Phase 1: CoreHR MVP (Must Have)

**Objective:** Launch a functional Nigerian HR platform with payroll and leave management.

**Tasks:**
1. Rebrand ConsultPro → CoreHR (colors, logos, naming)
2. Port payroll engine from taxpayHR
3. Implement PAYE, Pension, NHIS calculations
4. Build leave management module
5. Create employee onboarding checklist
6. Generate PDF payslips
7. Update demo data for HR context

**Deliverables:**
- CoreHR branding applied
- Payroll runs with all statutory deductions
- PDF payslips for employees
- Leave request and approval workflow
- Employee onboarding tracking

### Phase 2: Enhanced HR (Should Have)

**Objective:** Add performance management and employee self-service.

**Tasks:**
1. Build basic performance management
2. Port ESS portal from taxpayHR
3. Add attendance tracking (manual)
4. Implement disciplinary management
5. Create payroll reports and schedules

### Phase 3: Premium (Could Have)

**Objective:** Add advanced features for enterprise clients.

**Tasks:**
1. 360° performance reviews
2. Recruitment module enhancement
3. Mobile app deployment
4. Biometric integration
5. Learning management system

---

## Part 9: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Payroll calculation errors | Medium | High | Extensive testing, validation against manual calculations |
| Compliance deadline misses | Low | High | Built-in reminders, deadline tracking |
| Data migration issues | Medium | Medium | Clear migration scripts, backup procedures |
| User adoption | Medium | Medium | Training materials, intuitive UX |
| Competitor feature parity | High | Medium | Focus on Nigeria-specific features |

---

## Part 10: Success Metrics

| Metric | Target |
|--------|--------|
| Payroll accuracy | 99.9% |
| Compliance deadline adherence | 100% |
| User adoption (active users) | 80% of registered |
| Payslip generation time | < 5 seconds |
| Leave request processing | < 24 hours |
| System uptime | 99.5% |

---

## Appendix A: Nigerian Statutory Rates Summary (2025)

| Contribution | Rate | Basis |
|--------------|------|-------|
| PAYE Band 1 | 7% | First ₦300,000 |
| PAYE Band 2 | 11% | Next ₦300,000 |
| PAYE Band 3 | 15% | Next ₦500,000 |
| PAYE Band 4 | 19% | Next ₦500,000 |
| PAYE Band 5 | 21% | Next ₦1,600,000 |
| PAYE Band 6 | 24% | Above ₦3,200,000 |
| Pension (Employer) | 10% | Basic + Housing + Transport |
| Pension (Employee) | 8% | Basic + Housing + Transport |
| NHIS (Employer) | 10% | Basic salary |
| NHIS (Employee) | 5% | Basic salary |
| NHF | 2.5% | Basic salary (employee) |
| NSITF | 1% | Monthly payroll (employer) |
| ITF | 1% | Annual payroll (employer) |

---

## Appendix B: Sources & References

- [Nigeria Payroll Compliance - Workforce Africa](https://workforceafrica.com/nigeria/payroll-compliance/)
- [7 Payroll Compliance Requirements - Workforce Africa](https://workforceafrica.com/payroll-compliance-in-nigeria/)
- [2025 PAYE Updates - StaffNotion](https://staffnotion.com/blog/2025-paye-updates-for-nigerian-businesses-what-hr-and-payroll-professionals-need-to-know)
- [Statutory Deductions Guide - MyWorkPay](https://www.myworkpay.com/blogs/statutory-deductions-in-nigeria-a-comprehensive-overview-and-detailed-guide)
- [Nigeria Employment Laws - ICLG](https://iclg.com/practice-areas/employment-and-labour-laws-and-regulations/nigeria)
- [HR Compliance Checklist 2026 - SeamlessHR](https://seamlesshr.com/blog/nigeria-federal-government-tax-reforms-hr-compliance-checklist-2026/)
- [Nigeria Payroll Guide - Skuad](https://www.skuad.io/global-payroll/nigeria)
- [Statutory Contributions Guide - SIAO](https://siao.ng/detailed-guide-to-statutory-contributions-in-nigeria/)

---

**Document End**
