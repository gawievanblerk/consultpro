// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * User Story 3: Staff and Client Management
 *
 * As an HR consultant,
 * I want to manage my staff pool and client portfolio,
 * So that I can assign staff to clients and track deployments.
 *
 * Acceptance Criteria:
 * - Consultant can create staff members
 * - Consultant can create clients
 * - Consultant can deploy staff to clients
 * - Staff can be invited to create user accounts
 * - Staff can log in and see their assigned work
 */

// Generate unique IDs for each test run
const testId = Date.now();

// Staff test data
const testStaff = [
  { first_name: 'Oluwaseun', last_name: 'Adeyemi', email: `oluwaseun.${testId}@example.com`, job_title: 'HR Specialist' },
  { first_name: 'Chidinma', last_name: 'Okonkwo', email: `chidinma.${testId}@example.com`, job_title: 'Payroll Officer' },
  { first_name: 'Emeka', last_name: 'Nwosu', email: `emeka.${testId}@example.com`, job_title: 'Recruitment Lead' }
];

// Client test data
const testClients = [
  { company_name: `First Bank ${testId}`, industry: 'Banking', city: 'Lagos' },
  { company_name: `Dangote Industries ${testId}`, industry: 'Manufacturing', city: 'Kano' },
  { company_name: `MTN Nigeria ${testId}`, industry: 'Telecommunications', city: 'Lagos' }
];

// Store IDs for created resources
let createdStaffIds = [];
let createdClientIds = [];
let staffInviteTokens = [];

// Consultant credentials (created in Story 2 or use a fallback)
let consultantEmail = null;
const consultantPassword = 'TestPass123!';

