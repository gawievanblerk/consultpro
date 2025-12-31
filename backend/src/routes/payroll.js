const express = require('express');
const router = express.Router();
const pool = require('../utils/db');
const PDFDocument = require('pdfkit');

/**
 * Nigerian PAYE Tax Calculator & Payroll Processing
 *
 * Based on Federal Government of Nigeria Personal Income Tax Act (PITA)
 * Tax bands effective January 2021 onwards
 */

// Nigerian PAYE Tax Bands (Annual)
const TAX_BANDS = [
  { threshold: 300000, rate: 0.07 },      // First N300,000 @ 7%
  { threshold: 300000, rate: 0.11 },      // Next N300,000 @ 11%
  { threshold: 500000, rate: 0.15 },      // Next N500,000 @ 15%
  { threshold: 500000, rate: 0.19 },      // Next N500,000 @ 19%
  { threshold: 1600000, rate: 0.21 },     // Next N1,600,000 @ 21%
  { threshold: Infinity, rate: 0.24 }     // Above N3,200,000 @ 24%
];

// Statutory deduction rates
const STATUTORY_RATES = {
  pensionEmployee: 0.08,      // 8% employee contribution
  pensionEmployer: 0.10,      // 10% employer contribution
  nhf: 0.025,                 // 2.5% National Housing Fund
  nsitf: 0.01,               // 1% NSITF (employer only)
  itf: 0.01                  // 1% ITF (employer only, >5 employees or >N50m turnover)
};

// Minimum wage for NHF eligibility (N30,000/month = N360,000/year)
const NHF_MIN_ANNUAL_SALARY = 360000;

/**
 * Calculate Consolidated Relief Allowance (CRA)
 * CRA = 20% of Gross Income + Higher of (1% of Gross Income or N200,000)
 */
function calculateCRA(grossAnnual) {
  const twentyPercent = grossAnnual * 0.20;
  const onePercent = grossAnnual * 0.01;
  const fixed = 200000;
  const higherOf = Math.max(onePercent, fixed);
  return twentyPercent + higherOf;
}

/**
 * Calculate PAYE tax using progressive tax bands
 */
function calculatePAYE(taxableIncome) {
  if (taxableIncome <= 0) return 0;

  let remainingIncome = taxableIncome;
  let totalTax = 0;
  const breakdown = [];

  for (const band of TAX_BANDS) {
    if (remainingIncome <= 0) break;

    const taxableInBand = Math.min(remainingIncome, band.threshold);
    const taxForBand = taxableInBand * band.rate;

    if (taxableInBand > 0) {
      breakdown.push({
        amount: taxableInBand,
        rate: band.rate * 100,
        tax: taxForBand
      });
    }

    totalTax += taxForBand;
    remainingIncome -= taxableInBand;
  }

  return { totalTax, breakdown };
}

/**
 * Calculate pension contribution base
 * Base = Basic + Housing + Transport (typically basic * 3 or specified components)
 */
function calculatePensionBase(basic, housing, transport) {
  return basic + (housing || 0) + (transport || 0);
}

/**
 * POST /api/payroll/calculate
 *
 * Full payroll calculation including PAYE and statutory deductions
 */
