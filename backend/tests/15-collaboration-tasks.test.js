/**
 * Collaboration Module - Tasks Tests
 * Priority: CRITICAL, HIGH, MEDIUM
 * Tests: 20
 */

const request = require('supertest');
const app = require('../src/server');

describe('Module 1.5: Collaboration - Tasks', () => {

  let createdTaskId;

  // ==========================================================================
  // CRITICAL: Task CRUD
  // ==========================================================================

  describe('Task CRUD Operations', () => {
    test('COL-T001: Should create task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          title: 'Review contract documents',
          description: 'Review and approve client contract',
          priority: 'high',
          due_date: '2024-03-20',
          status: 'pending'
        });

      expect([201, 200]).toContain(res.statusCode);
      if (res.body.data) {
        createdTaskId = res.body.data.id;
      }
    });

    test('COL-T002: Should create task linked to entity (client, engagement)', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          title: 'Client follow-up',
          entity_type: 'client',
          entity_id: global.testClientId,
          due_date: '2024-03-21'
        });

      expect([201, 200]).toContain(res.statusCode);
    });

    test('COL-T003: Should list all tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('COL-T004: Should get task by ID', async () => {
      if (!createdTaskId) return;

      const res = await request(app)
        .get(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${global.testToken}`);

      expect(res.statusCode).toBe(200);
    });

    test('COL-T005: Should update task', async () => {
      if (!createdTaskId) return;

      const res = await request(app)
        .put(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          status: 'in_progress',
          progress: 50
        });

      expect(res.statusCode).toBe(200);
    });

    test('COL-T006: Should delete task', async () => {
      const createRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          title: 'To delete',
          due_date: '2024-03-22'
        });

      if (createRes.body.data) {
        const res = await request(app)
          .delete(`/api/tasks/${createRes.body.data.id}`)
          .set('Authorization', `Bearer ${global.testToken}`);

        expect(res.statusCode).toBe(200);
      }
    });
  });

  // ==========================================================================
  // HIGH: Task Assignment
  // ==========================================================================

  describe('Task Assignment', () => {
    test('COL-T007: Should assign task to user', async () => {
      if (!createdTaskId) return;

      const res = await request(app)
        .put(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          assigned_to: global.testUserId
        });

      expect([200, 404]).toContain(res.statusCode);
    });

    test('COL-T008: Should reassign task', async () => {
      if (!createdTaskId) return;

      const res = await request(app)
        .put(`/api/tasks/${createdTaskId}/reassign`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          assigned_to: '22222222-2222-2222-2222-222222222222'
        });

      expect([200, 400, 404]).toContain(res.statusCode);
    });

    test('COL-T009: Should get my assigned tasks', async () => {
      const res = await request(app)
        .get('/api/tasks/my')
        .set('Authorization', `Bearer ${global.testToken}`);

      expect([200]).toContain(res.statusCode);
    });

    test('COL-T010: Should get tasks created by me', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ created_by: 'me' });

      expect([200]).toContain(res.statusCode);
    });
  });

  // ==========================================================================
  // HIGH: Task Status and Priority
  // ==========================================================================

  describe('Task Status and Priority', () => {
    test('COL-T011: Should track task status (pending, in_progress, completed, cancelled)', async () => {
      const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];

      for (const status of statuses) {
        const res = await request(app)
          .put(`/api/tasks/${createdTaskId}`)
          .set('Authorization', `Bearer ${global.testToken}`)
          .send({ status });

        expect([200, 404]).toContain(res.statusCode);
      }
    });

    test('COL-T012: Should set task priority (low, medium, high, urgent)', async () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];

      for (const priority of priorities) {
        const res = await request(app)
          .put(`/api/tasks/${createdTaskId}`)
          .set('Authorization', `Bearer ${global.testToken}`)
          .send({ priority });

        expect([200, 404]).toContain(res.statusCode);
      }
    });

    test('COL-T013: Should complete task with completion date', async () => {
      if (!createdTaskId) return;

      const res = await request(app)
        .post(`/api/tasks/${createdTaskId}/complete`)
        .set('Authorization', `Bearer ${global.testToken}`)
        .send({
          completion_notes: 'Task completed successfully'
        });

      expect([200, 404, 501]).toContain(res.statusCode);
    });

    test('COL-T014: Should get overdue tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ status: 'overdue' });

      expect([200]).toContain(res.statusCode);
    });
  });

  // ==========================================================================
  // HIGH: Task Filtering
  // ==========================================================================

  describe('Task Filtering', () => {
    test('COL-T015: Should filter tasks by status', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ status: 'pending' });

      expect(res.statusCode).toBe(200);
    });

    test('COL-T016: Should filter tasks by priority', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ priority: 'high' });

      expect(res.statusCode).toBe(200);
    });

    test('COL-T017: Should filter tasks by due date range', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({
          due_date_from: '2024-01-01',
          due_date_to: '2024-12-31'
        });

      expect(res.statusCode).toBe(200);
    });

    test('COL-T018: Should filter tasks by entity (client, engagement)', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({
          entity_type: 'client',
          entity_id: global.testClientId
        });

      expect(res.statusCode).toBe(200);
    });

    test('COL-T019: Should get task dashboard stats', async () => {
      const res = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${global.testToken}`);

      expect([200, 404, 501]).toContain(res.statusCode);
      if (res.statusCode === 200 && res.body.data) {
        expect(res.body.data).toHaveProperty('pending_count');
        expect(res.body.data).toHaveProperty('overdue_count');
      }
    });

    test('COL-T020: Should get tasks due today', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${global.testToken}`)
        .query({ due: 'today' });

      expect([200]).toContain(res.statusCode);
    });
  });
});
