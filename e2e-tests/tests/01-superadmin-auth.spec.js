// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * User Story 1: Superadmin Authentication
 *
 * As a platform superadmin,
 * I want to log in and out of the CoreHR platform,
 * So that I can manage HR consultancies on the platform.
 *
 * Acceptance Criteria:
 * - Superadmin can navigate to the superadmin login page
 * - Superadmin can log in with valid credentials
 * - After login, superadmin sees the admin dashboard
 * - Superadmin can log out successfully
 * - After logout, superadmin is redirected to login page
 */

test.describe('User Story 1: Superadmin Login and Logout', () => {

  test('1.1 Navigate to superadmin login page', async ({ page }) => {
    await page.goto('/superadmin/login');

    // Verify login page elements are visible
    await expect(page.getByRole('heading', { name: 'Super Admin Access' })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login|log in/i })).toBeVisible();
  });

  test('1.2 Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/superadmin/login');

    // Try to login with invalid credentials
    await page.getByLabel(/email/i).fill('wrong@email.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in|login|log in/i }).click();

    // Should stay on superadmin login page and show error
    await expect(page).toHaveURL(/superadmin\/login/i, { timeout: 5000 });

    // Should see an error message
    await expect(page.getByText(/invalid|incorrect|failed|not found/i)).toBeVisible({ timeout: 5000 });
  });

  test('1.3 Login with valid credentials succeeds', async ({ page }) => {
    await page.goto('/superadmin/login');

    // Login with valid superadmin credentials
    await page.getByLabel(/email/i).fill('admin@rozitech.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in|login|log in/i }).click();

    // Should be redirected to dashboard
    await expect(page).toHaveURL(/superadmin/i, { timeout: 15000 });

    // Should see Platform Dashboard heading
    await expect(page.getByRole('heading', { name: 'Platform Dashboard' })).toBeVisible({ timeout: 10000 });
  });

  test('1.4 Logged in superadmin can see dashboard stats', async ({ page }) => {
    // Login first
    await page.goto('/superadmin/login');
    await page.getByLabel(/email/i).fill('admin@rozitech.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in|login|log in/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/superadmin/i, { timeout: 15000 });

    // Dashboard should show key metrics
    await expect(page.getByText('Total Consultants')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Active Consultants')).toBeVisible();
    await expect(page.getByText('Total Companies')).toBeVisible();
    await expect(page.getByText('Total Employees')).toBeVisible();
  });

  test('1.5 Superadmin can logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/superadmin/login');
    await page.getByLabel(/email/i).fill('admin@rozitech.com');
    await page.getByLabel(/password/i).fill('Admin123!');
    await page.getByRole('button', { name: /sign in|login|log in/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/superadmin/i, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Platform Dashboard' })).toBeVisible();

    // The logout button is an icon button in the sidebar next to user info
    // Look for the button with logout icon (ArrowRightOnRectangleIcon)
    // It's near the user avatar showing "RA" and "Rozitech Admin"
    const logoutButton = page.locator('button').filter({ has: page.locator('svg') }).last();

    // Alternative: find by title attribute or aria-label
    const logoutByTitle = page.getByTitle(/sign out|logout/i);
    const logoutByRole = page.getByRole('button', { name: /sign out/i });

    // Try multiple selectors
    if (await logoutByTitle.isVisible().catch(() => false)) {
      await logoutByTitle.click();
    } else if (await logoutByRole.isVisible().catch(() => false)) {
      await logoutByRole.click();
    } else {
      // Click the icon button near user info at bottom of sidebar
      await page.locator('.flex.items-center.gap-3 button').click();
    }

    // Should be redirected to login page
    await expect(page).toHaveURL(/login/i, { timeout: 10000 });
  });

});
