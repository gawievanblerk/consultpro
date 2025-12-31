// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * User Story 4: Policy Management
 *
 * As an HR consultant,
 * I want to maintain a set of reusable policies,
 * So that I can share them with my clients for compliance management.
 *
 * Acceptance Criteria:
 * - Consultant can access the Policies page
 * - Consultant can upload policy documents (PDF)
 * - Consultant can assign policies to categories
 * - Consultant can publish policies
 * - Consultant can view and manage uploaded policies
 */

// Generate unique IDs for each test run
const testId = Date.now();

// Demo policy files to upload
const DEMO_POLICIES_DIR = path.join(__dirname, '../../demo-policies');

const demoPolicies = [
  {
    file: '01-Code-of-Conduct-Policy.pdf',
    title: 'Code of Conduct Policy',
    categoryCode: 'CODE_OF_CONDUCT',
    categoryName: 'Code of Conduct',
    description: 'Employee behavior and ethics guidelines for all staff members.'
  },
  {
    file: '02-NDPR-Data-Protection-Policy.pdf',
    title: 'NDPR Data Protection Policy',
    categoryCode: 'NDPR',
    categoryName: 'Data Protection (NDPR)',
    description: 'Nigeria Data Protection Regulation compliance requirements.'
  },
  {
    file: '03-Anti-Sexual-Harassment-Policy.pdf',
    title: 'Anti-Sexual Harassment Policy',
    categoryCode: 'SEXUAL_HARASSMENT',
    categoryName: 'Sexual Harassment',
    description: 'Zero tolerance policy against sexual harassment in the workplace.'
  },
  {
    file: '04-Leave-Policy.pdf',
    title: 'Leave Policy',
    categoryCode: 'LEAVE_POLICY',
    categoryName: 'Leave Policy',
    description: 'Annual, sick, and other leave entitlements and procedures.'
  },
  {
    file: '05-IT-Security-Policy.pdf',
    title: 'IT Security Policy',
    categoryCode: 'IT_SECURITY',
    categoryName: 'IT Security',
    description: 'Information security and acceptable use of company IT resources.'
  },
  {
    file: '06-Health-Safety-Policy.pdf',
    title: 'Health & Safety Policy',
    categoryCode: 'HEALTH_SAFETY',
    categoryName: 'Health & Safety',
    description: 'Workplace health and safety guidelines and procedures.'
  },
  {
    file: '07-Pension-NHF-Statutory-Deductions-Policy.pdf',
    title: 'Pension & Statutory Deductions Policy',
    categoryCode: 'PENSION',
    categoryName: 'Pension Compliance',
    description: 'Contributory pension scheme and NHF statutory deduction policies.'
  }
];

// Consultant credentials (created fresh for this test)
let consultantEmail = null;
const consultantPassword = 'TestPass123!';
let policyCategories = [];
let createdPolicyIds = [];