router.post('/calculate', (req, res) => {
  try {
    const {
      basicSalary = 0,
      housingAllowance = 0,
      transportAllowance = 0,
      utilityAllowance = 0,
      mealAllowance = 0,
      otherAllowances = 0,
      leaveAllowance = 0,
      thirteenthMonth = false,
      pensionEnabled = true,
      nhfEnabled = true,
      period = 'monthly' // 'monthly' or 'annual'
    } = req.body;

    // Convert to annual if monthly input
    const multiplier = period === 'monthly' ? 12 : 1;

    const annual = {
      basic: basicSalary * multiplier,
      housing: housingAllowance * multiplier,
      transport: transportAllowance * multiplier,
      utility: utilityAllowance * multiplier,
      meal: mealAllowance * multiplier,
      other: otherAllowances * multiplier,
      leave: leaveAllowance * multiplier,
      thirteenthMonth: thirteenthMonth ? basicSalary : 0 // One month's basic
    };

    // Calculate gross annual income
    const grossAnnual = Object.values(annual).reduce((sum, val) => sum + val, 0);

    // Calculate pension base and contributions
    const pensionBase = calculatePensionBase(annual.basic, annual.housing, annual.transport);
    const pensionEmployee = pensionEnabled ? pensionBase * STATUTORY_RATES.pensionEmployee : 0;
    const pensionEmployer = pensionEnabled ? pensionBase * STATUTORY_RATES.pensionEmployer : 0;

    // Calculate NHF (only if above minimum salary)
    const nhf = (nhfEnabled && annual.basic >= NHF_MIN_ANNUAL_SALARY)
      ? annual.basic * STATUTORY_RATES.nhf
      : 0;

    // NSITF and ITF (employer contributions only)
    const nsitf = annual.basic * STATUTORY_RATES.nsitf;
    const itf = annual.basic * STATUTORY_RATES.itf;

    // Calculate CRA (Consolidated Relief Allowance)
    const cra = calculateCRA(grossAnnual);

    // Calculate taxable income
    // Taxable = Gross - CRA - Pension Employee Contribution - NHF
    const totalRelief = cra + pensionEmployee + nhf;
    const taxableIncome = Math.max(0, grossAnnual - totalRelief);

    // Calculate PAYE
    const { totalTax: annualPAYE, breakdown: taxBreakdown } = calculatePAYE(taxableIncome);

    // Calculate effective tax rate
    const effectiveRate = grossAnnual > 0 ? (annualPAYE / grossAnnual * 100) : 0;

    // Calculate net pay
    const totalEmployeeDeductions = annualPAYE + pensionEmployee + nhf;
    const netAnnual = grossAnnual - totalEmployeeDeductions;

    // Monthly figures
    const monthly = {
      gross: grossAnnual / 12,
      basic: annual.basic / 12,
      paye: annualPAYE / 12,
      pension: pensionEmployee / 12,
      nhf: nhf / 12,
      totalDeductions: totalEmployeeDeductions / 12,
      net: netAnnual / 12
    };

    // Employer costs
    const employerCost = {
      pensionContribution: pensionEmployer,
      nsitf: nsitf,
      itf: itf,
      total: pensionEmployer + nsitf + itf
    };

    res.json({
      success: true,
      data: {
        period: period,
        income: {
          annual: {
            basic: annual.basic,
            housing: annual.housing,
            transport: annual.transport,
            utility: annual.utility,
            meal: annual.meal,
            leave: annual.leave,
            other: annual.other,
            thirteenthMonth: annual.thirteenthMonth,
            gross: grossAnnual
          },
          monthly: monthly
        },
        reliefs: {
          cra: cra,
          pensionContribution: pensionEmployee,
          nhf: nhf,
          total: totalRelief
        },
        tax: {
          taxableIncome: taxableIncome,
          annualPAYE: annualPAYE,
          monthlyPAYE: annualPAYE / 12,
          effectiveRate: effectiveRate.toFixed(2),
          breakdown: taxBreakdown.map(b => ({
            ...b,
            rate: `${b.rate}%`,
            amount: Math.round(b.amount),
            tax: Math.round(b.tax)
          }))
        },
        deductions: {
          employee: {
            paye: annualPAYE,
            pension: pensionEmployee,
            nhf: nhf,
            total: totalEmployeeDeductions
          },
          employer: employerCost
        },
        summary: {
          grossAnnual: Math.round(grossAnnual),
          grossMonthly: Math.round(grossAnnual / 12),
          netAnnual: Math.round(netAnnual),
          netMonthly: Math.round(netAnnual / 12),
          totalTaxAnnual: Math.round(annualPAYE),
          totalTaxMonthly: Math.round(annualPAYE / 12),
          effectiveTaxRate: `${effectiveRate.toFixed(2)}%`,
          takeHomePercentage: `${((netAnnual / grossAnnual) * 100).toFixed(2)}%`
        }
      }
    });
  } catch (error) {
    console.error('Payroll calculation error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate payroll' });
  }
});

/**
 * GET /api/payroll/tax-tables
 *
 * Returns current Nigerian PAYE tax tables and statutory rates
 */
