# ConsultPro - Project Context

## Project Overview
ConsultPro is a white-label HR/Consulting management platform built for TeamACE Nigeria based on Phase 1 of the TeamACE Platform Marketing Proposal.

## Current Status: MVP COMPLETE ✅

### Completed Tasks
1. ✅ Project structure created and Git initialized
2. ✅ Backend with Express.js (14 route files)
3. ✅ Database migrations for Phase 1 schema
4. ✅ Frontend with React + Vite + Tailwind (11 pages)
5. ✅ TeamACE branding applied (Navy #0d2865, Teal #41d8d1)
6. ✅ Docker configuration for local development
7. ✅ Render.yaml for cloud deployment
8. ✅ Demo data with Nigerian clients

## Architecture

### Backend (Port 4020)
- Express.js with PostgreSQL
- JWT authentication (DEMO_MODE)
- Multi-tenant architecture with tenant_id isolation
- Nigeria tax compliance (VAT 7.5%, WHT 5%/10%)

### Frontend (Port 5020)
- React 18 + Vite + Tailwind CSS
- TeamACE brand colors in tailwind.config.js
- Responsive sidebar navigation

### Database
- PostgreSQL 15
- Migrations in `/backend/migrations/`
- Demo data with Nigerian companies (First Bank, Dangote, MTN, etc.)

## Phase 1 Modules

| Module | Status | Routes |
|--------|--------|--------|
| CRM | ✅ | clients, contacts, engagements, documents, activities |
| Business Development | ✅ | leads, pipeline, proposals |
| HR Outsourcing | ✅ | staff, deployments |
| Finance | ✅ | invoices, payments (Nigeria VAT/WHT) |
| Collaboration | ✅ | tasks, notes |

## Quick Commands

### Local Development
```bash
# With Docker (recommended)
docker-compose up -d
# Frontend: http://localhost:5020
# Backend: http://localhost:4020

# Manual development
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

### Deploy to Render.com
1. Push to GitHub/GitLab
2. Create new Blueprint from render.yaml
3. Deploy

## Demo Credentials
- Email: admin@teamace.ng
- Password: Demo123!
- Tenant: TeamACE Nigeria (11111111-1111-1111-1111-111111111111)

## TeamACE Branding
- Primary Navy: #0d2865
- Accent Teal: #41d8d1
- Logo: Download from https://teamace.com.ng/images/icon.png
- Place in: frontend/public/teamace-icon.png

## File Structure
```
consultpro/
├── backend/
│   ├── src/
│   │   ├── routes/           # API endpoints (14 files)
│   │   │   ├── auth.js       # Login, register, me
│   │   │   ├── dashboard.js  # Stats endpoint
│   │   │   ├── clients.js    # CRM
│   │   │   ├── contacts.js   # CRM
│   │   │   ├── engagements.js# CRM
│   │   │   ├── documents.js  # CRM
│   │   │   ├── activities.js # CRM
│   │   │   ├── leads.js      # BD
│   │   │   ├── pipeline.js   # BD
│   │   │   ├── proposals.js  # BD
│   │   │   ├── staff.js      # HR
│   │   │   ├── deployments.js# HR
│   │   │   ├── invoices.js   # Finance (Nigeria tax)
│   │   │   ├── payments.js   # Finance
│   │   │   ├── tasks.js      # Collaboration
│   │   │   └── notes.js      # Collaboration
│   │   ├── middleware/
│   │   │   ├── auth.js       # JWT verification
│   │   │   └── tenant.js     # Multi-tenant isolation
│   │   ├── utils/
│   │   │   └── db.js         # PostgreSQL connection
│   │   └── server.js         # Express app
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   └── 002_seed_data.sql
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Tasks.jsx
│   │   │   ├── crm/          # Clients, Contacts, Engagements
│   │   │   ├── bd/           # Leads, Pipeline
│   │   │   ├── hr/           # Staff, Deployments
│   │   │   └── finance/      # Invoices, Payments
│   │   ├── components/
│   │   │   └── Layout.jsx    # Sidebar navigation
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   └── utils/
│   │       └── api.js
│   ├── tailwind.config.js    # TeamACE colors
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── render.yaml
└── README.md
```

## Nigeria Tax Compliance
- VAT Rate: 7.5% (NIGERIA_VAT_RATE)
- WHT Services: 5% (NIGERIA_WHT_RATE_SERVICES)
- WHT Professional: 10% (NIGERIA_WHT_RATE_PROFESSIONAL)
- Implemented in: backend/src/routes/invoices.js

## Next Steps / TODO
1. [ ] Download TeamACE logo to frontend/public/teamace-icon.png
2. [ ] Test Docker deployment locally
3. [ ] Deploy to Render.com for demo
4. [ ] Add form modals for creating/editing entities
5. [ ] Implement document upload functionality
6. [ ] Add PDF invoice generation
7. [ ] Email notifications for invoices
8. [ ] Implement search/filtering on all list views

## Source Documents
- TeamACE Marketing Proposal: rozitech-central/docs/proposals/TeamACE_Platform_Marketing_Proposal.md
- Phase 1 SRS: rozitech-central/docs/proposals/TeamACE_Phase1_SRS.md

## GitFlow Process
- Never push directly to main
- Create feature branches: feature/GVB.description
- Test locally before merging

---
**Last Updated:** 2025-12-02
**Status:** MVP Complete - Ready for Testing
