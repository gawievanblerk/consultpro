import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  cancelled: 'bg-red-100 text-red-800'
};

export default function PayrollRuns() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [processing, setProcessing] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState({
    company_id: '',
    pay_period_month: currentMonth,
    pay_period_year: currentYear,
    payment_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchRuns();
    fetchCompanies();
  }, []);

  const fetchRuns = async () => {
    try {
      const response = await api.get('/api/payroll/runs');
      setRuns(response.data.data || []);
    } catch (err) {
      setError('Failed to fetch payroll runs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await api.get('/api/companies');
      setCompanies(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/api/payroll/runs', formData);
      setShowModal(false);
      setFormData({
        company_id: '',
        pay_period_month: currentMonth,
        pay_period_year: currentYear,
        payment_date: '',
        notes: ''
      });
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create payroll run');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = async (runId) => {
    if (!confirm('Process payroll for all employees? This will calculate all deductions.')) return;
    setProcessing(true);
    try {
      await api.post(`/api/payroll/runs/${runId}/process`);
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (runId) => {
    if (!confirm('Approve this payroll run? Employees will be able to view their payslips.')) return;
    setProcessing(true);
    try {
      await api.post(`/api/payroll/runs/${runId}/approve`);
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve payroll');
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkPaid = async (runId) => {
    if (!confirm('Mark this payroll as paid?')) return;
    setProcessing(true);
    try {
      await api.post(`/api/payroll/runs/${runId}/mark-paid`);
      fetchRuns();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark payroll as paid');
    } finally {
      setProcessing(false);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Runs</h1>
          <p className="text-gray-600">Manage monthly payroll processing</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          + New Payroll Run
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Payroll Runs Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employees</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gross</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {runs.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No payroll runs found. Create one to get started.
                </td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {MONTHS[run.pay_period_month - 1]} {run.pay_period_year}
                    </div>
                    <div className="text-sm text-gray-500">
                      Payment: {new Date(run.payment_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {run.company_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {run.employee_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {formatCurrency(run.total_gross)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {formatCurrency(run.total_net)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[run.status]}`}>
                      {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/payroll/${run.id}`)}
                        className="text-primary hover:text-primary/80"
                      >
                        View
                      </button>
                      {run.status === 'draft' && (
                        <button
                          onClick={() => handleProcess(run.id)}
                          disabled={processing}
                          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                        >
                          Process
                        </button>
                      )}
                      {run.status === 'calculated' && (
                        <button
                          onClick={() => handleApprove(run.id)}
                          disabled={processing}
                          className="text-green-600 hover:text-green-800 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      )}
                      {run.status === 'approved' && (
                        <button
                          onClick={() => handleMarkPaid(run.id)}
                          disabled={processing}
                          className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      {runs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Total Payroll Runs</div>
            <div className="text-2xl font-bold text-gray-900">{runs.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Pending Processing</div>
            <div className="text-2xl font-bold text-yellow-600">
              {runs.filter(r => r.status === 'draft').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Pending Approval</div>
            <div className="text-2xl font-bold text-blue-600">
              {runs.filter(r => r.status === 'calculated').length}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500">Paid This Year</div>
            <div className="text-2xl font-bold text-green-600">
              {runs.filter(r => r.status === 'paid' && r.pay_period_year === currentYear).length}
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Payroll Run</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.trading_name || company.legal_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    value={formData.pay_period_month}
                    onChange={(e) => setFormData({ ...formData, pay_period_month: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {MONTHS.map((month, idx) => (
                      <option key={idx} value={idx + 1}>{month}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                  <select
                    value={formData.pay_period_year}
                    onChange={(e) => setFormData({ ...formData, pay_period_year: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {[currentYear - 1, currentYear, currentYear + 1].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows="2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                >
                  {processing ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