router.get('/tax-tables', (req, res) => {
  res.json({
    success: true,
    data: {
      taxBands: TAX_BANDS.map((band, index) => ({
        band: index + 1,
        threshold: band.threshold === Infinity ? 'Unlimited' : band.threshold,
        rate: `${band.rate * 100}%`,
        description: index === 0
          ? `First ₦${band.threshold.toLocaleString()}`
          : band.threshold === Infinity
            ? 'Above ₦3,200,000'
            : `Next ₦${band.threshold.toLocaleString()}`
      })),
      statutoryRates: {
        pension: {
          employee: `${STATUTORY_RATES.pensionEmployee * 100}%`,
          employer: `${STATUTORY_RATES.pensionEmployer * 100}%`,
          description: 'Contributory Pension Scheme (PenCom regulated)'
        },
        nhf: {
          rate: `${STATUTORY_RATES.nhf * 100}%`,
          description: 'National Housing Fund (for employees earning ≥₦30,000/month)',
          minSalary: 30000
        },
        nsitf: {
          rate: `${STATUTORY_RATES.nsitf * 100}%`,
          description: 'Nigeria Social Insurance Trust Fund (employer only)'
        },
        itf: {
          rate: `${STATUTORY_RATES.itf * 100}%`,
          description: 'Industrial Training Fund (employers with >5 staff or >₦50m turnover)'
        }
      },
      reliefAllowance: {
        cra: {
          formula: '20% of Gross + Max(1% of Gross, ₦200,000)',
          description: 'Consolidated Relief Allowance - reduces taxable income'
        }
      },
      effectiveDate: '2021-01-01',
      source: 'Federal Government of Nigeria - Personal Income Tax Act (PITA)'
    }
  });
});

/**
 * POST /api/payroll/quick-paye
 *
 * Quick PAYE calculation from gross salary only
 */
router.post('/quick-paye', (req, res) => {
  try {
    const { grossSalary = 0, period = 'monthly' } = req.body;

    const grossAnnual = period === 'monthly' ? grossSalary * 12 : grossSalary;

    // Assume standard breakdown: Basic 40%, Housing 20%, Transport 15%, Others 25%
    const estimatedBasic = grossAnnual * 0.40;
    const estimatedHousing = grossAnnual * 0.20;
    const estimatedTransport = grossAnnual * 0.15;

    // Calculate pension (on basic + housing + transport)
    const pensionBase = estimatedBasic + estimatedHousing + estimatedTransport;
    const pensionEmployee = pensionBase * STATUTORY_RATES.pensionEmployee;

    // Calculate NHF
    const nhf = estimatedBasic >= NHF_MIN_ANNUAL_SALARY
      ? estimatedBasic * STATUTORY_RATES.nhf
      : 0;

    // Calculate CRA
    const cra = calculateCRA(grossAnnual);

    // Calculate taxable income
    const taxableIncome = Math.max(0, grossAnnual - cra - pensionEmployee - nhf);

    // Calculate PAYE
    const { totalTax } = calculatePAYE(taxableIncome);

    // Net pay
    const totalDeductions = totalTax + pensionEmployee + nhf;
    const netAnnual = grossAnnual - totalDeductions;

    res.json({
      success: true,
      data: {
        input: {
          grossSalary,
          period
        },
        annual: {
          gross: Math.round(grossAnnual),
          paye: Math.round(totalTax),
          pension: Math.round(pensionEmployee),
          nhf: Math.round(nhf),
          totalDeductions: Math.round(totalDeductions),
          net: Math.round(netAnnual)
        },
        monthly: {
          gross: Math.round(grossAnnual / 12),
          paye: Math.round(totalTax / 12),
          pension: Math.round(pensionEmployee / 12),
          nhf: Math.round(nhf / 12),
          totalDeductions: Math.round(totalDeductions / 12),
          net: Math.round(netAnnual / 12)
        },
        effectiveTaxRate: `${((totalTax / grossAnnual) * 100).toFixed(2)}%`,
        note: 'Quick estimate based on standard 40/20/15/25 salary breakdown'
      }
    });
  } catch (error) {
    console.error('Quick PAYE calculation error:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate PAYE' });
  }
});

// ============================================================================
// PAYROLL RUNS ENDPOINTS
// ============================================================================

/**
 * GET /api/payroll/runs
 * List payroll runs for a company
 */
router.get('/runs', async (req, res) => {
  try {
    const { company_id, status, year } = req.query;

    let query = `
      SELECT pr.*, c.trading_name as company_name,
        (SELECT COUNT(*) FROM payslips ps WHERE ps.payroll_run_id = pr.id) as payslip_count
      FROM payroll_runs pr
      JOIN companies c ON pr.company_id = c.id
      WHERE pr.tenant_id = $1
    `;
    const params = [req.tenant_id];
    let paramIndex = 2;

    if (company_id) {
      query += ` AND pr.company_id = $${paramIndex++}`;
      params.push(company_id);
    }
    if (status) {
      query += ` AND pr.status = $${paramIndex++}`;
      params.push(status);
    }
    if (year) {
      query += ` AND pr.pay_period_year = $${paramIndex++}`;
      params.push(parseInt(year));
    }

    query += ' ORDER BY pr.pay_period_year DESC, pr.pay_period_month DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching payroll runs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payroll runs' });
  }
});

