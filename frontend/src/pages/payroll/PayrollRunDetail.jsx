import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  processing: 'bg-yellow-100 text-yellow-800',
  calculated: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  paid: 'bg-purple-100 text-purple-800',
  pending: 'bg-orange-100 text-orange-800'
};

export default function PayrollRunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRun();
  }, [id]);

  const fetchRun = async () => {
    try {
      const response = await api.get(`/api/payroll/runs/${id}`);
      setRun(response.data.data);
    } catch (err) {
      setError('Failed to fetch payroll run');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!confirm('Process payroll for all employees?')) return;
    setProcessing(true);
    try {
      await api.post(`/api/payroll/runs/${id}/process`);
      fetchRun();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this payroll run?')) return;
    setProcessing(true);
    try {
      await api.post(`/api/payroll/runs/${id}/approve`);
      fetchRun();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!confirm('Mark this payroll as paid?')) return;
    setProcessing(true);
    try {
      await api.post(`/api/payroll/runs/${id}/mark-paid`);
      fetchRun();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark payroll as paid');
    } finally {
      setProcessing(false);
    }
  };

  const downloadPayslip = async (payslipId, employeeName) => {
    try {
      const response = await api.get(`/api/payroll/payslips/${payslipId}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payslip_${employeeName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download payslip');
      console.error(err);
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

  if (!run) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Payroll run not found</p>
        <button onClick={() => navigate('/dashboard/payroll')} className="mt-4 text-primary">
          Back to Payroll Runs
        </button>
      </div>
    );
  }

  const periodName = `${MONTHS[run.pay_period_month - 1]} ${run.pay_period_year}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <button
            onClick={() => navigate('/dashboard/payroll')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            &larr; Back to Payroll Runs
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Payroll: {periodName}
          </h1>
          <p className="text-gray-600">{run.company_name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 text-sm font-medium rounded-full ${STATUS_COLORS[run.status]}`}>
            {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
          </span>
          {run.status === 'draft' && (
            <button
              onClick={handleProcess}
              disabled={processing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {processing ? 'Processing...' : 'Process Payroll'}
            </button>
          )}
          {run.status === 'calculated' && (
            <button
              onClick={handleApprove}
              disabled={processing}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {run.status === 'approved' && (
            <button
              onClick={handleMarkPaid}
              disabled={processing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Mark as Paid
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Employees</div>
          <div className="text-2xl font-bold text-gray-900">{run.employee_count || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Gross</div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(run.total_gross)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Deductions</div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(Number(run.total_paye || 0) + Number(run.total_pension_employee || 0) + Number(run.total_nhf || 0))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Total Net</div>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(run.total_net)}</div>
        </div>
      </div>

      {/* Statutory Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Statutory Deductions Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">PAYE Tax</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(run.total_paye)}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">Pension (Employee 8%)</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(run.total_pension_employee)}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">Pension (Employer 10%)</div>
            <div className="text-lg font-semibold text-blue-600">{formatCurrency(run.total_pension_employer)}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">NHF (2.5%)</div>
            <div className="text-lg font-semibold text-gray-900">{formatCurrency(run.total_nhf)}</div>
          </div>
          <div className="border rounded-lg p-3">
            <div className="text-xs text-gray-500">NSITF + ITF (Employer)</div>
            <div className="text-lg font-semibold text-blue-600">
              {formatCurrency(Number(run.total_nsitf || 0) + Number(run.total_itf || 0))}
            </div>
          </div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Employee Payslips</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">PAYE</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pension</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">NHF</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(!run.payslips || run.payslips.length === 0) ? (
              <tr>
                <td colSpan="9" className="px-6 py-8 text-center text-gray-500">
                  {run.status === 'draft' ? (
                    'Click "Process Payroll" to generate payslips for all employees'
                  ) : (
                    'No payslips found'
                  )}
                </td>
              </tr>
            ) : (
              run.payslips.map((slip) => (
                <tr key={slip.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{slip.employee_name}</div>
                    <div className="text-sm text-gray-500">{slip.employee_id_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {slip.department || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-900">
                    {formatCurrency(slip.gross_salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                    -{formatCurrency(slip.paye_tax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                    -{formatCurrency(slip.pension_employee)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-red-600">
                    -{formatCurrency(slip.nhf)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-green-600">
                    {formatCurrency(slip.net_salary)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[slip.status]}`}>
                      {slip.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {['approved', 'paid'].includes(slip.status) && (
                      <button
                        onClick={() => downloadPayslip(slip.id, slip.employee_name)}
                        className="text-primary hover:text-primary/80"
                      >
                        Download PDF
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Payment Date Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Payment Date:</strong> {new Date(run.payment_date).toLocaleDateString('en-NG', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}
        {run.notes && (
          <div className="mt-2"><strong>Notes:</strong> {run.notes}</div>
        )}
      </div>
    </div>
  );
}
