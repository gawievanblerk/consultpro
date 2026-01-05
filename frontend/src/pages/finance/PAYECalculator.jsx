import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  CalculatorIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  InformationCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

// Format number as Nigerian Naira
const formatNGN = (amount) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

function PAYECalculator() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [taxTables, setTaxTables] = useState(null);
  const [mode, setMode] = useState('quick'); // 'quick' or 'detailed'
  const [period, setPeriod] = useState('monthly');
  const [result, setResult] = useState(null);

  // Quick mode input
  const [grossSalary, setGrossSalary] = useState('');

  // Detailed mode inputs
  const [formData, setFormData] = useState({
    basicSalary: '',
    housingAllowance: '',
    transportAllowance: '',
    utilityAllowance: '',
    mealAllowance: '',
    otherAllowances: '',
    leaveAllowance: '',
    thirteenthMonth: false,
    pensionEnabled: true,
    nhfEnabled: true
  });

  useEffect(() => {
    fetchTaxTables();
  }, []);

  const fetchTaxTables = async () => {
    try {
      const response = await api.get('/api/payroll/tax-tables');
      if (response.data.success) {
        setTaxTables(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tax tables:', error);
    }
  };

  const handleQuickCalculate = async () => {
    if (!grossSalary || parseFloat(grossSalary) <= 0) {
      toast.warning('Please enter a valid gross salary');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/payroll/quick-paye', {
        grossSalary: parseFloat(grossSalary),
        period
      });
      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (error) {
      console.error('Calculation failed:', error);
      toast.error('Failed to calculate PAYE');
    } finally {
      setLoading(false);
    }
  };

  const handleDetailedCalculate = async () => {
    if (!formData.basicSalary || parseFloat(formData.basicSalary) <= 0) {
      toast.warning('Please enter a valid basic salary');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/api/payroll/calculate', {
        basicSalary: parseFloat(formData.basicSalary) || 0,
        housingAllowance: parseFloat(formData.housingAllowance) || 0,
        transportAllowance: parseFloat(formData.transportAllowance) || 0,
        utilityAllowance: parseFloat(formData.utilityAllowance) || 0,
        mealAllowance: parseFloat(formData.mealAllowance) || 0,
        otherAllowances: parseFloat(formData.otherAllowances) || 0,
        leaveAllowance: parseFloat(formData.leaveAllowance) || 0,
        thirteenthMonth: formData.thirteenthMonth,
        pensionEnabled: formData.pensionEnabled,
        nhfEnabled: formData.nhfEnabled,
        period
      });
      if (response.data.success) {
        setResult(response.data.data);
      }
    } catch (error) {
      console.error('Calculation failed:', error);
      toast.error('Failed to calculate payroll');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setGrossSalary('');
    setFormData({
      basicSalary: '',
      housingAllowance: '',
      transportAllowance: '',
      utilityAllowance: '',
      mealAllowance: '',
      otherAllowances: '',
      leaveAllowance: '',
      thirteenthMonth: false,
      pensionEnabled: true,
      nhfEnabled: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">PAYE Calculator</h1>
          <p className="mt-1 text-sm text-gray-500">
            Nigerian Pay-As-You-Earn tax calculator with statutory deductions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Input */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mode Toggle */}
          <div className="card p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Calculator Mode:</span>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                <button
                  onClick={() => { setMode('quick'); setResult(null); }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    mode === 'quick'
                      ? 'bg-primary-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Quick Estimate
                </button>
                <button
                  onClick={() => { setMode('detailed'); setResult(null); }}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    mode === 'detailed'
                      ? 'bg-primary-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Detailed Breakdown
                </button>
              </div>
            </div>
          </div>

          {/* Quick Mode */}
          {mode === 'quick' && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CalculatorIcon className="h-5 w-5 text-primary-700" />
                <h2 className="text-lg font-semibold">Quick PAYE Estimate</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Enter your gross salary for a quick estimate. Uses standard salary structure (40% Basic, 20% Housing, 15% Transport, 25% Other).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Gross Salary (NGN)</label>
                  <input
                    type="number"
                    value={grossSalary}
                    onChange={(e) => setGrossSalary(e.target.value)}
                    placeholder="e.g. 500000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="form-input"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleQuickCalculate}
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CalculatorIcon className="h-5 w-5 mr-2" />
                      Calculate
                    </>
                  )}
                </button>
                <button onClick={handleReset} className="btn-secondary">
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Detailed Mode */}
          {mode === 'detailed' && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <DocumentTextIcon className="h-5 w-5 text-primary-700" />
                <h2 className="text-lg font-semibold">Detailed Salary Breakdown</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Enter individual salary components for accurate PAYE calculation.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Basic Salary (NGN) *</label>
                  <input
                    type="number"
                    value={formData.basicSalary}
                    onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })}
                    placeholder="e.g. 200000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Housing Allowance (NGN)</label>
                  <input
                    type="number"
                    value={formData.housingAllowance}
                    onChange={(e) => setFormData({ ...formData, housingAllowance: e.target.value })}
                    placeholder="e.g. 100000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Transport Allowance (NGN)</label>
                  <input
                    type="number"
                    value={formData.transportAllowance}
                    onChange={(e) => setFormData({ ...formData, transportAllowance: e.target.value })}
                    placeholder="e.g. 75000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Utility Allowance (NGN)</label>
                  <input
                    type="number"
                    value={formData.utilityAllowance}
                    onChange={(e) => setFormData({ ...formData, utilityAllowance: e.target.value })}
                    placeholder="e.g. 50000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Meal Allowance (NGN)</label>
                  <input
                    type="number"
                    value={formData.mealAllowance}
                    onChange={(e) => setFormData({ ...formData, mealAllowance: e.target.value })}
                    placeholder="e.g. 25000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Leave Allowance (NGN)</label>
                  <input
                    type="number"
                    value={formData.leaveAllowance}
                    onChange={(e) => setFormData({ ...formData, leaveAllowance: e.target.value })}
                    placeholder="e.g. 50000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Other Allowances (NGN)</label>
                  <input
                    type="number"
                    value={formData.otherAllowances}
                    onChange={(e) => setFormData({ ...formData, otherAllowances: e.target.value })}
                    placeholder="e.g. 50000"
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Period</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="form-input"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>
              </div>

              {/* Options */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-3">Options</p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.pensionEnabled}
                      onChange={(e) => setFormData({ ...formData, pensionEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Include Pension (8%)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.nhfEnabled}
                      onChange={(e) => setFormData({ ...formData, nhfEnabled: e.target.checked })}
                      className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">Include NHF (2.5%)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.thirteenthMonth}
                      onChange={(e) => setFormData({ ...formData, thirteenthMonth: e.target.checked })}
                      className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700">13th Month Salary</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleDetailedCalculate}
                  disabled={loading}
                  className="btn-primary flex-1"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <CalculatorIcon className="h-5 w-5 mr-2" />
                      Calculate
                    </>
                  )}
                </button>
                <button onClick={handleReset} className="btn-secondary">
                  Reset
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <CurrencyDollarIcon className="h-5 w-5 text-accent-600" />
                <h2 className="text-lg font-semibold">Calculation Results</h2>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase">Gross Monthly</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatNGN(result.monthly?.gross || result.summary?.grossMonthly)}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase">PAYE Tax</p>
                  <p className="text-xl font-bold text-red-600">
                    {formatNGN(result.monthly?.paye || result.tax?.monthlyPAYE)}
                  </p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase">Deductions</p>
                  <p className="text-xl font-bold text-yellow-600">
                    {formatNGN(result.monthly?.totalDeductions || result.deductions?.employee?.total / 12)}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase">Net Monthly</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatNGN(result.monthly?.net || result.summary?.netMonthly)}
                  </p>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-4">
                {/* Income Breakdown (Detailed mode only) */}
                {result.income && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Income Breakdown (Annual)</h3>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      {result.income.annual.basic > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Basic Salary</span>
                          <span className="font-medium">{formatNGN(result.income.annual.basic)}</span>
                        </div>
                      )}
                      {result.income.annual.housing > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Housing Allowance</span>
                          <span className="font-medium">{formatNGN(result.income.annual.housing)}</span>
                        </div>
                      )}
                      {result.income.annual.transport > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Transport Allowance</span>
                          <span className="font-medium">{formatNGN(result.income.annual.transport)}</span>
                        </div>
                      )}
                      {result.income.annual.utility > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Utility Allowance</span>
                          <span className="font-medium">{formatNGN(result.income.annual.utility)}</span>
                        </div>
                      )}
                      {result.income.annual.meal > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Meal Allowance</span>
                          <span className="font-medium">{formatNGN(result.income.annual.meal)}</span>
                        </div>
                      )}
                      {result.income.annual.leave > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Leave Allowance</span>
                          <span className="font-medium">{formatNGN(result.income.annual.leave)}</span>
                        </div>
                      )}
                      {result.income.annual.other > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Other Allowances</span>
                          <span className="font-medium">{formatNGN(result.income.annual.other)}</span>
                        </div>
                      )}
                      {result.income.annual.thirteenthMonth > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">13th Month</span>
                          <span className="font-medium">{formatNGN(result.income.annual.thirteenthMonth)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200 font-semibold">
                        <span>Gross Annual</span>
                        <span>{formatNGN(result.income.annual.gross)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tax Breakdown */}
                {result.tax?.breakdown && result.tax.breakdown.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">PAYE Tax Breakdown</h3>
                    <div className="bg-red-50 rounded-lg p-4 space-y-2">
                      {result.tax.breakdown.map((band, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {formatNGN(band.amount)} @ {band.rate}
                          </span>
                          <span className="font-medium text-red-700">{formatNGN(band.tax)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm pt-2 border-t border-red-200 font-semibold">
                        <span>Annual PAYE</span>
                        <span className="text-red-700">{formatNGN(result.tax.annualPAYE)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Deductions Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Monthly Deductions</h3>
                  <div className="bg-yellow-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">PAYE Tax</span>
                      <span className="font-medium">{formatNGN(result.monthly?.paye || result.tax?.monthlyPAYE)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pension (8%)</span>
                      <span className="font-medium">{formatNGN(result.monthly?.pension || result.deductions?.employee?.pension / 12)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">NHF (2.5%)</span>
                      <span className="font-medium">{formatNGN(result.monthly?.nhf || result.deductions?.employee?.nhf / 12)}</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-yellow-200 font-semibold">
                      <span>Total Monthly Deductions</span>
                      <span>{formatNGN(result.monthly?.totalDeductions || result.deductions?.employee?.total / 12)}</span>
                    </div>
                  </div>
                </div>

                {/* Effective Tax Rate */}
                <div className="flex items-center justify-between bg-primary-50 rounded-lg p-4">
                  <div>
                    <p className="text-sm text-gray-600">Effective Tax Rate</p>
                    <p className="text-2xl font-bold text-primary-700">
                      {result.effectiveTaxRate || result.tax?.effectiveRate || result.summary?.effectiveTaxRate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Take-Home</p>
                    <p className="text-2xl font-bold text-green-600">
                      {result.summary?.takeHomePercentage || `${(((result.monthly?.net || result.summary?.netMonthly) / (result.monthly?.gross || result.summary?.grossMonthly)) * 100).toFixed(1)}%`}
                    </p>
                  </div>
                </div>

                {/* Note for quick mode */}
                {result.note && (
                  <div className="flex items-start gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                    <InformationCircleIcon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                    <p>{result.note}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tax Tables Sidebar */}
        <div className="space-y-6">
          {/* Quick Reference */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <InformationCircleIcon className="h-5 w-5 text-primary-700" />
              <h3 className="font-semibold text-gray-900">Nigeria PAYE Tax Bands</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Federal Government tax tables (2021 onwards)
            </p>

            {taxTables?.taxBands && (
              <div className="space-y-2">
                {taxTables.taxBands.map((band, index) => (
                  <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600">{band.description}</span>
                    <span className="font-medium text-primary-700">{band.rate}</span>
                  </div>
                ))}
              </div>
            )}

            {!taxTables && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">First N300,000</span>
                  <span className="font-medium text-primary-700">7%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">Next N300,000</span>
                  <span className="font-medium text-primary-700">11%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">Next N500,000</span>
                  <span className="font-medium text-primary-700">15%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">Next N500,000</span>
                  <span className="font-medium text-primary-700">19%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600">Next N1,600,000</span>
                  <span className="font-medium text-primary-700">21%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-600">Above N3,200,000</span>
                  <span className="font-medium text-primary-700">24%</span>
                </div>
              </div>
            )}
          </div>

          {/* Statutory Deductions */}
          <div className="card p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Statutory Deductions</h3>
            <div className="space-y-3 text-sm">
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Pension</span>
                  <span className="text-accent-600">8% / 10%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Employee 8%, Employer 10% (of Basic + Housing + Transport)
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">NHF</span>
                  <span className="text-accent-600">2.5%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  National Housing Fund (employees earning above N30,000/month)
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">NSITF</span>
                  <span className="text-accent-600">1%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Social Insurance (employer contribution only)
                </p>
              </div>
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">ITF</span>
                  <span className="text-accent-600">1%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Industrial Training Fund (employers with 5+ staff)
                </p>
              </div>
            </div>
          </div>

          {/* CRA Info */}
          <div className="card p-4 bg-primary-50 border-primary-200">
            <h3 className="font-semibold text-primary-900 mb-2">Consolidated Relief Allowance</h3>
            <p className="text-sm text-primary-800">
              CRA = 20% of Gross + Higher of (1% of Gross or N200,000)
            </p>
            <p className="text-xs text-primary-600 mt-2">
              This relief reduces your taxable income before PAYE calculation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PAYECalculator;
