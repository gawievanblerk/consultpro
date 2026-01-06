# CoreHR UAT Testing Guide

## Overview

This guide provides step-by-step instructions for User Acceptance Testing (UAT) of the CoreHR platform.

**Test Environment:** https://corehr.africa

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Superadmin | admin@rozitech.com | Admin123! |

---

## Test Scenarios

### Scenario 1: Superadmin Authentication

#### Test 1.1: Access Superadmin Login Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open browser | Browser opens |
| 2 | Navigate to https://corehr.africa/superadmin/login | Login page loads |
| 3 | Verify page elements | See: "Super Admin Access" heading, Email field, Password field, Sign In button |

**Pass Criteria:** All elements visible on the page

---

#### Test 1.2: Invalid Login Attempt

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to https://corehr.africa/superadmin/login | Login page loads |
| 2 | Enter email: `wrong@email.com` | Email entered |
| 3 | Enter password: `wrongpassword` | Password entered |
| 4 | Click "Sign in to Admin Portal" | Error message appears |
| 5 | Verify URL | Still on /superadmin/login |

**Pass Criteria:** Error message displayed, user NOT redirected to dashboard

---

#### Test 1.3: Valid Login

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to https://corehr.africa/superadmin/login | Login page loads |
| 2 | Enter email: `admin@rozitech.com` | Email entered |
| 3 | Enter password: `Admin123!` | Password entered |
| 4 | Click "Sign in to Admin Portal" | Redirected to dashboard |
| 5 | Verify URL | URL is /superadmin/dashboard |
| 6 | Verify heading | "Platform Dashboard" visible |

**Pass Criteria:** Successfully logged in and dashboard displayed

---

#### Test 1.4: Dashboard Metrics Display

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as superadmin (see Test 1.3) | Dashboard displayed |
| 2 | Verify metrics cards visible | See all cards below |

**Expected Metrics:**
- [ ] Total Consultants (shows 0)
- [ ] Active Consultants (shows 0)
- [ ] Total Companies (shows 0)
- [ ] Total Employees (shows 0)
- [ ] ESS Enabled (shows 0)
- [ ] Pending Invites (shows 0)

**Pass Criteria:** All metric cards visible with values

---

#### Test 1.5: Logout

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as superadmin (see Test 1.3) | Dashboard displayed |
| 2 | Locate user info at bottom-left of sidebar | Shows "Rozitech Admin" |
| 3 | Click the logout icon (door/arrow icon) | Redirected to login |
| 4 | Verify URL | URL contains /login |

**Pass Criteria:** Successfully logged out and redirected to login page

---

---

### Scenario 2: Consultant Invitation Flow

#### Test 2.1: Superadmin Sends Invitation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as superadmin (see Test 1.3) | Dashboard displayed |
| 2 | Click "Consultants" in sidebar | Consultants page loads |
| 3 | Click "Invite Consultant" button | Modal form appears |
| 4 | Enter Company Name: `Test HR Consulting` | Text entered |
| 5 | Enter Email: `testconsultant@example.com` | Text entered |
| 6 | Click "Send Invitation" | Success message appears |

**Pass Criteria:** "Invitation sent" message displayed

---

#### Test 2.2: Verify Invitation Created

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as superadmin (see Test 1.3) | Dashboard displayed |
| 2 | Click "Invitations" in sidebar | Invitations page loads |
| 3 | Verify invitation email visible | See `testconsultant@example.com` in list |

**Pass Criteria:** Invitation appears in pending invitations list

---

#### Test 2.3: Consultant Completes Onboarding

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Get invitation link from email or superadmin | Link received |
| 2 | Open invitation link | Onboarding page loads |
| 3 | Verify Step 1: "Create Your Account" | Form visible |
| 4 | Enter First Name: `Test` | Text entered |
| 5 | Enter Last Name: `Consultant` | Text entered |
| 6 | Enter Password: `TestPass123!` | Password entered |
| 7 | Enter Confirm Password: `TestPass123!` | Password entered |
| 8 | Click "Continue" | Step 2 loads |
| 9 | Verify Step 2: "Contact Information" | Form visible |
| 10 | Click "Continue" (skip optional fields) | Step 3 loads |
| 11 | Verify Step 3: "Business Details" | Form visible |
| 12 | Click "Complete Registration" | Success message |
| 13 | Verify redirect | Dashboard displayed |

