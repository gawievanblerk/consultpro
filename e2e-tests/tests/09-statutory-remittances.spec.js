// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * User Story 9: Statutory Remittances
 *
 * As a consultant managing client companies,
 * I want to track statutory remittances (PAYE, Pension, NHF, NSITF, ITF)
 * So that I can ensure timely payments to government agencies
 *
 * Covers:
 * - Creating remittance records
 * - Auto-generating from payroll runs
 * - Marking remittances as paid
 * - Confirming with receipts
 * - Viewing overdue and upcoming remittances
 */

test.describe('User Story 9: Statutory Remittances', () => {
  // Test configuration
  const apiUrl = 'https://api.corehr.africa';
  const timestamp = Date.now();

  // Shared state across tests
  let consultantEmail = `remit.consultant.${timestamp}@example.com`;
  let consultantPassword = 'Test123!@#';
  let authToken = null;
  let companyId = null;
  let employeeId = null;
  let payrollRunId = null;
  let remittanceId = null;

  // ============================================================================
  // SETUP: Create consultant, company, employee, and payroll run
  // ============================================================================

  test('9.0.1 Setup: Create consultant for remittance testing', async ({ page }) => {
    // Create consultant via superadmin invitation flow (like test 07)
    await page.goto('/superadmin/login');
    await page.fill('input[type="email"]', 'admin@rozitech.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/superadmin/dashboard');

    // Navigate to Consultants and invite
    await page.getByRole('link', { name: /consultants/i }).click();
    await expect(page.getByRole('heading', { name: /HR Consultants/i })).toBeVisible();

    const companyName = `Remittance Test Consulting ${timestamp}`;

    await page.getByRole('button', { name: /invite consultant/i }).click();
    await expect(page.getByRole('heading', { name: /invite consultant/i })).toBeVisible();

    await page.getByPlaceholder(/HR Solutions Nigeria/i).fill(companyName);
    await page.getByPlaceholder(/consultant@example.com/i).fill(consultantEmail);
    await page.getByRole('button', { name: /send invitation/i }).click();
    await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 10000 });

    // Get invitation token via API
    const superadminToken = await page.evaluate(() => localStorage.getItem('superadmin_token') || localStorage.getItem('token'));
    const invitationsRes = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/superadmin/invitations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: superadminToken });

    const invitation = invitationsRes.data.find(inv => inv.email === consultantEmail);
    expect(invitation).toBeTruthy();
    const inviteToken = invitation.token;

    // Complete consultant onboarding
    await page.goto(`/onboard/consultant?token=${inviteToken}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible({ timeout: 10000 });

    // Step 1: Account
    await page.locator('input').first().fill('Remittance');
    await page.waitForTimeout(200);
    await page.locator('input[type="text"]').nth(1).fill('Consultant');
    await page.waitForTimeout(200);
    await page.locator('input[type="password"]').first().fill(consultantPassword);
    await page.waitForTimeout(200);
    await page.locator('input[type="password"]').nth(1).fill(consultantPassword);
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2: Contact Information
    await expect(page.getByRole('heading', { name: /contact information/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3: Business Details
    await expect(page.getByRole('heading', { name: /business details/i })).toBeVisible({ timeout: 5000 });

    const responsePromise = page.waitForResponse(
      response => response.url().includes('/onboard/consultant/complete'),
      { timeout: 30000 }
    );

    const buttonText = await page.locator('button[type="submit"]').textContent();
    if (!buttonText?.includes('Creating')) {
      await page.getByRole('button', { name: /complete registration/i }).click();
    }

    await responsePromise;
    await expect(page.getByText(/welcome to corehr/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    console.log(`Remittance Consultant ${consultantEmail} created`);
  });

  test('9.0.2 Setup: Create company for remittance tracking', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Create company via API
    const companyResult = await page.evaluate(async ({ apiUrl, token, timestamp }) => {
      const res = await fetch(`${apiUrl}/api/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          legalName: `Remittance Test Co ${timestamp} Ltd`,
          tradingName: `Remittance Co ${timestamp}`,
          rcNumber: `RC${timestamp}`,
          tin: `TIN${timestamp}`,
          industry: 'Finance',
          employeeCountRange: '11-50',
          addressLine1: '456 Tax Street',
          city: 'Lagos',
          state: 'Lagos'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, timestamp });

    expect(companyResult.success).toBe(true);
    companyId = companyResult.data.id;
    console.log(`Created company: ${companyResult.data.trading_name} (ID: ${companyId})`);
  });

  test('9.0.3 Setup: Create employee with salary', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Create employee via API
    const employeeResult = await page.evaluate(async ({ apiUrl, token, companyId, timestamp }) => {
      const res = await fetch(`${apiUrl}/api/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: companyId,
          firstName: 'Chioma',
          lastName: 'Nwosu',
          email: `chioma.nwosu.${timestamp}@example.com`,
          phone: '+234 802 345 6789',
          jobTitle: 'Accountant',
          department: 'Finance',
          employmentType: 'full_time',
          employmentStatus: 'active',
          hireDate: new Date().toISOString().split('T')[0],
          salary: 500000,
          salaryCurrency: 'NGN',
          payFrequency: 'monthly'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, companyId, timestamp });

    expect(employeeResult.success).toBe(true);
    employeeId = employeeResult.data.id;
    console.log(`Created employee: Chioma Nwosu (ID: ${employeeId})`);
  });

  test('9.0.4 Setup: Create and process payroll run', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Create payroll run
    const runResult = await page.evaluate(async ({ apiUrl, token, companyId, month, year }) => {
      const res = await fetch(`${apiUrl}/api/payroll/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: companyId,
          pay_period_month: month,
          pay_period_year: year,
          notes: 'Remittance test payroll'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, companyId, month: currentMonth, year: currentYear });

    expect(runResult.success).toBe(true);
    payrollRunId = runResult.data.id;

    // Process payroll
    const processResult = await page.evaluate(async ({ apiUrl, token, runId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/runs/${runId}/process`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, runId: payrollRunId });

    expect(processResult.success).toBe(true);
    console.log(`Created and processed payroll run (ID: ${payrollRunId})`);
  });

  // ============================================================================
  // STAGE 1: Auto-Generate Remittances from Payroll
  // ============================================================================

  test('9.1.1 Generate remittances from processed payroll', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Generate remittances from payroll
    const genResult = await page.evaluate(async ({ apiUrl, token, runId }) => {
      const res = await fetch(`${apiUrl}/api/remittances/generate-from-payroll/${runId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, runId: payrollRunId });

    expect(genResult.success).toBe(true);
    expect(genResult.data.length).toBeGreaterThan(0);

    // Save first remittance ID for later tests
    remittanceId = genResult.data[0].id;

    console.log(`Generated ${genResult.data.length} remittances from payroll`);
    genResult.data.forEach(r => {
      console.log(`  - ${r.remittance_type}: ${r.amount}`);
    });
  });

  // ============================================================================
  // STAGE 2: List and View Remittances
  // ============================================================================

  test('9.2.1 View remittances page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to remittances page
    await page.goto('/dashboard/remittances');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByRole('heading', { name: /statutory remittances/i })).toBeVisible({ timeout: 10000 });

    console.log('Remittances page accessible');
  });

  test('9.2.2 List remittances via API', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const remitResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/remittances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(remitResult.success).toBe(true);
    expect(remitResult.data.length).toBeGreaterThan(0);

    console.log(`Found ${remitResult.data.length} remittances`);
  });

  test('9.2.3 Get remittance summary', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const summaryResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/remittances/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(summaryResult.success).toBe(true);
    console.log(`Summary has ${summaryResult.data.length} entries`);
  });

  test('9.2.4 Get single remittance details', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const remitResult = await page.evaluate(async ({ apiUrl, token, remitId }) => {
      const res = await fetch(`${apiUrl}/api/remittances/${remitId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, remitId: remittanceId });

    expect(remitResult.success).toBe(true);
    expect(remitResult.data.id).toBe(remittanceId);
    expect(remitResult.data.status).toBe('pending');

    console.log(`Remittance: ${remitResult.data.remittance_type}, Amount: ${remitResult.data.amount}, Status: ${remitResult.data.status}`);
  });

  // ============================================================================
  // STAGE 3: Remittance Types and PFAs
  // ============================================================================

  test('9.3.1 Get remittance types', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const typesResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/remittances/types/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(typesResult.success).toBe(true);
    expect(typesResult.data.length).toBe(5); // paye, pension, nhf, nsitf, itf

    console.log('Remittance types:', typesResult.data.map(t => t.code).join(', '));
  });

  test('9.3.2 Get PFA list', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const pfaResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/remittances/pfas/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(pfaResult.success).toBe(true);
    expect(pfaResult.data.length).toBeGreaterThan(0);

    console.log(`Found ${pfaResult.data.length} Pension Fund Administrators`);
  });

  // ============================================================================
  // STAGE 4: Mark Remittance as Paid
  // ============================================================================

  test('9.4.1 Mark remittance as paid', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const paidResult = await page.evaluate(async ({ apiUrl, token, remitId }) => {
      const res = await fetch(`${apiUrl}/api/remittances/${remitId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          payment_date: new Date().toISOString().split('T')[0],
          payment_reference: 'PAY-REF-12345',
          payment_method: 'bank_transfer',
          payment_bank: 'First Bank',
          notes: 'E2E test payment'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, remitId: remittanceId });

    expect(paidResult.success).toBe(true);
    expect(paidResult.data.status).toBe('paid');
    expect(paidResult.data.payment_reference).toBe('PAY-REF-12345');

    console.log('Remittance marked as paid');
  });

  test('9.4.2 Verify payment recorded in audit log', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const remitResult = await page.evaluate(async ({ apiUrl, token, remitId }) => {
      const res = await fetch(`${apiUrl}/api/remittances/${remitId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, remitId: remittanceId });

    expect(remitResult.success).toBe(true);
    expect(remitResult.data.audit_log).toBeDefined();
    expect(remitResult.data.audit_log.length).toBeGreaterThan(0);

    console.log(`Audit log has ${remitResult.data.audit_log.length} entries`);
  });

  // ============================================================================
  // STAGE 5: Confirm Remittance with Receipt
  // ============================================================================

  test('9.5.1 Confirm remittance with receipt', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const confirmResult = await page.evaluate(async ({ apiUrl, token, remitId }) => {
      const res = await fetch(`${apiUrl}/api/remittances/${remitId}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receipt_number: 'FIRS-RCT-2024-001234',
          confirmation_date: new Date().toISOString().split('T')[0],
          notes: 'Receipt received from FIRS'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, remitId: remittanceId });

    expect(confirmResult.success).toBe(true);
    expect(confirmResult.data.status).toBe('confirmed');
    expect(confirmResult.data.receipt_number).toBe('FIRS-RCT-2024-001234');

    console.log('Remittance confirmed with receipt');
  });

  // ============================================================================
  // STAGE 6: Overdue and Upcoming Remittances
  // ============================================================================

  test('9.6.1 Get upcoming remittances', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const upcomingResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/remittances/upcoming?days=30`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(upcomingResult.success).toBe(true);
    console.log(`Found ${upcomingResult.data.length} upcoming remittances (next 30 days)`);
  });

  test('9.6.2 Get overdue remittances', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const overdueResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/remittances/overdue`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(overdueResult.success).toBe(true);
    console.log(`Found ${overdueResult.data.length} overdue remittances`);
  });

  // ============================================================================
  // STAGE 7: Create Manual Remittance
  // ============================================================================

  test('9.7.1 Create manual remittance record', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const currentMonth = new Date().getMonth(); // Previous month
    const currentYear = new Date().getFullYear();

    const createResult = await page.evaluate(async ({ apiUrl, token, companyId, month, year }) => {
      const res = await fetch(`${apiUrl}/api/remittances`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          company_id: companyId,
          remittance_type: 'itf',
          pay_period_month: month || 12,
          pay_period_year: month ? year : year - 1,
          amount: 15000,
          employee_contribution: 0,
          employer_contribution: 15000,
          agency_name: 'Industrial Training Fund',
          due_date: new Date(year, month, 10).toISOString().split('T')[0],
          notes: 'ITF contribution - manual entry'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, companyId, month: currentMonth, year: currentYear });

    expect(createResult.success).toBe(true);
    expect(createResult.data.remittance_type).toBe('itf');

    console.log(`Created manual ITF remittance: ${createResult.data.amount}`);
  });

  // ============================================================================
  // VERIFICATION
  // ============================================================================

  test('9.8.1 Verify complete remittance workflow', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get final state
    const remitResult = await page.evaluate(async ({ apiUrl, token, remitId }) => {
      const res = await fetch(`${apiUrl}/api/remittances/${remitId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, remitId: remittanceId });

    expect(remitResult.success).toBe(true);
    expect(remitResult.data.status).toBe('confirmed');
    expect(remitResult.data.payment_reference).toBeDefined();
    expect(remitResult.data.receipt_number).toBeDefined();
    expect(remitResult.data.audit_log.length).toBeGreaterThanOrEqual(2);

    console.log('=== REMITTANCE WORKFLOW COMPLETE ===');
    console.log(`Remittance ID: ${remitResult.data.id}`);
    console.log(`Type: ${remitResult.data.remittance_type}`);
    console.log(`Amount: ${remitResult.data.amount}`);
    console.log(`Status: ${remitResult.data.status}`);
    console.log(`Payment Ref: ${remitResult.data.payment_reference}`);
    console.log(`Receipt: ${remitResult.data.receipt_number}`);
    console.log(`Audit Log Entries: ${remitResult.data.audit_log.length}`);
  });
});
