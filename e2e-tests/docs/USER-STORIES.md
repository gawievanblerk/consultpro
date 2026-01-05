# CoreHR E2E Test User Stories

This document describes the end-to-end test scenarios for the CoreHR platform. These tests verify the deployed system at https://corehr.africa and also serve as demo documentation for potential clients.

> **For UAT Testers:** See [UAT-GUIDE.md](./UAT-GUIDE.md) for step-by-step manual testing instructions.

**Last Updated:** 2025-12-31
**Test Environment:** https://corehr.africa

---

## User Story 1: Superadmin Authentication

**As a** platform superadmin
**I want to** log in and out of the CoreHR platform
**So that** I can manage HR consultancies on the platform

### Acceptance Criteria

| # | Criteria | Status |
|---|----------|--------|
| 1.1 | Superadmin can navigate to the login page | ✅ PASS |
| 1.2 | Invalid credentials are rejected | ✅ PASS |
| 1.3 | Valid credentials grant access to dashboard | ✅ PASS |
| 1.4 | Dashboard displays platform metrics | ✅ PASS |
| 1.5 | Superadmin can logout successfully | ✅ PASS |

### Test Details

#### 1.1 Navigate to superadmin login page
- **URL:** https://corehr.africa/superadmin/login
- **Expected Elements:**
  - "Super Admin Access" heading
  - Email input field
  - Password input field
  - Sign In button

#### 1.2 Login with invalid credentials shows error
- **Input:** Invalid email and password
- **Expected:** Stay on superadmin login page, display error message
- **Error Message:** "Invalid credentials" or similar

#### 1.3 Login with valid credentials succeeds
- **Credentials:** admin@rozitech.com / Admin123!
- **Expected:** Redirect to /superadmin/dashboard
- **Verification:** "Platform Dashboard" heading visible

#### 1.4 Logged in superadmin can see dashboard stats
- **Expected Metrics Displayed:**
  - Total Consultants
  - Active Consultants
  - Total Companies
  - Total Employees

#### 1.5 Superadmin can logout successfully
- **Action:** Click logout button in sidebar
- **Expected:** Redirect to login page
- **Verification:** URL contains /login

### Screenshots

Dashboard after successful login:
![Platform Dashboard](../test-results/screenshots/superadmin-dashboard.png)

---

## User Story 2: Consultant Invitation Flow

**As a** platform superadmin
**I want to** invite HR consultants to the platform
**So that** they can create their accounts and manage their clients

### Acceptance Criteria

| # | Criteria | Status |
|---|----------|--------|
| 2.1 | Superadmin can send invitation to consultant | ✅ PASS |
| 2.2 | Invitation token can be retrieved | ✅ PASS |
| 2.3 | Consultant can complete onboarding registration | ✅ PASS |
| 2.4 | Consultant can log in after registration | ✅ PASS |
| 2.5 | Consultant can log out | ✅ PASS |

### Test Details

#### 2.1 Superadmin sends invitation to consultant
- **Login:** admin@rozitech.com / Admin123!
- **Navigate:** /superadmin → Consultants page
- **Action:** Click "Invite Consultant" button
- **Form Fields:**
  - Company Name: Test HR Consulting [timestamp]
  - Email: test.consultant.[timestamp]@example.com
  - Tier: Professional (default)
- **Expected:** "Invitation sent" success message

#### 2.2 Get invitation token
- **Login:** admin@rozitech.com / Admin123!
- **Navigate:** /superadmin → Invitations page
- **Verification:** Test email visible in pending invitations
- **Action:** Retrieve invitation token via API

#### 2.3 Consultant completes onboarding
- **URL:** /onboard/consultant?token=[invitation_token]
- **Step 1 - Account:**
  - First Name: Test
  - Last Name: Consultant
  - Password: TestPass123!
  - Confirm Password: TestPass123!
- **Step 2 - Profile:** Skip (optional fields)
- **Step 3 - Business:** Skip (optional fields), click "Complete Registration"
- **Expected:**
  - "Welcome to CoreHR!" success message
  - Redirect to /dashboard

#### 2.4 Consultant can log in after registration
- **URL:** /login
- **Credentials:** test.consultant.[timestamp]@example.com / TestPass123!
- **Expected:** Redirect to /dashboard
- **Verification:** CRM navigation visible in sidebar

