so how d# ConsultPro - TeamACE HR Platform

A comprehensive HR and consulting management platform built for TeamACE Nigeria.

## Features (Phase 1)

### Module 1.1: CRM & Client Management
- Client profiles with Nigeria compliance (TIN, RC Number)
- Contact management with decision-maker tracking
- Engagement/project management
- Document storage and activity logging

### Module 1.2: Business Development
- Lead capture and tracking
- Visual sales pipeline (Kanban)
- Proposal management
- Opportunity analytics

### Module 1.3: HR Outsourcing
- Staff pool management
- Client deployment tracking
- Billing rate management
- Skills and certification tracking

### Module 1.4: Finance
- Invoice generation with Nigeria VAT (7.5%)
- Withholding Tax support (5%/10%)
- Payment tracking
- Receivables aging reports

### Module 1.5: Collaboration
- Task management
- Notes and comments
- Activity timeline

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL 15
- **Deployment**: Docker, Render.com

## Getting Started

### Local Development with Docker

```bash
# Clone the repository
git clone <repo-url>
cd consultpro

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost:5020
# Backend API: http://localhost:4020
```

### Manual Development Setup

```bash
# Backend
cd backend
npm install
cp .env.example .env
npm run dev

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Demo Credentials

- Email: admin@teamace.ng
- Password: Demo123!

## Deployment on Render.com

1. Fork this repository
2. Connect to Render.com
3. Create a new Blueprint from `render.yaml`
4. Deploy

## Project Structure

```
consultpro/
├── backend/
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Auth, tenant isolation
│   │   └── utils/          # Database, helpers
│   ├── migrations/         # SQL schema
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI
│   │   ├── pages/          # Route components
│   │   ├── context/        # React context
│   │   └── utils/          # API client
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
└── render.yaml
```

## Brand Colors

- Primary Navy: #0d2865
- Accent Teal: #41d8d1

## License

Proprietary - TeamACE Nigeria / Rozitech
