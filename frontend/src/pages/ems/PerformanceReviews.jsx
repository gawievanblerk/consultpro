import { useState, useEffect } from 'react';
import api from '../../utils/api';

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  active: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  self_assessment: 'bg-purple-100 text-purple-800',
  manager_review: 'bg-indigo-100 text-indigo-800',
  calibration: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
};

const RATING_LABELS = {
  outstanding: 'Outstanding',
  exceeds_expectations: 'Exceeds Expectations',
  meets_expectations: 'Meets Expectations',
  needs_improvement: 'Needs Improvement',
  unsatisfactory: 'Unsatisfactory'
};

export default function PerformanceReviews() {
  const [activeTab, setActiveTab] = useState('cycles');
  const [cycles, setCycles] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const currentYear = new Date().getFullYear();
  const [cycleForm, setCycleForm] = useState({
    company_id: '',
    name: `Annual Review ${currentYear}`,
    description: '',
    cycle_type: 'annual',
    start_date: `${currentYear}-01-01`,
    end_date: `${currentYear}-12-31`,
    review_deadline: `${currentYear}-12-15`
  });

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'cycles') {
        const response = await api.get('/api/performance/cycles');
        setCycles(response.data.data || []);
      } else {
        const response = await api.get('/api/performance/reviews');
        setReviews(response.data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch data');
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

  const handleCreateCycle = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/api/performance/cycles', cycleForm);
      setShowCycleModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create cycle');
    } finally {
      setProcessing(false);
    }
  };

  const handleInitiateCycle = async (cycleId) => {
    if (!confirm('Initiate this performance cycle? This will create reviews for all eligible employees.')) return;
    setProcessing(true);
    try {
      const response = await api.post(`/api/performance/cycles/${cycleId}/initiate`);
      alert(`Created ${response.data.count} performance reviews`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to initiate cycle');
    } finally {
      setProcessing(false);
    }
  };

  const handleManagerApprove = async (reviewId) => {
    if (!confirm('Approve this performance review?')) return;
    try {
      await api.post(`/api/performance/reviews/${reviewId}/manager-approve`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve review');
    }
  };

  const handleHRApprove = async (reviewId) => {
    if (!confirm('Complete and finalize this performance review?')) return;
    try {
      await api.post(`/api/performance/reviews/${reviewId}/hr-approve`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to finalize review');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
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
          <h1 className="text-2xl font-bold text-gray-900">Performance Management</h1>
          <p className="text-gray-600">Manage performance review cycles and employee assessments</p>
        </div>
        {activeTab === 'cycles' && (
          <button
            onClick={() => setShowCycleModal(true)}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
          >
            + New Cycle
          </button>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('cycles')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cycles'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Review Cycles ({cycles.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reviews'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            All Reviews ({reviews.length})
          </button>
        </nav>
      </div>

      {/* Cycles Tab */}
      {activeTab === 'cycles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cycles.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No performance cycles found. Create one to get started.
            </div>
          ) : (
            cycles.map((cycle) => (
              <div key={cycle.id} className="bg-white rounded-lg shadow p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cycle.name}</h3>
                    <p className="text-sm text-gray-500">{cycle.company_name}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[cycle.status]}`}>
                    {cycle.status}
                  </span>
                </div>

                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <div>Type: {cycle.cycle_type}</div>
                  <div>Period: {formatDate(cycle.start_date)} - {formatDate(cycle.end_date)}</div>
                  <div>Deadline: {formatDate(cycle.review_deadline)}</div>
                </div>

                <div className="flex justify-between items-center text-sm mb-4">
                  <span className="text-gray-500">Reviews:</span>
                  <span className="font-medium">
                    {cycle.completed_count || 0} / {cycle.review_count || 0} completed
                  </span>
                </div>

                {cycle.review_count > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${(cycle.completed_count / cycle.review_count) * 100}%` }}
                    />
                  </div>
                )}

                <div className="flex space-x-2">
                  {cycle.status === 'draft' && (
                    <button
                      onClick={() => handleInitiateCycle(cycle.id)}
                      disabled={processing}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Initiate
                    </button>
                  )}
                  <button className="flex-1 px-3 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50">
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cycle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No performance reviews found
                  </td>
                </tr>
              ) : (
                reviews.map((review) => (
                  <tr key={review.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{review.employee_name}</div>
                      <div className="text-sm text-gray-500">{review.job_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {review.cycle_name || 'Ad-hoc Review'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm">
                      {formatDate(review.review_period_start)} - {formatDate(review.review_period_end)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {review.reviewer_full_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {review.overall_rating ? (
                        <div>
                          <div className="font-medium">{review.overall_score}</div>
                          <div className="text-xs text-gray-500">
                            {RATING_LABELS[review.overall_rating] || review.overall_rating}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[review.status]}`}>
                        {review.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {review.status === 'manager_review' && (
                        <button
                          onClick={() => handleManagerApprove(review.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Manager Approve
                        </button>
                      )}
                      {review.status === 'calibration' && (
                        <button
                          onClick={() => handleHRApprove(review.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Finalize
                        </button>
                      )}
                      <button className="text-primary hover:text-primary/80">
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Cycle Modal */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Create Performance Cycle</h2>
            <form onSubmit={handleCreateCycle} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={cycleForm.company_id}
                  onChange={(e) => setCycleForm({ ...cycleForm, company_id: e.target.value })}
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Name</label>
                <input
                  type="text"
                  value={cycleForm.name}
                  onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Type</label>
                <select
                  value={cycleForm.cycle_type}
                  onChange={(e) => setCycleForm({ ...cycleForm, cycle_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="annual">Annual</option>
                  <option value="bi_annual">Bi-Annual</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={cycleForm.start_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={cycleForm.end_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, end_date: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Review Deadline</label>
                <input
                  type="date"
                  value={cycleForm.review_deadline}
                  onChange={(e) => setCycleForm({ ...cycleForm, review_deadline: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCycleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
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
