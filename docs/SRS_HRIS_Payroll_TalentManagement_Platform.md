# Software Requirements Specification (SRS)

## HRIS + Payroll + Talent Management Platform

**Document Version:** 1.0
**Date:** 2025-11-26
**Status:** Draft

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [System Architecture](#5-system-architecture)
6. [Data Requirements](#6-data-requirements)
7. [External Interface Requirements](#7-external-interface-requirements)
8. [Compliance Requirements](#8-compliance-requirements)
9. [Appendices](#9-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for a multi-tenant Human Resource Information System (HRIS), Payroll, and Talent Management Platform. The platform is designed to serve enterprise clients across Nigeria, South Africa, and the United States of America with country-specific compliance modules.

### 1.2 Scope

The platform consists of three integrated modules:

1. **HRIS Module** - Core HR management functionality
2. **Payroll Module** - Country-compliant payroll processing
3. **Talent Management Module** - Recruitment and performance management

### 1.3 Definitions, Acronyms, and Abbreviations

| Term | Definition |
|------|------------|
| HRIS | Human Resource Information System |
| ESS | Employee Self-Service |
| MSS | Manager Self-Service |
| PAYE | Pay As You Earn (Tax) |
| NHF | National Housing Fund (Nigeria) |
| NSITF | Nigeria Social Insurance Trust Fund |
| UIF | Unemployment Insurance Fund (South Africa) |
| SDL | Skills Development Levy (South Africa) |
| FICA | Federal Insurance Contributions Act (USA) |
| OKR | Objectives and Key Results |
| KPI | Key Performance Indicator |
| RBAC | Role-Based Access Control |
| SaaS | Software as a Service |
| API | Application Programming Interface |

### 1.4 References

- Nigeria Federal Inland Revenue Service (FIRS) Guidelines
- Nigeria Pension Reform Act 2014
- South African Revenue Service (SARS) PAYE Guidelines
- South African Basic Conditions of Employment Act
- US Internal Revenue Service (IRS) Publication 15
- Fair Labor Standards Act (FLSA)

### 1.5 Overview

This document is organized into nine sections covering all aspects of the platform requirements, from functional specifications to compliance mandates across three target countries.

---

## 2. Overall Description

### 2.1 Product Perspective

The platform is a cloud-hosted, multi-tenant SaaS solution designed to serve multiple enterprise clients simultaneously. Each tenant operates in complete isolation with dedicated data storage, custom configurations, and branding options.

```
┌─────────────────────────────────────────────────────────────────┐
│                      PLATFORM ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   TENANT A   │  │   TENANT B   │  │   TENANT N   │           │
│  │  (Nigeria)   │  │ (S. Africa)  │  │    (USA)     │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         ▼                 ▼                 ▼                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   API GATEWAY LAYER                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│         ┌────────────────────┼────────────────────┐             │
│         ▼                    ▼                    ▼             │
│  ┌────────────┐      ┌────────────┐      ┌────────────────┐    │
│  │   HRIS     │      │  PAYROLL   │      │    TALENT      │    │
│  │  MODULE    │      │   MODULE   │      │  MANAGEMENT    │    │
│  └────────────┘      └────────────┘      └────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              SHARED SERVICES LAYER                       │    │
│  │  (Auth, Notifications, Document Storage, Audit Logs)     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Product Functions

#### High-Level Function Summary

| Module | Primary Functions |
|--------|-------------------|
| HRIS | Employee database, leave management, attendance, onboarding |
| Payroll | Tax calculations, deductions, payslip generation, bank exports |
| Talent | Job posting, applicant tracking, performance reviews |

### 2.3 User Classes and Characteristics

| User Class | Description | Access Level |
|------------|-------------|--------------|
| Super Admin | Platform operator managing all tenants | Full system access |
| Tenant Admin | Organization administrator | Full tenant access |
| HR Manager | HR department staff | HR module full access |
| Payroll Admin | Payroll processing staff | Payroll module access |
| Department Manager | Team/department leaders | MSS access |
| Employee | Regular staff members | ESS access |
| Recruiter | Talent acquisition staff | Recruitment module access |
| Candidate | Job applicants | Limited portal access |

### 2.4 Operating Environment

- **Hosting:** Cloud-based (AWS/Azure/GCP compatible)
- **Database:** PostgreSQL with schema-based multi-tenancy
- **Frontend:** Responsive web application (React/Vue.js)
- **Mobile:** Progressive Web App (PWA) with native app optional
- **Browsers:** Chrome, Firefox, Safari, Edge (latest 2 versions)
- **API:** RESTful API with JSON payloads

### 2.5 Design and Implementation Constraints

1. Must support true multi-tenant architecture with data isolation
2. Must comply with data protection regulations (NDPR Nigeria, POPIA South Africa, GDPR-aligned)
3. Must integrate with local banking systems for payment file exports
4. Must support multiple currencies (NGN, ZAR, USD)
5. Must maintain audit trails for all sensitive operations

### 2.6 Assumptions and Dependencies

**Assumptions:**
- Clients have stable internet connectivity
- Clients will provide accurate employee and tax information
- Tax tables will be updated annually by the platform operator

**Dependencies:**
- Third-party email service for notifications
- Cloud storage for document management
- Payment gateway integrations (optional)
- Government tax API integrations where available

---

## 3. Functional Requirements

### 3.1 HRIS Module

#### 3.1.1 Employee Database Management

| ID | Requirement | Priority |
|----|-------------|----------|
| HRIS-001 | System shall maintain a central employee database with unique employee identifiers | Critical |
| HRIS-002 | System shall store employee personal information (name, DOB, contact, emergency contacts) | Critical |
| HRIS-003 | System shall store employee employment details (hire date, department, position, reporting line) | Critical |
| HRIS-004 | System shall support employee status types: Active, Inactive, Terminated, On Leave, Probation | Critical |
| HRIS-005 | System shall maintain employment history including position changes, promotions, transfers | High |
| HRIS-006 | System shall support custom fields per tenant for additional employee attributes | Medium |
| HRIS-007 | System shall support bulk employee import via CSV/Excel templates | High |
| HRIS-008 | System shall generate unique employee numbers with configurable formats | High |

#### 3.1.2 Employee Self-Service (ESS)

| ID | Requirement | Priority |
|----|-------------|----------|
| ESS-001 | Employees shall view and update personal information (within permitted fields) | Critical |
| ESS-002 | Employees shall view their payslips and payment history | Critical |
| ESS-003 | Employees shall submit leave requests with supporting documents | Critical |
| ESS-004 | Employees shall view leave balances and history | Critical |
| ESS-005 | Employees shall clock in/out via web or mobile interface | High |
| ESS-006 | Employees shall view company announcements and policies | High |
| ESS-007 | Employees shall upload and manage personal documents | Medium |
| ESS-008 | Employees shall update bank account details for salary payments | High |
| ESS-009 | Employees shall view organizational chart and company directory | Medium |

#### 3.1.3 Manager Self-Service (MSS)

| ID | Requirement | Priority |
|----|-------------|----------|
| MSS-001 | Managers shall view team member profiles and employment details | Critical |
| MSS-002 | Managers shall approve/reject leave requests from direct reports | Critical |
| MSS-003 | Managers shall view team attendance and time records | High |
| MSS-004 | Managers shall initiate and approve employee status changes | High |
| MSS-005 | Managers shall conduct performance reviews for team members | High |
| MSS-006 | Managers shall view team-level reports and analytics | Medium |
| MSS-007 | Managers shall request position changes, transfers for team members | Medium |

#### 3.1.4 Leave Management

| ID | Requirement | Priority |
|----|-------------|----------|
| LV-001 | System shall support multiple leave types (Annual, Sick, Maternity, Paternity, Study, Unpaid) | Critical |
| LV-002 | System shall enforce country-specific leave entitlements and policies | Critical |
| LV-003 | System shall support configurable approval workflows (single/multi-level) | Critical |
| LV-004 | System shall automatically calculate leave balances based on accrual rules | Critical |
| LV-005 | System shall support leave carry-over with configurable limits | High |
| LV-006 | System shall support public holiday calendars per country/region | High |
| LV-007 | System shall prevent leave requests conflicting with team coverage rules | Medium |
| LV-008 | System shall send notifications for pending approvals and status changes | High |
| LV-009 | System shall support leave cancellation and modification workflows | Medium |
| LV-010 | System shall integrate with payroll for unpaid leave deductions | High |

**Country-Specific Leave Defaults:**

| Leave Type | Nigeria | South Africa | USA |
|------------|---------|--------------|-----|
| Annual Leave | 6-30 days (based on tenure) | 15 working days | Employer-defined |
| Sick Leave | 12 days | 30 days (3-year cycle) | FMLA eligible |
| Maternity | 12 weeks | 4 months | 12 weeks FMLA |
| Paternity | 14 days | 10 days | FMLA eligible |

#### 3.1.5 Time & Attendance

| ID | Requirement | Priority |
|----|-------------|----------|
| TA-001 | System shall support web-based clock in/out functionality | Critical |
| TA-002 | System shall support mobile app clock in/out with GPS capture (optional) | High |
| TA-003 | System shall support biometric integration via API | Medium |
| TA-004 | System shall calculate daily, weekly, and monthly work hours | Critical |
| TA-005 | System shall track overtime hours with configurable rules | High |
| TA-006 | System shall support shift scheduling and rotation | High |
| TA-007 | System shall flag attendance anomalies (late arrival, early departure, missed punches) | High |
| TA-008 | System shall allow managers to adjust time records with audit trail | High |
| TA-009 | System shall integrate attendance data with payroll calculations | Critical |
| TA-010 | System shall generate attendance reports and analytics | Medium |

#### 3.1.6 Onboarding/Offboarding Workflows

| ID | Requirement | Priority |
|----|-------------|----------|
| OB-001 | System shall provide configurable onboarding checklists per role/department | High |
| OB-002 | System shall automate new employee account creation and access provisioning | High |
| OB-003 | System shall collect new employee documents and information electronically | High |
| OB-004 | System shall send automated welcome emails with login credentials | High |
| OB-005 | System shall track onboarding task completion and send reminders | Medium |
| OB-006 | System shall support probation period tracking and review reminders | Medium |
| OFF-001 | System shall provide configurable offboarding checklists | High |
| OFF-002 | System shall calculate final settlement amounts (leave encashment, deductions) | High |
| OFF-003 | System shall revoke system access upon termination | Critical |
| OFF-004 | System shall generate clearance certificates and experience letters | Medium |
| OFF-005 | System shall conduct exit interviews electronically | Low |

#### 3.1.7 Document Management

| ID | Requirement | Priority |
|----|-------------|----------|
| DM-001 | System shall provide secure document storage per employee | High |
| DM-002 | System shall support document categories (contracts, ID docs, certificates, etc.) | High |
| DM-003 | System shall enforce document expiry tracking and renewal reminders | Medium |
| DM-004 | System shall support document version control | Medium |
| DM-005 | System shall provide company-wide document/policy repository | High |
| DM-006 | System shall track document acknowledgments from employees | Medium |
| DM-007 | System shall support bulk document upload and distribution | Medium |

#### 3.1.8 Role-Based Access Control (RBAC)

| ID | Requirement | Priority |
|----|-------------|----------|
| RBAC-001 | System shall support role-based access with granular permissions | Critical |
| RBAC-002 | System shall support hierarchical data access based on org structure | Critical |
| RBAC-003 | System shall allow custom role creation with configurable permissions | High |
| RBAC-004 | System shall support data field-level access control | High |
| RBAC-005 | System shall log all permission changes with audit trail | Critical |
| RBAC-006 | System shall support temporary elevated access with expiry | Medium |

**Default System Roles:**

| Role | HRIS | Payroll | Talent | Admin |
|------|------|---------|--------|-------|
| Super Admin | Full | Full | Full | Full |
| Tenant Admin | Full | Full | Full | Tenant |
| HR Manager | Full | View | Full | None |
| Payroll Admin | View | Full | None | None |
| Department Manager | Team | None | Team | None |
| Employee | Self | Self | Self | None |
| Recruiter | View | None | Recruitment | None |

#### 3.1.9 Audit Logging

| ID | Requirement | Priority |
|----|-------------|----------|
| AL-001 | System shall log all create, update, delete operations with timestamps | Critical |
| AL-002 | System shall capture user ID, IP address, and action details for each log | Critical |
| AL-003 | System shall provide audit log search and export functionality | High |
| AL-004 | System shall retain audit logs for minimum 7 years | High |
| AL-005 | System shall support audit log archival and retrieval | Medium |
| AL-006 | System shall alert on suspicious activity patterns | Medium |

---

### 3.2 Payroll Module

#### 3.2.1 Core Payroll Processing

| ID | Requirement | Priority |
|----|-------------|----------|
| PAY-001 | System shall support monthly, bi-weekly, and weekly pay cycles | Critical |
| PAY-002 | System shall calculate gross pay based on salary/hourly rates | Critical |
| PAY-003 | System shall apply statutory deductions based on country rules | Critical |
| PAY-004 | System shall support custom deductions (loans, advances, union dues, etc.) | Critical |
| PAY-005 | System shall support custom allowances (housing, transport, meal, etc.) | Critical |
| PAY-006 | System shall calculate net pay after all deductions | Critical |
| PAY-007 | System shall support payroll corrections and adjustments | High |
| PAY-008 | System shall support off-cycle payments (bonuses, advances) | High |
| PAY-009 | System shall support payroll reversal with proper audit | Medium |
| PAY-010 | System shall lock payroll periods to prevent retroactive changes | High |

#### 3.2.2 Nigeria Payroll Compliance

| ID | Requirement | Priority |
|----|-------------|----------|
| NG-001 | System shall calculate PAYE tax using Nigeria graduated tax table | Critical |
| NG-002 | System shall apply Consolidated Relief Allowance (CRA) - 20% of gross + ₦200,000 | Critical |
| NG-003 | System shall calculate pension at 8% employee + 10% employer contribution | Critical |
| NG-004 | System shall calculate NHF at 2.5% of basic salary | Critical |
| NG-005 | System shall calculate NSITF at 1% employer contribution | Critical |
| NG-006 | System shall support Industrial Training Fund (ITF) at 1% of annual payroll | High |
| NG-007 | System shall generate PAYE tax remittance reports per state | Critical |
| NG-008 | System shall support multiple PFA (Pension Fund Administrators) | High |
| NG-009 | System shall generate annual tax certificates (Form H1) | Critical |
| NG-010 | System shall support state-specific tax rules (Lagos, FCT, etc.) | High |

**Nigeria PAYE Tax Table (Current):**

| Annual Income (₦) | Tax Rate |
|-------------------|----------|
| First 300,000 | 7% |
| Next 300,000 | 11% |
| Next 500,000 | 15% |
| Next 500,000 | 19% |
| Next 1,600,000 | 21% |
| Above 3,200,000 | 24% |

#### 3.2.3 South Africa Payroll Compliance

| ID | Requirement | Priority |
|----|-------------|----------|
| ZA-001 | System shall calculate PAYE using SARS tax tables | Critical |
| ZA-002 | System shall apply tax rebates (Primary, Secondary, Tertiary) | Critical |
| ZA-003 | System shall calculate UIF at 1% employee + 1% employer (capped) | Critical |
| ZA-004 | System shall calculate SDL at 1% of payroll | Critical |
| ZA-005 | System shall support medical aid tax credits | High |
| ZA-006 | System shall support retirement fund contributions (tax deductible) | High |
| ZA-007 | System shall generate IRP5 certificates | Critical |
| ZA-008 | System shall support EMP201 monthly submissions | Critical |
| ZA-009 | System shall support COIDA (Compensation for Occupational Injuries) | High |
| ZA-010 | System shall handle tax directives for special payments | Medium |

**South Africa Tax Tables 2024/2025:**

| Taxable Income (ZAR) | Tax Rate |
|----------------------|----------|
| 0 - 237,100 | 18% |
| 237,101 - 370,500 | 26% |
| 370,501 - 512,800 | 31% |
| 512,801 - 673,000 | 36% |
| 673,001 - 857,900 | 39% |
| 857,901 - 1,817,000 | 41% |
| Above 1,817,000 | 45% |

#### 3.2.4 USA Payroll Compliance

| ID | Requirement | Priority |
|----|-------------|----------|
| US-001 | System shall calculate Federal Income Tax using IRS withholding tables | Critical |
| US-002 | System shall calculate Social Security tax at 6.2% (employee + employer) | Critical |
| US-003 | System shall calculate Medicare tax at 1.45% (employee + employer) | Critical |
| US-004 | System shall support Additional Medicare Tax (0.9% over $200k) | High |
| US-005 | System shall support state income tax calculations (all 50 states) | Critical |
| US-006 | System shall support local/city taxes where applicable | High |
| US-007 | System shall support W-4 based withholding (2020+ format) | Critical |
| US-008 | System shall generate W-2 forms | Critical |
| US-009 | System shall support 401(k) and retirement plan deductions | High |
| US-010 | System shall support FUTA (Federal Unemployment Tax) | High |
| US-011 | System shall support state unemployment taxes (SUTA) | High |
| US-012 | System shall support garnishments and child support orders | High |

#### 3.2.5 Pay Groups and Structures

| ID | Requirement | Priority |
|----|-------------|----------|
| PG-001 | System shall support multiple pay groups with different pay cycles | High |
| PG-002 | System shall support salary grades and bands | High |
| PG-003 | System shall support currency conversion for multi-country payroll | High |
| PG-004 | System shall support department/cost center allocation | High |
| PG-005 | System shall support project-based pay allocation | Medium |

#### 3.2.6 Payslip Generation

| ID | Requirement | Priority |
|----|-------------|----------|
| PS-001 | System shall generate payslips in PDF format | Critical |
| PS-002 | System shall support customizable payslip templates per tenant | High |
| PS-003 | System shall email payslips to employees automatically | Critical |
| PS-004 | System shall provide payslip access via ESS portal | Critical |
| PS-005 | System shall support bulk payslip generation and distribution | High |
| PS-006 | System shall display YTD (Year-to-Date) earnings and deductions | High |

#### 3.2.7 Bank Payment Integration

| ID | Requirement | Priority |
|----|-------------|----------|
| BP-001 | System shall generate bulk payment files for Nigerian banks (NIBSS format) | Critical |
| BP-002 | System shall generate bulk payment files for South African banks (NAEDO/EFT) | Critical |
| BP-003 | System shall generate ACH files for US banks (NACHA format) | Critical |
| BP-004 | System shall support multiple bank account payments per employee | High |
| BP-005 | System shall validate bank account details before payment file generation | High |
| BP-006 | System shall maintain payment history and reconciliation | High |

**Supported Bank File Formats:**

| Country | Format | Banks |
|---------|--------|-------|
| Nigeria | NIBSS NIP | All Nigerian banks |
| South Africa | NAEDO/DebiCheck | Major SA banks |
| USA | NACHA/ACH | US banks |

#### 3.2.8 Payroll Reporting

| ID | Requirement | Priority |
|----|-------------|----------|
| PR-001 | System shall generate payroll summary reports | Critical |
| PR-002 | System shall generate statutory deduction reports | Critical |
| PR-003 | System shall generate bank reconciliation reports | High |
| PR-004 | System shall generate department/cost center reports | High |
| PR-005 | System shall generate variance reports (period-over-period) | Medium |
| PR-006 | System shall support custom report builder | Medium |
| PR-007 | System shall export reports to PDF, Excel, CSV formats | High |

---

### 3.3 Talent Management Module

#### 3.3.1 Job Posting and Publishing

| ID | Requirement | Priority |
|----|-------------|----------|
| JP-001 | System shall support job posting creation with templates | Critical |
| JP-002 | System shall support rich text job descriptions | High |
| JP-003 | System shall publish jobs to careers page | Critical |
| JP-004 | System shall support job posting expiry dates | High |
| JP-005 | System shall support job requisition approval workflows | High |
| JP-006 | System shall support internal job postings | High |
| JP-007 | System shall integrate with external job boards (optional API) | Medium |
| JP-008 | System shall track job posting analytics (views, applications) | Medium |

#### 3.3.2 Applicant Tracking System (ATS)

| ID | Requirement | Priority |
|----|-------------|----------|
| ATS-001 | System shall capture candidate applications via careers page | Critical |
| ATS-002 | System shall support resume/CV upload and parsing | High |
| ATS-003 | System shall support configurable recruitment pipeline stages | Critical |
| ATS-004 | System shall move candidates through stages with drag-drop interface | High |
| ATS-005 | System shall support candidate status tracking | Critical |
| ATS-006 | System shall support candidate communication (email templates) | High |
| ATS-007 | System shall prevent duplicate candidate entries | High |
| ATS-008 | System shall support candidate tagging and filtering | Medium |

**Default Pipeline Stages:**

1. Applied
2. Screening
3. Interview Scheduled
4. Interview Completed
5. Assessment
6. Reference Check
7. Offer
8. Hired / Rejected

#### 3.3.3 Candidate Database / Talent Pool

| ID | Requirement | Priority |
|----|-------------|----------|
| CD-001 | System shall maintain searchable candidate database | High |
| CD-002 | System shall support candidate profile creation (manual entry) | High |
| CD-003 | System shall retain rejected candidates for future opportunities | High |
| CD-004 | System shall support talent pool segmentation | Medium |
| CD-005 | System shall support candidate data retention policies (GDPR compliance) | High |

#### 3.3.4 Interview Management

| ID | Requirement | Priority |
|----|-------------|----------|
| IM-001 | System shall support interview scheduling with calendar integration | High |
| IM-002 | System shall send interview invitations to candidates | High |
| IM-003 | System shall support multiple interview rounds | High |
| IM-004 | System shall support interviewer assignment | High |
| IM-005 | System shall provide interview evaluation forms/scorecards | High |
| IM-006 | System shall aggregate interview feedback for hiring decisions | High |
| IM-007 | System shall support panel interview scheduling | Medium |

#### 3.3.5 Offer Management

| ID | Requirement | Priority |
|----|-------------|----------|
| OM-001 | System shall generate offer letters from templates | High |
| OM-002 | System shall support offer approval workflows | High |
| OM-003 | System shall track offer status (pending, accepted, declined, expired) | High |
| OM-004 | System shall support digital offer acceptance | Medium |
| OM-005 | System shall support offer negotiation tracking | Medium |

#### 3.3.6 Candidate to Employee Conversion

| ID | Requirement | Priority |
|----|-------------|----------|
| CE-001 | System shall convert hired candidate to employee record | Critical |
| CE-002 | System shall pre-populate employee record from candidate data | High |
| CE-003 | System shall trigger onboarding workflow upon conversion | High |
| CE-004 | System shall maintain link between candidate and employee records | Medium |

#### 3.3.7 Performance Goals (OKR/KPI)

| ID | Requirement | Priority |
|----|-------------|----------|
| PG-001 | System shall support goal creation at company, team, and individual levels | High |
| PG-002 | System shall support OKR framework (Objectives with Key Results) | High |
| PG-003 | System shall support KPI tracking with targets | High |
| PG-004 | System shall support goal cascading (company → team → individual) | Medium |
| PG-005 | System shall track goal progress with updates | High |
| PG-006 | System shall support goal weighting for performance calculations | Medium |

#### 3.3.8 Performance Review Cycles

| ID | Requirement | Priority |
|----|-------------|----------|
| PRC-001 | System shall support configurable review cycles (annual, semi-annual, quarterly) | High |
| PRC-002 | System shall support self-assessment | High |
| PRC-003 | System shall support manager assessment | High |
| PRC-004 | System shall support 360-degree feedback (optional) | Medium |
| PRC-005 | System shall support rating scales (configurable) | High |
| PRC-006 | System shall generate performance review forms from templates | High |
| PRC-007 | System shall track review completion status | High |
| PRC-008 | System shall support review calibration sessions | Low |
| PRC-009 | System shall archive completed reviews | High |

#### 3.3.9 Training and Skills

| ID | Requirement | Priority |
|----|-------------|----------|
| TS-001 | System shall maintain employee skills inventory | Medium |
| TS-002 | System shall support skill proficiency levels | Medium |
| TS-003 | System shall track training history | Medium |
| TS-004 | System shall support training request and approval | Medium |
| TS-005 | System shall support training calendar | Low |
| TS-006 | System shall track certifications and expiry | Medium |

---

### 3.4 Multi-Tenant Administration

#### 3.4.1 Super Admin Functions

| ID | Requirement | Priority |
|----|-------------|----------|
| SA-001 | System shall provide super admin dashboard for all tenants | Critical |
| SA-002 | System shall support tenant provisioning (create new organization) | Critical |
| SA-003 | System shall support tenant suspension and reactivation | Critical |
| SA-004 | System shall configure tenant-level feature access | High |
| SA-005 | System shall view tenant usage metrics and analytics | High |
| SA-006 | System shall support tenant data export | High |
| SA-007 | System shall manage system-wide configurations | High |
| SA-008 | System shall update tax tables and compliance rules | Critical |

#### 3.4.2 Tenant Configuration

| ID | Requirement | Priority |
|----|-------------|----------|
| TC-001 | System shall support tenant-specific branding (logo, colors) | High |
| TC-002 | System shall support tenant-specific configurations | High |
| TC-003 | System shall support multiple legal entities per tenant | Medium |
| TC-004 | System shall support tenant-specific workflows | Medium |
| TC-005 | System shall support tenant-specific custom fields | Medium |

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

| ID | Requirement | Metric |
|----|-------------|--------|
| PERF-001 | Page load time | < 3 seconds (95th percentile) |
| PERF-002 | API response time | < 500ms (95th percentile) |
| PERF-003 | Payroll processing | < 5 minutes for 1000 employees |
| PERF-004 | Report generation | < 30 seconds for standard reports |
| PERF-005 | Concurrent users | Support 10,000+ concurrent users |
| PERF-006 | Database queries | Optimized with indexing, < 100ms |

### 4.2 Scalability Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| SCAL-001 | Total employees | 500,000+ across all tenants |
| SCAL-002 | Tenants | 1,000+ organizations |
| SCAL-003 | Employees per tenant | 20 - 10,000 |
| SCAL-004 | Horizontal scaling | Support auto-scaling based on load |
| SCAL-005 | Database scaling | Support read replicas |

### 4.3 Availability Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| AVAIL-001 | System uptime | 99.9% (excluding planned maintenance) |
| AVAIL-002 | Planned maintenance window | Monthly, < 4 hours, weekends |
| AVAIL-003 | Recovery Time Objective (RTO) | < 1 hour |
| AVAIL-004 | Recovery Point Objective (RPO) | < 15 minutes |

### 4.4 Security Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SEC-001 | All data transmission shall use TLS 1.2+ encryption | Critical |
| SEC-002 | Passwords shall be hashed using bcrypt/Argon2 | Critical |
| SEC-003 | System shall support Multi-Factor Authentication (MFA) | High |
| SEC-004 | System shall enforce password complexity policies | High |
| SEC-005 | System shall support SSO (SAML 2.0, OAuth 2.0) | High |
| SEC-006 | System shall implement session timeout (configurable) | High |
| SEC-007 | System shall encrypt sensitive data at rest (AES-256) | Critical |
| SEC-008 | System shall implement rate limiting on APIs | High |
| SEC-009 | System shall pass OWASP Top 10 security audit | Critical |
| SEC-010 | System shall support IP whitelisting (optional) | Medium |

### 4.5 Usability Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| USE-001 | Interface shall be mobile-responsive | Critical |
| USE-002 | Interface shall support accessibility (WCAG 2.1 AA) | High |
| USE-003 | System shall provide contextual help and tooltips | Medium |
| USE-004 | System shall support multiple languages (English required) | High |
| USE-005 | System shall provide intuitive navigation | High |
| USE-006 | System shall provide bulk action capabilities | High |

### 4.6 Reliability Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REL-001 | System shall implement automated database backups (daily) | Critical |
| REL-002 | System shall implement point-in-time recovery | High |
| REL-003 | System shall implement graceful degradation | Medium |
| REL-004 | System shall implement health monitoring and alerting | High |
| REL-005 | System shall implement automated failover | High |

### 4.7 Compliance Requirements Summary

| Standard | Applicability |
|----------|---------------|
| NDPR (Nigeria) | All Nigerian tenant data |
| POPIA (South Africa) | All South African tenant data |
| CCPA/State Privacy Laws | US tenant data |
| SOC 2 Type II | All operations |
| ISO 27001 | Recommended |

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                            │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Web Portal  │  │ Mobile PWA  │  │ Admin Panel │  │ Careers Page│    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          └────────────────┴────────────────┴────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                 │
│         (Rate Limiting, Authentication, Routing, Logging)               │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌───────────────┐          ┌───────────────┐          ┌───────────────┐
│  HRIS SERVICE │          │PAYROLL SERVICE│          │TALENT SERVICE │
├───────────────┤          ├───────────────┤          ├───────────────┤
│ - Employees   │          │ - Pay Calc    │          │ - Recruitment │
│ - Leave       │          │ - Tax Engine  │          │ - Performance │
│ - Attendance  │          │ - Deductions  │          │ - Training    │
│ - Documents   │          │ - Payslips    │          │ - Goals       │
└───────┬───────┘          └───────┬───────┘          └───────┬───────┘
        │                          │                          │
        └──────────────────────────┼──────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          SHARED SERVICES                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │    Auth    │  │   Email    │  │  Document  │  │   Audit    │        │
│  │  Service   │  │  Service   │  │  Storage   │  │    Log     │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐        │
│  │Notification│  │  Reports   │  │    Tax     │  │   Jobs/    │        │
│  │  Service   │  │   Engine   │  │   Engine   │  │   Queue    │        │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            DATA LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    PostgreSQL (Multi-Tenant)                      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │   │
│  │  │  Tenant A   │  │  Tenant B   │  │  Tenant N   │               │   │
│  │  │   Schema    │  │   Schema    │  │   Schema    │               │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────┐      │
│  │   Redis Cache    │  │   File Storage   │  │  Search Index     │      │
│  │  (Sessions/Cache)│  │  (S3/Azure Blob) │  │  (Elasticsearch)  │      │
│  └──────────────────┘  └──────────────────┘  └───────────────────┘      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Multi-Tenant Data Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     PostgreSQL Database                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    PUBLIC SCHEMA                         │    │
│  │  ┌───────────┐  ┌───────────┐  ┌────────────────────┐   │    │
│  │  │  tenants  │  │   users   │  │  system_settings   │   │    │
│  │  └───────────┘  └───────────┘  └────────────────────┘   │    │
│  │  ┌───────────────────┐  ┌─────────────────────────┐     │    │
│  │  │    tax_tables     │  │   country_settings      │     │    │
│  │  └───────────────────┘  └─────────────────────────┘     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │ tenant_abc123   │  │ tenant_def456   │  │ tenant_xyz789  │   │
│  │    (Schema)     │  │    (Schema)     │  │    (Schema)    │   │
│  ├─────────────────┤  ├─────────────────┤  ├────────────────┤   │
│  │ - employees     │  │ - employees     │  │ - employees    │   │
│  │ - leave_requests│  │ - leave_requests│  │ - leave_request│   │
│  │ - payroll_runs  │  │ - payroll_runs  │  │ - payroll_runs │   │
│  │ - candidates    │  │ - candidates    │  │ - candidates   │   │
│  │ - goals         │  │ - goals         │  │ - goals        │   │
│  │ - ...           │  │ - ...           │  │ - ...          │   │
│  └─────────────────┘  └─────────────────┘  └────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Technology Stack Recommendations

| Layer | Recommended Technology |
|-------|------------------------|
| Frontend | React.js / Vue.js with TypeScript |
| Mobile | Progressive Web App (PWA) / React Native |
| API | Node.js (Express) / Python (FastAPI) / .NET Core |
| Database | PostgreSQL 14+ with schema-based multi-tenancy |
| Cache | Redis |
| Search | Elasticsearch (for candidate search) |
| File Storage | AWS S3 / Azure Blob Storage |
| Email | SendGrid / AWS SES |
| Queue | Redis Queue / RabbitMQ / AWS SQS |
| Monitoring | Datadog / New Relic / Prometheus + Grafana |

---

## 6. Data Requirements

### 6.1 Core Data Entities

#### 6.1.1 Employee Entity

```
Employee
├── id (UUID)
├── employee_number (String)
├── tenant_id (FK)
├── first_name (String)
├── middle_name (String, nullable)
├── last_name (String)
├── email (String, unique per tenant)
├── phone (String)
├── date_of_birth (Date)
├── gender (Enum)
├── marital_status (Enum)
├── nationality (String)
├── national_id (String)
├── tax_id (String)
├── address (JSON)
├── emergency_contact (JSON)
├── hire_date (Date)
├── employment_type (Enum: Full-time, Part-time, Contract)
├── employment_status (Enum: Active, Inactive, Terminated, On Leave)
├── department_id (FK)
├── position_id (FK)
├── manager_id (FK, self-reference)
├── pay_group_id (FK)
├── bank_details (JSON, encrypted)
├── pension_details (JSON)
├── created_at (Timestamp)
├── updated_at (Timestamp)
└── deleted_at (Timestamp, soft delete)
```

#### 6.1.2 Payroll Run Entity

```
PayrollRun
├── id (UUID)
├── tenant_id (FK)
├── pay_period_start (Date)
├── pay_period_end (Date)
├── pay_date (Date)
├── status (Enum: Draft, Processing, Completed, Approved, Paid)
├── pay_group_id (FK)
├── total_gross (Decimal)
├── total_deductions (Decimal)
├── total_net (Decimal)
├── total_employer_costs (Decimal)
├── employee_count (Integer)
├── approved_by (FK)
├── approved_at (Timestamp)
├── created_at (Timestamp)
└── updated_at (Timestamp)
```

#### 6.1.3 Payroll Item Entity

```
PayrollItem
├── id (UUID)
├── payroll_run_id (FK)
├── employee_id (FK)
├── basic_salary (Decimal)
├── gross_pay (Decimal)
├── taxable_income (Decimal)
├── tax_amount (Decimal)
├── pension_employee (Decimal)
├── pension_employer (Decimal)
├── other_deductions (JSON)
├── other_allowances (JSON)
├── net_pay (Decimal)
├── ytd_gross (Decimal)
├── ytd_tax (Decimal)
├── created_at (Timestamp)
└── updated_at (Timestamp)
```

### 6.2 Data Retention Requirements

| Data Type | Retention Period | Notes |
|-----------|-----------------|-------|
| Employee records | 7 years after termination | Legal requirement |
| Payroll records | 7 years | Tax audit requirement |
| Tax certificates | 7 years | Statutory requirement |
| Audit logs | 7 years | Compliance requirement |
| Candidate data | 2 years (or consent) | GDPR/POPIA compliance |
| Performance reviews | 5 years | HR best practice |
| Training records | Duration of employment + 3 years | Skills tracking |

### 6.3 Data Backup Requirements

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full backup | Daily | 30 days |
| Incremental backup | Hourly | 7 days |
| Point-in-time recovery | Continuous | 7 days |
| Offsite backup | Weekly | 1 year |

---

## 7. External Interface Requirements

### 7.1 User Interfaces

#### 7.1.1 Web Portal Screens

| Screen | Description | Users |
|--------|-------------|-------|
| Dashboard | Overview with key metrics and quick actions | All |
| Employee Directory | Searchable employee list with filters | HR, Managers |
| Employee Profile | Detailed employee information | HR, Self |
| Leave Calendar | Visual leave schedule | All |
| Payroll Dashboard | Payroll run status and actions | Payroll Admin |
| Payslip Viewer | Individual payslip display | Employees |
| Recruitment Pipeline | Kanban board for candidates | Recruiters |
| Performance Goals | Goal tracking and progress | Managers, Employees |
| Reports | Report generation and viewing | HR, Managers |
| Settings | System and tenant configuration | Admin |

### 7.2 API Interfaces

#### 7.2.1 REST API Endpoints (Sample)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/employees` | GET | List employees with pagination |
| `/api/v1/employees/{id}` | GET | Get employee details |
| `/api/v1/employees` | POST | Create new employee |
| `/api/v1/employees/{id}` | PUT | Update employee |
| `/api/v1/leave-requests` | POST | Submit leave request |
| `/api/v1/payroll-runs` | POST | Initiate payroll run |
| `/api/v1/payroll-runs/{id}/payslips` | GET | Get payslips for run |
| `/api/v1/candidates` | GET | List candidates |
| `/api/v1/jobs` | GET | List job postings |

#### 7.2.2 Webhook Events

| Event | Trigger | Payload |
|-------|---------|---------|
| `employee.created` | New employee added | Employee object |
| `employee.terminated` | Employee terminated | Employee ID, date |
| `leave.approved` | Leave request approved | Leave request object |
| `payroll.completed` | Payroll run completed | Payroll summary |
| `candidate.hired` | Candidate converted to employee | Candidate + Employee IDs |

### 7.3 Integration Interfaces

| System | Integration Type | Purpose |
|--------|------------------|---------|
| Accounting Systems | API | GL posting |
| Banking Systems | File Export | Payment processing |
| Background Check | API | Pre-employment screening |
| Job Boards | API | Job posting syndication |
| Calendar (Google/Outlook) | OAuth | Interview scheduling |
| SSO Providers | SAML/OAuth | Authentication |

---

## 8. Compliance Requirements

### 8.1 Nigeria Compliance

#### 8.1.1 Tax Compliance

| Requirement | Details |
|-------------|---------|
| PAYE Registration | Employer must be registered with relevant State IRS |
| Monthly PAYE Remittance | Due by 10th of following month |
| Annual Tax Returns | Form H1 by January 31st |
| Tax Clearance Certificate | Annual employer obligation |

#### 8.1.2 Pension Compliance

| Requirement | Details |
|-------------|---------|
| PFA Registration | All employees must have RSA |
| Contribution Rates | 8% employee, 10% employer (minimum) |
| Remittance Deadline | Within 7 working days after pay day |
| PenCom Reporting | Monthly schedule submission |

#### 8.1.3 Data Protection (NDPR)

| Requirement | Details |
|-------------|---------|
| Consent | Explicit consent for data collection |
| Data Minimization | Collect only necessary data |
| Right to Access | Employees can request their data |
| Data Breach Notification | Report within 72 hours |
| DPO Appointment | Required for organizations processing personal data |

### 8.2 South Africa Compliance

#### 8.2.1 Tax Compliance

| Requirement | Details |
|-------------|---------|
| PAYE Registration | Register with SARS |
| Monthly Submissions | EMP201 by 7th of following month |
| Bi-Annual Reconciliation | EMP501 (August and February) |
| Annual Certificates | IRP5/IT3(a) for employees |

#### 8.2.2 UIF Compliance

| Requirement | Details |
|-------------|---------|
| Registration | Register with Department of Labour |
| Monthly Contributions | 1% employee + 1% employer |
| UI-19 Forms | Issue on termination |

#### 8.2.3 Data Protection (POPIA)

| Requirement | Details |
|-------------|---------|
| Lawful Processing | Legal basis required |
| Purpose Limitation | Process for specified purposes only |
| Data Subject Rights | Access, correction, deletion |
| Cross-border Transfers | Adequate protection required |
| Information Officer | Must be registered |

### 8.3 USA Compliance

#### 8.3.1 Federal Tax Compliance

| Requirement | Details |
|-------------|---------|
| EIN Registration | Employer Identification Number required |
| Form 941 | Quarterly federal tax return |
| Form W-2 | Annual wage statements by January 31 |
| Form W-3 | Transmittal of W-2s to SSA |
| Form 940 | Annual FUTA return |

#### 8.3.2 State Compliance

| Requirement | Details |
|-------------|---------|
| State Registration | Register with each state where employees work |
| State Income Tax | Varies by state (9 states have no income tax) |
| State UI | Register and report per state requirements |
| Local Taxes | City/county taxes where applicable |

#### 8.3.3 Employment Law

| Requirement | Details |
|-------------|---------|
| I-9 Verification | Employment eligibility verification |
| FLSA Compliance | Minimum wage, overtime rules |
| FMLA Tracking | Leave eligibility and usage |
| ADA Compliance | Accommodation requests |
| EEO Reporting | For employers with 100+ employees |

---

## 9. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| Tenant | An organization/company using the platform |
| Pay Group | A grouping of employees with same pay schedule |
| Pay Period | Time span for which payroll is calculated |
| Gross Pay | Total earnings before deductions |
| Net Pay | Take-home pay after all deductions |
| YTD | Year-to-Date cumulative totals |
| CRA | Consolidated Relief Allowance (Nigeria tax) |
| RSA | Retirement Savings Account (Nigeria pension) |
| PFA | Pension Fund Administrator (Nigeria) |

### Appendix B: Sample Payslip Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                        [COMPANY LOGO]                            │
│                    [Company Name & Address]                      │
├─────────────────────────────────────────────────────────────────┤
│  PAYSLIP                           Pay Period: [Start] - [End]  │
│                                    Pay Date: [Date]             │
├─────────────────────────────────────────────────────────────────┤
│  Employee: [Name]                  Employee No: [Number]        │
│  Department: [Dept]                Position: [Title]            │
│  Tax ID: [Tax Number]              Bank: [Bank Name] *****1234  │
├─────────────────────────────────────────────────────────────────┤
│  EARNINGS                          DEDUCTIONS                    │
│  ─────────────────────────         ─────────────────────────    │
│  Basic Salary      [Amount]        PAYE Tax        [Amount]     │
│  Housing Allow.    [Amount]        Pension (8%)    [Amount]     │
│  Transport Allow.  [Amount]        NHF (2.5%)      [Amount]     │
│  Overtime          [Amount]        Loan Repayment  [Amount]     │
│  Bonus             [Amount]        Other           [Amount]     │
│  ─────────────────────────         ─────────────────────────    │
│  GROSS PAY:        [Amount]        TOTAL DEDUCT:   [Amount]     │
├─────────────────────────────────────────────────────────────────┤
│  NET PAY:                                          [AMOUNT]     │
├─────────────────────────────────────────────────────────────────┤
│  YTD Summary: Gross [Amount] | Tax [Amount] | Pension [Amount]  │
└─────────────────────────────────────────────────────────────────┘
```

### Appendix C: Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL INTEGRATIONS                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   │
│  │   Banking    │      │  Accounting  │      │  Background  │   │
│  │   Systems    │      │   Systems    │      │    Check     │   │
│  │ (NIBSS,ACH)  │      │(Xero,QB,SAP) │      │  Providers   │   │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘   │
│         │                     │                     │            │
│         │    File Export      │    API/Webhook      │    API     │
│         │                     │                     │            │
│         ▼                     ▼                     ▼            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              INTEGRATION SERVICE LAYER                   │    │
│  │     (API Gateway, Event Bus, File Transfer Service)      │    │
│  └─────────────────────────────────────────────────────────┘    │
│         ▲                     ▲                     ▲            │
│         │                     │                     │            │
│  ┌──────┴───────┐      ┌──────┴───────┐      ┌──────┴───────┐   │
│  │   Calendar   │      │   Job Boards │      │     SSO      │   │
│  │  (Google/MS) │      │(LinkedIn,etc)│      │  Providers   │   │
│  └──────────────┘      └──────────────┘      └──────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Appendix D: User Role Permission Matrix

| Permission | Super Admin | Tenant Admin | HR Manager | Payroll Admin | Manager | Employee | Recruiter |
|------------|:-----------:|:------------:|:----------:|:-------------:|:-------:|:--------:|:---------:|
| View All Tenants | ✓ | | | | | | |
| Create Tenant | ✓ | | | | | | |
| View All Employees | ✓ | ✓ | ✓ | View | Team | Self | View |
| Create Employee | ✓ | ✓ | ✓ | | | | |
| Edit Employee | ✓ | ✓ | ✓ | | | Self | |
| Delete Employee | ✓ | ✓ | ✓ | | | | |
| Run Payroll | ✓ | ✓ | | ✓ | | | |
| Approve Payroll | ✓ | ✓ | | ✓ | | | |
| View Payslips | ✓ | ✓ | ✓ | ✓ | Team | Self | |
| Manage Leave Types | ✓ | ✓ | ✓ | | | | |
| Approve Leave | ✓ | ✓ | ✓ | | ✓ | | |
| View Candidates | ✓ | ✓ | ✓ | | | | ✓ |
| Manage Job Posts | ✓ | ✓ | ✓ | | | | ✓ |
| Conduct Reviews | ✓ | ✓ | ✓ | | ✓ | | |
| View Reports | ✓ | ✓ | ✓ | ✓ | Team | | |
| System Settings | ✓ | ✓ | | | | | |

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-26 | Rozitech | Initial draft |

---

**End of Document**
