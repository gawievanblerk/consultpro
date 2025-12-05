/**
 * Task Routes - Collaboration Module (Module 1.5)
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/tasks - List all tasks
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, priority, assigned_to, client_id, due_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE t.tenant_id = $1 AND t.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (priority) {
      whereClause += ` AND t.priority = $${paramIndex}`;
      params.push(priority);
      paramIndex++;
    }

    if (assigned_to) {
      whereClause += ` AND t.assigned_to = $${paramIndex}`;
      params.push(assigned_to);
      paramIndex++;
    }

    if (client_id) {
      whereClause += ` AND t.client_id = $${paramIndex}`;
      params.push(client_id);
      paramIndex++;
    }

    if (due_date) {
      whereClause += ` AND t.due_date::date = $${paramIndex}::date`;
      params.push(due_date);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM tasks t ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT t.*, c.company_name as client_name
       FROM tasks t
       LEFT JOIN clients c ON t.client_id = c.id
       ${whereClause}
       ORDER BY t.due_date ASC, t.priority DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(countResult.rows[0].count / limit)
      }
    });

  } catch (error) {
    console.error('List tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/my - Get current user's tasks
router.get('/my', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.company_name as client_name
       FROM tasks t
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.tenant_id = $1 AND t.assigned_to = $2 AND t.status != 'completed' AND t.deleted_at IS NULL
       ORDER BY t.due_date ASC, t.priority DESC`,
      [req.tenant_id, req.user.id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/dashboard - Get task dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue,
        COUNT(*) FILTER (WHERE assigned_to = $2) as my_tasks
       FROM tasks
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [req.tenant_id, req.user.id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get task dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard stats' });
  }
});

// GET /api/tasks/stats - Get task stats (alias for dashboard)
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')) as overdue_count
       FROM tasks
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [req.tenant_id]
    );

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get task stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch task stats' });
  }
});

// GET /api/tasks/:id - Get task by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, c.company_name as client_name
       FROM tasks t
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.id = $1 AND t.tenant_id = $2 AND t.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch task' });
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req, res) => {
  try {
    const {
      title, description, client_id, engagement_id, lead_id,
      priority, status, due_date, assigned_to
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Task title is required'
      });
    }

    const id = uuidv4();

    // Convert empty strings to null for UUID fields
    const cleanClientId = client_id || null;
    const cleanEngagementId = engagement_id || null;
    const cleanLeadId = lead_id || null;
    const cleanDueDate = due_date || null;

    const result = await pool.query(
      `INSERT INTO tasks (
        id, tenant_id, title, description, client_id, engagement_id, lead_id,
        priority, status, due_date, assigned_to, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        id, req.tenant_id, title, description, cleanClientId, cleanEngagementId, cleanLeadId,
        priority || 'medium', status || 'pending', cleanDueDate,
        assigned_to || req.user.id, req.user.id
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ success: false, error: 'Failed to create task' });
  }
});

// PUT /api/tasks/:id - Update task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // UUID fields that should be null instead of empty string
    const uuidFields = ['client_id', 'engagement_id', 'lead_id', 'assigned_to'];

    const allowedFields = [
      'title', 'description', 'client_id', 'engagement_id', 'lead_id',
      'priority', 'status', 'due_date', 'assigned_to'
    ];

    const updateFields = [];
    const values = [id, req.tenant_id];
    let paramIndex = 3;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        // Convert empty strings to null for UUID fields
        let value = updates[field];
        if (uuidFields.includes(field) && value === '') {
          value = null;
        }
        values.push(value);
        paramIndex++;
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    // Add completed_at if status is being set to completed
    if (updates.status === 'completed') {
      updateFields.push('completed_at = NOW()');
    }

    updateFields.push('updated_at = NOW()');

    const result = await pool.query(
      `UPDATE tasks SET ${updateFields.join(', ')}
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, error: 'Failed to update task' });
  }
});

// PUT /api/tasks/:id/complete - Mark task as completed
router.put('/:id/complete', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE tasks
       SET status = 'completed', completed_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ success: false, error: 'Failed to complete task' });
  }
});

// PUT /api/tasks/:id/reassign - Reassign task to another user
router.put('/:id/reassign', async (req, res) => {
  try {
    const { assigned_to } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ success: false, error: 'New assignee is required' });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET assigned_to = $3, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [req.params.id, req.tenant_id, assigned_to]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Reassign task error:', error);
    res.status(500).json({ success: false, error: 'Failed to reassign task' });
  }
});

// DELETE /api/tasks/:id - Soft delete task
router.delete('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE tasks SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    res.json({ success: true, message: 'Task deleted successfully' });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
});

module.exports = router;
