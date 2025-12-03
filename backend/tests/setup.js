/**
 * Test Setup Configuration
 * Sets up test database, utilities, and mock data
 */

require('dotenv').config({ path: '.env.test' });

const pool = require('../src/utils/db');

// Test tenant and user IDs
const TEST_TENANT_ID = '11111111-1111-1111-1111-111111111111';
const TEST_USER_ID = '22222222-2222-2222-2222-222222222222';
const TEST_CLIENT_ID = '33333333-3333-3333-3333-333333333333';

// Store test token globally
global.testToken = null;
global.testTenantId = TEST_TENANT_ID;
global.testUserId = TEST_USER_ID;
global.testClientId = TEST_CLIENT_ID;

// Helper to generate auth token for tests
const jwt = require('jsonwebtoken');

global.generateTestToken = (userId = TEST_USER_ID, tenantId = TEST_TENANT_ID, role = 'admin') => {
  // Use the same JWT structure that the auth middleware expects
  return jwt.sign(
    {
      sub: userId,           // Auth middleware uses 'sub' for user ID
      org: tenantId,         // Auth middleware uses 'org' for tenant ID
      email: 'test@teamace.ng',
      role,
      products: ['consultpro']
    },
    process.env.JWT_SECRET || 'consultpro_docker_demo_secret_key_2025_standalone',
    { expiresIn: '1h' }
  );
};

// Setup before all tests
beforeAll(async () => {
  global.testToken = global.generateTestToken();
});

// Cleanup after all tests
afterAll(async () => {
  await pool.end();
});

// Export test utilities
module.exports = {
  TEST_TENANT_ID,
  TEST_USER_ID,
  TEST_CLIENT_ID,
  pool
};