**Pass Criteria:** "Welcome to CoreHR!" message displayed, redirected to dashboard

---

#### Test 2.4: Consultant Login After Registration

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to https://corehr.africa/login | Login page loads |
| 2 | Enter email: `testconsultant@example.com` | Email entered |
| 3 | Enter password: `TestPass123!` | Password entered |
| 4 | Click "Sign In" | Redirected to dashboard |
| 5 | Verify CRM section visible in sidebar | CRM navigation visible |

**Pass Criteria:** Successfully logged in and CRM navigation displayed

---

#### Test 2.5: Consultant Logout

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant (see Test 2.4) | Dashboard displayed |
| 2 | Click logout button in sidebar | Redirected to login |
| 3 | Verify URL | URL contains /login |

**Pass Criteria:** Successfully logged out and redirected to login page

---

### Scenario 3: Staff and Client Management

#### Test 3.1: Consultant Creates Staff Members

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Click "HR Outsourcing" in sidebar | Menu expands |
| 3 | Click "Staff Pool" | Staff Pool page loads |
| 4 | Click "Add Staff" button | Modal form appears |
| 5 | Fill in Employee ID, First Name, Last Name, Email, Job Title | Fields populated |
| 6 | Click "Create" | Staff created, modal closes |
| 7 | Verify staff appears in list | New staff visible |

**Pass Criteria:** Staff member successfully created and visible in list

---

#### Test 3.2: Consultant Creates Clients

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Click "CRM" in sidebar | Menu expands |
| 3 | Click "Clients" | Clients page loads |
| 4 | Click "Add Client" button | Modal form appears |
| 5 | Enter Company Name | Field populated |
| 6 | Click "Create Client" | Client created, modal closes |
| 7 | Verify client appears in list | New client visible |

**Pass Criteria:** Client successfully created and visible in list

---

#### Test 3.3: Consultant Views Deployments Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Click "HR Outsourcing" in sidebar | Menu expands |
| 3 | Click "Deployments" | Deployments page loads |
| 4 | Verify "New Deployment" button visible | Button displayed |

**Pass Criteria:** Deployments page accessible with create button visible

---

#### Test 3.4: Consultant Invites Staff Members

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Staff Pool | Staff list displayed |
| 2 | Find staff member to invite | Staff card visible |
| 3 | Click envelope/invite icon | Invitation processing |
| 4 | Verify success message | "Invitation sent" displayed |

**Pass Criteria:** Invitation sent successfully

---

### Scenario 4: Policy Management

#### Test 4.1: Access Policies Page

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Click "Compliance" in sidebar | Menu expands |
| 3 | Click "Policies" | Policies page loads |
| 4 | Verify page elements | See "Add Policy" button, search box |

**Pass Criteria:** Policies page accessible with Add Policy button visible

---

#### Test 4.2: Upload a Policy Document

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Policies page | Policies page displayed |
| 2 | Click "Add Policy" button | Modal form appears |
| 3 | Enter Title: `Code of Conduct Policy` | Text entered |
| 4 | Select Category: `Code of Conduct` | Category selected |
| 5 | Click file upload area | File picker opens |
| 6 | Select PDF file | File name appears |
| 7 | Click "Create" button | Policy created |
| 8 | Verify success message | "Policy created" toast appears |

**Pass Criteria:** Policy successfully uploaded and visible in list

---

#### Test 4.3: Publish a Policy

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Policies page | Policies page displayed |
| 2 | Find policy in list | Policy row visible with "Draft" badge |
| 3 | Click publish button (check icon) | Confirm dialog appears |
| 4 | Click "Publish" in dialog | Policy published |
| 5 | Verify status badge | Shows "Published" badge |

**Pass Criteria:** Policy status changes from Draft to Published

---

#### Test 4.4: Search and Filter Policies

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Policies page | All policies displayed |
| 2 | Enter "Leave" in search box | Only Leave Policy visible |
| 3 | Clear search box | All policies visible again |
| 4 | Select "Published" from status filter | Only published policies visible |
| 5 | Select "Draft" from status filter | Only draft policies visible |
| 6 | Select "All Status" | All policies visible |

