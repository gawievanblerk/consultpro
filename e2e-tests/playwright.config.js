// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * CoreHR E2E Test Configuration
 * Tests run against local Docker deployment or production
 * Set PLAYWRIGHT_BASE_URL env var to override (default: localhost)
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially for predictable state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'reports' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list']
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5020',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Output folder for test artifacts
  outputDir: 'test-results/',
});
