/**
 * Leave Requests Routes - Leave Management Module
 * CRUD operations for leave requests with approval workflow
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// Helper: Calculate working days between two dates (excluding weekends and holidays)
async function calculateWorkingDays(startDate, endDate, tenantId) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Get public holidays in the date range
  const holidaysResult = await pool.query(
    `SELECT date FROM public_holidays
     WHERE (tenant_id = $1 OR tenant_id IS NULL)
       AND date BETWEEN $2 AND $3`,
    [tenantId, startDate, endDate]
  );

  const holidays = new Set(holidaysResult.rows.map(h => h.date.toISOString().split('T')[0]));

  let workingDays = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    const dateStr = current.toISOString().split('T')[0];

    // Skip weekends (0 = Sunday, 6 = Saturday) and holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidays.has(dateStr)) {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return workingDays;
}

// GET /api/leave-requests - List leave requests
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, staff_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE lr.tenant_id = $1 AND lr.deleted_at IS NULL';
    let params = [req.tenant_id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND lr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (staff_id) {
      whereClause += ` AND lr.staff_id = $${paramIndex}`;
      params.push(staff_id);
      paramIndex++;
    }

    if (start_date) {
      whereClause += ` AND lr.start_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereClause += ` AND lr.end_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM leave_requests lr ${whereClause}`,
      params
    );

    const result = await pool.query(
      `SELECT lr.*,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        s.employee_id as staff_employee_id,
        s.department as staff_department,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.color as leave_type_color,
        u.first_name as approver_first_name,
        u.last_name as approver_last_name
       FROM leave_requests lr
       JOIN staff s ON lr.staff_id = s.id
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       LEFT JOIN users u ON lr.approver_id = u.id
       ${whereClause}
       ORDER BY lr.created_at DESC
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
    console.error('List leave requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave requests' });
  }
});

// GET /api/leave-requests/pending - Get pending requests for approval
router.get('/pending', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lr.*,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        s.employee_id as staff_employee_id,
        s.department as staff_department,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.color as leave_type_color
       FROM leave_requests lr
       JOIN staff s ON lr.staff_id = s.id
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.tenant_id = $1 AND lr.status = 'pending' AND lr.deleted_at IS NULL
       ORDER BY lr.created_at ASC`,
      [req.tenant_id]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch pending requests' });
  }
});

// GET /api/leave-requests/calendar - Get leave requests for calendar view
router.get('/calendar', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'start_date and end_date are required'
      });
    }

    const result = await pool.query(
      `SELECT lr.id, lr.start_date, lr.end_date, lr.days_requested, lr.status,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        lt.name as leave_type_name,
        lt.color as leave_type_color
       FROM leave_requests lr
       JOIN staff s ON lr.staff_id = s.id
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       WHERE lr.tenant_id = $1
         AND lr.deleted_at IS NULL
         AND lr.status IN ('pending', 'approved')
         AND lr.start_date <= $3
         AND lr.end_date >= $2
       ORDER BY lr.start_date`,
      [req.tenant_id, start_date, end_date]
    );

    // Get public holidays
    const holidays = await pool.query(
      `SELECT id, name, date FROM public_holidays
       WHERE (tenant_id = $1 OR tenant_id IS NULL)
         AND date BETWEEN $2 AND $3
       ORDER BY date`,
      [req.tenant_id, start_date, end_date]
    );

    res.json({
      success: true,
      data: {
        leave_requests: result.rows,
        public_holidays: holidays.rows
      }
    });

  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar data' });
  }
});

// GET /api/leave-requests/:id - Get leave request by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lr.*,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        s.employee_id as staff_employee_id,
        s.department as staff_department,
        s.email as staff_email,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.color as leave_type_color,
        lt.requires_documentation,
        u.first_name as approver_first_name,
        u.last_name as approver_last_name,
        lb.entitled_days,
        lb.used_days,
        lb.available_days
       FROM leave_requests lr
       JOIN staff s ON lr.staff_id = s.id
       JOIN leave_types lt ON lr.leave_type_id = lt.id
       LEFT JOIN users u ON lr.approver_id = u.id
       LEFT JOIN leave_balances lb ON lr.leave_balance_id = lb.id
       WHERE lr.id = $1 AND lr.tenant_id = $2 AND lr.deleted_at IS NULL`,
      [req.params.id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave request' });
  }
});

// POST /api/leave-requests - Create new leave request
router.post('/', async (req, res) => {
  try {
    const {
      staff_id, leave_type_id, start_date, end_date,
      is_half_day, half_day_period, reason, supporting_document_url
    } = req.body;

    if (!staff_id || !leave_type_id || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Staff, leave type, start date, and end date are required'
      });
    }

    // Validate dates
    const startDt = new Date(start_date);
    const endDt = new Date(end_date);

    if (endDt < startDt) {
      return res.status(400).json({
        success: false,
        error: 'End date cannot be before start date'
      });
    }

    // Get leave type details
    const leaveType = await pool.query(
      'SELECT * FROM leave_types WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [leave_type_id, req.tenant_id]
    );

    if (leaveType.rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Invalid leave type' });
    }

    // Calculate working days
    let days_requested = await calculateWorkingDays(start_date, end_date, req.tenant_id);
    if (is_half_day) {
      days_requested = 0.5;
    }

    // Get or create leave balance for current year
    const currentYear = new Date().getFullYear();
    let balanceResult = await pool.query(
      `SELECT * FROM leave_balances
       WHERE staff_id = $1 AND leave_type_id = $2 AND year = $3`,
      [staff_id, leave_type_id, currentYear]
    );

    let leave_balance_id = null;

    if (balanceResult.rows.length === 0) {
      // Create balance record
      const newBalance = await pool.query(
        `INSERT INTO leave_balances (tenant_id, staff_id, leave_type_id, year, entitled_days)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.tenant_id, staff_id, leave_type_id, currentYear, leaveType.rows[0].days_allowed]
      );
      balanceResult = { rows: [newBalance.rows[0]] };
    }

    const balance = balanceResult.rows[0];
    leave_balance_id = balance.id;

    // Check if enough balance
    if (days_requested > parseFloat(balance.available_days || 0)) {
      return res.status(400).json({
        success: false,
        error: `Insufficient leave balance. Available: ${balance.available_days} days, Requested: ${days_requested} days`
      });
    }

    // Check for overlapping requests
    const overlap = await pool.query(
      `SELECT id FROM leave_requests
       WHERE staff_id = $1
         AND deleted_at IS NULL
         AND status IN ('pending', 'approved')
         AND ((start_date <= $2 AND end_date >= $2) OR (start_date <= $3 AND end_date >= $3) OR (start_date >= $2 AND end_date <= $3))`,
      [staff_id, start_date, end_date]
    );

    if (overlap.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'There is already a leave request for these dates'
      });
    }

    const id = uuidv4();

    // Create leave request
    const result = await pool.query(
      `INSERT INTO leave_requests (
        id, tenant_id, staff_id, leave_type_id, leave_balance_id,
        start_date, end_date, days_requested, is_half_day, half_day_period,
        reason, supporting_document_url, status, requested_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13)
      RETURNING *`,
      [
        id, req.tenant_id, staff_id, leave_type_id, leave_balance_id,
        start_date, end_date, days_requested, is_half_day || false, half_day_period,
        reason, supporting_document_url, req.user.id
      ]
    );

    // Update pending days in balance
    await pool.query(
      `UPDATE leave_balances
       SET pending_days = pending_days + $1, updated_at = NOW()
       WHERE id = $2`,
      [days_requested, leave_balance_id]
    );

    res.status(201).json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to create leave request' });
  }
});

// PUT /api/leave-requests/:id/approve - Approve leave request
router.put('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    // Get the request
    const request = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [id, req.tenant_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    if (request.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot approve a ${request.rows[0].status} request`
      });
    }

    const leaveRequest = request.rows[0];

    // Update request status
    const result = await pool.query(
      `UPDATE leave_requests
       SET status = 'approved', approver_id = $1, approved_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [req.user.id, id]
    );

    // Update leave balance: move from pending to used
    await pool.query(
      `UPDATE leave_balances
       SET pending_days = pending_days - $1,
           used_days = used_days + $1,
           updated_at = NOW()
       WHERE id = $2`,
      [leaveRequest.days_requested, leaveRequest.leave_balance_id]
    );

    res.json({ success: true, data: result.rows[0], message: 'Leave request approved' });

  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve leave request' });
  }
});

// PUT /api/leave-requests/:id/reject - Reject leave request
router.put('/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason } = req.body;

    // Get the request
    const request = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [id, req.tenant_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    if (request.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot reject a ${request.rows[0].status} request`
      });
    }

    const leaveRequest = request.rows[0];

    // Update request status
    const result = await pool.query(
      `UPDATE leave_requests
       SET status = 'rejected', approver_id = $1, rejection_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [req.user.id, rejection_reason, id]
    );

    // Remove from pending days
    await pool.query(
      `UPDATE leave_balances
       SET pending_days = pending_days - $1, updated_at = NOW()
       WHERE id = $2`,
      [leaveRequest.days_requested, leaveRequest.leave_balance_id]
    );

    res.json({ success: true, data: result.rows[0], message: 'Leave request rejected' });

  } catch (error) {
    console.error('Reject leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to reject leave request' });
  }
});

// PUT /api/leave-requests/:id/cancel - Cancel leave request
router.put('/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    // Get the request
    const request = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [id, req.tenant_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const leaveRequest = request.rows[0];

    if (!['pending', 'approved'].includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel a ${leaveRequest.status} request`
      });
    }

    // Update request status
    const result = await pool.query(
      `UPDATE leave_requests
       SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = $1, cancellation_reason = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [req.user.id, cancellation_reason, id]
    );

    // Update balance based on previous status
    if (leaveRequest.status === 'pending') {
      await pool.query(
        `UPDATE leave_balances
         SET pending_days = pending_days - $1, updated_at = NOW()
         WHERE id = $2`,
        [leaveRequest.days_requested, leaveRequest.leave_balance_id]
      );
    } else if (leaveRequest.status === 'approved') {
      await pool.query(
        `UPDATE leave_balances
         SET used_days = used_days - $1, updated_at = NOW()
         WHERE id = $2`,
        [leaveRequest.days_requested, leaveRequest.leave_balance_id]
      );
    }

    res.json({ success: true, data: result.rows[0], message: 'Leave request cancelled' });

  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel leave request' });
  }
});

// DELETE /api/leave-requests/:id - Soft delete leave request
router.delete('/:id', async (req, res) => {
  try {
    const request = await pool.query(
      'SELECT * FROM leave_requests WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL',
      [req.params.id, req.tenant_id]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave request not found' });
    }

    const leaveRequest = request.rows[0];

    // Only allow deleting pending or cancelled requests
    if (!['pending', 'cancelled', 'rejected'].includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        error: 'Can only delete pending, cancelled, or rejected requests'
      });
    }

    // If pending, release the pending days
    if (leaveRequest.status === 'pending' && leaveRequest.leave_balance_id) {
      await pool.query(
        `UPDATE leave_balances
         SET pending_days = pending_days - $1, updated_at = NOW()
         WHERE id = $2`,
        [leaveRequest.days_requested, leaveRequest.leave_balance_id]
      );
    }

    const result = await pool.query(
      `UPDATE leave_requests SET deleted_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       RETURNING id`,
      [req.params.id, req.tenant_id]
    );

    res.json({ success: true, message: 'Leave request deleted successfully' });

  } catch (error) {
    console.error('Delete leave request error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete leave request' });
  }
});

module.exports = router;