**Pass Criteria:** Search and filter functionality works correctly

---

### Scenario 5: Policy Compliance Management

#### Test 5.1: Create Client Companies

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Click "CRM" in sidebar | Menu expands |
| 3 | Click "Clients" | Clients page loads |
| 4 | Click "Add Client" button | Modal form appears |
| 5 | Enter Company Name: `Zenith Bank` | Text entered |
| 6 | Click "Create Client" | Client created |
| 7 | Repeat for `Access Bank` | Second client created |
| 8 | Verify both clients in list | Both companies visible |

**Pass Criteria:** Both client companies successfully created and visible in list

---

#### Test 5.2: Create Policies with Compliance Rules

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to Compliance → Policies | Policies page loads |
| 2 | Click "Add Policy" button | Modal form appears |
| 3 | Enter Title: `Employee Code of Conduct` | Text entered |
| 4 | Select Category: `Code of Conduct` | Category selected |
| 5 | Check "Requires Acknowledgment" | Checkbox checked |
| 6 | Enter New Hire Due Days: `7` | Number entered |
| 7 | Click "Create" button | Policy created |
| 8 | Repeat for `IT Security Guidelines` with 14 days | Second policy created |
| 9 | Verify both policies in list | Both policies visible with "Draft" status |

**Pass Criteria:** Both policies created with compliance rules (due dates, acknowledgment required)

---

#### Test 5.3: View Compliance Dashboard

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Navigate to `/dashboard/compliance` | Compliance Dashboard loads |
| 3 | Verify stat cards visible | See: Policies, Overdue, Training Modules |
| 4 | Verify quick links section | Links to policies and training visible |

**Pass Criteria:** Compliance Dashboard displays policy and training statistics

---

#### Test 5.4: View Employee Compliance

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Navigate to `/dashboard/employee-compliance` | Employee Compliance page loads |
| 3 | Verify search functionality | Search box visible |
| 4 | Verify stat cards | Compliance statistics displayed |
| 5 | Verify employee list or empty state | Employee compliance table visible |

**Pass Criteria:** Employee Compliance page accessible with search and stats visible

---

### Scenario 6: Employee ESS Onboarding and Policy Acknowledgment

#### Test 6.1: Consultant Creates a Company for Employees

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Create company via API (POST /api/companies) | Company created |
| 3 | Verify company data | Company ID returned |

**Pass Criteria:** Company successfully created with valid ID

---

#### Test 6.2: Consultant Creates an Employee

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Create employee via API (POST /api/employees) | Employee created |
| 3 | Verify employee data | Employee ID returned, name "Adaeze Okonkwo" |

**Pass Criteria:** Employee successfully created and associated with company

---

#### Test 6.3: Consultant Sends ESS Invitation

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Send ESS invite (POST /api/employees/:id/ess/invite) | Invitation sent |
| 3 | Verify invitation link | Link contains token parameter |

**Pass Criteria:** ESS invitation sent with valid activation token

---

#### Test 6.4: Employee Activates ESS Account

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /onboard/ess?token=[token] | Activation page loads |
| 2 | Verify employee name displayed | "Adaeze" visible |
| 3 | Enter Password: `Employee123!` | Password entered |
| 4 | Enter Confirm Password: `Employee123!` | Password confirmed |
| 5 | Click "Activate Account" | Processing starts |
| 6 | Verify success message | "Account Activated!" displayed |

**Pass Criteria:** ESS account activated successfully

---

#### Test 6.5: Employee Logs In to ESS Portal

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to /login | Login page loads |
| 2 | Enter employee email | Email entered |
| 3 | Enter password: `Employee123!` | Password entered |
| 4 | Click "Sign In" | Login processing |
| 5 | Verify redirect to dashboard | Dashboard displayed |

**Pass Criteria:** Employee successfully logged in and dashboard displayed

---

