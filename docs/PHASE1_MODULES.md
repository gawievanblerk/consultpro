# ConsultPro Phase 1 Modules Reference

## Module 1.1: Core CRM & Client Management
**Reuse**: 60% from InvoiceFlow

### Features
- Client profiles with full Nigeria compliance (TIN, RC Number, CAC)
- Contact management with decision-maker tracking
- Engagement/project lifecycle management
- Document storage per entity
- Activity timeline logging

### Database Tables
- clients
- contacts
- engagements
- documents
- activity_logs

### API Endpoints
- GET/POST /api/clients
- GET/PUT/DELETE /api/clients/:id
- GET/POST /api/contacts
- GET/PUT/DELETE /api/contacts/:id
- GET/POST /api/engagements
- GET/PUT/DELETE /api/engagements/:id
- GET/POST /api/documents
- GET /api/activities

---

## Module 1.2: Business Development
**Reuse**: 50% from Workforce

### Features
- Lead capture and tracking
- Visual sales pipeline (Kanban)
- Proposal management
- Lead-to-client conversion
- Opportunity analytics

### Database Tables
- leads
- pipeline_stages
- proposals

### API Endpoints
- GET/POST /api/leads
- GET/PUT/DELETE /api/leads/:id
- POST /api/leads/:id/convert
- GET/POST /api/pipeline/stages
- GET/POST /api/proposals

---

## Module 1.3: HR Outsourcing Essentials
**Reuse**: 80% from Workforce

### Features
- Staff pool management
- Skills and certification tracking
- Client deployment tracking
- Billing rate management
- Availability status

### Database Tables
- staff
- deployments

### API Endpoints
- GET/POST /api/staff
- GET/PUT/DELETE /api/staff/:id
- GET/POST /api/deployments
- GET/PUT/DELETE /api/deployments/:id

---

## Module 1.4: Finance Light
**Reuse**: 70% from InvoiceFlow

### Features
- Invoice generation
- Nigeria VAT (7.5%) support
- Withholding Tax (5%/10%) support
- Payment tracking
- Receivables aging

### Tax Rates
```javascript
NIGERIA_VAT_RATE = 7.5%
NIGERIA_WHT_RATE_SERVICES = 5%
NIGERIA_WHT_RATE_PROFESSIONAL = 10%
```

### Database Tables
- invoices
- invoice_items
- payments

### API Endpoints
- GET/POST /api/invoices
- GET/PUT/DELETE /api/invoices/:id
- PUT /api/invoices/:id/send
- GET /api/invoices/reports/receivables
- GET/POST /api/payments
- DELETE /api/payments/:id

---

## Module 1.5: Collaboration & Workflow
**Reuse**: 40% from Workforce

### Features
- Task management
- Priority levels (low, medium, high, urgent)
- Task assignment
- Notes and comments on entities
- Activity timeline

### Database Tables
- tasks
- notes

### API Endpoints
- GET/POST /api/tasks
- GET/PUT/DELETE /api/tasks/:id
- PUT /api/tasks/:id/complete
- GET /api/tasks/my
- GET/POST /api/notes
- GET/PUT/DELETE /api/notes/:id

---

## Entity Relationships

```
Tenant
  └── Users
  └── Clients
        └── Contacts
        └── Engagements
              └── Deployments
              └── Invoices
        └── Documents
        └── Notes
  └── Leads
        └── Proposals
  └── Staff
        └── Deployments
  └── Tasks
  └── Pipeline Stages
```

## Nigeria Compliance Fields

### Clients
- tin (Tax Identification Number)
- rc_number (CAC Registration Number)

### Staff
- nin (National ID Number)
- bvn (Bank Verification Number)
- pension_pin
- tax_id
- bank_name, bank_account_number, bank_account_name

### Invoices
- vat_rate, vat_amount
- wht_rate, wht_amount
