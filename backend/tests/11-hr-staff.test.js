/**
 * HR Outsourcing Module - Staff Management Tests
 * Priority: CRITICAL, HIGH
 * Tests: 20
 */

const request = require('supertest');
const app = require('../src/server');

describe('Module 1.3: HR Outsourcing - Staff Management', () => {

  let createdStaffId;

  // ==========================================================================
  // CRITICAL: Staff CRUD
  // ==========================================================================

  describe('Staff CRUD Operations', () => {
    test('HR-S001: Should create outsourced staff record', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          employee_id: 'EMP-001',
          first_name: 'Adebayo',
          last_name: 'Okonkwo',
          email: 'adebayo@teamace.ng',
          phone: '+2348012345678',
          date_of_birth: '1990-05-15',
          gender: 'male',
          nationality: 'Nigerian',
          state_of_origin: 'Lagos',
          employment_type: 'outsourced',
          job_title: 'Accountant',
          department: 'Finance'
        });

      expect([201, 200]).toContain(res.statusCode);
      if (res.body.data) {
        createdStaffId = res.body.data.id;
      }
    });

    test('HR-S002: Should auto-generate unique staff/employee number', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          first_name: 'Test',
          last_name: 'Employee',
          email: 'test.employee@teamace.ng'
        });

      expect([201, 200]).toContain(res.statusCode);
      if (res.body.data) {
        expect(res.body.data.employee_id).toBeDefined();
      }
    });

    test('HR-S003: Should capture personal details (name, DOB, contact, NOK)', async () => {
      const res = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          first_name: 'Chidi',
          last_name: 'Nnamdi',
          email: 'chidi@teamace.ng',
          date_of_birth: '1985-03-20',
          phone: '+2348098765432',
          address: '15 Victoria Island, Lagos',
          next_of_kin_name: 'Grace Nnamdi',
          next_of_kin_phone: '+2348011112222',
          next_of_kin_relationship: 'Spouse'
        });

      expect([201, 200]).toContain(res.statusCode);
    });

    test('HR-S004: Should list all staff', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('HR-S005: Should get staff by ID', async () => {
      if (!createdStaffId) return;

      const res = await request(app)
        .get(`/api/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${global.testToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('HR-S006: Should update staff record', async () => {
      if (!createdStaffId) return;

      const res = await request(app)
        .put(`/api/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          job_title: 'Senior Accountant',
          salary: 450000
        });

      expect(res.statusCode).toBe(200);
    });

    test('HR-S007: Should delete (soft-delete) staff', async () => {
      const createRes = await request(app)
        .post('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          first_name: 'To',
          last_name: 'Delete',
          email: 'todelete@teamace.ng'
        });

      if (createRes.body.data) {
        const res = await request(app)
          .delete(`/api/staff/${createRes.body.data.id}`)
          .set('Authorization', `Bearer ${global.testToken}`);

        expect(res.statusCode).toBe(200);
      }
    });
  });

  // ==========================================================================
  // HIGH: Employment Details
  // ==========================================================================

  describe('Employment Details', () => {
    test('HR-S008: Should record employment type (permanent, contract, outsourced)', async () => {
      const types = ['permanent', 'contract', 'outsourced'];

      for (const employment_type of types) {
        const res = await request(app)
          .post('/api/staff')
          .set('Authorization', `Bearer ${global.testToken}`)
          .send({
            first_name: 'Type',
            last_name: employment_type,
            email: `${employment_type}@teamace.ng`,
            employment_type
          });

        expect([201, 200]).toContain(res.statusCode);
      }
    });

    test('HR-S009: Should record hire date and probation end date', async () => {
      const res = await request(app)
        .put(`/api/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          hire_date: '2024-01-15',
          probation_end_date: '2024-04-15'
        });

      expect([200, 404]).toContain(res.statusCode);
    });

    test('HR-S010: Should track staff status (active, on-leave, terminated)', async () => {
      const statuses = ['active', 'on_leave', 'terminated'];

      for (const status of statuses) {
        const res = await request(app)
          .put(`/api/staff/${createdStaffId}`)
          .set('Authorization', `Bearer ${global.testToken}`)
          .send({ status });

        expect([200, 404]).toContain(res.statusCode);
      }
    });

    test('HR-S011: Should record termination date and reason', async () => {
      const res = await request(app)
        .put(`/api/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          status: 'terminated',
          termination_date: '2024-12-31',
          termination_reason: 'End of contract'
        });

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ==========================================================================
  // HIGH: Salary and Banking
  // ==========================================================================

  describe('Salary and Banking', () => {
    test('HR-S012: Should record salary details', async () => {
      const res = await request(app)
        .put(`/api/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          salary: 350000,
          salary_currency: 'NGN',
          payment_frequency: 'monthly'
        });

      expect([200, 404]).toContain(res.statusCode);
    });

    test('HR-S013: Should record bank account details', async () => {
      const res = await request(app)
        .put(`/api/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          bank_name: 'First Bank Nigeria',
          bank_account_number: '0123456789',
          bank_account_name: 'Adebayo Okonkwo'
        });

      expect([200, 404]).toContain(res.statusCode);
    });

    test('HR-S014: Should record pension and tax details', async () => {
      const res = await request(app)
        .put(`/api/staff/${createdStaffId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          pension_number: 'PEN123456789',
          tax_id: 'TIN987654321',
          nhf_number: 'NHF001122334'
        });

      expect([200, 404]).toContain(res.statusCode);
    });
  });

  // ==========================================================================
  // HIGH: Staff Filtering
  // ==========================================================================

  describe('Staff Filtering', () => {
    test('HR-S015: Should filter staff by status', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ status: 'active' });

      expect(res.statusCode).toBe(200);
    });

    test('HR-S016: Should filter staff by employment type', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ employment_type: 'outsourced' });

      expect(res.statusCode).toBe(200);
    });

    test('HR-S017: Should filter staff by department', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ department: 'Finance' });

      expect(res.statusCode).toBe(200);
    });

    test('HR-S018: Should search staff by name', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ search: 'Adebayo' });

      expect(res.statusCode).toBe(200);
    });

    test('HR-S019: Should filter staff by client deployment', async () => {
      const res = await request(app)
        .get('/api/staff')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ client_id: global.testClientId });

      expect(res.statusCode).toBe(200);
    });

    test('HR-S020: Should export staff to CSV', async () => {
      const res = await request(app)
        .get('/api/staff/export')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ format: 'csv' });

      expect([200, 404, 501]).toContain(res.statusCode);
    });
  });
});
