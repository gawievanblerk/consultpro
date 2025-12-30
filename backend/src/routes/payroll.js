const express = require('express');
const router = express.Router();

/**
 * Nigerian PAYE Tax Calculator
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

module.exports = router;
