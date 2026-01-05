# CoreHR Super Admin Guide

**Version 1.0 | December 2025**

---

## Quick Reference

| Item | Details |
|------|---------|
| **Portal URL** | `http://localhost:5020/superadmin/login` |
| **Demo Email** | `admin@rozitech.com` |
| **Demo Password** | `Admin123!` |
| **API Base URL** | `http://localhost:4020/api/superadmin` |

---

## Table of Contents

1. [Overview](#overview)
2. [Access & Authentication](#access--authentication)
3. [Dashboard Guide](#dashboard-guide)
4. [Consultant Management](#consultant-management)
5. [Invitation Management](#invitation-management)
6. [Audit & Compliance](#audit--compliance)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Super Admin portal is the platform administration interface for CoreHR. It is exclusively used by Rozitech staff to:

- Onboard new HR consulting firms
- Monitor platform health and usage
- Manage consultant subscriptions
- View audit trails
- Handle support escalations

### Security Notice

All actions performed in the Super Admin portal are logged and audited. Ensure you:
- Never share your credentials
- Log out when not in use
- Report any suspicious activity immediately

---

## Access & Authentication

### Login URL

**Production:** `https://corehr.ng/superadmin/login`

**Development/Demo:** `http://localhost:5020/superadmin/login`

### Demo Credentials

For testing and demonstration purposes:

```
Email:    admin@rozitech.com
Password: Admin123!
```

### Authentication Flow

1. Navigate to Super Admin login page
2. Enter email and password
3. Click "Sign in to Admin Portal"
4. Token is stored in browser (8-hour expiry)
5. Automatic redirect to dashboard

### Session Management

- Sessions expire after 8 hours
- Inactive sessions timeout after 1 hour
- Multiple devices can be logged in simultaneously

---

## Dashboard Guide

### Accessing Dashboard

After login, you're redirected to `/superadmin/dashboard`

### Dashboard Metrics

| Metric | Description |
|--------|-------------|
| Total Consultants | All registered consulting firms |
| Active Consultants | Firms with active subscriptions |
| Total Companies | Client companies across all consultants |
| Total Employees | Employee records across all companies |
| ESS Enabled | Employees with self-service access |
| Pending Invites | Unaccepted consultant invitations |

### Consultant Status Breakdown

- **Active**: Paid subscription, full access
- **Trial**: Free trial period (30 days)
- **Suspended**: Temporarily disabled
- **Churned**: Cancelled/inactive

### Tier Distribution

- **Starter**: Entry-level plan
- **Professional**: Mid-tier plan
- **Enterprise**: Premium plan

---

## Consultant Management

### Viewing All Consultants

**URL:** `/superadmin/consultants`

The consultant list shows:
- Company name and email
- Subscription tier
- Current status
- Company count
- Employee count
- Registration date

### Search & Filter

**Search:** Type consultant name or email in search box

**Filter by Status:**
- All Status
- Active
- Trial
- Suspended
- Churned

### Inviting New Consultant

1. Click **Invite Consultant** button
2. Fill in the form:

| Field | Description | Required |
|-------|-------------|----------|
| Company Name | HR consulting firm name | Yes |
| Email | Primary contact email | Yes |
| Tier | Subscription level | Yes |

3. Click **Send Invitation**
4. Email is sent with registration link
5. Invitation appears in Invitations list

### Tier Limits

| Tier | Max Companies | Max Employees/Company |
|------|---------------|----------------------|
| Starter | 5 | 50 |
| Professional | 20 | 200 |
| Enterprise | Unlimited | Unlimited |

### Suspending a Consultant

When to suspend:
- Non-payment
- Terms of service violation
- Security concerns

Steps:
1. Find consultant in list
2. Click **Suspend** button
3. Confirm action
4. Consultant immediately loses access
5. All their users are blocked

### Reactivating a Consultant

1. Find suspended consultant
2. Click **Activate** button
3. Consultant regains access immediately

---

## Invitation Management

### Viewing Invitations

**URL:** `/superadmin/invitations`

### Invitation Status

| Status | Description |
|--------|-------------|
| Pending | Sent, not yet accepted |
| Accepted | Consultant registered |
| Expired | Past 7-day validity |

### Resending Invitation

1. Find pending/expired invitation
2. Click **Resend**
3. New email sent with fresh 7-day validity

### Deleting Invitation

1. Find unwanted invitation
2. Click **Delete**
3. Link becomes invalid

---

## Audit & Compliance

### Audit Log Access

**URL:** `/superadmin/audit`

### Logged Actions

| Action | Description |
|--------|-------------|
| `login` | Super admin logged in |
| `consultant_invited` | New invitation sent |
| `consultant_suspended` | Consultant account suspended |
| `consultant_activated` | Consultant account reactivated |
| `invitation_resent` | Invitation email resent |
| `invitation_deleted` | Invitation removed |

### Audit Log Details

Each log entry contains:
- Timestamp
- Super admin who performed action
- Action type
- Entity affected
- IP address
- User agent (browser info)

---

## API Reference

### Base URL

```
http://localhost:4020/api/superadmin
```

### Authentication

All API requests require Bearer token:

```
Authorization: Bearer <your_token>
```

### Endpoints

#### Login
```
POST /auth/login
Content-Type: application/json

{
  "email": "admin@rozitech.com",
  "password": "Admin123!"
}

Response:
{
  "success": true,
  "token": "eyJ...",
  "superadmin": {
    "id": "uuid",
    "email": "admin@rozitech.com",
    "firstName": "Rozitech",
    "lastName": "Admin"
  }
}
```

#### Dashboard Stats
```
GET /dashboard
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "consultants": {
      "total": 10,
      "active": 8,
      "trial": 1,
      "suspended": 1
    },
    "companies": {
      "total": 45,
      "active": 40,
      "onboarding": 5
    },
    "employees": {
      "total": 1200,
      "essEnabled": 800
    },
    "pendingInvitations": 2
  }
}
```

#### List Consultants
```
GET /consultants?search=&status=
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_name": "HR Solutions Ltd",
      "email": "info@hrsolutions.ng",
      "tier": "professional",
      "subscription_status": "active",
      "company_count": 5,
      "employee_count": 150,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### Invite Consultant
```
POST /consultants/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "new@consultant.ng",
  "companyName": "New HR Firm",
  "tier": "professional"
}

Response:
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "invitationId": "uuid",
    "email": "new@consultant.ng"
  }
}
```

#### Suspend Consultant
```
PUT /consultants/:id/suspend
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Consultant suspended successfully"
}
```

#### Activate Consultant
```
PUT /consultants/:id/activate
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Consultant activated successfully"
}
```

#### List Invitations
```
GET /invitations
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "pending@example.com",
      "company_name": "Pending Co",
      "tier": "starter",
      "status": "pending",
      "created_at": "2025-01-01T00:00:00Z",
      "expires_at": "2025-01-08T00:00:00Z"
    }
  ]
}
```

#### Audit Logs
```
GET /audit
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "action": "login",
      "entity_type": "superadmin",
      "details": {},
      "ip_address": "192.168.1.1",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

---

## Troubleshooting

### Cannot Login

**Check:**
1. Correct email address
2. Correct password (case-sensitive)
3. Account is active
4. Backend service is running

**Solution:**
Contact another super admin to verify your account status.

### Dashboard Shows No Data

**Check:**
1. API connection
2. Database connectivity
3. Browser console for errors

**Solution:**
Refresh page or contact technical support.

### Invitation Not Received

**Check:**
1. Correct email address
2. Spam/junk folder
3. Email server status

**Solution:**
Resend invitation or contact email admin.

### Session Expired

**Cause:** Token expired after 8 hours

**Solution:** Login again

---

## Support

### Technical Issues

Contact: tech@rozitech.com

### Account Issues

Contact: admin@rozitech.com

### Emergency Support

Phone: +234 xxx xxx xxxx

---

**Document Version:** 1.0

**Last Updated:** December 2025

**Maintained by:** Rozitech Platform Team