#### 2.5 Consultant can log out
- **Action:** Click logout button in sidebar
- **Expected:** Redirect to /login

### Screenshots

Consultant onboarding flow:
![Consultant Onboarding](../test-results/screenshots/consultant-onboard.png)

---

## User Story 3: Staff and Client Management

**As an** HR consultant
**I want to** manage my staff pool and client portfolio
**So that** I can assign staff to clients and track deployments

### Acceptance Criteria

| # | Criteria | Status |
|---|----------|--------|
| 3.1 | Consultant can log in | ✅ PASS |
| 3.2 | Consultant can create 3 staff members | ✅ PASS |
| 3.3 | Consultant can create 3 clients | ✅ PASS |
| 3.4 | Consultant can view deployments page | ✅ PASS |
| 3.5 | Consultant can invite staff members | ✅ PASS |
| 3.6 | Consultant can view and manage staff | ✅ PASS |
| 3.7 | Consultant can log out | ✅ PASS |

### Test Details

#### 3.1 Consultant logs in
- **URL:** /login
- **Action:** Creates new consultant via superadmin invitation flow
- **Verification:** Redirected to dashboard

#### 3.2 Consultant creates 3 staff members
- **Navigate:** HR Outsourcing → Staff Pool
- **Action:** Click "Add Staff" and fill form for each:
  - Oluwaseun Adeyemi (HR Specialist)
  - Chidinma Okonkwo (Payroll Officer)
  - Emeka Nwosu (Recruitment Lead)
- **Verification:** All 3 staff appear in list

#### 3.3 Consultant creates 3 clients
- **Navigate:** CRM → Clients
- **Action:** Click "Add Client" and fill Company Name for each:
  - First Bank
  - Dangote Industries
  - MTN Nigeria
- **Verification:** All 3 clients appear in list

#### 3.4 Consultant views deployments page
- **Navigate:** HR Outsourcing → Deployments
- **Verification:** Page accessible, "New Deployment" button visible

#### 3.5 Consultant invites staff members
- **Navigate:** HR Outsourcing → Staff Pool
- **Action:** Click invite button (envelope icon) for each staff
- **Verification:** "Invitation sent" message for each

#### 3.6 Consultant can view and manage staff
- **Navigate:** HR Outsourcing → Staff Pool
- **Verification:** All created staff visible with invite status

#### 3.7 Consultant can log out
- **Action:** Click logout button in sidebar
- **Verification:** Redirected to /login

---

## User Story 4: Policy Management

**As an** HR consultant
**I want to** maintain a set of reusable policies
**So that** I can share them with my clients for compliance management

### Acceptance Criteria

| # | Criteria | Status |
|---|----------|--------|
| 4.1 | Consultant can log in | ✅ PASS |
| 4.2 | Consultant can navigate to Policies page | ✅ PASS |
| 4.3 | Consultant can upload 7 demo policies | ✅ PASS |
| 4.4 | Consultant can publish policies | ✅ PASS |
| 4.5 | Consultant can filter and search policies | ✅ PASS |
| 4.6 | Consultant can view policy details | ✅ PASS |
| 4.7 | Consultant can log out | ✅ PASS |

### Test Details

#### 4.1 Consultant logs in
- **URL:** /login
- **Action:** Creates new consultant via superadmin invitation flow
- **Verification:** Redirected to dashboard

#### 4.2 Consultant navigates to Policies page
- **Navigate:** Compliance → Policies
- **Verification:** Policies page loads with "Add Policy" button visible
- **Note:** Policy categories are created automatically if none exist

#### 4.3 Consultant uploads 7 demo policies
- **Navigate:** Compliance → Policies
- **Action:** For each policy, click "Add Policy" and upload PDF from demo-policies folder
- **Policies Uploaded:**
  - Code of Conduct Policy
  - NDPR Data Protection Policy
  - Anti-Sexual Harassment Policy
  - Leave Policy
  - IT Security Policy
  - Health & Safety Policy
  - Pension & Statutory Deductions Policy
- **Verification:** All 7 policies appear in the list with "Draft" status

#### 4.4 Consultant publishes policies
- **Navigate:** Compliance → Policies
- **Action:** Click publish button for first 3 policies, confirm in dialog
- **Verification:** Published policies show "Published" badge

