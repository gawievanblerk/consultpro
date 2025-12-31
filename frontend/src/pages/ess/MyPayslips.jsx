import { useState, useEffect } from 'react';
import api from '../../utils/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MyPayslips() {
  const [payslips, setPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchPayslips();
  }, []);

  const fetchPayslips = async () => {
    try {
      const response = await api.get('/api/payroll/employee/my-payslips');
      setPayslips(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch payslips');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (payslipId) => {
    setDownloading(payslipId);
    try {
      const response = await api.get(`/api/payroll/payslips/${payslipId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const payslip = payslips.find(p => p.id === payslipId);
      const periodName = payslip ? `${MONTHS[payslip.pay_period_month - 1]}_${payslip.pay_period_year}` : payslipId;
      link.download = `payslip_${periodName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download payslip');
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Payslips</h1>
        <p className="text-gray-600">View and download your salary payslips</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Payslips Grid */}
      {payslips.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No payslips available</h3>
          <p className="mt-1 text-sm text-gray-500">Your payslips will appear here once processed.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payslips.map((payslip) => (
            <div
              key={payslip.id}
              className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedPayslip(payslip)}
            >
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {MONTHS[payslip.pay_period_month - 1]} {payslip.pay_period_year}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Paid: {new Date(payslip.payment_date).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    payslip.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {payslip.status}
                  </span>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Gross Salary</span>
                    <span className="font-medium">{formatCurrency(payslip.gross_salary)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-500">Deductions</span>
                    <span className="text-red-600">-{formatCurrency(payslip.total_deductions)}</span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t">
                    <span className="font-medium text-gray-900">Net Pay</span>
                    <span className="font-bold text-green-600">{formatCurrency(payslip.net_salary)}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadPayslip(payslip.id);
                  }}
                  disabled={downloading === payslip.id}
                  className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-sm"
                >
                  {downloading === payslip.id ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Payslip: {MONTHS[selectedPayslip.pay_period_month - 1]} {selectedPayslip.pay_period_year}
                  </h2>
                  <p className="text-gray-600">{selectedPayslip.employee_name}</p>
                </div>
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm text-gray-500">Employee ID:</span>
                  <span className="ml-2 font-medium">{selectedPayslip.employee_id_number || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Department:</span>
                  <span className="ml-2 font-medium">{selectedPayslip.department || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Position:</span>
                  <span className="ml-2 font-medium">{selectedPayslip.job_title || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Bank:</span>
                  <span className="ml-2 font-medium">{selectedPayslip.bank_name || 'N/A'}</span>
                </div>
              </div>

              {/* Earnings */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Earnings
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'Basic Salary', value: selectedPayslip.basic_salary },
                    { label: 'Housing Allowance', value: selectedPayslip.housing_allowance },
                    { label: 'Transport Allowance', value: selectedPayslip.transport_allowance },
                    { label: 'Meal Allowance', value: selectedPayslip.meal_allowance },
                    { label: 'Utility Allowance', value: selectedPayslip.utility_allowance },
                    { label: 'Other Allowances', value: selectedPayslip.other_allowances }
                  ].filter(item => parseFloat(item.value) > 0).map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 bg-green-50 px-2 rounded font-semibold">
                    <span>GROSS SALARY</span>
                    <span className="text-green-700">{formatCurrency(selectedPayslip.gross_salary)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Deductions
                </h3>
                <div className="space-y-2">
                  {[
                    { label: 'PAYE Tax', value: selectedPayslip.paye_tax },
                    { label: 'Pension (8%)', value: selectedPayslip.pension_employee },
                    { label: 'NHF (2.5%)', value: selectedPayslip.nhf },
                    { label: 'Loan Deduction', value: selectedPayslip.loan_deduction },
                    { label: 'Other Deductions', value: selectedPayslip.other_deductions }
                  ].filter(item => parseFloat(item.value) > 0).map((item, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium text-red-600">-{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 bg-red-50 px-2 rounded font-semibold">
                    <span>TOTAL DEDUCTIONS</span>
                    <span className="text-red-700">-{formatCurrency(selectedPayslip.total_deductions)}</span>
                  </div>
                </div>
              </div>

              {/* Net Pay */}
              <div className="bg-gradient-to-r from-primary to-accent p-4 rounded-lg text-white">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">NET PAY</span>
                  <span className="text-2xl font-bold">{formatCurrency(selectedPayslip.net_salary)}</span>
                </div>
              </div>

              {/* Employer Contributions Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
                <strong>Employer Contributions (not deducted from your pay):</strong>
                <div className="mt-1">
                  Pension (10%): {formatCurrency(selectedPayslip.employer_pension)} |
                  NSITF: {formatCurrency(selectedPayslip.employer_nsitf)} |
                  ITF: {formatCurrency(selectedPayslip.employer_itf)}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedPayslip(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadPayslip(selectedPayslip.id)}
                  disabled={downloading === selectedPayslip.id}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {downloading === selectedPayslip.id ? 'Downloading...' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
