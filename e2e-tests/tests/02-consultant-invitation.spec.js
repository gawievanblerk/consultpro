// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * User Story 2: Consultant Invitation Flow
 *
 * As a platform superadmin,
 * I want to invite HR consultants to the platform,
 * So that they can create their accounts and manage their clients.
 *
 * Acceptance Criteria:
 * - Superadmin can send invitation to consultant
 * - Consultant can access invitation link
 * - Consultant can complete registration
 * - Consultant can log in to their dashboard
 * - Consultant can log out
 */

// Generate unique email for each test run
const testId = Date.now();
const testEmail = `test.consultant.${testId}@example.com`;
const testCompany = `Test HR Consulting ${testId}`;
const testPassword = 'TestPass123!';

// Store invitation token between tests
let invitationToken = null;

test.describe('User Story 2: Consultant Invitation Flow', () => {
  test.describe.configure({ mode: 'serial' });

  test('2.1 Superadmin sends invitation to consultant', async ({ page }) => {
    // Login as superadmin
    await page.goto('/superadmin/login');
    await page.getByLabel(/email/i).fill('admin@rozitech.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/superadmin/i, { timeout: 15000 });

    // Navigate to Consultants page
    await page.getByRole('link', { name: /consultants/i }).click();
    await expect(page.getByRole('heading', { name: /HR Consultants/i })).toBeVisible();

    // Click Invite Consultant button
    await page.getByRole('button', { name: /invite consultant/i }).click();

    // Wait for modal
    await expect(page.getByRole('heading', { name: /invite consultant/i })).toBeVisible();

    // Fill invitation form using placeholders
    await page.getByPlaceholder(/HR Solutions Nigeria/i).fill(testCompany);
    await page.getByPlaceholder(/consultant@example.com/i).fill(testEmail);
    // Tier defaults to professional

    // Send invitation
    await page.getByRole('button', { name: /send invitation/i }).click();

    // Verify success message
    await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 10000 });
  });

  test('2.2 Get invitation token', async ({ page }) => {
    // Login as superadmin
    await page.goto('/superadmin/login');
    await page.getByLabel(/email/i).fill('admin@rozitech.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/superadmin/i, { timeout: 15000 });

    // Navigate to Invitations page
    await page.getByRole('link', { name: /invitations/i }).click();
    await expect(page.getByRole('heading', { name: /pending invitations/i })).toBeVisible();

    // Wait for invitations to load and find our email
    await expect(page.getByText(testEmail)).toBeVisible({ timeout: 10000 });

    // Get token via page context - evaluate the API call within the page
    const tokenData = await page.evaluate(async (email) => {
      const token = localStorage.getItem('superadmin_token');
      // Use the full backend URL since frontend and backend are on different domains
      const apiUrl = 'https://consultpro-backend-950l.onrender.com';
      const response = await fetch(`${apiUrl}/api/superadmin/invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const invitation = data.data?.find(inv => inv.email === email);
      return invitation?.token;
    }, testEmail);

    expect(tokenData).toBeTruthy();
    invitationToken = tokenData;
    console.log(`Got invitation token for ${testEmail}`);
  });

  test('2.3 Consultant completes onboarding', async ({ page }) => {
    console.log(`Using invitation token: ${invitationToken}`);
    expect(invitationToken).toBeTruthy();

    // Clear any stale tokens before onboarding
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Navigate to onboarding page with token
    await page.goto(`/onboard/consultant?token=${invitationToken}`);

    // Wait for page to load - check if we got the onboarding form or an error
    await page.waitForLoadState('networkidle');

    // Check if we're on the onboarding page (not redirected to login)
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // If redirected to login, the token was invalid
    if (currentUrl.includes('/login')) {
      throw new Error('Token invalid - redirected to login page');
    }

    // Verify onboarding page loads - wait for Step 1 heading
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible({ timeout: 10000 });

    // Step 1: Account - Fill in credentials using label text
    // Fill First Name
    await page.locator('input').first().fill('Test');
    await page.waitForTimeout(200);

    // Fill Last Name (second text input)
    await page.locator('input[type="text"]').nth(1).fill('Consultant');
    await page.waitForTimeout(200);

    // Fill password fields
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.waitForTimeout(200);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.waitForTimeout(200);

    // Continue to Step 2
    console.log('Clicking Continue to Step 2...');
    await page.getByRole('button', { name: /continue/i }).click();

    // Check if we moved to Step 2 or got an error
    const step2Heading = page.getByRole('heading', { name: /contact information/i });
    const errorMessage = page.getByText(/password|match|error/i);

    const step2Visible = await step2Heading.isVisible().catch(() => false);
    if (!step2Visible) {
      // Take screenshot to debug
      await page.screenshot({ path: 'test-results/debug-step1-error.png' });
      const hasError = await errorMessage.isVisible().catch(() => false);
      if (hasError) {
        throw new Error('Step 1 validation failed - check debug-step1-error.png');
      }
    }
    await expect(step2Heading).toBeVisible({ timeout: 5000 });
    console.log('Step 2 visible');

    // Step 2: Profile - Skip optional info
    console.log('Clicking Continue to Step 3...');
    await page.getByRole('button', { name: /continue/i }).click();
    await expect(page.getByRole('heading', { name: /business details/i })).toBeVisible({ timeout: 5000 });
    console.log('Step 3 visible');

    // Step 3: Business - Complete registration
    console.log('Clicking Complete Registration...');

    // Take a screenshot to see what we have
    await page.screenshot({ path: 'test-results/debug-step3.png' });

    // Check if form is already being submitted (loading state)
    const buttonText = await page.locator('button[type="submit"]').textContent();
    console.log(`Button text: ${buttonText}`);

    // Set up response listener
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/onboard/consultant/complete'),
      { timeout: 30000 }
    );

    // If not already loading, click the button
    if (!buttonText?.includes('Creating')) {
      const submitButton = page.getByRole('button', { name: /complete registration/i });
      await submitButton.click();
      console.log('Button clicked');
    } else {
      console.log('Form already submitting, waiting for response...');
    }

    // Wait for API response
    const response = await responsePromise;
    const status = response.status();
    console.log(`API Response status: ${status}`);

    if (status !== 201 && status !== 200) {
      const body = await response.text();
      console.log(`API Error: ${body}`);
      throw new Error(`Registration failed with status ${status}`);
    }

    console.log('Registration successful, waiting for success message...');

    // Verify success
    await expect(page.getByText(/welcome to corehr/i)).toBeVisible({ timeout: 15000 });
    console.log('Success message visible');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/i, { timeout: 10000 });
    console.log('Redirected to dashboard');

    // Verify on consultant dashboard - check for CRM section (consultant-specific)
    await expect(page.getByText('CRM')).toBeVisible();
  });

  test('2.4 Consultant can log in after registration', async ({ page }) => {
    // Go to regular login page
    await page.goto('/login');

    // Login with consultant credentials
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Verify dashboard content - check for consultant-specific navigation (CRM section header)
    await expect(page.locator('aside').getByText('CRM')).toBeVisible({ timeout: 10000 });
  });

  test('2.5 Consultant can log out', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Find and click logout button in sidebar (button with logout icon near user info)
    const logoutButton = page.locator('aside button').last();
    await logoutButton.click();

    // Should be redirected to login
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });
  });

});