#### 4.5 Consultant can filter and search policies
- **Navigate:** Compliance → Policies
- **Action:** Use search box and status filter dropdown
- **Test Cases:**
  - Search "Leave" → Only Leave Policy visible
  - Filter "Published" → Only published policies visible
  - Filter "Draft" → Only draft policies visible
- **Verification:** Filters work correctly

#### 4.6 Consultant can view policy details
- **Navigate:** Compliance → Policies
- **Action:** Click edit button on a policy
- **Verification:** Modal opens with policy details populated

#### 4.7 Consultant can log out
- **Action:** Click logout button in sidebar
- **Verification:** Redirected to /login

### Screenshots

Policy list with uploaded documents:
![Policy List](../test-results/screenshots/policy-list.png)

---

## User Story 5: Policy Compliance Management

**As an** HR consultant
**I want to** assign policies to client companies with compliance rules
**So that** employees can acknowledge policies and I can track compliance status

### Acceptance Criteria

| # | Criteria | Status |
|---|----------|--------|
| 5.1 | Consultant can log in | ✅ PASS |
| 5.2 | Consultant can create client companies | ✅ PASS |
| 5.3 | Consultant can create policies via API | ✅ PASS |
| 5.4 | Consultant can publish policies | ✅ PASS |
| 5.5 | Consultant can view Compliance Dashboard | ✅ PASS |
| 5.6 | Consultant can view Employee Compliance | ✅ PASS |
| 5.7 | Consultant can create staff | ✅ PASS |
| 5.8 | Consultant can log out | ✅ PASS |

### Test Details

#### 5.1 Consultant logs in
- **Action:** Creates new consultant via superadmin invitation flow
- **Verification:** Redirected to dashboard

#### 5.2 Consultant creates client companies
- **Navigate:** CRM → Clients
- **Action:** Create 2 client companies (Zenith Bank, Access Bank)
- **Verification:** Clients appear in list

#### 5.3 Consultant creates policies via API
- **Action:** Create policy categories and policies via API
- **Policies Created:**
  - Employee Code of Conduct (7 day due)
  - IT Security Guidelines (14 day due)
- **Verification:** Policies appear in Policies list

#### 5.4 Consultant publishes policies
- **Action:** Publish policies via API
- **Verification:** Policies status changes to "published"

#### 5.5 Consultant views Compliance Dashboard
- **Navigate:** /dashboard/compliance
- **Verification:** Dashboard loads with stat cards and quick links

#### 5.6 Consultant views Employee Compliance page
- **Navigate:** /dashboard/employee-compliance
- **Verification:** Page loads with search and stat cards

#### 5.7 Consultant creates staff
- **Navigate:** HR Outsourcing → Staff Pool
- **Action:** Create staff member (Compliance Officer)
- **Verification:** Staff appears in list

#### 5.8 Consultant can log out
- **Action:** Click logout button
- **Verification:** Redirected to login page

---

## User Story 6: Employee ESS Onboarding and Policy Acknowledgment

**As an** HR consultant
**I want to** create employees for client companies and invite them to ESS (Employee Self-Service)
**So that** employees can access their personal details, update missing information, view company policies, and provide acknowledgments

### Acceptance Criteria

| # | Criteria | Status |
|---|----------|--------|
| 6.1 | Consultant can log in and set up test data | ✅ PASS |
| 6.2 | Consultant can create a company for employee management | ✅ PASS |
| 6.3 | Consultant can create an employee for the company | ✅ PASS |
| 6.4 | Consultant can send ESS invitation to employee | ✅ PASS |
| 6.5 | Employee can activate ESS account | ✅ PASS |
| 6.6 | Employee can log in to ESS portal | ✅ PASS |
| 6.7 | Employee can view their profile | ✅ PASS |
| 6.8 | Employee can update their profile details | ✅ PASS |
| 6.9 | Consultant can create and publish a policy for the company | ✅ PASS |
| 6.10 | Employee can view pending policies | ✅ PASS |
| 6.11 | Employee can acknowledge the policy | ✅ PASS |
| 6.12 | Consultant can verify employee acknowledgment | ✅ PASS |
| 6.13 | Employee can log out | ✅ PASS |

