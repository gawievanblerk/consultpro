# CoreHR Product Manual

**Version 1.0 | December 2025**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles & Access Levels](#user-roles--access-levels)
4. [Super Admin Workflows](#super-admin-workflows)
5. [HR Consultant Workflows](#hr-consultant-workflows)
6. [Company Admin Workflows](#company-admin-workflows)
7. [Employee Self-Service (ESS)](#employee-self-service-ess)
8. [Coming Soon Features](#coming-soon-features)
9. [Troubleshooting](#troubleshooting)
10. [Support & Contact](#support--contact)

---

## Introduction

CoreHR is a comprehensive Human Resource Management System designed specifically for HR consulting firms operating in Nigeria. The platform enables HR consultants to manage multiple client companies, their employees, and statutory compliance from a single dashboard.

### Key Features

- Multi-tenant architecture supporting multiple HR consultants
- Client company management with Nigerian compliance
- Employee lifecycle management
- Employee Self-Service (ESS) portal
- Statutory compliance tracking (PAYE, Pension, NHIS, NHF, NSITF, ITF)
- Audit trails and activity logging

### System Requirements

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Stable internet connection
- Minimum screen resolution: 1024x768

---

## Getting Started

### Accessing CoreHR

CoreHR is accessible via web browser at your organization's designated URL. Contact your administrator for the correct access URL.

### First-Time Login

1. Navigate to the login page
2. Enter your email address
3. Enter your password
4. Click "Sign In"

### Password Requirements

- Minimum 8 characters
- Recommended: Mix of uppercase, lowercase, numbers, and symbols

---

## User Roles & Access Levels

CoreHR has four distinct user roles, each with specific permissions:

| Role | Description | Access Level |
|------|-------------|--------------|
| **Super Admin** | Platform administrators (Rozitech staff) | Full platform access |
| **HR Consultant** | HR consulting firm owners/staff | Manage own companies & employees |
| **Company Admin** | HR managers at client companies | Manage company employees |
| **Employee** | End users with ESS access | View own profile & payslips |

---

## Super Admin Workflows

### Accessing Super Admin Portal

1. Navigate to `/superadmin/login`
2. Enter your Super Admin credentials
3. Click "Sign in to Admin Portal"

### Dashboard Overview

The Super Admin dashboard displays:
- Total number of consultants
- Active vs suspended consultants
- Total companies managed
- Total employees across all companies
- Pending invitations
- Recent platform activity

### Inviting a New HR Consultant

1. Navigate to **Consultants** in the sidebar
2. Click **Invite Consultant** button
3. Fill in the invitation form:
   - **Company Name**: The HR consulting firm's name
   - **Email Address**: Primary contact email
   - **Tier**: Select subscription tier
     - *Starter*: 5 companies, 50 employees each
     - *Professional*: 20 companies, 200 employees each
     - *Enterprise*: Unlimited
4. Click **Send Invitation**
5. The consultant receives an email with registration link

### Managing Consultants

**View Consultant Details:**
- Click on any consultant row to view details
- See company count, employee count, subscription status

**Suspend a Consultant:**
1. Find the consultant in the list
2. Click **Suspend** button
3. Confirm the action
4. Consultant loses access immediately

**Reactivate a Consultant:**
1. Find the suspended consultant
2. Click **Activate** button
3. Consultant regains access

### Viewing Audit Logs

1. Navigate to **Audit Logs** in sidebar
2. View all super admin actions
3. Filter by action type, date range, or admin

---

## HR Consultant Workflows

### Completing Registration

When you receive an invitation:

1. Click the registration link in your email
2. Complete the 3-step wizard:
   - **Step 1 - Account**: Set your name and password
   - **Step 2 - Profile**: Add contact information
   - **Step 3 - Business**: Add TIN and RC Number (optional)
3. Click **Complete Registration**
4. You're automatically logged in to your dashboard

### Dashboard Overview

Your consultant dashboard shows:
- Total client companies
- Total employees managed
- Active vs onboarding companies
- ESS activation rate
- Recent activity feed

### Creating a New Company

1. Navigate to **Companies** in the sidebar
2. Click **Add Company** button
3. Complete the company setup wizard:

**Step 1 - Basic Information:**
- Legal Name (required)
- Trading Name
- Company Type (LLC, PLC, etc.)
- Industry

**Step 2 - Contact Details:**
- Email
- Phone
- Website
- Physical Address

**Step 3 - Statutory Registration:**
- TIN (Tax Identification Number)
- RC Number (CAC Registration)
- Pension Code
- NHF Code
- NHIS Code
- ITF Code
- NSITF Code

**Step 4 - Payroll Settings:**
- Default Currency
- Pay Frequency (Weekly/Bi-weekly/Monthly)
- Payroll Cutoff Day
- Pay Day

4. Click **Create Company**
5. Company is created with "Onboarding" status

### Managing Companies

**View Company Details:**
- Click on any company to view full details
- See employee count, ESS activation status

**Update Company:**
1. Open company details
2. Click **Edit** button
3. Modify required fields
4. Click **Save Changes**

**Change Company Status:**
- *Onboarding*: Initial setup phase
- *Active*: Fully operational
- *Suspended*: Temporarily disabled
- *Offboarded*: Archived/deleted

**Invite Company Admin (Optional):**
1. Open company details
2. Go to **Admins** tab
3. Click **Invite Admin**
4. Enter admin's email and name
5. Click **Send Invitation**

### Adding Employees

**Individual Employee:**
1. Navigate to company's **Employees** section
2. Click **Add Employee**
3. Complete the employee form:

*Personal Information:*
- First Name, Last Name, Middle Name
- Email, Phone
- Date of Birth, Gender
- State of Origin, LGA

*Employment Details:*
- Job Title
- Department
- Employment Type (Full-time/Part-time/Contract)
- Hire Date
- Reports To

*Compensation:*
- Salary
- Currency
- Pay Frequency

*Bank Details:*
- Bank Name
- Account Number
- Account Name

*Statutory IDs:*
- NIN (National Identification Number)
- BVN (Bank Verification Number)
- Tax ID
- Pension PIN
- PFA (Pension Fund Administrator)

4. Toggle **Enable ESS** if employee should have self-service access
5. Click **Save Employee**

**Bulk Import:**
1. Navigate to **Employees** section
2. Click **Import Employees**
3. Download the CSV template
4. Fill in employee data following the template format
5. Upload the completed CSV file
6. Review imported data
7. Click **Confirm Import**

### Sending ESS Invitations

1. Navigate to employee list
2. Find employees with ESS enabled
3. Click **Send Invitation** for each employee
4. Employee receives activation email
5. Track invitation status in employee details

---

## Company Admin Workflows

### Accepting Admin Invitation

1. Click the link in your invitation email
2. Set your password
3. Click **Activate Account**
4. You're logged into the company dashboard

### Managing Employees

Company admins can:
- View all employees in their company
- Add new employees
- Edit employee details
- Send ESS invitations
- View employee documents

*Note: Company admins cannot delete employees or access other companies.*

---

## Employee Self-Service (ESS)

### Activating ESS Account

1. Check your email for the ESS activation invitation
2. Click the activation link
3. Create your password
4. Click **Activate Account**
5. You're logged into your ESS portal

### ESS Features

**View Profile:**
- Personal information
- Employment details
- Contact information

**Coming Soon:**
- View payslips
- Download tax certificates
- Request leave
- Update personal details

---

## Coming Soon Features

The following features are planned for future releases:

### Phase 2 - Payroll Management
- Payroll processing
- Salary computation with Nigerian tax tables
- PAYE calculation
- Pension contributions
- Bank file generation
- Payslip generation

### Phase 3 - Statutory Compliance
- PAYE remittance tracking
- Pension contribution reports
- Annual tax returns (Form H1)
- NHIS contribution management
- NHF deduction tracking

### Phase 4 - Leave Management
- Leave request workflow
- Leave balance tracking
- Leave calendar
- Public holiday management

### Phase 5 - Performance Management
- Goal setting
- Performance reviews
- 360-degree feedback
- Training tracking

### Phase 6 - Advanced Reporting
- Custom report builder
- Scheduled reports
- Export to Excel/PDF
- Dashboard analytics

### Phase 7 - Mobile App
- iOS and Android apps
- Push notifications
- Offline capability
- Biometric authentication

---

## Troubleshooting

### Cannot Login

1. Verify your email address is correct
2. Check if Caps Lock is on
3. Try resetting your password
4. Contact your administrator if issues persist

### Invitation Link Expired

- Invitation links expire after 7 days
- Contact your administrator to resend the invitation

### Page Not Loading

1. Clear browser cache
2. Try a different browser
3. Check internet connection
4. Contact support if issues persist

### Missing Features

Some features may not be visible based on your role:
- Super Admins see platform-wide features
- Consultants see their companies only
- Company Admins see their company only
- Employees see their profile only

---

## Support & Contact

### Technical Support

- Email: support@corehr.ng
- Phone: +234 xxx xxx xxxx
- Hours: Monday - Friday, 8:00 AM - 6:00 PM WAT

### Documentation

- Product Manual: `/docs/manual.html`
- API Documentation: Contact technical team

### Feedback

We welcome your feedback to improve CoreHR. Send suggestions to: feedback@corehr.ng

---

**CoreHR** is powered by Rozitech

Copyright 2025 Rozitech. All rights reserved.
