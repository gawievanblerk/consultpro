# Employee Onboarding System - User Guide

## Overview

The ConsultPro Onboarding System provides a structured 5-phase workflow to onboard new employees. This guide explains how HR administrators and consultants can set up and manage the onboarding process.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Document Templates](#document-templates)
3. [Starting Employee Onboarding](#starting-employee-onboarding)
4. [Monitoring Progress](#monitoring-progress)
5. [The 5 Onboarding Phases](#the-5-onboarding-phases)
6. [Employee Experience (ESS)](#employee-experience-ess)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Before You Begin

Ensure you have:
- [ ] Created document templates for your organization
- [ ] Added the employee to the system with their details
- [ ] Set up company policies (optional but recommended)

### Basic Workflow

```
1. Create Document Templates → 2. Add Employee → 3. Start Onboarding → 4. Send ESS Invite → 5. Monitor Progress
```

---

## Document Templates

### What Are Document Templates?

Document templates are reusable documents (contracts, NDAs, policies) that automatically populate with employee-specific data. Instead of manually editing each document, you create one template and the system fills in employee details automatically.

### Accessing Document Templates

**Navigation:** Employee Management → Document Templates

### Creating a New Template

1. Click **+ New Template**
2. Fill in the details:
   - **Template Name**: A descriptive name (e.g., "Standard Employment Contract 2024")
   - **Template Type**: Select the document type (Offer Letter, Employment Contract, NDA, etc.)
   - **Description**: Brief description for your reference

3. **Write your document content** using the rich text editor:
   - Use the toolbar to format text (bold, italic, headers, lists)
   - The editor works like Microsoft Word or Google Docs

4. **Insert placeholders** by clicking the blue buttons:
   - `employee_name` → Employee's full name
   - `job_title` → Their position
   - `department` → Their department
   - `hire_date` → Start date
   - `salary` → Basic salary
   - `company_name` → Your company name
   - `manager_name` → Their line manager
   - And more...

5. Click **Create Template**

### Example Template

Here's an example of how to write an Employment Contract template:

```
EMPLOYMENT CONTRACT

This Employment Contract is entered into on {{current_date}} between:

EMPLOYER: {{company_name}}
EMPLOYEE: {{employee_name}}

1. POSITION
You are appointed as {{job_title}} in the {{department}} department, reporting to {{manager_name}}.

2. COMMENCEMENT
Your employment begins on {{hire_date}}.

3. REMUNERATION
Your gross monthly salary is {{salary}}, payable on the last working day of each month.

4. PROBATION
You will be on probation until {{probation_end_date}}.

Please sign below to confirm acceptance of these terms.

_______________________
{{employee_name}}
Date: _______________
```

### Template Types

| Type | Used For | Phase |
|------|----------|-------|
| Offer Letter | Initial job offer | Phase 1 |
| Employment Contract | Terms of employment | Phase 1 |
| NDA | Non-disclosure agreement | Phase 1 |
| NDPA Consent | Data protection consent | Phase 1 |
| Code of Conduct | Company behavior standards | Phase 1 |
| Job Description | Role responsibilities | Phase 2 |
| Org Chart | Reporting structure | Phase 2 |
| Key Contacts | Important contacts list | Phase 2 |

### Preview Templates

Click **Preview** on any template to see how it looks with sample employee data filled in.

---

## Starting Employee Onboarding

### Prerequisites

Before starting onboarding, ensure the employee exists in the system:
- **Navigation:** Employees → Add Employee
- Fill in at least: Name, Email, Job Title, Department, Hire Date

### Starting the Onboarding Process

1. **Navigation:** Employee Management → Onboarding Workflow

2. Click **+ Start Onboarding**

3. **Select the employee** from the dropdown list
   - Only employees not already in onboarding will appear

4. Click **Start Onboarding**

5. The system will automatically:
   - Create an onboarding record
   - Generate documents for each phase based on your templates
   - Set the employee's status to "Preboarding"

### Sending ESS Invitation

After starting onboarding, the employee needs access to the Employee Self-Service (ESS) portal:

1. In the Onboarding Workflow page, find the employee
2. Click **View Details**
3. Click **Send ESS Invite**

The employee will receive an email with:
- Link to the ESS portal
- Instructions to set up their password
- Their onboarding tasks

---

## Monitoring Progress

### Onboarding Dashboard

**Navigation:** Employee Management → Onboarding Workflow

The dashboard shows:
- **All employees** currently in onboarding
- **Current phase** for each employee
- **Progress percentage**
- **Status** (In Progress, Blocked, Completed)

### Viewing Employee Details

Click on any employee row to see:
- Document completion status for each phase
- Which documents are pending/signed/acknowledged
- Profile completion percentage

### Refresh Documents

If templates were updated after onboarding started:
1. Open the employee's onboarding details
2. Click **Refresh Documents**
3. New documents will be created based on current templates

---

## The 5 Onboarding Phases

### Phase 1: Document Signing (Hard Gate)

**What employees do:**
- Sign Offer Letter
- Sign Employment Contract
- Sign NDA
- Acknowledge NDPA (Data Protection)
- Acknowledge Code of Conduct

**Hard Gate:** Employee cannot proceed to Phase 2 until all Phase 1 documents are completed.

### Phase 2: Role Clarity

**What employees do:**
- Review and acknowledge Job Description
- Review Organizational Chart
- Review Key Contacts

**Note:** This phase helps employees understand their role and reporting structure.

### Phase 3: Employee File (Hard Gate)

**What employees do:**
- Complete their profile (minimum 80% required)
- Upload required documents:
  - Passport photographs
  - Educational certificates
  - Government ID (NIN, Driver's License)
  - Professional certifications (if applicable)

**Hard Gate:** Phase 3 must be verified by HR before proceeding.

### Phase 4: Policy Acknowledgments

**What employees do:**
- Read and acknowledge company policies
- Policies are pulled from the Compliance module

**Setting up policies:**
1. Navigation: Compliance & Training → Policies
2. Add your company policies
3. Policies marked as active will appear in Phase 4

### Phase 5: Complete

**What happens:**
- Onboarding is marked complete
- Employee status changes to "Active"
- Probation check-in tasks are auto-scheduled (30, 60, 90 days)

---

## Employee Experience (ESS)

### What Employees See

When employees log into ESS, they see:

1. **My Onboarding** - Their personalized onboarding wizard
2. **Progress bar** - Overall completion percentage
3. **Phase tabs** - Navigate between phases (locked phases show padlock)
4. **Document list** - Documents to sign/acknowledge/upload

### Employee Actions

| Document Type | Employee Action |
|--------------|-----------------|
| Requires Signature | Click View → Review → Sign Document (draw signature) |
| Requires Acknowledgment | Click View → Read → Click "I Acknowledge" |
| Requires Upload | Click Upload → Select file → Submit |

### Document Status Badges

- **Pending** (yellow) - Not yet completed
- **Signed** (green) - Signature submitted
- **Acknowledged** (green) - Document acknowledged
- **Uploaded** (blue) - File uploaded, awaiting HR verification
- **Verified** (green) - HR has verified the upload
- **Rejected** (red) - HR rejected, needs re-upload

---

## Troubleshooting

### "No templates found for document type"

**Problem:** Generic placeholder content appears instead of your template.

**Solution:** Create a template with the matching type:
1. Go to Document Templates
2. Create a new template
3. Select the correct Template Type
4. Ensure "Active" is checked

### "Employee not appearing in onboarding list"

**Problem:** Employee doesn't show when starting new onboarding.

**Possible causes:**
- Employee is already in onboarding (check existing list)
- Employee record is missing required fields
- Employee status is not "Preboarding" or "Active"

### "Documents showing 0 created"

**Problem:** Clicking "Refresh Documents" shows 0 documents created.

**Solution:** Documents may already exist. Check the employee's document list in their onboarding details.

### "Employee can't see their onboarding"

**Problem:** Employee logs into ESS but sees "Onboarding Not Started."

**Possible causes:**
1. Onboarding wasn't started - Go to Onboarding Workflow and start it
2. ESS invite not sent - Send the ESS invitation
3. Employee logged in with wrong account - Verify email address

### "Employee stuck on a phase"

**Problem:** Employee completed all documents but can't proceed.

**Check:**
- For Phase 1 & 3 (hard gates): All documents must be completed
- For Phase 3: Profile must be 80%+ complete
- For Phase 3: HR must verify uploaded documents

---

## Best Practices

### 1. Set Up Templates First
Create all your document templates before starting any onboarding. This ensures consistency.

### 2. Use Meaningful Template Names
Include version or date: "Employment Contract v2024" helps track which version employees signed.

### 3. Test the Flow
Create a test employee and go through the entire onboarding process yourself to understand the employee experience.

### 4. Keep Policies Updated
Regularly review and update policies in the Compliance module. Employees will automatically see current policies during onboarding.

### 5. Monitor Dashboard Daily
Check the Onboarding Workflow dashboard regularly to:
- Identify stuck employees
- Verify uploaded documents promptly
- Follow up on overdue items

---

## Quick Reference

### Key Navigation Paths

| Task | Navigation |
|------|------------|
| Create document templates | Employee Management → Document Templates |
| Start employee onboarding | Employee Management → Onboarding Workflow → + Start Onboarding |
| View onboarding progress | Employee Management → Onboarding Workflow |
| Manage policies | Compliance & Training → Policies |
| Add new employees | Employees |

### Placeholder Reference

| Placeholder | Description |
|-------------|-------------|
| `{{employee_name}}` | Full name |
| `{{employee_first_name}}` | First name |
| `{{employee_last_name}}` | Last name |
| `{{employee_email}}` | Email address |
| `{{employee_number}}` | Employee ID |
| `{{job_title}}` | Position title |
| `{{department}}` | Department name |
| `{{hire_date}}` | Start date |
| `{{company_name}}` | Company name |
| `{{salary}}` | Basic salary |
| `{{manager_name}}` | Line manager |
| `{{current_date}}` | Today's date |
| `{{probation_end_date}}` | Probation end date |

---

## Support

For technical issues or feature requests, contact your system administrator or Rozitech support.

---

*Document Version: 1.0*
*Last Updated: January 2026*