### Test Details

#### 6.1 Consultant logs in and sets up test data
- **Action:** Creates new consultant via superadmin invitation flow
- **Verification:** Redirected to dashboard with auth token

#### 6.2 Consultant creates a company for employee management
- **Action:** Create company via API (`POST /api/companies`)
- **Company Details:**
  - Legal Name: TechCorp Nigeria [timestamp]
  - Type: LLC
  - Industry: Technology
- **Note:** Companies are separate from CRM Clients - employees belong to companies
- **Verification:** Company created with valid ID

#### 6.3 Consultant creates an employee for the company
- **Action:** Create employee via API (`POST /api/employees`)
- **Employee Details:**
  - Name: Adaeze Okonkwo
  - Email: employee.[timestamp]@techcorp.test
  - Job Title: Software Engineer
  - Department: Engineering
  - Employment Type: Full-time
- **Verification:** Employee created with valid ID

#### 6.4 Consultant sends ESS invitation to employee
- **Action:** Send invitation via API (`POST /api/employees/:id/ess/invite`)
- **Verification:** Invitation link generated with ESS token

#### 6.5 Employee activates ESS account
- **URL:** /onboard/ess?token=[ess_token]
- **Form:**
  - Password: Employee123!
  - Confirm Password: Employee123!
- **Expected:** "Account Activated!" success message
- **Verification:** Activation completes, redirected to login

#### 6.6 Employee logs in to ESS portal
- **URL:** /login
- **Credentials:** employee.[timestamp]@techcorp.test / Employee123!
- **Verification:** Redirected to dashboard

#### 6.7 Employee views their profile
- **Action:** Get profile via API (`GET /api/employees/ess/profile`)
- **Verification:** Profile contains correct employee data:
  - First Name: Adaeze
  - Last Name: Okonkwo
  - Job Title: Software Engineer

#### 6.8 Employee updates their profile details
- **Action:** Update profile via API (`PUT /api/employees/ess/profile`)
- **Fields Updated:**
  - Phone: +234 802 345 6789
  - Address: 15 Marina Street, Victoria Island, Lagos
- **Verification:** Phone number updated in profile

#### 6.9 Consultant creates and publishes a policy for the company
- **Action:** Create policy category and policy via API
- **Policy Details:**
  - Title: Employee Code of Conduct [timestamp]
  - Requires Acknowledgment: Yes
  - New Hire Due Days: 7
- **Verification:** Policy created and published

#### 6.10 Employee views pending policies
- **Action:** Get pending policies via API (`GET /api/policies/employee/pending`)
- **Verification:** Employee Code of Conduct appears in pending list with `requires_acknowledgment: true`

#### 6.11 Employee acknowledges the policy
- **Action:** Acknowledge policy via API (`POST /api/policies/:id/acknowledge`)
- **Verification:** Policy no longer appears in pending list

#### 6.12 Consultant verifies employee acknowledgment
- **Navigate:** /dashboard/employee-compliance
- **Verification:** Page accessible, consultant can view compliance status

#### 6.13 Employee can log out
- **Action:** Click "Sign out" button
- **Verification:** Redirected to login page

### Key API Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/companies | POST | Create company for employee management |
| /api/employees | POST | Create employee under company |
| /api/employees/:id/ess/invite | POST | Send ESS invitation to employee |
| /api/employees/ess/profile | GET | Get employee's own profile |
| /api/employees/ess/profile | PUT | Update employee's own profile |
| /api/policies | POST | Create policy with company assignment |
| /api/policies/:id/publish | PUT | Publish a policy |
| /api/policies/employee/pending | GET | Get employee's pending policies |
| /api/policies/:id/acknowledge | POST | Employee acknowledges policy |

---

## Running the Tests

```bash
# Navigate to e2e-tests directory
cd e2e-tests

# Install dependencies
npm install

# Run all tests
npm test

# Run tests with browser visible
npm run test:headed

# Run tests with UI
npm run test:ui

# Run specific test file
npm run test:superadmin

# View test report
npm run test:report
```

---

## Test Environment

- **Target URL:** https://corehr.africa
- **Browser:** Chromium
- **Framework:** Playwright
- **Last Run:** See reports/results.json

---

*Generated by CoreHR E2E Test Suite*