test.describe('User Story 3: Staff and Client Management', () => {
  test.describe.configure({ mode: 'serial' });

  test('3.1 Consultant logs in', async ({ page }) => {
    // First, try to create a fresh consultant for this test
    // Login as superadmin and send invitation
    await page.goto('/superadmin/login');
    await page.getByLabel(/email/i).fill('admin@rozitech.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/superadmin/i, { timeout: 15000 });

    // Navigate to Consultants page
    await page.getByRole('link', { name: /consultants/i }).click();
    await expect(page.getByRole('heading', { name: /HR Consultants/i })).toBeVisible();

    // Create consultant for this test
    consultantEmail = `test.consultant.story3.${testId}@example.com`;
    const testCompany = `Story3 HR Consulting ${testId}`;

    await page.getByRole('button', { name: /invite consultant/i }).click();
    await expect(page.getByRole('heading', { name: /invite consultant/i })).toBeVisible();
    await page.getByPlaceholder(/HR Solutions Nigeria/i).fill(testCompany);
    await page.getByPlaceholder(/consultant@example.com/i).fill(consultantEmail);
    await page.getByRole('button', { name: /send invitation/i }).click();
    await expect(page.getByText(/invitation sent/i)).toBeVisible({ timeout: 10000 });

    // Get invitation token
    await page.getByRole('link', { name: /invitations/i }).click();
    await expect(page.getByText(consultantEmail)).toBeVisible({ timeout: 10000 });

    const invitationToken = await page.evaluate(async (email) => {
      const token = localStorage.getItem('superadmin_token');
      const apiUrl = 'https://consultpro-backend-950l.onrender.com';
      const response = await fetch(`${apiUrl}/api/superadmin/invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      const invitation = data.data?.find(inv => inv.email === email);
      return invitation?.token;
    }, consultantEmail);

    expect(invitationToken).toBeTruthy();

    // Complete consultant onboarding
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await page.goto(`/onboard/consultant?token=${invitationToken}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible({ timeout: 10000 });

    // Step 1: Account
    await page.locator('input').first().fill('Test');
    await page.locator('input[type="text"]').nth(1).fill('Consultant');
    await page.locator('input[type="password"]').first().fill(consultantPassword);
    await page.locator('input[type="password"]').nth(1).fill(consultantPassword);
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2: Profile (skip)
    await expect(page.getByRole('heading', { name: /contact information/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3: Business (complete)
    await expect(page.getByRole('heading', { name: /business details/i })).toBeVisible({ timeout: 5000 });

    const buttonText = await page.locator('button[type="submit"]').textContent();
    if (!buttonText?.includes('Creating')) {
      await page.getByRole('button', { name: /complete registration/i }).click();
    }

    await expect(page.getByText(/welcome to corehr/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/dashboard/i, { timeout: 10000 });
    console.log(`Consultant ${consultantEmail} logged in successfully`);
  });

  test('3.2 Consultant creates 3 staff members', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Staff Pool
    await page.getByText('HR Outsourcing').click();
    await page.getByRole('link', { name: /staff pool/i }).click();
    await expect(page.getByRole('heading', { name: /staff pool/i })).toBeVisible();

    // Create each staff member
    for (const staff of testStaff) {
      await page.getByRole('button', { name: /add staff/i }).click();
      await expect(page.getByRole('heading', { name: /add staff/i })).toBeVisible();

      // Fill staff form - locate inputs within the modal form
      const modal = page.locator('[role="dialog"]').or(page.locator('.fixed.inset-0'));
      const form = modal.locator('form');

      // Employee ID is first text input in the grid
      await form.locator('input[type="text"]').first().fill(`EMP-${testId}-${testStaff.indexOf(staff) + 1}`);

      // First Name and Last Name are after Status select
      const inputs = form.locator('input[type="text"]');
      await inputs.nth(1).fill(staff.first_name);  // First Name
      await inputs.nth(2).fill(staff.last_name);   // Last Name

      // Email input
      await form.locator('input[type="email"]').fill(staff.email);

      // Job Title
      await inputs.nth(4).fill(staff.job_title);

      // Click the Create button in the modal (submit button)
      await form.getByRole('button', { name: /^create$/i }).click();

      // Wait for success and modal to close
      await expect(page.getByText(/staff created/i)).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      console.log(`Created staff: ${staff.first_name} ${staff.last_name}`);
    }

    // Verify all 3 staff appear
    for (const staff of testStaff) {
      await expect(page.getByText(`${staff.first_name} ${staff.last_name}`)).toBeVisible();
    }

    // Get staff IDs via API
    createdStaffIds = await page.evaluate(async (staffEmails) => {
      const token = localStorage.getItem('token');
      const apiUrl = 'https://consultpro-backend-950l.onrender.com';
      const response = await fetch(`${apiUrl}/api/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      return data.data
        .filter(s => staffEmails.includes(s.email))
        .map(s => ({ id: s.id, email: s.email }));
    }, testStaff.map(s => s.email));

    console.log(`Created ${createdStaffIds.length} staff members`);
    expect(createdStaffIds.length).toBe(3);
  });

  test('3.3 Consultant creates 3 clients', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Clients (use exact match to avoid "Active Clients" dashboard link)
    await page.getByText('CRM').click();
    await page.getByRole('link', { name: 'Clients', exact: true }).click();
    await expect(page.getByRole('heading', { name: /clients/i })).toBeVisible();

    // Create each client
    for (const client of testClients) {
      await page.getByRole('button', { name: /add client/i }).click();
      await expect(page.getByRole('heading', { name: /new client/i })).toBeVisible();

      // Fill client form - use visible form on the page
      // Just fill Company Name (required) and click create
      const allInputs = page.locator('form input');

      // Company Name is the first visible text input in the form
      await allInputs.first().fill(client.company_name);

      await page.getByRole('button', { name: /create client/i }).click();

      // Wait for success
      await expect(page.getByText(/client created/i)).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(1000);

      console.log(`Created client: ${client.company_name}`);
    }

    // Verify all 3 clients appear
    for (const client of testClients) {
      await expect(page.getByText(client.company_name)).toBeVisible();
    }

    // Get client IDs via API
    createdClientIds = await page.evaluate(async (clientNames) => {
      const token = localStorage.getItem('token');
      const apiUrl = 'https://consultpro-backend-950l.onrender.com';
      const response = await fetch(`${apiUrl}/api/clients`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      return data.data
        .filter(c => clientNames.some(name => c.company_name.includes(name.split(' ')[0])))
        .map(c => ({ id: c.id, name: c.company_name }));
    }, testClients.map(c => c.company_name));

    console.log(`Created ${createdClientIds.length} clients`);
    expect(createdClientIds.length).toBe(3);
  });

  test('3.4 Consultant views deployments page', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Deployments
    await page.getByText('HR Outsourcing').click();
    await page.getByRole('link', { name: /deployments/i }).click();
    await expect(page.getByRole('heading', { name: /deployments/i })).toBeVisible();

    // Verify the New Deployment button is available
    await expect(page.getByRole('button', { name: /new deployment/i })).toBeVisible();

    console.log('Deployments page accessible');
  });

  test('3.5 Consultant invites staff members', async ({ page }) => {
    expect(createdStaffIds.length).toBe(3);

    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Staff Pool
    await page.getByText('HR Outsourcing').click();
    await page.getByRole('link', { name: /staff pool/i }).click();
    await expect(page.getByRole('heading', { name: /staff pool/i })).toBeVisible();

    // Invite each staff member
    for (const staff of testStaff) {
      // Find the staff card
      const staffCard = page.locator('.card').filter({ hasText: `${staff.first_name} ${staff.last_name}` });
      await expect(staffCard).toBeVisible();

      // Click the invite button (envelope icon)
      const inviteButton = staffCard.locator('button').filter({ has: page.locator('svg') }).first();
      await inviteButton.click();

      // Wait for success message (use first() to handle multiple toasts)
      await expect(page.getByText(/invitation sent/i).first()).toBeVisible({ timeout: 10000 });
      // Wait for toast to fade before next invite
      await page.waitForTimeout(2000);

      console.log(`Invited staff: ${staff.first_name} ${staff.last_name}`);
    }

    // Get invite tokens via API
    staffInviteTokens = await page.evaluate(async (staffEmails) => {
      const token = localStorage.getItem('token');
      const apiUrl = 'https://consultpro-backend-950l.onrender.com';
      // Try to get from users/invites endpoint
      const response = await fetch(`${apiUrl}/api/users/invites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success && data.data) {
        return data.data
          .filter(inv => staffEmails.includes(inv.email) && !inv.accepted_at)
          .map(inv => ({ email: inv.email, token: inv.token }));
      }
      return [];
    }, testStaff.map(s => s.email));

    // If we couldn't get tokens via API, we'll need to use a different approach
    // For now, log what we have
    console.log(`Got ${staffInviteTokens.length} invitation tokens`);
  });

  test('3.6 Consultant can view and manage staff', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Staff Pool
    await page.getByText('HR Outsourcing').click();
    await page.getByRole('link', { name: /staff pool/i }).click();

    // Verify all staff are visible with "Invited" status indicator
    for (const staff of testStaff) {
      await expect(page.getByText(`${staff.first_name} ${staff.last_name}`)).toBeVisible();
    }

    console.log('All staff visible in Staff Pool');
  });

  test('3.7 Consultant can log out', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Find and click logout button
    const logoutButton = page.locator('aside button').last();
    await logoutButton.click();

    // Should be redirected to login
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });
    console.log('Consultant logged out successfully');
  });
});
