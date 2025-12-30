/**
 * Leave Balances Routes - Leave Management Module
 * View and manage employee leave balances
 */
const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

// GET /api/leave-balances - List all leave balances (with filters)
router.get('/', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), staff_id, department } = req.query;

    let whereClause = 'WHERE lb.tenant_id = $1 AND lb.year = $2 AND s.deleted_at IS NULL';
    let params = [req.tenant_id, parseInt(year)];
    let paramIndex = 3;

    if (staff_id) {
      whereClause += ` AND lb.staff_id = $${paramIndex}`;
      params.push(staff_id);
      paramIndex++;
    }

    if (department) {
      whereClause += ` AND s.department = $${paramIndex}`;
      params.push(department);
      paramIndex++;
    }

    const result = await pool.query(
      `SELECT lb.*,
        s.first_name as staff_first_name,
        s.last_name as staff_last_name,
        s.employee_id as staff_employee_id,
        s.department as staff_department,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.color as leave_type_color
       FROM leave_balances lb
       JOIN staff s ON lb.staff_id = s.id
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       ${whereClause}
       ORDER BY s.last_name, s.first_name, lt.sort_order`,
      params
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('List leave balances error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave balances' });
  }
});

// GET /api/leave-balances/summary - Get summary of all staff leave balances
router.get('/summary', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const result = await pool.query(
      `SELECT
        s.id as staff_id,
        s.first_name,
        s.last_name,
        s.employee_id,
        s.department,
        json_agg(json_build_object(
          'leave_type_id', lt.id,
          'leave_type_name', lt.name,
          'leave_type_code', lt.code,
          'color', lt.color,
          'entitled', COALESCE(lb.entitled_days, 0) + COALESCE(lb.carried_forward, 0) + COALESCE(lb.adjustment_days, 0),
          'used', COALESCE(lb.used_days, 0),
          'pending', COALESCE(lb.pending_days, 0),
          'available', COALESCE(lb.available_days, 0)
        ) ORDER BY lt.sort_order) as balances
       FROM staff s
       LEFT JOIN leave_balances lb ON s.id = lb.staff_id AND lb.year = $2
       LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id AND lt.deleted_at IS NULL
       WHERE s.tenant_id = $1 AND s.deleted_at IS NULL AND s.status = 'active'
       GROUP BY s.id, s.first_name, s.last_name, s.employee_id, s.department
       ORDER BY s.last_name, s.first_name`,
      [req.tenant_id, parseInt(year)]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get leave summary error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leave summary' });
  }
});

// GET /api/leave-balances/staff/:staffId - Get leave balances for a specific staff member
router.get('/staff/:staffId', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const result = await pool.query(
      `SELECT lb.*,
        lt.name as leave_type_name,
        lt.code as leave_type_code,
        lt.color as leave_type_color,
        lt.days_allowed as default_entitlement
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.staff_id = $1 AND lb.tenant_id = $2 AND lb.year = $3
       ORDER BY lt.sort_order`,
      [req.params.staffId, req.tenant_id, parseInt(year)]
    );

    res.json({ success: true, data: result.rows });

  } catch (error) {
    console.error('Get staff leave balances error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch staff leave balances' });
  }
});

