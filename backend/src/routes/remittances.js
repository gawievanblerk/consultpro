const express = require('express');
const router = express.Router();
const pool = require('../utils/db');

/**
 * Statutory Remittances Management
 *
 * Tracks PAYE, Pension, NHF, NSITF, ITF remittances to government agencies
 */

const REMITTANCE_TYPES = {
  paye: { name: 'PAYE Tax', agency: 'Federal Inland Revenue Service (FIRS)' },
  pension: { name: 'Pension Contribution', agency: 'Pension Fund Administrator (PFA)' },
  nhf: { name: 'National Housing Fund', agency: 'Federal Mortgage Bank of Nigeria (FMBN)' },
  nsitf: { name: 'NSITF Contribution', agency: 'Nigeria Social Insurance Trust Fund' },
  itf: { name: 'ITF Contribution', agency: 'Industrial Training Fund' }
};

// ============================================================================
// REMITTANCES CRUD
// ============================================================================

/**
 * GET /api/remittances
 * List remittances with filters
 */
router.get('/', async (req, res) => {
  try {
    const { company_id, type, status, year, month } = req.query;

    let query = `
      SELECT r.*, c.trading_name as company_name,
        pr.pay_period_month as payroll_month, pr.pay_period_year as payroll_year
      FROM statutory_remittances r
      JOIN companies c ON r.company_id = c.id
      LEFT JOIN payroll_runs pr ON r.payroll_run_id = pr.id
      WHERE r.tenant_id = $1
    `;
    const params = [req.tenant_id];
    let paramIndex = 2;

    if (company_id) {
      query += ` AND r.company_id = $${paramIndex++}`;
      params.push(company_id);
    }
    if (type) {
      query += ` AND r.remittance_type = $${paramIndex++}`;
      params.push(type);
    }
    if (status) {
      query += ` AND r.status = $${paramIndex++}`;
      params.push(status);
    }
    if (year) {
      query += ` AND r.pay_period_year = $${paramIndex++}`;
      params.push(parseInt(year));
    }
    if (month) {
      query += ` AND r.pay_period_month = $${paramIndex++}`;
      params.push(parseInt(month));
    }

    query += ' ORDER BY r.pay_period_year DESC, r.pay_period_month DESC, r.remittance_type';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching remittances:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch remittances' });
  }
});

/**
 * GET /api/remittances/summary
 * Get remittance summary by company and year
 */
router.get('/summary', async (req, res) => {
  try {
    const { company_id, year = new Date().getFullYear() } = req.query;

    let query = `
      SELECT
        r.company_id,
        c.trading_name as company_name,
        r.remittance_type,
        COUNT(*) as total_count,
        COUNT(*) FILTER (WHERE r.status = 'paid' OR r.status = 'confirmed') as paid_count,
        COUNT(*) FILTER (WHERE r.status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE r.status = 'overdue') as overdue_count,
        SUM(r.amount) as total_amount,
        SUM(r.amount) FILTER (WHERE r.status = 'paid' OR r.status = 'confirmed') as paid_amount,
        SUM(r.amount) FILTER (WHERE r.status = 'pending') as pending_amount
      FROM statutory_remittances r
      JOIN companies c ON r.company_id = c.id
      WHERE r.tenant_id = $1 AND r.pay_period_year = $2
    `;
    const params = [req.tenant_id, parseInt(year)];

    if (company_id) {
      query += ` AND r.company_id = $3`;
      params.push(company_id);
    }

    query += ' GROUP BY r.company_id, c.trading_name, r.remittance_type ORDER BY c.trading_name, r.remittance_type';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching remittance summary:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch remittance summary' });
  }
});

/**
 * GET /api/remittances/overdue
 * Get overdue remittances
 */
router.get('/overdue', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, c.trading_name as company_name,
        CURRENT_DATE - r.due_date as days_overdue
      FROM statutory_remittances r
      JOIN companies c ON r.company_id = c.id
      WHERE r.tenant_id = $1
        AND r.status IN ('pending', 'scheduled')
        AND r.due_date < CURRENT_DATE
      ORDER BY r.due_date ASC
    `, [req.tenant_id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching overdue remittances:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch overdue remittances' });
  }
});

/**
 * GET /api/remittances/upcoming
 * Get upcoming remittances due in next N days
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const result = await pool.query(`
      SELECT r.*, c.trading_name as company_name,
        r.due_date - CURRENT_DATE as days_until_due
      FROM statutory_remittances r
      JOIN companies c ON r.company_id = c.id
      WHERE r.tenant_id = $1
        AND r.status IN ('pending', 'scheduled')
        AND r.due_date >= CURRENT_DATE
        AND r.due_date <= CURRENT_DATE + $2::INTEGER
      ORDER BY r.due_date ASC
    `, [req.tenant_id, parseInt(days)]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching upcoming remittances:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch upcoming remittances' });
  }
});

/**
 * GET /api/remittances/:id
 * Get single remittance with audit log
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const remitResult = await pool.query(`
      SELECT r.*, c.trading_name as company_name, c.legal_name,
        pr.pay_period_month as payroll_month, pr.pay_period_year as payroll_year
      FROM statutory_remittances r
      JOIN companies c ON r.company_id = c.id
      LEFT JOIN payroll_runs pr ON r.payroll_run_id = pr.id
      WHERE r.id = $1 AND r.tenant_id = $2
    `, [id, req.tenant_id]);

    if (remitResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Remittance not found' });
    }

    // Get audit log
    const auditResult = await pool.query(`
      SELECT * FROM remittance_audit_log
      WHERE remittance_id = $1
      ORDER BY created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        ...remitResult.rows[0],
        audit_log: auditResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching remittance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch remittance' });
  }
});

