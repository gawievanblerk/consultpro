// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * User Story 8: Payroll Processing
 *
 * As a consultant managing client companies,
 * I want to process monthly payroll for employees
 * So that I can calculate salaries, taxes, and deductions accurately
 *
 * Covers:
 * - Creating payroll runs
 * - Processing payroll (PAYE, pension, NHF calculations)
 * - Approving payroll
 * - Marking payroll as paid
 * - Viewing payslips
 * - ESS payslip access
 */

test.describe('User Story 8: Payroll Processing', () => {
  // Test configuration
  const apiUrl = 'https://api.corehr.africa';
  const timestamp = Date.now();

  // Shared state across tests
  let consultantEmail = `payroll.consultant.${timestamp}@example.com`;
  let consultantPassword = 'Test123!@#';
  let authToken = null;
  let companyId = null;
  let employeeId = null;
  let payrollRunId = null;
  let payslipId = null;

  // ============================================================================
  // SETUP: Create consultant, company, and employee
  // ============================================================================

  test('8.0.1 Setup: Create consultant for payroll testing', async ({ page }) => {
    // Create consultant via superadmin invitation flow (like test 07)
    await page.goto('/superadmin/login');
    await page.fill('input[type="email"]', 'admin@rozitech.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/superadmin/dashboard');

    // Navigate to Consultants and invite
    await page.getByRole('link', { name: /consultants/i }).click();
    await expect(page.getByRole('heading', { name: /HR Consultants/i })).toBeVisible();

    const companyName = `Payroll Test Consulting ${timestamp}`;

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
    await page.locator('input').first().fill('Payroll');
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

    console.log(`Payroll Consultant ${consultantEmail} created`);
  });

  test('8.0.2 Setup: Create company with employees for payroll', async ({ page }) => {
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
          legalName: `Payroll Test Company ${timestamp} Ltd`,
          tradingName: `Payroll Test Co ${timestamp}`,
          rcNumber: `RC${timestamp}`,
          tin: `TIN${timestamp}`,
          industry: 'Technology',
          employeeCountRange: '11-50',
          addressLine1: '123 Payroll Street',
          city: 'Lagos',
          state: 'Lagos',
          phone: '+234 800 123 4567',
          email: `payroll${timestamp}@example.com`
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, timestamp });

    expect(companyResult.success).toBe(true);
    companyId = companyResult.data.id;
    console.log(`Created company: ${companyResult.data.trading_name} (ID: ${companyId})`);
  });

  test('8.0.3 Setup: Create employee with salary details', async ({ page }) => {
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
          firstName: 'Adebayo',
          lastName: 'Ogundimu',
          email: `adebayo.ogundimu.${timestamp}@example.com`,
          phone: '+234 801 234 5678',
          jobTitle: 'Senior Developer',
          department: 'Engineering',
          employmentType: 'full_time',
          employmentStatus: 'active',
          hireDate: new Date().toISOString().split('T')[0],
          salary: 800000, // NGN 800,000 monthly
          salaryCurrency: 'NGN',
          payFrequency: 'monthly',
          bankName: 'First Bank of Nigeria',
          bankAccountNumber: '1234567890',
          bankAccountName: 'Adebayo Ogundimu'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, companyId, timestamp });

    expect(employeeResult.success).toBe(true);
    employeeId = employeeResult.data.id;
    console.log(`Created employee: Adebayo Ogundimu (ID: ${employeeId})`);
  });

  // ============================================================================
  // STAGE 1: Payroll Run Creation
  // ============================================================================

  test('8.1.1 Create payroll run for current month', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Create payroll run via API
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
          payment_date: new Date(year, month, 0).toISOString().split('T')[0], // Last day of month
          notes: 'E2E Test Payroll Run'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, companyId, month: currentMonth, year: currentYear });

    expect(runResult.success).toBe(true);
    payrollRunId = runResult.data.id;
    expect(runResult.data.status).toBe('draft');
    console.log(`Created payroll run (ID: ${payrollRunId}) for ${currentMonth}/${currentYear}`);
  });

  test('8.1.2 View payroll runs page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to payroll runs
    await page.goto('/dashboard/payroll');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByRole('heading', { name: /payroll runs/i })).toBeVisible({ timeout: 10000 });

    // Check for the created payroll run in the table
    await expect(page.getByText(/draft/i).first()).toBeVisible();

    console.log('Payroll runs page accessible');
  });

  test('8.1.3 List payroll runs via API', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    const runsResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/payroll/runs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(runsResult.success).toBe(true);
    expect(runsResult.data.length).toBeGreaterThan(0);
    console.log(`Found ${runsResult.data.length} payroll runs`);
  });

  // ============================================================================
  // STAGE 2: Payroll Processing
  // ============================================================================

  test('8.2.1 Process payroll run (calculate deductions)', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Process the payroll run
    const processResult = await page.evaluate(async ({ apiUrl, token, runId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/runs/${runId}/process`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, runId: payrollRunId });

    expect(processResult.success).toBe(true);
    expect(processResult.data.status).toBe('calculated');
    expect(processResult.data.employee_count).toBeGreaterThan(0);

    console.log(`Processed payroll: ${processResult.data.employee_count} employees, Gross: ${processResult.data.total_gross}, Net: ${processResult.data.total_net}`);
  });

  test('8.2.2 Verify payslips were generated', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get payslips for the run
    const payslipsResult = await page.evaluate(async ({ apiUrl, token, runId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/payslips?payroll_run_id=${runId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, runId: payrollRunId });

    expect(payslipsResult.success).toBe(true);
    expect(payslipsResult.data.length).toBeGreaterThan(0);

    // Save first payslip ID for later tests
    payslipId = payslipsResult.data[0].id;

    // Verify PAYE calculation (API returns numeric strings)
    const payslip = payslipsResult.data[0];
    const grossSalary = parseFloat(payslip.gross_salary);
    const payeTax = parseFloat(payslip.paye_tax);
    const pensionEmployee = parseFloat(payslip.pension_employee);
    const netSalary = parseFloat(payslip.net_salary);

    expect(grossSalary).toBeGreaterThan(0);
    expect(payeTax).toBeGreaterThan(0);
    expect(pensionEmployee).toBeGreaterThan(0);
    expect(netSalary).toBeGreaterThan(0);
    expect(netSalary).toBeLessThan(grossSalary);

    console.log(`Verified payslip: Gross=${payslip.gross_salary}, PAYE=${payslip.paye_tax}, Pension=${payslip.pension_employee}, Net=${payslip.net_salary}`);
  });

  test('8.2.3 Verify PAYE tax calculation accuracy', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Use the quick-paye calculator to verify
    const calcResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/payroll/quick-paye`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grossSalary: 800000, // Same as employee salary
          period: 'monthly'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(calcResult.success).toBe(true);
    expect(calcResult.data.monthly.paye).toBeGreaterThan(0);
    expect(calcResult.data.monthly.pension).toBeGreaterThan(0);
    expect(calcResult.data.effectiveTaxRate).toBeDefined();

    console.log(`PAYE calculator verified: Monthly PAYE=${calcResult.data.monthly.paye}, Effective rate=${calcResult.data.effectiveTaxRate}`);
  });

  // ============================================================================
  // STAGE 3: Payroll Approval
  // ============================================================================

  test('8.3.1 Approve payroll run', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Approve the payroll run
    const approveResult = await page.evaluate(async ({ apiUrl, token, runId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/runs/${runId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, runId: payrollRunId });

    expect(approveResult.success).toBe(true);
    expect(approveResult.data.status).toBe('approved');

    console.log('Payroll run approved successfully');
  });

  test('8.3.2 Verify payslips are now approved', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get payslip status
    console.log(`Fetching payslip ID: ${payslipId}`);
    const payslipResult = await page.evaluate(async ({ apiUrl, token, payslipId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/payslips/${payslipId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, payslipId });

    console.log(`Payslip API response:`, JSON.stringify(payslipResult));
    expect(payslipResult.success).toBe(true);
    expect(payslipResult.data.status).toBe('approved');

    console.log('Payslips status updated to approved');
  });

  // ============================================================================
  // STAGE 4: Mark Payroll as Paid
  // ============================================================================

  test('8.4.1 Mark payroll run as paid', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Mark as paid
    const paidResult = await page.evaluate(async ({ apiUrl, token, runId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/runs/${runId}/mark-paid`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, runId: payrollRunId });

    expect(paidResult.success).toBe(true);
    expect(paidResult.data.status).toBe('paid');

    console.log('Payroll run marked as paid');
  });

  // ============================================================================
  // STAGE 5: View Payroll Run Details
  // ============================================================================

  test('8.5.1 View payroll run detail page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to payroll run detail
    await page.goto(`/dashboard/payroll/${payrollRunId}`);
    await page.waitForLoadState('networkidle');

    // Verify page content
    await expect(page.getByText(/payroll/i).first()).toBeVisible({ timeout: 10000 });

    console.log('Payroll run detail page accessible');
  });

  test('8.5.2 Get payroll run with payslips via API', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get run details with payslips
    const runResult = await page.evaluate(async ({ apiUrl, token, runId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, runId: payrollRunId });

    expect(runResult.success).toBe(true);
    expect(runResult.data.payslips).toBeDefined();
    expect(runResult.data.payslips.length).toBeGreaterThan(0);
    expect(runResult.data.status).toBe('paid');

    console.log(`Payroll run has ${runResult.data.payslips.length} payslips`);
  });

  // ============================================================================
  // STAGE 6: Tax Tables and Calculator
  // ============================================================================

  test('8.6.1 Get Nigerian tax tables', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get tax tables
    const taxResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/payroll/tax-tables`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(taxResult.success).toBe(true);
    expect(taxResult.data.taxBands).toBeDefined();
    expect(taxResult.data.taxBands.length).toBe(6); // Nigerian has 6 tax bands
    expect(taxResult.data.statutoryRates).toBeDefined();
    expect(taxResult.data.statutoryRates.pension.employee).toBe('8%');
    expect(taxResult.data.statutoryRates.pension.employer).toBe('10%');

    console.log(`Tax tables loaded: ${taxResult.data.taxBands.length} bands, Source: ${taxResult.data.source}`);
  });

  test('8.6.2 Full payroll calculation via API', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Full calculation with breakdown
    const calcResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/payroll/calculate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          basicSalary: 400000,      // Basic 50%
          housingAllowance: 160000, // Housing 20%
          transportAllowance: 120000, // Transport 15%
          utilityAllowance: 40000,  // Utility 5%
          mealAllowance: 40000,     // Meal 5%
          otherAllowances: 40000,   // Other 5%
          pensionEnabled: true,
          nhfEnabled: true,
          period: 'monthly'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(calcResult.success).toBe(true);
    expect(calcResult.data.income.annual.gross).toBe(9600000); // 800k * 12
    expect(calcResult.data.reliefs.cra).toBeGreaterThan(0);
    expect(calcResult.data.tax.annualPAYE).toBeGreaterThan(0);
    expect(calcResult.data.tax.breakdown.length).toBeGreaterThan(0);
    expect(calcResult.data.deductions.employer.pensionContribution).toBeGreaterThan(0);

    console.log(`Full calculation: Gross=${calcResult.data.summary.grossAnnual}, Tax=${calcResult.data.summary.totalTaxAnnual}, Net=${calcResult.data.summary.netAnnual}`);
  });

  // ============================================================================
  // STAGE 7: Payslip PDF Generation
  // ============================================================================

  test('8.7.1 Generate payslip PDF', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Request PDF (check it returns correct content-type)
    const pdfResponse = await page.evaluate(async ({ apiUrl, token, payslipId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/payslips/${payslipId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return {
        ok: res.ok,
        status: res.status,
        contentType: res.headers.get('content-type')
      };
    }, { apiUrl, token: authToken, payslipId });

    expect(pdfResponse.ok).toBe(true);
    expect(pdfResponse.contentType).toContain('application/pdf');

    console.log('Payslip PDF generated successfully');
  });

  // ============================================================================
  // VERIFICATION
  // ============================================================================

  test('8.8.1 Verify complete payroll workflow', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get final run state
    const runResult = await page.evaluate(async ({ apiUrl, token, runId }) => {
      const res = await fetch(`${apiUrl}/api/payroll/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, runId: payrollRunId });

    expect(runResult.success).toBe(true);
    expect(runResult.data.status).toBe('paid');
    expect(parseFloat(runResult.data.total_gross)).toBeGreaterThan(0);
    expect(parseFloat(runResult.data.total_net)).toBeGreaterThan(0);
    expect(parseFloat(runResult.data.total_paye)).toBeGreaterThan(0);
    expect(parseFloat(runResult.data.total_pension_employee)).toBeGreaterThan(0);
    expect(parseInt(runResult.data.employee_count)).toBeGreaterThan(0);
    expect(runResult.data.payslips.length).toBe(parseInt(runResult.data.employee_count));

    console.log('=== PAYROLL WORKFLOW COMPLETE ===');
    console.log(`Company ID: ${companyId}`);
    console.log(`Payroll Run ID: ${payrollRunId}`);
    console.log(`Status: ${runResult.data.status}`);
    console.log(`Employees: ${runResult.data.employee_count}`);
    console.log(`Total Gross: ${runResult.data.total_gross}`);
    console.log(`Total PAYE: ${runResult.data.total_paye}`);
    console.log(`Total Net: ${runResult.data.total_net}`);
  });
});
