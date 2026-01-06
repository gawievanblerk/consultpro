const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================================================
// PROBATION CHECK-IN TASKS
// ============================================================================

/**
 * GET /api/probation-checkins
 * List all probation check-in tasks
 */
router.get('/', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id, status, manager_id, upcoming_days } = req.query;

    let query = `
      SELECT
        pc.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.hire_date,
        m.first_name || ' ' || m.last_name as manager_name,
        c.legal_name as company_name,
        u.first_name || ' ' || u.last_name as hr_assignee_name,
        pr.id as has_review
      FROM probation_checkin_tasks pc
      JOIN employees e ON pc.employee_id = e.id
      JOIN companies c ON pc.company_id = c.id
      LEFT JOIN employees m ON pc.manager_id = m.id
      LEFT JOIN users u ON pc.hr_assignee_id = u.id
      LEFT JOIN probation_reviews pr ON pc.probation_review_id = pr.id
      WHERE pc.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIdx = 2;

    if (company_id) {
      query += ` AND pc.company_id = $${paramIdx++}`;
      params.push(company_id);
    }

    if (status) {
      query += ` AND pc.status = $${paramIdx++}`;
      params.push(status);
    }

    if (manager_id) {
      query += ` AND pc.manager_id = $${paramIdx++}`;
      params.push(manager_id);
    }

    // Filter for upcoming check-ins within N days
    if (upcoming_days) {
      query += ` AND pc.scheduled_date <= CURRENT_DATE + INTERVAL '${parseInt(upcoming_days)} days'`;
      query += ` AND pc.status IN ('scheduled', 'reminder_sent')`;
    }

    query += ' ORDER BY pc.scheduled_date ASC, pc.checkin_day ASC';

    const result = await pool.query(query, params);

    // Add status indicators
    const today = new Date();
    const tasks = result.rows.map(task => {
      const scheduledDate = new Date(task.scheduled_date);
      const daysUntil = Math.ceil((scheduledDate - today) / (1000 * 60 * 60 * 24));

      return {
        ...task,
        days_until: daysUntil,
        is_overdue: daysUntil < 0 && !['completed', 'skipped', 'cancelled'].includes(task.status),
        is_due_soon: daysUntil >= 0 && daysUntil <= 3 && task.status === 'scheduled'
      };
    });

    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('Error fetching probation check-ins:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch check-in tasks' });
  }
});

/**
 * GET /api/probation-checkins/dashboard
 * Get dashboard summary of check-in tasks
 */
router.get('/dashboard', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { company_id } = req.query;

    let whereClause = 'WHERE pc.tenant_id = $1';
    const params = [tenantId];

    if (company_id) {
      whereClause += ' AND pc.company_id = $2';
      params.push(company_id);
    }

    // Get counts by status
    const countsResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
        COUNT(*) FILTER (WHERE status = 'reminder_sent') as reminder_sent,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status IN ('scheduled', 'reminder_sent') AND scheduled_date < CURRENT_DATE) as overdue,
        COUNT(*) FILTER (WHERE status IN ('scheduled', 'reminder_sent') AND scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days') as due_this_week
      FROM probation_checkin_tasks pc
      ${whereClause}
    `, params);

    // Get upcoming check-ins (next 14 days)
    const upcomingResult = await pool.query(`
      SELECT
        pc.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        m.first_name || ' ' || m.last_name as manager_name
      FROM probation_checkin_tasks pc
      JOIN employees e ON pc.employee_id = e.id
      LEFT JOIN employees m ON pc.manager_id = m.id
      ${whereClause}
        AND pc.status IN ('scheduled', 'reminder_sent')
        AND pc.scheduled_date <= CURRENT_DATE + INTERVAL '14 days'
      ORDER BY pc.scheduled_date ASC
      LIMIT 10
    `, params);

    res.json({
      success: true,
      data: {
        counts: countsResult.rows[0],
        upcoming: upcomingResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dashboard' });
  }
});

/**
 * GET /api/probation-checkins/employee/:employeeId
 * Get check-in tasks for a specific employee
 */
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { employeeId } = req.params;

    const result = await pool.query(`
      SELECT
        pc.*,
        m.first_name || ' ' || m.last_name as manager_name,
        u.first_name || ' ' || u.last_name as hr_assignee_name,
        cu.first_name || ' ' || cu.last_name as completed_by_name,
        pr.status as review_status,
        pr.recommendation as review_recommendation
      FROM probation_checkin_tasks pc
      LEFT JOIN employees m ON pc.manager_id = m.id
      LEFT JOIN users u ON pc.hr_assignee_id = u.id
      LEFT JOIN users cu ON pc.completed_by = cu.id
      LEFT JOIN probation_reviews pr ON pc.probation_review_id = pr.id
      WHERE pc.employee_id = $1 AND pc.tenant_id = $2
      ORDER BY pc.checkin_day ASC
    `, [employeeId, tenantId]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employee check-ins:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch check-in tasks' });
  }
});