/**
 * POST /api/remittances
 * Create a remittance record
 */
router.post('/', async (req, res) => {
  try {
    const {
      company_id, remittance_type, pay_period_month, pay_period_year,
      amount, employee_contribution, employer_contribution,
      agency_name, agency_account_number, agency_bank,
      due_date, payroll_run_id, notes
    } = req.body;

    if (!company_id || !remittance_type || !pay_period_month || !pay_period_year) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const result = await pool.query(`
      INSERT INTO statutory_remittances (
        tenant_id, company_id, remittance_type, pay_period_month, pay_period_year,
        amount, employee_contribution, employer_contribution,
        agency_name, agency_account_number, agency_bank,
        due_date, payroll_run_id, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      req.tenant_id, company_id, remittance_type, pay_period_month, pay_period_year,
      amount || 0, employee_contribution || 0, employer_contribution || 0,
      agency_name, agency_account_number, agency_bank,
      due_date, payroll_run_id, notes, req.user?.id
    ]);

    // Log creation
    await pool.query(`
      INSERT INTO remittance_audit_log (remittance_id, action, new_status, user_id, notes)
      VALUES ($1, 'created', 'pending', $2, 'Remittance record created')
    `, [result.rows[0].id, req.user?.id]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating remittance:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'Remittance already exists for this period and type' });
    }
    res.status(500).json({ success: false, error: 'Failed to create remittance' });
  }
});

/**
 * POST /api/remittances/generate-from-payroll/:payrollRunId
 * Auto-generate remittances from a processed payroll run
 */
router.post('/generate-from-payroll/:payrollRunId', async (req, res) => {
  try {
    const { payrollRunId } = req.params;

    // Get payroll run with totals
    const runResult = await pool.query(`
      SELECT * FROM payroll_runs
      WHERE id = $1 AND tenant_id = $2 AND status IN ('calculated', 'approved', 'paid')
    `, [payrollRunId, req.tenant_id]);

    if (runResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payroll run not found or not processed' });
    }

    const run = runResult.rows[0];
    const dueDate = new Date(run.pay_period_year, run.pay_period_month, 10); // 10th of next month

    const remittances = [];

    // PAYE Tax
    if (run.total_paye > 0) {
      const payeResult = await pool.query(`
        INSERT INTO statutory_remittances (
          tenant_id, company_id, remittance_type, pay_period_month, pay_period_year,
          amount, employee_contribution, agency_name, due_date, payroll_run_id, created_by
        ) VALUES ($1, $2, 'paye', $3, $4, $5, $5, 'Federal Inland Revenue Service (FIRS)', $6, $7, $8)
        ON CONFLICT (tenant_id, company_id, remittance_type, pay_period_year, pay_period_month)
        DO UPDATE SET amount = $5, employee_contribution = $5, updated_at = NOW()
        RETURNING *
      `, [req.tenant_id, run.company_id, run.pay_period_month, run.pay_period_year,
          run.total_paye, dueDate, payrollRunId, req.user?.id]);
      remittances.push(payeResult.rows[0]);
    }

    // Pension (employee + employer)
    if (run.total_pension_employee > 0 || run.total_pension_employer > 0) {
      const pensionResult = await pool.query(`
        INSERT INTO statutory_remittances (
          tenant_id, company_id, remittance_type, pay_period_month, pay_period_year,
          amount, employee_contribution, employer_contribution,
          agency_name, due_date, payroll_run_id, created_by
        ) VALUES ($1, $2, 'pension', $3, $4, $5, $6, $7, 'Pension Fund Administrator (PFA)', $8, $9, $10)
        ON CONFLICT (tenant_id, company_id, remittance_type, pay_period_year, pay_period_month)
        DO UPDATE SET amount = $5, employee_contribution = $6, employer_contribution = $7, updated_at = NOW()
        RETURNING *
      `, [req.tenant_id, run.company_id, run.pay_period_month, run.pay_period_year,
          (run.total_pension_employee || 0) + (run.total_pension_employer || 0),
          run.total_pension_employee || 0, run.total_pension_employer || 0,
          dueDate, payrollRunId, req.user?.id]);
      remittances.push(pensionResult.rows[0]);
    }

    // NHF
    if (run.total_nhf > 0) {
      const nhfResult = await pool.query(`
        INSERT INTO statutory_remittances (
          tenant_id, company_id, remittance_type, pay_period_month, pay_period_year,
          amount, employee_contribution, agency_name, due_date, payroll_run_id, created_by
        ) VALUES ($1, $2, 'nhf', $3, $4, $5, $5, 'Federal Mortgage Bank of Nigeria (FMBN)', $6, $7, $8)
        ON CONFLICT (tenant_id, company_id, remittance_type, pay_period_year, pay_period_month)
        DO UPDATE SET amount = $5, employee_contribution = $5, updated_at = NOW()
        RETURNING *
      `, [req.tenant_id, run.company_id, run.pay_period_month, run.pay_period_year,
          run.total_nhf, dueDate, payrollRunId, req.user?.id]);
      remittances.push(nhfResult.rows[0]);
    }

    res.json({
      success: true,
      message: `Generated ${remittances.length} remittance records`,
      data: remittances
    });
  } catch (error) {
    console.error('Error generating remittances:', error);
    res.status(500).json({ success: false, error: 'Failed to generate remittances' });
  }
});

/**
 * PUT /api/remittances/:id
 * Update remittance details
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount, employee_contribution, employer_contribution,
      agency_name, agency_account_number, agency_bank, reference_number,
      due_date, notes
    } = req.body;

    const result = await pool.query(`
      UPDATE statutory_remittances SET
        amount = COALESCE($3, amount),
        employee_contribution = COALESCE($4, employee_contribution),
        employer_contribution = COALESCE($5, employer_contribution),
        agency_name = COALESCE($6, agency_name),
        agency_account_number = COALESCE($7, agency_account_number),
        agency_bank = COALESCE($8, agency_bank),
        reference_number = COALESCE($9, reference_number),
        due_date = COALESCE($10, due_date),
        notes = COALESCE($11, notes),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, req.tenant_id, amount, employee_contribution, employer_contribution,
        agency_name, agency_account_number, agency_bank, reference_number, due_date, notes]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Remittance not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error updating remittance:', error);
    res.status(500).json({ success: false, error: 'Failed to update remittance' });
  }
});

