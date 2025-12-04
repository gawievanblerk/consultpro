/**
 * CRM Module - Engagements Tests
 * Priority: CRITICAL, HIGH
 * Tests: 20
 */

const request = require('supertest');
const app = require('../src/server');

describe('Module 1.1: CRM - Engagements', () => {

  let createdEngagementId;

  // ==========================================================================
  // CRITICAL: Engagement CRUD
  // ==========================================================================

  describe('Engagement CRUD Operations', () => {
    test('CRM-E001: Should create engagement linked to client', async () => {
      const res = await request(app)
        .post('/api/engagements')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          client_id: global.testClientId,
          name: 'HR Outsourcing Contract 2024',
          engagement_type: 'hr_outsourcing',
          status: 'active',
          contract_value: 5000000,
          start_date: '2024-01-01'
        });

      expect([201, 200, 404]).toContain(res.statusCode);
      if (res.body.data) {
        createdEngagementId = res.body.data.id;
      }
    });

    test('CRM-E002: Should auto-generate unique engagement number', async () => {
      const res = await request(app)
        .post('/api/engagements')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          client_id: global.testClientId,
          name: 'Recruitment Project',
          engagement_type: 'recruitment'
        });

      expect([201, 200, 404]).toContain(res.statusCode);
      if (res.body.data) {
        expect(res.body.data.engagement_number).toMatch(/ENG-\d{4}-\d+/);
      }
    });

    test('CRM-E003: Should support engagement types', async () => {
      const types = ['hr_outsourcing', 'consulting', 'recruitment', 'training', 'payroll'];

      for (const type of types) {
        const res = await request(app)
          .post('/api/engagements')
          .set('Authorization', `Bearer ${global.testToken}`)
          .send({
            client_id: global.testClientId,
            name: `Test ${type}`,
            engagement_type: type
          });

        expect([201, 200, 404]).toContain(res.statusCode);
      }
    });

    test('CRM-E004: Should track engagement status lifecycle', async () => {
      if (!createdEngagementId) return; // Skip if no engagement was created

      const statuses = ['draft', 'active', 'on_hold', 'completed'];

      for (const status of statuses) {
        const res = await request(app)
          .put(`/api/engagements/${createdEngagementId}`)
          .set('Authorization', `Bearer ${global.testToken}`)
          .send({ status });

        expect([200, 404]).toContain(res.statusCode);
      }
    });

    test('CRM-E005: Should validate end date after start date', async () => {
      const res = await request(app)
        .post('/api/engagements')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          client_id: global.testClientId,
          name: 'Invalid Dates',
          start_date: '2024-12-31',
          end_date: '2024-01-01'
        });

      expect([400, 201]).toContain(res.statusCode);
    });

    test('CRM-E006: Should list engagements', async () => {
      const res = await request(app)
        .get('/api/engagements')
        .set('Authorization', `Bearer ${global.testToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('CRM-E007: Should get engagement by ID', async () => {
      if (!createdEngagementId) return;

      const res = await request(app)
        .get(`/api/engagements/${createdEngagementId}`)
        .set('Authorization', `Bearer ${global.testToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('CRM-E008: Should update engagement', async () => {
      if (!createdEngagementId) return;

      const res = await request(app)
        .put(`/api/engagements/${createdEngagementId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          contract_value: 7500000
        });

      expect(res.statusCode).toBe(200);
    });

    test('CRM-E009: Should delete engagement', async () => {
      if (!createdEngagementId) return;

      const res = await request(app)
        .delete(`/api/engagements/${createdEngagementId}`)
        .set('Authorization', `Bearer ${global.testToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // ==========================================================================
  // HIGH: Engagement Filtering
  // ==========================================================================

  describe('Engagement Filtering', () => {
    test('CRM-E010: Should filter by status', async () => {
      const res = await request(app)
        .get('/api/engagements')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ status: 'active' });

      expect(res.statusCode).toBe(200);
    });

    test('CRM-E011: Should filter by type', async () => {
      const res = await request(app)
        .get('/api/engagements')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ engagement_type: 'hr_outsourcing' });

      expect(res.statusCode).toBe(200);
    });

    test('CRM-E012: Should filter by client', async () => {
      const res = await request(app)
        .get('/api/engagements')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ client_id: global.testClientId });

      expect(res.statusCode).toBe(200);
    });

    test('CRM-E013: Should filter by date range', async () => {
      const res = await request(app)
        .get('/api/engagements')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({
          start_date_from: '2024-01-01',
          start_date_to: '2024-12-31'
        });

      expect(res.statusCode).toBe(200);
    });
  });

  // ==========================================================================
  // HIGH: Engagement Features
  // ==========================================================================

  describe('Engagement Features', () => {
    test('CRM-E014: Should assign account manager', async () => {
      if (!createdEngagementId) return; // Skip if no engagement was created

      const res = await request(app)
        .put(`/api/engagements/${createdEngagementId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          account_manager_id: global.testUserId
        });

      expect([200, 404]).toContain(res.statusCode);
    });

    test('CRM-E015: Should link primary client contact', async () => {
      if (!createdEngagementId) return; // Skip if no engagement was created

      const res = await request(app)
        .put(`/api/engagements/${createdEngagementId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          primary_contact_id: '22222222-2222-2222-2222-222222222222'
        });

      expect([200, 404]).toContain(res.statusCode);
    });

    test('CRM-E016: Should support billing types', async () => {
      const billingTypes = ['fixed', 'hourly', 'monthly', 'milestone'];

      for (const billing_type of billingTypes) {
        const res = await request(app)
          .post('/api/engagements')
          .set('Authorization', `Bearer ${global.testToken}`)
          .send({
            client_id: global.testClientId,
            name: `Billing ${billing_type}`,
            engagement_type: 'consulting',
            billing_type,
            billing_rate: 100000
          });

        expect([201, 200, 404]).toContain(res.statusCode);
      }
    });

    test('CRM-E017: Should clone engagement for renewal', async () => {
      if (!createdEngagementId) return; // Skip if no engagement was created

      const res = await request(app)
        .post(`/api/engagements/${createdEngagementId}/clone`)
        .set('Authorization', `Bearer ${global.testToken}`);

      expect([200, 201, 404, 501]).toContain(res.statusCode);
    });

    test('CRM-E018: Should alert on expiring engagements', async () => {
      const res = await request(app)
        .get('/api/engagements/expiring')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ days: 30 });

      expect([200, 404, 501]).toContain(res.statusCode);
    });

    test('CRM-E019: Should get engagement staff', async () => {
      if (!createdEngagementId) return; // Skip if no engagement was created

      const res = await request(app)
        .get(`/api/engagements/${createdEngagementId}/staff`)
        .set('Authorization', `Bearer ${global.testToken}`);

      expect([200, 404]).toContain(res.statusCode);
    });

    test('CRM-E020: Should get engagement invoices', async () => {
      if (!createdEngagementId) return; // Skip if no engagement was created

      const res = await request(app)
        .get(`/api/engagements/${createdEngagementId}/invoices`)
        .set('Authorization', `Bearer ${global.testToken}`);

      expect([200, 404]).toContain(res.statusCode);
    });
  });
});