test.describe('User Story 4: Policy Management', () => {
  test.describe.configure({ mode: 'serial' });

  test('4.1 Consultant logs in', async ({ page }) => {
    // Create a fresh consultant for this test
    await page.goto('/superadmin/login');
    await page.getByLabel(/email/i).fill('admin@rozitech.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/superadmin/i, { timeout: 15000 });

    // Navigate to Consultants page
    await page.getByRole('link', { name: /consultants/i }).click();
    await expect(page.getByRole('heading', { name: /HR Consultants/i })).toBeVisible();

    // Create consultant for this test
    consultantEmail = `test.consultant.story4.${testId}@example.com`;
    const testCompany = `Story4 Policy Consulting ${testId}`;

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
    await page.locator('input').first().fill('Policy');
    await page.locator('input[type="text"]').nth(1).fill('Admin');
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

  test('4.2 Consultant navigates to Policies page', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Compliance > Policies (use exact match to avoid "Employee Compliance")
    await page.getByText('Compliance', { exact: true }).click();
    await page.getByRole('link', { name: /^policies$/i }).click();
    await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible();

    // Verify page elements
    await expect(page.getByRole('button', { name: /add policy/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search policies/i)).toBeVisible();

    // Get policy categories for later use
    policyCategories = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const apiUrl = 'https://consultpro-backend-950l.onrender.com';
      const response = await fetch(`${apiUrl}/api/policy-categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      return data.data || [];
    });

    console.log(`Found ${policyCategories.length} policy categories`);

    // If no categories exist, create them via API
    if (policyCategories.length === 0) {
      console.log('Creating policy categories...');
      const categoriesToCreate = [
        { name: 'Code of Conduct', code: 'CODE_OF_CONDUCT' },
        { name: 'Data Protection (NDPR)', code: 'NDPR' },
        { name: 'Sexual Harassment', code: 'SEXUAL_HARASSMENT' },
        { name: 'Leave Policy', code: 'LEAVE_POLICY' },
        { name: 'IT Security', code: 'IT_SECURITY' },
        { name: 'Health & Safety', code: 'HEALTH_SAFETY' },
        { name: 'Pension Compliance', code: 'PENSION' }
      ];

      policyCategories = await page.evaluate(async (categories) => {
        const token = localStorage.getItem('token');
        const apiUrl = 'https://consultpro-backend-950l.onrender.com';
        const created = [];

        for (const cat of categories) {
          const response = await fetch(`${apiUrl}/api/policy-categories`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(cat)
          });
          const data = await response.json();
          if (data.success) {
            created.push(data.data);
          }
        }
        return created;
      }, categoriesToCreate);

      console.log(`Created ${policyCategories.length} policy categories`);
    }

    expect(policyCategories.length).toBeGreaterThan(0);
  });

  test('4.3 Consultant uploads 7 demo policies', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Policies
    await page.getByText('Compliance', { exact: true }).click();
    await page.getByRole('link', { name: /^policies$/i }).click();
    await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible();

    // Get categories if not already loaded
    if (policyCategories.length === 0) {
      policyCategories = await page.evaluate(async () => {
        const token = localStorage.getItem('token');
        const apiUrl = 'https://consultpro-backend-950l.onrender.com';
        const response = await fetch(`${apiUrl}/api/policy-categories`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await response.json();
        return data.data || [];
      });
    }

    // Upload each policy
    for (const policy of demoPolicies) {
      // Find matching category
      const category = policyCategories.find(c => c.code === policy.categoryCode);
      if (!category) {
        console.log(`Warning: Category ${policy.categoryCode} not found, using first available`);
      }

      // Click Add Policy button
      await page.getByRole('button', { name: /add policy/i }).click();
      await expect(page.getByRole('heading', { name: /add policy/i })).toBeVisible();

      // Fill in policy details
      const modal = page.locator('[role="dialog"]').or(page.locator('.fixed.inset-0'));
      const form = modal.locator('form');

      // Title
      await form.locator('input[type="text"]').first().fill(policy.title);

      // Category dropdown
      const categorySelect = form.locator('select').first();
      if (category) {
        await categorySelect.selectOption(category.id);
      } else {
        // Select first available category
        const options = await categorySelect.locator('option').all();
        if (options.length > 1) {
          await categorySelect.selectOption({ index: 1 });
        }
      }

      // Description
      await form.locator('textarea').fill(policy.description);

      // File upload - find the hidden file input
      const fileInput = form.locator('input[type="file"]');
      const filePath = path.join(DEMO_POLICIES_DIR, policy.file);
      await fileInput.setInputFiles(filePath);

      // Wait for file to be selected
      await expect(form.getByText(policy.file)).toBeVisible({ timeout: 5000 });

      // Submit
      await form.getByRole('button', { name: /^create$/i }).click();

      // Wait for success message
      await expect(page.getByText(/policy created/i).first()).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1500); // Wait for toast to fade

      console.log(`Created policy: ${policy.title}`);
    }

    // Verify all 7 policies appear in the table
    for (const policy of demoPolicies) {
      // Use more specific selector - policy title in table row
      const policyRow = page.locator('tbody tr').filter({ hasText: policy.title });
      await expect(policyRow).toBeVisible({ timeout: 5000 });
    }

    // Get created policy IDs
    createdPolicyIds = await page.evaluate(async () => {
      const token = localStorage.getItem('token');
      const apiUrl = 'https://consultpro-backend-950l.onrender.com';
      const response = await fetch(`${apiUrl}/api/policies`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      return data.data?.map(p => ({ id: p.id, title: p.title, status: p.status })) || [];
    });

    console.log(`Created ${createdPolicyIds.length} policies`);
    expect(createdPolicyIds.length).toBe(7);
  });

  test('4.4 Consultant publishes policies', async ({ page }) => {
    expect(createdPolicyIds.length).toBe(7);

    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Policies
    await page.getByText('Compliance', { exact: true }).click();
    await page.getByRole('link', { name: /^policies$/i }).click();
    await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible();

    // Publish first 3 policies (others remain as drafts)
    const policiesToPublish = demoPolicies.slice(0, 3);

    for (const policy of policiesToPublish) {
      // Find the policy row
      const policyRow = page.locator('tr').filter({ hasText: policy.title });
      await expect(policyRow).toBeVisible();

      // Click the publish button (check circle icon)
      const publishButton = policyRow.locator('button[title="Publish"]');

      if (await publishButton.isVisible()) {
        await publishButton.click();

        // Confirm publish dialog - wait for dialog to appear
        await expect(page.getByText(/publish policy/i)).toBeVisible({ timeout: 5000 });
        // The dialog confirm button has bg-primary-900 styling - use the dialog footer button
        const confirmBtn = page.locator('.fixed.inset-0 button.bg-primary-900').filter({ hasText: 'Publish' });
        await confirmBtn.click();

        // Wait for success
        await expect(page.getByText(/policy published/i).first()).toBeVisible({ timeout: 10000 });
        await page.waitForTimeout(1500);

        console.log(`Published policy: ${policy.title}`);
      }
    }

    // Verify published policies show "Published" badge
    for (const policy of policiesToPublish) {
      const policyRow = page.locator('tr').filter({ hasText: policy.title });
      await expect(policyRow.getByText(/published/i)).toBeVisible();
    }

    console.log(`Published ${policiesToPublish.length} policies`);
  });

  test('4.5 Consultant can filter and search policies', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Policies
    await page.getByText('Compliance', { exact: true }).click();
    await page.getByRole('link', { name: /^policies$/i }).click();
    await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible();

    // Test search - use table row selector for policies
    await page.getByPlaceholder(/search policies/i).fill('Leave');
    const leaveRow = page.locator('tbody tr').filter({ hasText: 'Leave Policy' });
    await expect(leaveRow).toBeVisible();
    // Others should be filtered out
    const conductRow = page.locator('tbody tr').filter({ hasText: 'Code of Conduct Policy' });
    await expect(conductRow).not.toBeVisible();

    // Clear search
    await page.getByPlaceholder(/search policies/i).clear();
    await expect(conductRow).toBeVisible();

    // Test status filter - Published
    const statusSelect = page.locator('select').nth(0);
    await statusSelect.selectOption('published');
    await page.waitForTimeout(500);

    // Should only show published policies (first 3) - use table row selectors
    await expect(page.locator('tbody tr').filter({ hasText: 'Code of Conduct Policy' })).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: 'NDPR Data Protection Policy' })).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: 'Anti-Sexual Harassment Policy' })).toBeVisible();

    // Filter by draft
    await statusSelect.selectOption('draft');
    await page.waitForTimeout(500);

    // Should show draft policies
    await expect(page.locator('tbody tr').filter({ hasText: 'Leave Policy' })).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: 'IT Security Policy' })).toBeVisible();

    // Reset filter
    await statusSelect.selectOption('');
    await page.waitForTimeout(500);

    console.log('Search and filter functionality verified');
  });

  test('4.6 Consultant can view policy details', async ({ page }) => {
    // Login as consultant
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(consultantEmail);
    await page.getByLabel(/password/i).fill(consultantPassword);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/dashboard/i, { timeout: 15000 });

    // Navigate to Policies
    await page.getByText('Compliance', { exact: true }).click();
    await page.getByRole('link', { name: /^policies$/i }).click();
    await expect(page.getByRole('heading', { name: /policies/i })).toBeVisible();

    // Click edit on first policy
    const firstPolicyRow = page.locator('tr').filter({ hasText: 'Code of Conduct Policy' });
    await firstPolicyRow.locator('button[title="Edit"]').click();

    // Verify modal opens with policy details
    await expect(page.getByRole('heading', { name: /edit policy/i })).toBeVisible();

    const modal = page.locator('[role="dialog"]').or(page.locator('.fixed.inset-0'));
    const form = modal.locator('form');

    // Verify title is populated
    const titleInput = form.locator('input[type="text"]').first();
    await expect(titleInput).toHaveValue('Code of Conduct Policy');

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('heading', { name: /edit policy/i })).not.toBeVisible();

    console.log('Policy details view verified');
  });

  test('4.7 Consultant can log out', async ({ page }) => {
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
