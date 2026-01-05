# CoreHR Workflow Documentation

## Overview

This document outlines the key workflows in CoreHR for HR consultants in Nigeria, identifying current capabilities, gaps, and opportunities for improvement.

---

## Table of Contents

1. [Workflow 1: Superadmin Invites Consultancy Owner](#workflow-1-superadmin-invites-consultancy-owner)
2. [Workflow 2: Consultant Onboards a New Company](#workflow-2-consultant-onboards-a-new-company)
3. [Workflow 3: Onboard Employees to New Company](#workflow-3-onboard-employees-to-new-company)
4. [Workflow 4: Add Employees to Existing Company](#workflow-4-add-employees-to-existing-company)
5. [Current Gaps Analysis](#current-gaps-analysis)
6. [Recommended Improvements](#recommended-improvements)
7. [Nigeria-Specific Features](#nigeria-specific-features)

---

## Workflow 1: Superadmin Invites Consultancy Owner

### Current Flow

```
┌─────────────────┐
│   SUPERADMIN    │
│   DASHBOARD     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  1. Navigate to Consultants page    │
│  2. Click "Invite Consultant"       │
│  3. Enter:                          │
│     - Email address                 │
│     - Company name                  │
│     - Tier (Starter/Pro/Enterprise) │
│     - Consultant type (HR/Tax/Legal)│
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  System generates:                  │
│  - Secure 64-char hex token         │
│  - 7-day expiry                     │
│  - Invitation record                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Email sent to consultant with:     │
│  Link: /onboard/consultant?token=X  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  CONSULTANT REGISTRATION            │
│  3-Step Wizard:                     │
│                                     │
│  Step 1: Account Details            │
│  - First name, Last name            │
│  - Email (pre-filled), Password     │
│                                     │
│  Step 2: Profile Information        │
│  - Phone, Address, City, State      │
│  - Website URL                      │
│                                     │
│  Step 3: Business Details           │
│  - TIN (Tax ID Number)              │
│  - RC Number (CAC Registration)     │
│  - Tier confirmation                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  System creates:                    │
│  - Tenant (isolated workspace)      │
│  - Consultant organization          │
│  - Admin user account               │
│  - 30-day trial subscription        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Redirect to Dashboard              │
│  (Logged in as consultant admin)    │
└─────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/superadmin/consultants/invite` | Send invitation |
| GET | `/api/superadmin/invitations` | List all invitations |
| POST | `/api/superadmin/invitations/:id/resend` | Resend invitation |
| DELETE | `/api/superadmin/invitations/:id` | Cancel invitation |
| GET | `/api/onboard/consultant/verify/:token` | Verify token |
| POST | `/api/onboard/consultant/complete` | Complete registration |

### Database Tables

- `consultant_invitations` - Pending invitations
- `tenants` - Workspace isolation
- `consultants` - Consultant organizations
- `users` - User accounts
- `consultant_users` - User-consultant relationships

---

## Workflow 2: Consultant Onboards a New Company

### Current Flow

```
┌─────────────────┐
│   CONSULTANT    │
│   DASHBOARD     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  CRM: Create/Select Client          │
│  Navigate to Clients page           │
│  Add or select existing client      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Client Details Required:           │
│  - Company name                     │
│  - Trading name                     │
│  - Industry                         │
│  - Contact email/phone              │
│  - Address                          │
│  - TIN, RC Number (optional)        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Initiate Onboarding                │
│  Click "Onboard" on client          │
│  Enter company admin details:       │
│  - Admin email                      │
│  - Admin first name                 │
│  - Admin last name                  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  System creates:                    │
│  - Company record (HR module)       │
│  - Links to CRM client              │
│  - Company invitation token         │
│  - Updates client status: 'invited' │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Email sent to company admin        │
│  Link: /onboard/company?token=X     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  COMPANY ADMIN REGISTRATION         │
│  Single-page form:                  │
│  - First name, Last name            │
│  - Phone number                     │
│  - Password                         │
│  (Email pre-filled from invitation) │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  System creates:                    │
│  - Company admin user account       │
│  - Links user to company            │
│  - Updates client status: 'active'  │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Company admin redirected to        │
│  their Dashboard                    │
└─────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/clients` | Create CRM client |
| POST | `/api/clients/:id/onboard` | Initiate company onboarding |
| POST | `/api/clients/:id/resend-invite` | Resend admin invitation |
| GET | `/api/onboard/company/verify/:token` | Verify token |
| POST | `/api/onboard/company/complete` | Complete admin registration |

### Database Tables

- `clients` - CRM client records
- `companies` - HR company records (linked to clients)
- `company_invitations` - Pending admin invitations
- `users` - Company admin accounts
- `company_admins` - User-company relationships

---

## Workflow 3: Onboard Employees to New Company

### Current Flow

```
┌─────────────────┐
│  COMPANY ADMIN  │
│  or CONSULTANT  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Navigate to Employees/Staff        │
│  Select the company                 │
└────────┬────────────────────────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────────┐     ┌─────────────────────┐
│  SINGLE EMPLOYEE    │     │  BULK IMPORT        │
│                     │     │                     │
│  Add Employee Form: │     │  CSV Upload:        │
│  - Name, Email      │     │  - Up to 500 rows   │
│  - Phone, DOB       │     │  - Template format  │
│  - Job title        │     │  - Auto-validation  │
│  - Department       │     │  - Optional ESS     │
│  - Employment type  │     │    invite flag      │
│  - Start date       │     │                     │
│  - Salary info      │     │                     │
│  - Bank details     │     │                     │
│  - Tax info (NIN,   │     │                     │
│    BVN, Tax ID)     │     │                     │
└─────────┬───────────┘     └──────────┬──────────┘
          │                            │
          └──────────┬─────────────────┘
                     │
                     ▼
┌─────────────────────────────────────┐
│  System creates:                    │
│  - Employee record                  │
│  - Auto-generates Employee Number   │
│    Format: EMP-YYYY-####            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Enable ESS (Employee Self-Service) │
│  Click "Invite to ESS" button       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  System generates:                  │
│  - ESS invitation token             │
│  - Sets ess_enabled = true          │
│  - Records invitation sent time     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Email sent to employee             │
│  Link: /onboard/ess/activate?token=X│
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  EMPLOYEE ESS ACTIVATION            │
│  Simple form:                       │
│  - Shows: Name, Job title, Company  │
│  - Enter: Password only             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  System creates:                    │
│  - Employee user account            │
│  - Links to employee record         │
│  - Sets ess_activated_at            │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Employee redirected to             │
│  ESS Dashboard (limited features)   │
└─────────────────────────────────────┘
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/employees` | Create single employee |
| POST | `/api/employees/import` | Bulk import employees |
| POST | `/api/employees/:id/ess/invite` | Send ESS invitation |
| POST | `/api/employees/:id/ess/resend` | Resend ESS invitation |
| GET | `/api/onboard/ess/verify/:token` | Verify ESS token |
| POST | `/api/onboard/ess/complete` | Activate ESS account |

### Database Tables

- `employees` - Employee records with ESS flags
- `employee_invitations` - ESS invitation tracking
- `users` - Employee user accounts

---

## Workflow 4: Add Employees to Existing Company

### Current Flow

Same as Workflow 3, but company already exists:

```
┌─────────────────┐
│  COMPANY ADMIN  │
│  or CONSULTANT  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Navigate to existing company       │
│  Go to Employees section            │
└────────┬────────────────────────────┘
         │
         ├──────────────────────────────────┐
         │                                  │
         ▼                                  ▼
┌─────────────────────┐     ┌─────────────────────┐
│  Add Single         │     │  Bulk Import        │
│  Employee           │     │  (CSV)              │
└─────────┬───────────┘     └──────────┬──────────┘
          │                            │
          └──────────┬─────────────────┘
                     │
                     ▼
         [Same flow as Workflow 3]
```

### Additional Features for Existing Companies

- View employee directory
- Filter by department, status
- Edit existing employees
- Terminate/offboard employees
- Bulk ESS invitations
- Export employee data

---

## Current Gaps Analysis

### Critical Gaps

| Gap | Impact | Priority |
|-----|--------|----------|
| No onboarding UI button on Clients page | Consultant must use API directly | HIGH |
| Email delivery not guaranteed | Invitations may not reach recipients | HIGH |
| No bulk employee ESS invitation | Time-consuming for large companies | HIGH |
| No onboarding progress tracking | Consultant can't see bottlenecks | MEDIUM |
| No employee import template download | Error-prone manual CSV creation | MEDIUM |

### Feature Gaps

| Feature | Current State | Needed |
|---------|---------------|--------|
| Client onboarding wizard | API only | UI wizard |
| Bulk ESS invitations | One-by-one | Select multiple |
| Import templates | None | Downloadable CSV templates |
| Onboarding dashboard | None | Progress overview |
| Document collection | None | Required docs checklist |
| Compliance checklist | None | Nigeria labor law requirements |

### UX Gaps

| Issue | Description |
|-------|-------------|
| No guided onboarding | Users must figure out process themselves |
| Missing tooltips | No help text for Nigeria-specific fields |
| No progress indicators | Can't see completion percentage |
| Limited feedback | Success/error messages not detailed |

---

## Recommended Improvements

### Phase 1: Core Workflow Improvements (Quick Wins)

#### 1.1 Add Onboarding Button to Clients Page
```
Current: API call required
Proposed: "Onboard Company" button on client card/row
```

**Implementation:**
- Add button to Clients.jsx
- Open modal with company admin details form
- Call existing `/api/clients/:id/onboard` endpoint

#### 1.2 Bulk ESS Invitation
```
Current: One employee at a time
Proposed: Select multiple → "Invite to ESS" bulk action
```

**Implementation:**
- Add to BulkActions component
- New endpoint: `POST /api/employees/bulk-ess-invite`
- Track invitation status in UI

#### 1.3 CSV Import Template Download
```
Current: No template available
Proposed: "Download Template" button on import modal
```

**Implementation:**
- Generate CSV with headers and sample data
- Include Nigeria-specific fields
- Add validation rules in comments

### Phase 2: Onboarding Experience Improvements

#### 2.1 Onboarding Dashboard
```
┌─────────────────────────────────────────────────────────┐
│  COMPANY ONBOARDING PROGRESS                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Acme Corp Ltd                                          │
│  ═══════════════════════════════════════ 75%           │
│                                                         │
│  ✓ Company Created          ✓ Admin Activated          │
│  ✓ Basic Info Complete      ○ Employees Added (0/10)   │
│  ○ Bank Details             ○ Payroll Setup            │
│  ○ Tax Registration         ○ First Payrun             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

#### 2.2 Guided Onboarding Wizard
```
Step 1: Company Details
  → Legal name, Trading name, RC Number, TIN

Step 2: Contact & Location
  → Address, Phone, Email, Industry

Step 3: Invite Company Admin
  → Admin email, name, role

Step 4: Setup Checklist
  → Required documents, compliance items

Step 5: Employee Import
  → Single add or bulk import
```

#### 2.3 Document Collection System
```
Required Documents Checklist:
□ CAC Certificate (RC Number)
□ TIN Certificate
□ Pension Registration (PFA details)
□ NSITF Registration
□ ITF Registration
□ NHF Registration
□ Company Bank Account Details
```

### Phase 3: Nigeria-Specific Productivity Features

#### 3.1 Statutory Deductions Calculator
Auto-calculate:
- PAYE (Pay As You Earn) based on current tax tables
- Pension (8% employee + 10% employer)
- NHF (2.5% for eligible employees)
- NSITF (1% employer contribution)

#### 3.2 Pre-built Pay Items
```
Standard Nigeria Pay Items:
├── Basic Salary
├── Housing Allowance (max 50% of basic for PAYE)
├── Transport Allowance
├── Utility Allowance
├── Leave Allowance
├── 13th Month Salary
├── Overtime (1.5x / 2x rates)
└── Bonuses
```

#### 3.3 Statutory Report Generation
- PAYE monthly returns
- Pension schedule
- Annual tax returns (Form H1)
- NSITF contributions report

#### 3.4 Bank Payment Integration
Generate payment files for major Nigerian banks:
- GTBank format
- First Bank format
- Access Bank format
- Zenith Bank format
- UBA format

---

## Nigeria-Specific Features

### Current Supported Features

| Feature | Status | Notes |
|---------|--------|-------|
| TIN (Tax Identification Number) | ✓ | On company & employee |
| RC Number (CAC Registration) | ✓ | On company |
| NIN (National ID) | ✓ | On employee |
| BVN (Bank Verification) | ✓ | On employee |
| Nigeria bank account format | ✓ | 10-digit NUBAN |
| NGN currency | ✓ | Default currency |
| VAT (7.5%) | ✓ | On invoices |
| WHT (5%/10%) | ✓ | On invoices |

### Needed Nigeria Features

| Feature | Priority | Description |
|---------|----------|-------------|
| PAYE Calculator | HIGH | Auto-calculate based on FG tax tables |
| Pension Integration | HIGH | PFA submission format |
| HMO Management | MEDIUM | Health insurance tracking |
| NHF Calculation | MEDIUM | 2.5% deduction for eligible |
| State Tax Variations | LOW | Lagos vs other states |
| Union Dues | LOW | NLC/TUC deductions |

### Compliance Checklist for Nigerian Companies

```
STATUTORY REGISTRATIONS
├── □ Corporate Affairs Commission (CAC)
├── □ Federal Inland Revenue Service (FIRS) - TIN
├── □ State Internal Revenue Service - PAYE
├── □ Pension Commission (PenCom)
├── □ National Social Insurance Trust Fund (NSITF)
├── □ Industrial Training Fund (ITF)
├── □ National Housing Fund (NHF)
└── □ Nigeria Social Insurance Trust Fund (NSITF)

MONTHLY SUBMISSIONS
├── □ PAYE remittance (by 10th)
├── □ Pension contributions (by 7th working day)
├── □ NSITF contributions (monthly)
├── □ NHF contributions (monthly)
└── □ ITF contributions (for companies >5 employees or >N50m turnover)

ANNUAL FILINGS
├── □ Annual tax returns (March 31)
├── □ Form H1 (Employee declaration)
├── □ Pension annual returns
└── □ Company annual returns (CAC)
```

---

## Implementation Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Onboarding button on Clients | High | Low | P1 |
| Bulk ESS invitation | High | Low | P1 |
| CSV template download | Medium | Low | P1 |
| Onboarding progress dashboard | High | Medium | P2 |
| Document collection system | High | Medium | P2 |
| PAYE calculator | High | Medium | P2 |
| Pension integration | High | High | P3 |
| Bank payment file generation | Medium | Medium | P3 |
| Guided onboarding wizard | Medium | High | P3 |

---

## Next Steps

1. **Review this document** with stakeholders
2. **Prioritize improvements** based on consultant feedback
3. **Implement Phase 1** quick wins (1-2 weeks)
4. **User testing** with Nigerian HR consultants
5. **Iterate** based on feedback

---

## Appendix: Sample CSV Import Template

```csv
employee_number,first_name,last_name,email,phone,date_of_birth,gender,national_id,bvn,job_title,department,employment_type,start_date,basic_salary,currency,bank_name,bank_account_number,pension_pin,tax_id
,John,Doe,john.doe@company.com,08012345678,1990-05-15,male,12345678901,22123456789,Software Engineer,Engineering,full_time,2024-01-15,500000,NGN,GTBank,0123456789,PEN123456,TIN987654
,Jane,Smith,jane.smith@company.com,08098765432,1988-11-20,female,98765432109,22987654321,HR Manager,Human Resources,full_time,2024-02-01,650000,NGN,First Bank,9876543210,PEN654321,TIN123456
```

**Field Notes:**
- `employee_number`: Leave blank for auto-generation (EMP-YYYY-####)
- `phone`: Nigerian format (080/081/090/091/070/071)
- `national_id`: NIN (11 digits)
- `bvn`: Bank Verification Number (11 digits)
- `bank_account_number`: NUBAN format (10 digits)
- `basic_salary`: Monthly amount in NGN
- `pension_pin`: PenCom Registration Number

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: CoreHR Development Team*