#### Test 6.6: Employee Views and Updates Profile

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as employee | Dashboard displayed |
| 2 | Get profile via API (GET /api/employees/ess/profile) | Profile data returned |
| 3 | Verify profile data | Name: Adaeze Okonkwo, Job: Software Engineer |
| 4 | Update profile (PUT /api/employees/ess/profile) | Profile updated |
| 5 | Verify phone updated | New phone number saved |

**Pass Criteria:** Employee can view and update their profile details

---

#### Test 6.7: Employee Views Pending Policies

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as employee | Dashboard displayed |
| 2 | Get pending policies (GET /api/policies/employee/pending) | Pending policies returned |
| 3 | Verify policy in list | "Employee Code of Conduct" visible |
| 4 | Verify requires acknowledgment | requires_acknowledgment = true |

**Pass Criteria:** Employee can see pending policies requiring acknowledgment

---

#### Test 6.8: Employee Acknowledges Policy

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as employee | Dashboard displayed |
| 2 | Acknowledge policy (POST /api/policies/:id/acknowledge) | Acknowledgment recorded |
| 3 | Get pending policies again | Policy no longer in list |

**Pass Criteria:** Employee can acknowledge policies, policy removed from pending list

---

#### Test 6.9: Consultant Verifies Acknowledgment

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as consultant | Dashboard displayed |
| 2 | Navigate to /dashboard/employee-compliance | Page loads |
| 3 | Verify page accessible | Compliance data visible |

**Pass Criteria:** Consultant can view employee compliance and acknowledgment status

---

#### Test 6.10: Employee Logs Out

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Login as employee | Dashboard displayed |
| 2 | Click "Sign out" button | Logout processing |
| 3 | Verify redirect to login | Login page displayed |

**Pass Criteria:** Employee successfully logged out

---

## UAT Sign-Off

### Test Execution Summary

| Scenario | Test | Tester | Date | Status | Notes |
|----------|------|--------|------|--------|-------|
| 1 | 1.1 Access Login Page | | | | |
| 1 | 1.2 Invalid Login | | | | |
| 1 | 1.3 Valid Login | | | | |
| 1 | 1.4 Dashboard Metrics | | | | |
| 1 | 1.5 Logout | | | | |
| 2 | 2.1 Send Invitation | | | | |
| 2 | 2.2 Verify Invitation | | | | |
| 2 | 2.3 Complete Onboarding | | | | |
| 2 | 2.4 Consultant Login | | | | |
| 2 | 2.5 Consultant Logout | | | | |
| 3 | 3.1 Create Staff | | | | |
| 3 | 3.2 Create Clients | | | | |
| 3 | 3.3 View Deployments | | | | |
| 3 | 3.4 Invite Staff | | | | |
| 4 | 4.1 Access Policies Page | | | | |
| 4 | 4.2 Upload a Policy Document | | | | |
| 4 | 4.3 Publish a Policy | | | | |
| 4 | 4.4 Search and Filter Policies | | | | |
| 5 | 5.1 Create Client Companies | | | | |
| 5 | 5.2 Create Policies with Compliance Rules | | | | |
| 5 | 5.3 View Compliance Dashboard | | | | |
| 5 | 5.4 View Employee Compliance | | | | |
| 6 | 6.1 Consultant Creates Company | | | | |
| 6 | 6.2 Consultant Creates Employee | | | | |
| 6 | 6.3 Consultant Sends ESS Invitation | | | | |
| 6 | 6.4 Employee Activates ESS Account | | | | |
| 6 | 6.5 Employee Logs In | | | | |
| 6 | 6.6 Employee Views/Updates Profile | | | | |
| 6 | 6.7 Employee Views Pending Policies | | | | |
| 6 | 6.8 Employee Acknowledges Policy | | | | |
| 6 | 6.9 Consultant Verifies Acknowledgment | | | | |
| 6 | 6.10 Employee Logs Out | | | | |

### Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| UAT Tester | | | |
| Product Owner | | | |

---

## Automated Test Execution

To run the automated tests:

```bash
cd e2e-tests
npm install
npm test
```

To run with visible browser:
```bash
npm run test:headed
```

---

## Issues & Defects

| ID | Description | Severity | Status |
|----|-------------|----------|--------|
| | | | |

---

## Contact

For questions or issues during UAT, contact the development team.