/**
 * POST /api/payroll/runs
 * Create a new payroll run (draft)
 */
router.post('/runs', async (req, res) => {
  try {
    const { company_id, pay_period_month, pay_period_year, payment_date, notes } = req.body;

    if (!company_id || !pay_period_month || !pay_period_year) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Calculate pay period dates
    const pay_period_start = new Date(pay_period_year, pay_period_month - 1, 1);
    const pay_period_end = new Date(pay_period_year, pay_period_month, 0); // Last day of month

    const result = await pool.query(`
      INSERT INTO payroll_runs (
        tenant_id, company_id, pay_period_month, pay_period_year,
        pay_period_start, pay_period_end, payment_date, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft')
      RETURNING *
    `, [
      req.tenant_id, company_id, pay_period_month, pay_period_year,
      pay_period_start, pay_period_end, payment_date || pay_period_end, notes
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error creating payroll run:', error);
    if (error.code === '23505') {
      return res.status(400).json({ success: false, error: 'A payroll run already exists for this period' });
    }
    res.status(500).json({ success: false, error: 'Failed to create payroll run' });
  }
});

/**
 * GET /api/payroll/runs/:id
 * Get payroll run details with payslips
 */
router.get('/runs/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const runResult = await pool.query(`
      SELECT pr.*, c.trading_name as company_name
      FROM payroll_runs pr
      JOIN companies c ON pr.company_id = c.id
      WHERE pr.id = $1 AND pr.tenant_id = $2
    `, [id, req.tenant_id]);

    if (runResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payroll run not found' });
    }

    const payslipsResult = await pool.query(`
      SELECT * FROM payslips
      WHERE payroll_run_id = $1
      ORDER BY employee_name
    `, [id]);

    res.json({
      success: true,
      data: {
        ...runResult.rows[0],
        payslips: payslipsResult.rows
      }
    });
  } catch (error) {
    console.error('Error fetching payroll run:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payroll run' });
  }
});

/**
 * POST /api/payroll/runs/:id/process
 * Process payroll - calculate all employee payslips
 */
router.post('/runs/:id/process', async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    // Get payroll run
    const runResult = await client.query(`
      SELECT * FROM payroll_runs
      WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
    `, [id, req.tenant_id]);

    if (runResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payroll run not found or not in draft status' });
    }

    const payrollRun = runResult.rows[0];

    await client.query('BEGIN');

    // Update status to processing
    await client.query(`UPDATE payroll_runs SET status = 'processing' WHERE id = $1`, [id]);

    // Get active employees for the company
    const employeesResult = await client.query(`
      SELECT e.*,
        COALESCE(sc_basic.amount, e.salary * 0.40) as basic_amount,
        COALESCE(sc_housing.amount, e.salary * 0.20) as housing_amount,
        COALESCE(sc_transport.amount, e.salary * 0.15) as transport_amount,
        COALESCE(sc_meal.amount, e.salary * 0.05) as meal_amount,
        COALESCE(sc_utility.amount, e.salary * 0.05) as utility_amount,
        COALESCE(sc_other.amount, e.salary * 0.15) as other_amount
      FROM employees e
      LEFT JOIN salary_components sc_basic ON sc_basic.employee_id = e.id AND sc_basic.component_type = 'basic' AND (sc_basic.end_date IS NULL OR sc_basic.end_date >= CURRENT_DATE)
      LEFT JOIN salary_components sc_housing ON sc_housing.employee_id = e.id AND sc_housing.component_type = 'housing' AND (sc_housing.end_date IS NULL OR sc_housing.end_date >= CURRENT_DATE)
      LEFT JOIN salary_components sc_transport ON sc_transport.employee_id = e.id AND sc_transport.component_type = 'transport' AND (sc_transport.end_date IS NULL OR sc_transport.end_date >= CURRENT_DATE)
      LEFT JOIN salary_components sc_meal ON sc_meal.employee_id = e.id AND sc_meal.component_type = 'meal' AND (sc_meal.end_date IS NULL OR sc_meal.end_date >= CURRENT_DATE)
      LEFT JOIN salary_components sc_utility ON sc_utility.employee_id = e.id AND sc_utility.component_type = 'utility' AND (sc_utility.end_date IS NULL OR sc_utility.end_date >= CURRENT_DATE)
      LEFT JOIN salary_components sc_other ON sc_other.employee_id = e.id AND sc_other.component_type = 'other' AND (sc_other.end_date IS NULL OR sc_other.end_date >= CURRENT_DATE)
      WHERE e.company_id = $1 AND e.employment_status = 'active'
    `, [payrollRun.company_id]);

    let totalGross = 0, totalNet = 0, totalPaye = 0;
    let totalPensionEmployee = 0, totalPensionEmployer = 0, totalNhf = 0;

    // Delete existing payslips for this run
    await client.query('DELETE FROM payslips WHERE payroll_run_id = $1', [id]);

    // Process each employee
    for (const emp of employeesResult.rows) {
      // Monthly amounts
      const basic = parseFloat(emp.basic_amount) || 0;
      const housing = parseFloat(emp.housing_amount) || 0;
      const transport = parseFloat(emp.transport_amount) || 0;
      const meal = parseFloat(emp.meal_amount) || 0;
      const utility = parseFloat(emp.utility_amount) || 0;
      const other = parseFloat(emp.other_amount) || 0;
      const gross = basic + housing + transport + meal + utility + other;

      // Annual equivalents
      const annualGross = gross * 12;
      const annualBasic = basic * 12;

      // Calculate pension base and contributions
      const pensionBase = (basic + housing + transport) * 12;
      const pensionEmployee = pensionBase * STATUTORY_RATES.pensionEmployee;
      const pensionEmployer = pensionBase * STATUTORY_RATES.pensionEmployer;

      // Calculate NHF
      const nhf = annualBasic >= NHF_MIN_ANNUAL_SALARY ? annualBasic * STATUTORY_RATES.nhf : 0;

      // Calculate CRA
      const cra = calculateCRA(annualGross);

      // Calculate taxable income
      const taxableIncome = Math.max(0, annualGross - cra - pensionEmployee - nhf);

      // Calculate PAYE
      const { totalTax: annualPAYE, breakdown: taxBreakdown } = calculatePAYE(taxableIncome);
      const monthlyPAYE = annualPAYE / 12;

      // Monthly deductions
      const monthlyPension = pensionEmployee / 12;
      const monthlyNhf = nhf / 12;
      const totalDeductions = monthlyPAYE + monthlyPension + monthlyNhf;
      const netSalary = gross - totalDeductions;

      // Employer contributions
      const employerPension = pensionEmployer / 12;
      const employerNsitf = (annualBasic * STATUTORY_RATES.nsitf) / 12;
      const employerItf = (annualBasic * STATUTORY_RATES.itf) / 12;

      // Insert payslip
      await client.query(`
        INSERT INTO payslips (
          tenant_id, payroll_run_id, employee_id,
          employee_name, employee_id_number, department, job_title,
          bank_name, bank_account_number, bank_account_name,
          basic_salary, housing_allowance, transport_allowance,
          meal_allowance, utility_allowance, other_allowances, gross_salary,
          annual_gross, annual_taxable, consolidated_relief,
          paye_tax, pension_employee, nhf, total_deductions, net_salary,
          employer_pension, employer_nsitf, employer_itf,
          calculation_details, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25,
          $26, $27, $28, $29, 'pending'
        )
      `, [
        req.tenant_id, id, emp.id,
        `${emp.first_name} ${emp.last_name}`, emp.employee_id_number, emp.department, emp.job_title,
        emp.bank_name, emp.bank_account_number, emp.bank_account_name,
        basic, housing, transport, meal, utility, other, gross,
        annualGross, taxableIncome, cra / 12,
        monthlyPAYE, monthlyPension, monthlyNhf, totalDeductions, netSalary,
        employerPension, employerNsitf, employerItf,
        JSON.stringify({ taxBreakdown, rates: STATUTORY_RATES })
      ]);

      // Accumulate totals
      totalGross += gross;
      totalNet += netSalary;
      totalPaye += monthlyPAYE;
      totalPensionEmployee += monthlyPension;
      totalPensionEmployer += employerPension;
      totalNhf += monthlyNhf;
    }

    // Update payroll run with totals
    await client.query(`
      UPDATE payroll_runs SET
        status = 'calculated',
        total_gross = $2,
        total_net = $3,
        total_paye = $4,
        total_pension_employee = $5,
        total_pension_employer = $6,
        total_nhf = $7,
        employee_count = $8,
        processed_by = $9,
        processed_at = NOW()
      WHERE id = $1
    `, [id, totalGross, totalNet, totalPaye, totalPensionEmployee, totalPensionEmployer, totalNhf, employeesResult.rows.length, req.user?.id]);

    await client.query('COMMIT');

    // Fetch updated run
    const updatedRun = await pool.query(`
      SELECT pr.*, c.trading_name as company_name
      FROM payroll_runs pr
      JOIN companies c ON pr.company_id = c.id
      WHERE pr.id = $1
    `, [id]);

    res.json({
      success: true,
      message: `Processed ${employeesResult.rows.length} employee payslips`,
      data: updatedRun.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing payroll:', error);
    res.status(500).json({ success: false, error: 'Failed to process payroll' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/payroll/runs/:id/approve
 * Approve a processed payroll run
 */
router.post('/runs/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE payroll_runs
      SET status = 'approved', approved_by = $3, approved_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND status = 'calculated'
      RETURNING *
    `, [id, req.tenant_id, req.user?.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payroll run not found or not in calculated status' });
    }

    // Update all payslips to approved
    await pool.query(`UPDATE payslips SET status = 'approved' WHERE payroll_run_id = $1`, [id]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error approving payroll run:', error);
    res.status(500).json({ success: false, error: 'Failed to approve payroll run' });
  }
});

/**
 * POST /api/payroll/runs/:id/mark-paid
 * Mark payroll run as paid
 */
router.post('/runs/:id/mark-paid', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE payroll_runs
      SET status = 'paid', paid_by = $3, paid_at = NOW()
      WHERE id = $1 AND tenant_id = $2 AND status = 'approved'
      RETURNING *
    `, [id, req.tenant_id, req.user?.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payroll run not found or not in approved status' });
    }

    // Update all payslips to paid
    await pool.query(`UPDATE payslips SET status = 'paid' WHERE payroll_run_id = $1`, [id]);

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error marking payroll as paid:', error);
    res.status(500).json({ success: false, error: 'Failed to mark payroll as paid' });
  }
});

// ============================================================================
// PAYSLIPS ENDPOINTS
// ============================================================================

/**
 * GET /api/payroll/payslips
 * List payslips (filtered)
 */
router.get('/payslips', async (req, res) => {
  try {
    const { payroll_run_id, employee_id, status } = req.query;

    let query = `
      SELECT ps.*, pr.pay_period_month, pr.pay_period_year, pr.payment_date
      FROM payslips ps
      JOIN payroll_runs pr ON ps.payroll_run_id = pr.id
      WHERE ps.tenant_id = $1
    `;
    const params = [req.tenant_id];
    let paramIndex = 2;

    if (payroll_run_id) {
      query += ` AND ps.payroll_run_id = $${paramIndex++}`;
      params.push(payroll_run_id);
    }
    if (employee_id) {
      query += ` AND ps.employee_id = $${paramIndex++}`;
      params.push(employee_id);
    }
    if (status) {
      query += ` AND ps.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ' ORDER BY pr.pay_period_year DESC, pr.pay_period_month DESC, ps.employee_name';

    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching payslips:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payslips' });
  }
});

