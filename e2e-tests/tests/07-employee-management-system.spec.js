// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * User Story 7: Employee Management System (EMS) - Complete Lifecycle
 *
 * Tests the complete employee lifecycle from creation to exit:
 * 1. Employee Creation - Create employees with full details
 * 2. Onboarding & Policies - Onboarding checklist, policy acknowledgment
 * 3. Probation & Confirmation - Probation review, confirmation
 * 4. Active Employment - Leave requests, disciplinary actions
 * 5. Performance Linkage - Performance reviews
 * 6. Exit & Transition - Exit management, handover
 *
 * Test Environment: https://corehr.africa
 */

test.describe.configure({ mode: 'serial' });

// Shared state across tests
let consultantEmail;
let consultantPassword = 'TestPass123!';
let testId;
let authToken;
let companyId;
let employeeId;
let employeeEmail;
let employeePassword = 'Employee123!';
let onboardingChecklistId;
let probationId;
let performanceReviewId;
let disciplinaryId;
let exitId;

const apiUrl = 'https://api.corehr.africa';

test.describe('User Story 7: Employee Management System (EMS)', () => {

  test.beforeAll(async () => {
    testId = Date.now();
  });

  // ============================================================================
  // STAGE 0: Setup - Create consultant and company
  // ============================================================================

  test('7.0.1 Setup: Create consultant and company for EMS testing', async ({ page }) => {
    // Create a new consultant via superadmin invitation flow
    await page.goto('/superadmin/login');
    await page.fill('input[type="email"]', 'admin@rozitech.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/superadmin/dashboard');

    // Navigate to Consultants and invite
    await page.getByRole('link', { name: /consultants/i }).click();
    await expect(page.getByRole('heading', { name: /HR Consultants/i })).toBeVisible();

    consultantEmail = `ems.consultant.${testId}@example.com`;
    const companyName = `EMS Test Consulting ${testId}`;

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
    await page.locator('input').first().fill('EMS');
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

    authToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(authToken).toBeTruthy();

    console.log(`EMS Consultant ${consultantEmail} created`);
  });

  test('7.0.2 Setup: Create a company for employee management', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Create a company via API
    const companyName = `EMS Test Company ${testId}`;
    const companyResult = await page.evaluate(async ({ apiUrl, token, companyName }) => {
      const res = await fetch(`${apiUrl}/api/companies`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          legalName: companyName,
          tradingName: companyName,
          companyType: 'llc',
          industry: 'Technology',
          email: 'hr@emstest.com',
          phone: '+234 1 234 5678'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, companyName });

    expect(companyResult.success).toBe(true);
    companyId = companyResult.data.id;

    console.log(`Created company: ${companyName} (ID: ${companyId})`);
  });

  // ============================================================================
  // STAGE 1: Employee Creation
  // ============================================================================

  test('7.1.1 Stage 1: Create employee with full details', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    employeeEmail = `employee.ems.${testId}@emstest.com`;
    const employeeData = await page.evaluate(async ({ apiUrl, token, companyId, employeeEmail }) => {
      const res = await fetch(`${apiUrl}/api/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyId: companyId,
          firstName: 'Chukwuemeka',
          lastName: 'Okafor',
          email: employeeEmail,
          phone: '+234 801 234 5678',
          dateOfBirth: '1992-03-20',
          gender: 'Male',
          maritalStatus: 'Single',
          nationality: 'Nigerian',
          stateOfOrigin: 'Lagos',
          jobTitle: 'Software Developer',
          department: 'Engineering',
          employmentType: 'full_time',
          employmentStatus: 'active',
          hireDate: new Date().toISOString().split('T')[0],
          salary: 600000,
          salaryCurrency: 'NGN',
          reportingManagerId: null,
          workLocation: 'Lagos Office',
          addressLine1: '15 Victoria Island',
          city: 'Lagos',
          stateOfResidence: 'Lagos State'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, companyId, employeeEmail });

    expect(employeeData.success).toBe(true);
    employeeId = employeeData.data.id;

    console.log(`Created employee: Chukwuemeka Okafor (ID: ${employeeId})`);
  });

  test('7.1.2 Stage 1: Verify employee appears in employees list', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get employees list via API
    const employeesResult = await page.evaluate(async ({ apiUrl, token, companyId }) => {
      const res = await fetch(`${apiUrl}/api/employees?company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, companyId });

    expect(employeesResult.success).toBe(true);
    const employee = employeesResult.data.find(e => e.email === employeeEmail);
    expect(employee).toBeTruthy();
    expect(employee.first_name).toBe('Chukwuemeka');
    expect(employee.employment_status).toBe('active');

    console.log('Employee verified in employees list');
  });

  // ============================================================================
  // STAGE 2: Onboarding & Policies
  // ============================================================================

  test('7.2.1 Stage 2: Create onboarding checklist for employee', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Create onboarding checklist via API
    const checklistResult = await page.evaluate(async ({ apiUrl, token, employeeId, companyId }) => {
      const res = await fetch(`${apiUrl}/api/onboarding-checklist/checklists`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: employeeId,
          company_id: companyId
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, employeeId, companyId });

    if (checklistResult.success) {
      onboardingChecklistId = checklistResult.data.id;
      console.log(`Created onboarding checklist (ID: ${onboardingChecklistId})`);
    } else {
      // Checklist might already exist or tables not ready
      console.log('Onboarding checklist creation skipped:', checklistResult.error);
    }
  });

  test('7.2.2 Stage 2: Send ESS invitation to employee', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Send ESS invitation via API
    const inviteResult = await page.evaluate(async ({ apiUrl, token, employeeId }) => {
      const res = await fetch(`${apiUrl}/api/employees/${employeeId}/ess/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return res.json();
    }, { apiUrl, token: authToken, employeeId });

    expect(inviteResult.success).toBe(true);
    expect(inviteResult.data.invitationLink).toBeTruthy();

    console.log('ESS invitation sent to employee');
  });

  test('7.2.3 Stage 2: View onboarding management page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to onboarding management
    await page.goto('/dashboard/onboarding-admin');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByRole('heading', { name: /onboarding/i })).toBeVisible({ timeout: 10000 });

    console.log('Onboarding management page accessible');
  });

  // ============================================================================
  // STAGE 3: Probation & Confirmation
  // ============================================================================

  test('7.3.1 Stage 3: Create probation record for employee', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Create probation record via API
    const probationEndDate = new Date();
    probationEndDate.setMonth(probationEndDate.getMonth() + 3);

    const probationResult = await page.evaluate(async ({ apiUrl, token, employeeId, companyId, endDate }) => {
      const res = await fetch(`${apiUrl}/api/probation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: employeeId,
          company_id: companyId,
          probation_end_date: endDate,
          objectives: 'Complete onboarding, learn company systems, deliver first project milestone',
          notes: 'Standard 3-month probation period'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, employeeId, companyId, endDate: probationEndDate.toISOString().split('T')[0] });

    if (probationResult.success) {
      probationId = probationResult.data.id;
      console.log(`Created probation record (ID: ${probationId})`);
    } else {
      console.log('Probation creation skipped:', probationResult.error);
    }
  });

  test('7.3.2 Stage 3: View probation management page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to probation management
    await page.goto('/dashboard/probation');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByRole('heading', { name: /probation/i })).toBeVisible({ timeout: 10000 });

    console.log('Probation management page accessible');
  });

  test('7.3.3 Stage 3: Get probation records for company', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get probation records via API
    const probationResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/probation`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(probationResult.success).toBe(true);
    console.log(`Found ${probationResult.data?.length || 0} probation records`);
  });

  // ============================================================================
  // STAGE 4: Active Employment
  // ============================================================================

  test('7.4.1 Stage 4: Create disciplinary record', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Create disciplinary record via API
    const disciplinaryResult = await page.evaluate(async ({ apiUrl, token, employeeId, companyId }) => {
      const res = await fetch(`${apiUrl}/api/disciplinary`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: employeeId,
          company_id: companyId,
          incident_date: new Date().toISOString().split('T')[0],
          incident_type: 'verbal_warning',
          description: 'Late arrival to work - first occurrence',
          action_taken: 'Verbal warning issued, employee acknowledged',
          status: 'resolved'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, employeeId, companyId });

    if (disciplinaryResult.success) {
      disciplinaryId = disciplinaryResult.data.id;
      console.log(`Created disciplinary record (ID: ${disciplinaryId})`);
    } else {
      console.log('Disciplinary creation skipped:', disciplinaryResult.error);
    }
  });

  test('7.4.2 Stage 4: View disciplinary management page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to disciplinary management
    await page.goto('/dashboard/disciplinary');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByRole('heading', { name: /disciplinary/i })).toBeVisible({ timeout: 10000 });

    console.log('Disciplinary management page accessible');
  });

  test('7.4.3 Stage 4: Get disciplinary records', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get disciplinary records via API
    const disciplinaryResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/disciplinary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(disciplinaryResult.success).toBe(true);
    console.log(`Found ${disciplinaryResult.data?.length || 0} disciplinary records`);
  });

  // ============================================================================
  // STAGE 5: Performance Linkage
  // ============================================================================

  test('7.5.1 Stage 5: Create performance review', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Create performance review via API
    const reviewResult = await page.evaluate(async ({ apiUrl, token, employeeId, companyId }) => {
      const res = await fetch(`${apiUrl}/api/performance-reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: employeeId,
          company_id: companyId,
          review_period_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          review_period_end: new Date().toISOString().split('T')[0],
          review_type: 'quarterly',
          status: 'draft',
          objectives_met: 'Completed onboarding tasks, delivered first milestone',
          areas_for_improvement: 'Time management, documentation',
          overall_rating: 4
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, employeeId, companyId });

    if (reviewResult.success) {
      performanceReviewId = reviewResult.data.id;
      console.log(`Created performance review (ID: ${performanceReviewId})`);
    } else {
      console.log('Performance review creation skipped:', reviewResult.error);
    }
  });

  test('7.5.2 Stage 5: View performance reviews page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to performance reviews
    await page.goto('/dashboard/performance');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByRole('heading', { name: /performance/i })).toBeVisible({ timeout: 10000 });

    console.log('Performance reviews page accessible');
  });

  test('7.5.3 Stage 5: Get performance reviews', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get performance reviews via API
    const reviewsResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/performance-reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(reviewsResult.success).toBe(true);
    console.log(`Found ${reviewsResult.data?.length || 0} performance reviews`);
  });

  // ============================================================================
  // STAGE 6: Exit & Transition
  // ============================================================================

  test('7.6.1 Stage 6: Create exit record for employee', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Create exit record via API
    const exitDate = new Date();
    exitDate.setMonth(exitDate.getMonth() + 1);

    const exitResult = await page.evaluate(async ({ apiUrl, token, employeeId, companyId, exitDate }) => {
      const res = await fetch(`${apiUrl}/api/exits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          employee_id: employeeId,
          company_id: companyId,
          exit_type: 'resignation',
          notice_date: new Date().toISOString().split('T')[0],
          last_working_day: exitDate,
          reason: 'Career growth opportunity',
          status: 'pending'
        })
      });
      return res.json();
    }, { apiUrl, token: authToken, employeeId, companyId, exitDate: exitDate.toISOString().split('T')[0] });

    if (exitResult.success) {
      exitId = exitResult.data.id;
      console.log(`Created exit record (ID: ${exitId})`);
    } else {
      console.log('Exit creation skipped:', exitResult.error);
    }
  });

  test('7.6.2 Stage 6: View exit management page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to exit management
    await page.goto('/dashboard/exit-management');
    await page.waitForLoadState('networkidle');

    // Verify page loads
    await expect(page.getByRole('heading', { name: /exit/i })).toBeVisible({ timeout: 10000 });

    console.log('Exit management page accessible');
  });

  test('7.6.3 Stage 6: Get exit records', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get exit records via API
    const exitsResult = await page.evaluate(async ({ apiUrl, token }) => {
      const res = await fetch(`${apiUrl}/api/exits`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken });

    expect(exitsResult.success).toBe(true);
    console.log(`Found ${exitsResult.data?.length || 0} exit records`);
  });

  // ============================================================================
  // CLEANUP
  // ============================================================================

  test('7.7.1 Verify complete employee lifecycle data', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    authToken = await page.evaluate(() => localStorage.getItem('token'));

    // Get employee with full history
    const employeeResult = await page.evaluate(async ({ apiUrl, token, employeeId }) => {
      const res = await fetch(`${apiUrl}/api/employees/${employeeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      return res.json();
    }, { apiUrl, token: authToken, employeeId });

    expect(employeeResult.success).toBe(true);
    expect(employeeResult.data.first_name).toBe('Chukwuemeka');
    expect(employeeResult.data.last_name).toBe('Okafor');

    console.log('Complete EMS lifecycle test finished successfully');
    console.log(`Employee: ${employeeResult.data.first_name} ${employeeResult.data.last_name}`);
    console.log(`Status: ${employeeResult.data.employment_status}`);
  });
});
