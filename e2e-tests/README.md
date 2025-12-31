# CoreHR E2E Tests

End-to-end test suite for the CoreHR platform using Playwright.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with browser visible
npm run test:headed
```

## Documentation

| Document | Description |
|----------|-------------|
| [USER-STORIES.md](./docs/USER-STORIES.md) | Test scenarios and acceptance criteria |
| [UAT-GUIDE.md](./docs/UAT-GUIDE.md) | Step-by-step manual testing guide for UAT testers |

## Test Environment

- **URL:** https://corehr.africa
- **Superadmin Login:** https://corehr.africa/superadmin/login

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Superadmin | admin@rozitech.com | Admin123! |

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests headless |
| `npm run test:headed` | Run with visible browser |
| `npm run test:ui` | Run with Playwright UI |
| `npm run test:debug` | Run in debug mode |
| `npm run test:report` | View HTML test report |
| `npm run test:superadmin` | Run superadmin tests only |

## Test Status

| Scenario | Tests | Status |
|----------|-------|--------|
| 1. Superadmin Auth | 5 | ✅ All Pass |
| 2. Consultant Invitation | 5 | ✅ All Pass |
| 3. Staff & Client Management | 7 | ✅ All Pass |
| 4. Policy Management | 7 | ✅ All Pass |
| 5. Policy Compliance | 8 | ✅ All Pass |
| 6. Employee ESS Onboarding | 13 | ✅ All Pass |