/**
 * GET /api/payroll/payslips/:id
 * Get single payslip
 */
router.get('/payslips/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT ps.*, pr.pay_period_month, pr.pay_period_year, pr.payment_date,
        c.trading_name as company_name, c.address as company_address
      FROM payslips ps
      JOIN payroll_runs pr ON ps.payroll_run_id = pr.id
      JOIN companies c ON pr.company_id = c.id
      WHERE ps.id = $1 AND ps.tenant_id = $2
    `, [id, req.tenant_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payslip not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching payslip:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payslip' });
  }
});

/**
 * GET /api/payroll/employee/my-payslips
 * ESS: Employee's own payslips
 */
router.get('/employee/my-payslips', async (req, res) => {
  try {
    if (!req.user?.employee_id) {
      return res.status(403).json({ success: false, error: 'Employee access only' });
    }

    const result = await pool.query(`
      SELECT ps.*, pr.pay_period_month, pr.pay_period_year, pr.payment_date
      FROM payslips ps
      JOIN payroll_runs pr ON ps.payroll_run_id = pr.id
      WHERE ps.employee_id = $1 AND ps.status IN ('approved', 'paid')
      ORDER BY pr.pay_period_year DESC, pr.pay_period_month DESC
    `, [req.user.employee_id]);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching employee payslips:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch payslips' });
  }
});

// ============================================================================
// PAYSLIP PDF GENERATION
// ============================================================================

// Currency formatter for Nigerian Naira (PDF-safe, no special symbols)
const formatNGN = (amount) => {
  const num = Number(amount) || 0;
  return 'NGN ' + num.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Month names
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * GET /api/payroll/payslips/:id/pdf
 * Generate payslip PDF
 */
router.get('/payslips/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    // Get payslip with company details
    const result = await pool.query(`
      SELECT ps.*, pr.pay_period_month, pr.pay_period_year, pr.payment_date,
        c.trading_name as company_name, c.legal_name as registered_name,
        c.address_line1 as company_address, c.phone as company_phone, c.email as company_email
      FROM payslips ps
      JOIN payroll_runs pr ON ps.payroll_run_id = pr.id
      JOIN companies c ON pr.company_id = c.id
      WHERE ps.id = $1 AND ps.tenant_id = $2
    `, [id, req.tenant_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Payslip not found' });
    }

    const payslip = result.rows[0];
    const periodName = `${MONTH_NAMES[payslip.pay_period_month - 1]} ${payslip.pay_period_year}`;

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=payslip_${periodName.replace(' ', '_')}_${payslip.employee_name.replace(/\s+/g, '_')}.pdf`);

    doc.pipe(res);

    // Colors (CoreHR branding)
    const navyBlue = '#0d2865';
    const tealAccent = '#41d8d1';
    const lightGray = '#f5f5f5';

    // Header
    doc.rect(0, 0, doc.page.width, 100).fill(navyBlue);
    doc.fillColor('white')
       .fontSize(24)
       .text(payslip.company_name || 'Company Name', 50, 35);
    doc.fontSize(12)
       .text('PAYSLIP', 50, 65);
    doc.text(periodName, doc.page.width - 200, 45, { width: 150, align: 'right' });

    // Employee Details Section
    let y = 120;
    doc.fillColor(navyBlue).fontSize(12).text('Employee Details', 50, y);
    doc.strokeColor(tealAccent).lineWidth(2).moveTo(50, y + 15).lineTo(200, y + 15).stroke();

    y += 30;
    doc.fillColor('#333').fontSize(10);

    const detailsLeft = [
      ['Name:', payslip.employee_name],
      ['Employee ID:', payslip.employee_id_number || 'N/A'],
      ['Department:', payslip.department || 'N/A'],
      ['Position:', payslip.job_title || 'N/A']
    ];

    const detailsRight = [
      ['Bank:', payslip.bank_name || 'N/A'],
      ['Account:', payslip.bank_account_number || 'N/A'],
      ['Pay Date:', payslip.payment_date ? new Date(payslip.payment_date).toLocaleDateString() : 'N/A'],
      ['Status:', payslip.status.toUpperCase()]
    ];

    detailsLeft.forEach((item, i) => {
      doc.font('Helvetica-Bold').text(item[0], 50, y + (i * 18), { continued: true });
      doc.font('Helvetica').text(' ' + item[1]);
    });

    detailsRight.forEach((item, i) => {
      doc.font('Helvetica-Bold').text(item[0], 320, y + (i * 18), { continued: true });
      doc.font('Helvetica').text(' ' + item[1]);
    });

    // Earnings & Deductions Section - side by side
    const sectionStartY = y + 100;
    const colWidth = 250;
    const amountColWidth = 100;

    // Earnings Section (Left)
    let earnY = sectionStartY;
    doc.fillColor(navyBlue).fontSize(12).font('Helvetica-Bold').text('Earnings', 50, earnY);
    doc.strokeColor(tealAccent).lineWidth(2).moveTo(50, earnY + 15).lineTo(150, earnY + 15).stroke();

    earnY += 25;
    doc.rect(50, earnY, colWidth, 20).fill(tealAccent);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
       .text('Description', 60, earnY + 5)
       .text('Amount', 50 + colWidth - amountColWidth, earnY + 5, { width: amountColWidth - 10, align: 'right' });

    earnY += 20;
    const earnings = [
      ['Basic Salary', payslip.basic_salary],
      ['Housing Allowance', payslip.housing_allowance],
      ['Transport Allowance', payslip.transport_allowance],
      ['Meal Allowance', payslip.meal_allowance],
      ['Utility Allowance', payslip.utility_allowance],
      ['Other Allowances', payslip.other_allowances]
    ].filter(e => parseFloat(e[1]) > 0);

    earnings.forEach((item, i) => {
      const bgColor = i % 2 === 0 ? lightGray : 'white';
      doc.rect(50, earnY, colWidth, 18).fill(bgColor);
      doc.fillColor('#333').fontSize(9).font('Helvetica')
         .text(item[0], 60, earnY + 4)
         .text(formatNGN(item[1]), 50 + colWidth - amountColWidth, earnY + 4, { width: amountColWidth - 10, align: 'right' });
      earnY += 18;
    });

    // Gross total
    doc.rect(50, earnY, colWidth, 24).fill(navyBlue);
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
       .text('GROSS SALARY', 60, earnY + 7)
       .text(formatNGN(payslip.gross_salary), 50 + colWidth - amountColWidth, earnY + 7, { width: amountColWidth - 10, align: 'right' });
    earnY += 24;

    // Deductions Section (Right)
    let deductY = sectionStartY;
    const rightColX = 310;
    doc.fillColor(navyBlue).fontSize(12).font('Helvetica-Bold').text('Deductions', rightColX, deductY);
    doc.strokeColor(tealAccent).lineWidth(2).moveTo(rightColX, deductY + 15).lineTo(rightColX + 100, deductY + 15).stroke();

    deductY += 25;
    doc.rect(rightColX, deductY, colWidth, 20).fill('#d32f2f');
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
       .text('Description', rightColX + 10, deductY + 5)
       .text('Amount', rightColX + colWidth - amountColWidth, deductY + 5, { width: amountColWidth - 10, align: 'right' });

    deductY += 20;
    const deductions = [
      ['PAYE Tax', payslip.paye_tax],
      ['Pension (8%)', payslip.pension_employee],
      ['NHF (2.5%)', payslip.nhf],
      ['Loan Deduction', payslip.loan_deduction],
      ['Other Deductions', payslip.other_deductions]
    ].filter(d => parseFloat(d[1]) > 0);

    deductions.forEach((item, i) => {
      const bgColor = i % 2 === 0 ? '#ffebee' : 'white';
      doc.rect(rightColX, deductY, colWidth, 18).fill(bgColor);
      doc.fillColor('#c62828').fontSize(9).font('Helvetica')
         .text(item[0], rightColX + 10, deductY + 4)
         .text('-' + formatNGN(item[1]), rightColX + colWidth - amountColWidth, deductY + 4, { width: amountColWidth - 10, align: 'right' });
      deductY += 18;
    });

    // Total deductions
    doc.rect(rightColX, deductY, colWidth, 24).fill('#c62828');
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
       .text('TOTAL DEDUCTIONS', rightColX + 10, deductY + 7)
       .text('-' + formatNGN(payslip.total_deductions), rightColX + colWidth - amountColWidth, deductY + 7, { width: amountColWidth - 10, align: 'right' });
    deductY += 24;

    // Update y to the max of both columns
    y = earnY;

    // Net Pay Section
    const netY = Math.max(y, deductY) + 40;
    doc.rect(50, netY, 500, 50).fill(tealAccent);
    doc.fillColor(navyBlue).fontSize(14).font('Helvetica-Bold')
       .text('NET PAY', 70, netY + 8);
    doc.fillColor('white').fontSize(24)
       .text(formatNGN(payslip.net_salary), 70, netY + 22);

    // Employer Contributions (informational)
    const empY = netY + 70;
    doc.fillColor('#666').fontSize(9).font('Helvetica')
       .text('Employer Contributions (not deducted from employee):', 50, empY);
    doc.text(`Pension (10%): ${formatNGN(payslip.employer_pension)} | NSITF: ${formatNGN(payslip.employer_nsitf)} | ITF: ${formatNGN(payslip.employer_itf)}`, 50, empY + 12);

    // Footer
    const footerY = doc.page.height - 80;
    doc.rect(0, footerY, doc.page.width, 80).fill(lightGray);
    doc.fillColor('#666').fontSize(8)
       .text('This is a computer-generated document. No signature required.', 50, footerY + 15)
       .text(`Generated: ${new Date().toLocaleString()}`, 50, footerY + 28);
    doc.fillColor(navyBlue).fontSize(10)
       .text('Powered by CoreHR', doc.page.width - 150, footerY + 20, { width: 100, align: 'right' });

    doc.end();
  } catch (error) {
    console.error('Error generating payslip PDF:', error);
    res.status(500).json({ success: false, error: 'Failed to generate PDF' });
  }
});

module.exports = router;