/**
 * GET /api/probation-checkins/:id
 * Get single check-in task details
 */
router.get('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        pc.*,
        e.first_name || ' ' || e.last_name as employee_name,
        e.employee_number,
        e.job_title,
        e.department,
        e.hire_date,
        m.first_name || ' ' || m.last_name as manager_name,
        m.email as manager_email,
        c.legal_name as company_name,
        u.first_name || ' ' || u.last_name as hr_assignee_name,
        cu.first_name || ' ' || cu.last_name as completed_by_name
      FROM probation_checkin_tasks pc
      JOIN employees e ON pc.employee_id = e.id
      JOIN companies c ON pc.company_id = c.id
      LEFT JOIN employees m ON pc.manager_id = m.id
      LEFT JOIN users u ON pc.hr_assignee_id = u.id
      LEFT JOIN users cu ON pc.completed_by = cu.id
      WHERE pc.id = $1 AND pc.tenant_id = $2
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in task not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching check-in task:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch check-in task' });
  }
});

/**
 * POST /api/probation-checkins/employee/:employeeId/schedule
 * Auto-schedule probation check-ins for an employee
 */
router.post('/employee/:employeeId/schedule', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = req.user.tenant_id;
    const { employeeId } = req.params;
    const { checkin_days = [30, 60, 90], hr_assignee_id } = req.body;

    await client.query('BEGIN');

    // Get employee details
    const employeeResult = await client.query(`
      SELECT id, company_id, hire_date, reports_to
      FROM employees
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
    `, [employeeId, tenantId]);

    if (employeeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const employee = employeeResult.rows[0];
    const hireDate = employee.hire_date || new Date();

    // Check for existing check-ins
    const existingResult = await client.query(`
      SELECT checkin_day FROM probation_checkin_tasks
      WHERE employee_id = $1 AND status NOT IN ('cancelled', 'skipped')
    `, [employeeId]);

    const existingDays = existingResult.rows.map(r => r.checkin_day);

    // Create check-ins for days not already scheduled
    const createdTasks = [];

    for (const days of checkin_days) {
      if (existingDays.includes(days)) continue;

      const scheduledDate = new Date(hireDate);
      scheduledDate.setDate(scheduledDate.getDate() + days);

      const result = await client.query(`
        INSERT INTO probation_checkin_tasks (
          tenant_id, company_id, employee_id,
          checkin_type, checkin_day, checkin_name,
          scheduled_date, manager_id, hr_assignee_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        tenantId,
        employee.company_id,
        employeeId,
        `${days}_day`,
        days,
        `${days}-Day Probation Check-in`,
        scheduledDate,
        employee.reports_to,
        hr_assignee_id || null
      ]);

      createdTasks.push(result.rows[0]);
    }

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: `${createdTasks.length} check-in task(s) scheduled`,
      data: createdTasks
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error scheduling check-ins:', error);
    res.status(500).json({ success: false, error: 'Failed to schedule check-ins' });
  } finally {
    client.release();
  }
});

/**
 * PUT /api/probation-checkins/:id
 * Update a check-in task
 */
router.put('/:id', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const {
      scheduled_date,
      manager_id,
      hr_assignee_id,
      meeting_scheduled_at,
      meeting_location,
      meeting_notes
    } = req.body;

    const result = await pool.query(`
      UPDATE probation_checkin_tasks
      SET scheduled_date = COALESCE($1, scheduled_date),
          manager_id = COALESCE($2, manager_id),
          hr_assignee_id = COALESCE($3, hr_assignee_id),
          meeting_scheduled_at = COALESCE($4, meeting_scheduled_at),
          meeting_location = COALESCE($5, meeting_location),
          meeting_notes = COALESCE($6, meeting_notes),
          updated_at = NOW()
      WHERE id = $7 AND tenant_id = $8
      RETURNING *
    `, [
      scheduled_date,
      manager_id,
      hr_assignee_id,
      meeting_scheduled_at,
      meeting_location,
      meeting_notes,
      id,
      tenantId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in task not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating check-in task:', error);
    res.status(500).json({ success: false, error: 'Failed to update check-in task' });
  }
});

/**
 * PUT /api/probation-checkins/:id/complete
 * Mark a check-in task as completed
 */
router.put('/:id/complete', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { notes } = req.body;

    const result = await pool.query(`
      UPDATE probation_checkin_tasks
      SET status = 'completed',
          completed_at = NOW(),
          completed_by = $1,
          completion_notes = $2,
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4 AND status NOT IN ('completed', 'cancelled')
      RETURNING *
    `, [userId, notes, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in task not found or already completed' });
    }

    res.json({
      success: true,
      message: 'Check-in task completed',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error completing check-in task:', error);
    res.status(500).json({ success: false, error: 'Failed to complete check-in task' });
  }
});

/**
 * PUT /api/probation-checkins/:id/skip
 * Skip a check-in task
 */
router.put('/:id/skip', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const result = await pool.query(`
      UPDATE probation_checkin_tasks
      SET status = 'skipped',
          completed_at = NOW(),
          completed_by = $1,
          completion_notes = $2,
          updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4 AND status NOT IN ('completed', 'cancelled', 'skipped')
      RETURNING *
    `, [userId, reason || 'Skipped by user', id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in task not found' });
    }

    res.json({
      success: true,
      message: 'Check-in task skipped',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error skipping check-in task:', error);
    res.status(500).json({ success: false, error: 'Failed to skip check-in task' });
  }
});

/**
 * POST /api/probation-checkins/:id/create-review
 * Create a probation review from a check-in task
 */
router.post('/:id/create-review', async (req, res) => {
  const client = await pool.connect();
  try {
    const tenantId = req.user.tenant_id;
    const userId = req.user.id;
    const { id } = req.params;

    await client.query('BEGIN');

    // Get check-in task
    const taskResult = await client.query(`
      SELECT pc.*, e.company_id, e.probation_period_months
      FROM probation_checkin_tasks pc
      JOIN employees e ON pc.employee_id = e.id
      WHERE pc.id = $1 AND pc.tenant_id = $2
    `, [id, tenantId]);

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: 'Check-in task not found' });
    }

    const task = taskResult.rows[0];

    // Determine review type based on check-in day
    let reviewType = 'mid_probation';
    const probationMonths = task.probation_period_months || 3;
    const totalProbationDays = probationMonths * 30;

    if (task.checkin_day >= totalProbationDays - 15) {
      reviewType = 'end_probation';
    }

    // Create probation review
    const reviewResult = await client.query(`
      INSERT INTO probation_reviews (
        tenant_id, company_id, employee_id,
        review_type, review_date, reviewer_id,
        status
      ) VALUES ($1, $2, $3, $4, CURRENT_DATE, $5, 'draft')
      RETURNING *
    `, [
      tenantId,
      task.company_id,
      task.employee_id,
      reviewType,
      userId
    ]);

    const review = reviewResult.rows[0];

    // Link review to check-in task
    await client.query(`
      UPDATE probation_checkin_tasks
      SET probation_review_id = $1, status = 'in_progress', updated_at = NOW()
      WHERE id = $2
    `, [review.id, id]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Probation review created',
      data: {
        task_id: id,
        review_id: review.id,
        review_type: reviewType
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating review:', error);
    res.status(500).json({ success: false, error: 'Failed to create probation review' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/probation-checkins/:id/send-reminder
 * Send reminder for a check-in task
 */
router.post('/:id/send-reminder', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;

    // Update reminder tracking
    const result = await pool.query(`
      UPDATE probation_checkin_tasks
      SET reminder_sent_at = NOW(),
          reminder_count = reminder_count + 1,
          status = CASE WHEN status = 'scheduled' THEN 'reminder_sent' ELSE status END,
          updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in task not found' });
    }

    // TODO: Send actual email notification
    // await sendProbationCheckinReminder(result.rows[0]);

    res.json({
      success: true,
      message: 'Reminder sent successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ success: false, error: 'Failed to send reminder' });
  }
});

/**
 * POST /api/probation-checkins/:id/escalate
 * Escalate an overdue check-in task
 */
router.post('/:id/escalate', async (req, res) => {
  try {
    const tenantId = req.user.tenant_id;
    const { id } = req.params;
    const { escalate_to } = req.body;

    if (!escalate_to) {
      return res.status(400).json({ success: false, error: 'Escalation recipient is required' });
    }

    const result = await pool.query(`
      UPDATE probation_checkin_tasks
      SET escalation_sent_at = NOW(),
          escalated_to = $1,
          status = 'overdue',
          updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING *
    `, [escalate_to, id, tenantId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Check-in task not found' });
    }

    // TODO: Send escalation email
    // await sendProbationEscalation(result.rows[0]);

    res.json({
      success: true,
      message: 'Escalation sent successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error escalating task:', error);
    res.status(500).json({ success: false, error: 'Failed to escalate task' });
  }
});

module.exports = router;