// POST /api/leave-balances/initialize - Initialize leave balances for all staff for a year
router.post('/initialize', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.body;

    // Get all active staff
    const staffResult = await pool.query(
      `SELECT id, gender FROM staff
       WHERE tenant_id = $1 AND deleted_at IS NULL AND status = 'active'`,
      [req.tenant_id]
    );

    // Get all active leave types
    const leaveTypesResult = await pool.query(
      `SELECT * FROM leave_types
       WHERE tenant_id = $1 AND deleted_at IS NULL AND is_active = true`,
      [req.tenant_id]
    );

    let created = 0;
    let skipped = 0;

    for (const staff of staffResult.rows) {
      for (const leaveType of leaveTypesResult.rows) {
        // Check gender restriction
        if (leaveType.gender_restriction) {
          const staffGender = staff.gender?.toLowerCase();
          if (leaveType.gender_restriction !== staffGender) {
            continue;
          }
        }

        // Check if balance already exists
        const existing = await pool.query(
          `SELECT id FROM leave_balances
           WHERE staff_id = $1 AND leave_type_id = $2 AND year = $3`,
          [staff.id, leaveType.id, year]
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        // Create balance record
        await pool.query(
          `INSERT INTO leave_balances (tenant_id, staff_id, leave_type_id, year, entitled_days)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.tenant_id, staff.id, leaveType.id, year, leaveType.days_allowed]
        );
        created++;
      }
    }

    res.json({
      success: true,
      message: `Leave balances initialized for ${year}`,
      data: { created, skipped }
    });

  } catch (error) {
    console.error('Initialize leave balances error:', error);
    res.status(500).json({ success: false, error: 'Failed to initialize leave balances' });
  }
});

// POST /api/leave-balances/carry-forward - Carry forward unused leave to next year
router.post('/carry-forward', async (req, res) => {
  try {
    const { from_year, to_year = from_year + 1 } = req.body;

    if (!from_year) {
      return res.status(400).json({ success: false, error: 'from_year is required' });
    }

    // Get leave types that allow carry forward
    const leaveTypes = await pool.query(
      `SELECT id, max_carry_forward FROM leave_types
       WHERE tenant_id = $1 AND carry_forward = true AND deleted_at IS NULL`,
      [req.tenant_id]
    );

    let processed = 0;

    for (const leaveType of leaveTypes.rows) {
      // Get balances from previous year with available days
      const balances = await pool.query(
        `SELECT staff_id, available_days FROM leave_balances
         WHERE tenant_id = $1 AND leave_type_id = $2 AND year = $3 AND available_days > 0`,
        [req.tenant_id, leaveType.id, from_year]
      );

      for (const balance of balances.rows) {
        const carryDays = Math.min(
          parseFloat(balance.available_days),
          leaveType.max_carry_forward || 999
        );

        if (carryDays <= 0) continue;

        // Update or create next year's balance
        const existing = await pool.query(
          `SELECT id FROM leave_balances
           WHERE staff_id = $1 AND leave_type_id = $2 AND year = $3`,
          [balance.staff_id, leaveType.id, to_year]
        );

        if (existing.rows.length > 0) {
          await pool.query(
            `UPDATE leave_balances
             SET carried_forward = $1, updated_at = NOW()
             WHERE id = $2`,
            [carryDays, existing.rows[0].id]
          );
        } else {
          const defaultEntitlement = await pool.query(
            'SELECT days_allowed FROM leave_types WHERE id = $1',
            [leaveType.id]
          );

          await pool.query(
            `INSERT INTO leave_balances (tenant_id, staff_id, leave_type_id, year, entitled_days, carried_forward)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [req.tenant_id, balance.staff_id, leaveType.id, to_year,
             defaultEntitlement.rows[0].days_allowed, carryDays]
          );
        }

        processed++;
      }
    }

    res.json({
      success: true,
      message: `Carried forward leave balances from ${from_year} to ${to_year}`,
      data: { processed }
    });

  } catch (error) {
    console.error('Carry forward error:', error);
    res.status(500).json({ success: false, error: 'Failed to carry forward leave balances' });
  }
});

// PUT /api/leave-balances/:id/adjust - Adjust leave balance manually
router.put('/:id/adjust', async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment_days, adjustment_reason } = req.body;

    if (adjustment_days === undefined) {
      return res.status(400).json({ success: false, error: 'adjustment_days is required' });
    }

    const result = await pool.query(
      `UPDATE leave_balances
       SET adjustment_days = $1, adjustment_reason = $2, updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING *`,
      [adjustment_days, adjustment_reason, id, req.tenant_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Leave balance not found' });
    }

    res.json({ success: true, data: result.rows[0] });

  } catch (error) {
    console.error('Adjust leave balance error:', error);
    res.status(500).json({ success: false, error: 'Failed to adjust leave balance' });
  }
});

module.exports = router;
