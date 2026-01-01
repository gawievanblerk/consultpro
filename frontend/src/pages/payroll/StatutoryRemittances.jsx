import { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useCompany } from '../../context/CompanyContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  confirmed: 'bg-purple-100 text-purple-800',
  overdue: 'bg-red-100 text-red-800'
};

const TYPE_LABELS = {
  paye: { name: 'PAYE Tax', icon: '💰', color: 'bg-blue-50 border-blue-200' },
  pension: { name: 'Pension', icon: '🏦', color: 'bg-green-50 border-green-200' },
  nhf: { name: 'NHF', icon: '🏠', color: 'bg-orange-50 border-orange-200' },
  nsitf: { name: 'NSITF', icon: '🛡️', color: 'bg-purple-50 border-purple-200' },
  itf: { name: 'ITF', icon: '📚', color: 'bg-teal-50 border-teal-200' }
};

export default function StatutoryRemittances() {
  const { selectedCompany, isCompanyMode } = useCompany();
  const [remittances, setRemittances] = useState([]);
  const [summary, setSummary] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedRemittance, setSelectedRemittance] = useState(null);
  const [processing, setProcessing] = useState(false);

  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterCompany, setFilterCompany] = useState('');
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, [selectedCompany, filterYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const companyParam = isCompanyMode && selectedCompany?.id ? selectedCompany.id : filterCompany;

      const [remitRes, summaryRes, overdueRes, upcomingRes] = await Promise.all([
        api.get('/api/remittances', {
          params: {
            company_id: companyParam || undefined,
            year: filterYear,
            type: filterType || undefined
          }
        }),
        api.get('/api/remittances/summary', {
          params: { company_id: companyParam || undefined, year: filterYear }
        }),
        api.get('/api/remittances/overdue'),
        api.get('/api/remittances/upcoming', { params: { days: 30 } })
      ]);

      setRemittances(remitRes.data.data || []);
      setSummary(summaryRes.data.data || []);
      setOverdue(overdueRes.data.data || []);
      setUpcoming(upcomingRes.data.data || []);
    } catch (err) {
      setError('Failed to fetch remittances');
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

  const handleMarkPaid = async (remittance) => {
    setSelectedRemittance(remittance);
    setShowModal(true);
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setProcessing(true);
    const formData = new FormData(e.target);

    try {
      await api.post(`/api/remittances/${selectedRemittance.id}/mark-paid`, {
        payment_date: formData.get('payment_date'),
        payment_reference: formData.get('payment_reference'),
        payment_method: formData.get('payment_method'),
        payment_bank: formData.get('payment_bank'),
        notes: formData.get('notes')
      });
      setShowModal(false);
      setSelectedRemittance(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as paid');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async (remittance) => {
    const receipt = prompt('Enter receipt number:');
    if (!receipt) return;

    try {
      await api.post(`/api/remittances/${remittance.id}/confirm`, {
        receipt_number: receipt
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to confirm remittance');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate totals from summary
  const totalsByType = summary.reduce((acc, item) => {
    if (!acc[item.remittance_type]) {
      acc[item.remittance_type] = { total: 0, paid: 0, pending: 0 };
    }
    acc[item.remittance_type].total += parseFloat(item.total_amount) || 0;
    acc[item.remittance_type].paid += parseFloat(item.paid_amount) || 0;
    acc[item.remittance_type].pending += parseFloat(item.pending_amount) || 0;
    return acc;
  }, {});

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
          <h1 className="text-2xl font-bold text-gray-900">Statutory Remittances</h1>
          <p className="text-gray-600">Track PAYE, Pension, NHF and other statutory payments</p>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(TYPE_LABELS).map(([type, info]) => (
          <div key={type} className={`p-4 rounded-lg border ${info.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{info.icon}</span>
              <span className="font-medium text-gray-700">{info.name}</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {formatCurrency(totalsByType[type]?.total || 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Paid: {formatCurrency(totalsByType[type]?.paid || 0)}
            </div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      {(overdue.length > 0 || upcoming.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {overdue.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-bold text-red-800 flex items-center gap-2">
                <span>⚠️</span> Overdue Remittances ({overdue.length})
              </h3>
              <ul className="mt-2 space-y-1">
                {overdue.slice(0, 3).map(r => (
                  <li key={r.id} className="text-sm text-red-700">
                    {r.company_name} - {TYPE_LABELS[r.remittance_type]?.name} ({r.days_overdue} days overdue)
                  </li>
                ))}
                {overdue.length > 3 && (
                  <li className="text-sm text-red-600">+{overdue.length - 3} more...</li>
                )}
              </ul>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                <span>📅</span> Upcoming (Next 30 Days) ({upcoming.length})
              </h3>
              <ul className="mt-2 space-y-1">
                {upcoming.slice(0, 3).map(r => (
                  <li key={r.id} className="text-sm text-yellow-700">
                    {r.company_name} - {TYPE_LABELS[r.remittance_type]?.name} (due in {r.days_until_due} days)
                  </li>
                ))}
                {upcoming.length > 3 && (
                  <li className="text-sm text-yellow-600">+{upcoming.length - 3} more...</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={filterYear}
              onChange={(e) => setFilterYear(parseInt(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {!isCompanyMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">All Companies</option>
                {companies.map(c => (
                  <option key={c.id} value={c.id}>{c.trading_name || c.legal_name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="">All Types</option>
              {Object.entries(TYPE_LABELS).map(([key, info]) => (
                <option key={key} value={key}>{info.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'all', label: 'All Remittances' },
            { id: 'pending', label: 'Pending' },
            { id: 'paid', label: 'Paid' },
            { id: 'confirmed', label: 'Confirmed' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Remittances Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {remittances
              .filter(r => activeTab === 'all' || r.status === activeTab)
              .map(remittance => (
              <tr key={remittance.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">
                    {MONTHS[remittance.pay_period_month - 1]} {remittance.pay_period_year}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {remittance.company_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span>{TYPE_LABELS[remittance.remittance_type]?.icon}</span>
                    <span>{TYPE_LABELS[remittance.remittance_type]?.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">{formatCurrency(remittance.amount)}</div>
                  {remittance.employer_contribution > 0 && (
                    <div className="text-xs text-gray-500">
                      Emp: {formatCurrency(remittance.employee_contribution)} | Er: {formatCurrency(remittance.employer_contribution)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {formatDate(remittance.due_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[remittance.status]}`}>
                    {remittance.status.charAt(0).toUpperCase() + remittance.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex space-x-2">
                    {(remittance.status === 'pending' || remittance.status === 'scheduled' || remittance.status === 'overdue') && (
                      <button
                        onClick={() => handleMarkPaid(remittance)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Mark Paid
                      </button>
                    )}
                    {remittance.status === 'paid' && (
                      <button
                        onClick={() => handleConfirm(remittance)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        Confirm
                      </button>
                    )}
                    {remittance.receipt_number && (
                      <span className="text-gray-500 text-xs">
                        Receipt: {remittance.receipt_number}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {remittances.filter(r => activeTab === 'all' || r.status === activeTab).length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  No remittances found for this period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mark Paid Modal */}
      {showModal && selectedRemittance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Mark Remittance as Paid</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                {selectedRemittance.company_name} - {TYPE_LABELS[selectedRemittance.remittance_type]?.name}
              </div>
              <div className="text-lg font-bold">{formatCurrency(selectedRemittance.amount)}</div>
            </div>
            <form onSubmit={submitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                <input
                  type="date"
                  name="payment_date"
                  defaultValue={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
                <input
                  type="text"
                  name="payment_reference"
                  placeholder="Bank reference number"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  name="payment_method"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="online">Online Portal</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Bank</label>
                <input
                  type="text"
                  name="payment_bank"
                  placeholder="Bank used for payment"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  name="notes"
                  rows="2"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setSelectedRemittance(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? 'Saving...' : 'Mark as Paid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
