# CoreHR HR Consultant Guide

**Version 1.0 | December 2025**

---

## Quick Reference

| Item | Details |
|------|---------|
| **Application URL** | `http://localhost:5020/login` |
| **Onboarding URL** | `http://localhost:5020/onboard/consultant?token=<your_token>` |
| **API Base URL** | `http://localhost:4020/api` |

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Company Management](#company-management)
4. [Employee Management](#employee-management)
5. [ESS Management](#ess-management)
6. [Team Management](#team-management)
7. [API Reference](#api-reference)
8. [Coming Soon](#coming-soon)
9. [FAQ & Troubleshooting](#faq--troubleshooting)

---

## Getting Started

### Receiving Your Invitation

1. You'll receive an email from CoreHR with subject "Welcome to CoreHR"
2. The email contains your unique registration link
3. The link is valid for 7 days

### Completing Registration

**Step 1: Access Registration**

Click the link in your email or navigate to:
```
http://localhost:5020/onboard/consultant?token=<your_token>
```

**Step 2: Create Your Account**

| Field | Description | Required |
|-------|-------------|----------|
| First Name | Your first name | Yes |
| Last Name | Your last name | Yes |
| Password | Min 8 characters | Yes |
| Confirm Password | Must match | Yes |

**Step 3: Add Contact Information**

| Field | Description | Required |
|-------|-------------|----------|
| Phone | Business phone | No |
| Address | Office address | No |
| City | City | No |
| State | State/Region | No |
| Website | Company website | No |

**Step 4: Business Details**

| Field | Description | Required |
|-------|-------------|----------|
| TIN | Tax Identification Number | No |
| RC Number | CAC Registration Number | No |

Click **Complete Registration** to finish.

### First Login

After registration, you're automatically logged in. For future logins:

1. Navigate to `http://localhost:5020/login`
2. Enter your registered email
3. Enter your password
4. Click **Sign In**

---

## Dashboard Overview

### Accessing Dashboard

After login, you're directed to `/dashboard`

### Dashboard Widgets

| Widget | Description |
|--------|-------------|
| Total Companies | Client companies you manage |
| Active Companies | Companies in active status |
| Total Employees | All employees across companies |
| ESS Activated | Employees with self-service access |

### Quick Actions

- **Add Company**: Create a new client company
- **Add Employee**: Add employee to a company
- **View Activity**: See recent actions

### Activity Feed

The activity feed shows:
- New companies created
- Employees added
- ESS invitations sent
- Status changes

---

## Company Management

### Viewing All Companies

**URL:** `/dashboard/companies` (Coming Soon - use API)

Current access via API:
```
GET /api/companies
Authorization: Bearer <your_token>
```

### Creating a New Company

**Step 1: Basic Information**

| Field | Description | Required |
|-------|-------------|----------|
| Legal Name | Registered company name | Yes |
| Trading Name | Business/trading name | No |
| Company Type | LLC, PLC, Partnership, Sole Proprietor, NGO | No |
| Industry | Business sector | No |
| Employee Count Range | Size category | No |

**Step 2: Contact Information**

| Field | Description | Required |
|-------|-------------|----------|
| Email | Company email | No |
| Phone | Main phone line | No |
| Website | Company website | No |
| Address Line 1 | Street address | No |
| Address Line 2 | Suite/Floor | No |
| City | City | No |
| State | State | No |
| Postal Code | ZIP/Postal code | No |

**Step 3: Statutory Registration (Nigerian Compliance)**

| Field | Description | Format |
|-------|-------------|--------|
| TIN | Tax Identification Number | XX-XXXXXXXX |
| RC Number | CAC Registration | RC XXXXXX |
| Pension Code | PenCom Code | PFC/XXX/XXX |
| NHF Code | National Housing Fund | NHF-XXXXX |
| NHIS Code | National Health Insurance | NHIS-XXXXX |
| ITF Code | Industrial Training Fund | ITF-XXXXX |
| NSITF Code | Social Insurance | NSITF-XXXXX |

**Step 4: Payroll Settings**

| Field | Options | Default |
|-------|---------|---------|
| Default Currency | NGN, USD, ZAR | NGN |
| Pay Frequency | Weekly, Bi-weekly, Monthly | Monthly |
| Payroll Cutoff Day | 1-31 | 25 |
| Pay Day | 1-31 | 28 |

### Company Status Workflow

```
Onboarding -> Active -> Suspended -> Offboarded
                ^           |
                |___________|
```

| Status | Description |
|--------|-------------|
| Onboarding | Initial setup, not fully active |
| Active | Fully operational |
| Suspended | Temporarily disabled |
| Offboarded | Archived/deleted |

### Updating Company Details

**API:**
```
PUT /api/companies/:id
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "legalName": "Updated Company Name",
  "status": "active"
}
```

### Deleting (Offboarding) a Company

**API:**
```
DELETE /api/companies/:id
Authorization: Bearer <your_token>
```

Note: This performs a soft delete. Data is retained for compliance.

---

## Employee Management

### Viewing Employees

**API:**
```
GET /api/employees?company_id=<uuid>&page=1&limit=20
Authorization: Bearer <your_token>
```

### Adding an Employee

**Personal Information**

| Field | Description | Required |
|-------|-------------|----------|
| First Name | Legal first name | Yes |
| Last Name | Legal surname | Yes |
| Middle Name | Middle name(s) | No |
| Email | Work email | No |
| Phone | Contact phone | No |
| Date of Birth | DOB | No |
| Gender | Male/Female/Other | No |
| Marital Status | Single/Married/Divorced/Widowed | No |
| Nationality | Country of citizenship | No |
| State of Origin | Nigerian state | No |
| LGA of Origin | Local Government Area | No |

**Address**

| Field | Description | Required |
|-------|-------------|----------|
| Address Line 1 | Street address | No |
| Address Line 2 | Apartment/Suite | No |
| City | City | No |
| State of Residence | Current state | No |
| Country | Country | No |

**Employment Details**

| Field | Options | Required |
|-------|---------|----------|
| Employee Number | Auto-generated (EMP-YYYY-0001) | Auto |
| Employment Type | Full-time, Part-time, Contract, Intern | No |
| Job Title | Position title | No |
| Department | Department name | No |
| Reports To | Manager (employee ID) | No |
| Hire Date | Start date | No |
| Confirmation Date | When confirmed | No |

**Compensation**

| Field | Description | Required |
|-------|-------------|----------|
| Salary | Monthly/Annual amount | No |
| Currency | NGN, USD, ZAR | No |
| Pay Frequency | Weekly, Bi-weekly, Monthly | No |

**Bank Details**

| Field | Description | Required |
|-------|-------------|----------|
| Bank Name | Nigerian bank name | No |
| Account Number | 10-digit NUBAN | No |
| Account Name | Name on account | No |
| Bank Code | CBN bank code | No |

**Nigerian IDs**

| Field | Description | Format |
|-------|-------------|--------|
| NIN | National Identification Number | 11 digits |
| BVN | Bank Verification Number | 11 digits |
| Tax ID | State tax ID | Varies by state |

**Pension Details**

| Field | Description | Required |
|-------|-------------|----------|
| Pension PIN | PenCom PIN | No |
| PFA | Pension Fund Administrator | No |
| PFA Code | PFA code | No |

**API to Create Employee:**
```
POST /api/employees
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "companyId": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@company.com",
  "jobTitle": "Software Engineer",
  "department": "Engineering",
  "employmentType": "full_time",
  "salary": 500000,
  "salaryCurrency": "NGN",
  "hireDate": "2025-01-15",
  "essEnabled": true
}
```

### Bulk Import Employees

**Step 1: Download Template**

```
GET /api/employees/import/template?company_id=<uuid>
```

Returns a CSV file with headers.

**Step 2: Fill Template**

Required columns:
- first_name
- last_name

Optional columns:
- middle_name, email, phone, date_of_birth, gender
- job_title, department, employment_type
- salary, salary_currency
- bank_name, bank_account_number, bank_account_name
- nin, bvn, tax_id, pension_pin, pfa

**Step 3: Upload CSV**

```
POST /api/employees/import
Authorization: Bearer <your_token>
Content-Type: multipart/form-data

company_id: <uuid>
file: <csv_file>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "imported": 45,
    "skipped": 2,
    "errors": [
      {"row": 12, "error": "Invalid email format"}
    ]
  }
}
```

### Employment Status

| Status | Description |
|--------|-------------|
| active | Currently employed |
| on_leave | On authorized leave |
| suspended | Temporarily suspended |
| terminated | Employment ended |

### Terminating an Employee

```
PUT /api/employees/:id
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "employmentStatus": "terminated",
  "terminationDate": "2025-12-31",
  "terminationReason": "Resignation"
}
```

---

## ESS Management

### Enabling ESS for an Employee

When creating or updating an employee:
```json
{
  "essEnabled": true
}
```

### Sending ESS Invitation

```
POST /api/employees/:id/ess/invite
Authorization: Bearer <your_token>
```

The employee receives an email with activation link.

### Resending Invitation

```
POST /api/employees/:id/ess/resend
Authorization: Bearer <your_token>
```

### Tracking ESS Status

| Field | Description |
|-------|-------------|
| ess_enabled | Whether ESS is enabled |
| ess_invitation_sent_at | When invite was sent |
| ess_activated_at | When employee activated |

---

## Team Management

### Inviting Company Admins

You can invite HR managers at client companies to help manage employees:

```
POST /api/companies/:id/admins/invite
Authorization: Bearer <your_token>
Content-Type: application/json

{
  "email": "hr@clientcompany.com",
  "firstName": "Jane",
  "lastName": "HR",
  "role": "hr_manager"
}
```

### Admin Roles

| Role | Permissions |
|------|-------------|
| admin | Full company access |
| hr_manager | Employee management |
| payroll_admin | Payroll access (future) |

### Listing Company Admins

```
GET /api/companies/:id/admins
Authorization: Bearer <your_token>
```

---

## API Reference

### Authentication

All API requests require Bearer token:
```
Authorization: Bearer <your_token>
```

### Base URL

```
http://localhost:4020/api
```

### Companies Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /companies | List your companies |
| POST | /companies | Create company |
| GET | /companies/:id | Get company details |
| PUT | /companies/:id | Update company |
| DELETE | /companies/:id | Offboard company |
| GET | /companies/:id/admins | List company admins |
| POST | /companies/:id/admins/invite | Invite admin |

### Employees Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /employees | List employees |
| POST | /employees | Create employee |
| GET | /employees/:id | Get employee |
| PUT | /employees/:id | Update employee |
| DELETE | /employees/:id | Delete employee |
| POST | /employees/:id/ess/invite | Send ESS invite |
| POST | /employees/:id/ess/resend | Resend invite |
| GET | /employees/import/template | Download CSV template |
| POST | /employees/import | Bulk import |

---

## Coming Soon

### Phase 2 - Payroll Processing
- Salary computation
- PAYE tax calculation
- Pension deductions
- Bank file generation
- Payslip creation

### Phase 3 - Statutory Compliance
- PAYE remittance reports
- Pension contribution schedules
- Annual returns (Form H1)
- NHIS/NHF tracking

### Phase 4 - Leave Management
- Leave request workflow
- Leave balances
- Public holidays

### Phase 5 - Document Management
- Employment contracts
- Policy documents
- Certificate generation

---

## FAQ & Troubleshooting

### How many companies can I create?

Depends on your subscription tier:
- Starter: 5 companies
- Professional: 20 companies
- Enterprise: Unlimited

### How many employees per company?

Depends on your subscription tier:
- Starter: 50 employees
- Professional: 200 employees
- Enterprise: Unlimited

### Employee didn't receive ESS invitation

1. Check email address is correct
2. Check spam/junk folder
3. Resend invitation
4. Verify email server is working

### Cannot delete an employee

Employees with ESS accounts cannot be deleted, only terminated. This maintains audit trail and data integrity.

### Session expired

Login sessions expire after 24 hours. Simply login again.

### Forgot password

1. Go to login page
2. Click "Forgot password?"
3. Enter your email
4. Check email for reset link
5. Create new password

---

## Support

### Email Support
support@corehr.ng

### Phone Support
+234 xxx xxx xxxx

### Documentation
Full documentation available at `/docs/manual.html`

---

**Document Version:** 1.0

**Last Updated:** December 2025

**Maintained by:** Rozitech Platform Team