/**
 * POST /api/remittances/:id/mark-paid
 * Mark remittance as paid
 */
router.post('/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, payment_reference, payment_method, payment_bank, notes } = req.body;

    // Get current status
    const current = await pool.query(
      'SELECT status FROM statutory_remittances WHERE id = $1 AND tenant_id = $2',
      [id, req.tenant_id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Remittance not found' });
    }

    const oldStatus = current.rows[0].status;

    const result = await pool.query(`
      UPDATE statutory_remittances SET
        status = 'paid',
        payment_date = COALESCE($3, CURRENT_DATE),
        payment_reference = $4,
        payment_method = $5,
        payment_bank = $6,
        notes = COALESCE($7, notes),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, req.tenant_id, payment_date, payment_reference, payment_method, payment_bank, notes]);

    // Log the change
    await pool.query(`
      INSERT INTO remittance_audit_log (remittance_id, action, old_status, new_status, user_id, notes)
      VALUES ($1, 'mark_paid', $2, 'paid', $3, $4)
    `, [id, oldStatus, req.user?.id, notes || 'Marked as paid']);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error marking remittance as paid:', error);
    res.status(500).json({ success: false, error: 'Failed to mark remittance as paid' });
  }
});

/**
 * POST /api/remittances/:id/confirm
 * Confirm remittance with receipt
 */
router.post('/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { receipt_number, receipt_url, confirmation_date, notes } = req.body;

    const current = await pool.query(
      'SELECT status FROM statutory_remittances WHERE id = $1 AND tenant_id = $2',
      [id, req.tenant_id]
    );

    if (current.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Remittance not found' });
    }

    const oldStatus = current.rows[0].status;

    const result = await pool.query(`
      UPDATE statutory_remittances SET
        status = 'confirmed',
        receipt_number = $3,
        receipt_url = $4,
        confirmation_date = COALESCE($5, CURRENT_DATE),
        confirmed_by = $6,
        notes = COALESCE($7, notes),
        updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *
    `, [id, req.tenant_id, receipt_number, receipt_url, confirmation_date, req.user?.id, notes]);

    // Log the change
    await pool.query(`
      INSERT INTO remittance_audit_log (remittance_id, action, old_status, new_status, user_id, notes)
      VALUES ($1, 'confirmed', $2, 'confirmed', $3, $4)
    `, [id, oldStatus, req.user?.id, `Receipt: ${receipt_number}`]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error confirming remittance:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm remittance' });
  }
});

// ============================================================================
// PFA MANAGEMENT
// ============================================================================

/**
 * GET /api/remittances/pfas
 * List all PFAs
 */
router.get('/pfas/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM pension_fund_administrators
      WHERE is_active = true
      ORDER BY name
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching PFAs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch PFAs' });
  }
});

/**
 * GET /api/remittances/types
 * Get remittance types with descriptions
 */
router.get('/types/list', async (req, res) => {
  res.json({
    success: true,
    data: Object.entries(REMITTANCE_TYPES).map(([key, value]) => ({
      code: key,
      ...value
    }))
  });
});

module.exports = router;
