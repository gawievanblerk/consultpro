import { useState, useEffect } from 'react';
import api from '../../utils/api';

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  extended: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  terminated: 'bg-red-100 text-red-800',
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800'
};

const URGENCY_COLORS = {
  overdue: 'bg-red-100 text-red-800 border-red-200',
  due_soon: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  on_track: 'bg-green-100 text-green-800 border-green-200'
};

export default function ProbationManagement() {
  const [activeTab, setActiveTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [processing, setProcessing] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    review_type: 'mid_probation',
    review_date: new Date().toISOString().split('T')[0],
    job_knowledge_score: 3,
    quality_of_work_score: 3,
    productivity_score: 3,
    attendance_punctuality_score: 3,
    communication_score: 3,
    teamwork_score: 3,
    initiative_score: 3,
    adaptability_score: 3,
    strengths: '',
    areas_for_improvement: '',
    recommendation: 'confirm',
    recommendation_comments: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'employees') {
        const response = await api.get('/api/probation/employees');
        setEmployees(response.data.data || []);
      } else {
        const response = await api.get('/api/probation/reviews');
        setReviews(response.data.data || []);
      }
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (employee) => {
    setSelectedEmployee(employee);
    setReviewForm({
      ...reviewForm,
      review_period_start: employee.probation_start_date,
      review_period_end: employee.probation_end_date
    });
    setShowModal(true);
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/api/probation/reviews', {
        company_id: selectedEmployee.company_id,
        employee_id: selectedEmployee.id,
        ...reviewForm
      });
      setShowModal(false);
      setActiveTab('reviews');
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create review');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmitReview = async (reviewId) => {
    if (!confirm('Submit this review for approval?')) return;
    try {
      await api.post(`/api/probation/reviews/${reviewId}/submit`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit review');
    }
  };

  const handleApproveReview = async (reviewId) => {
    if (!confirm('Approve this probation review? This will update the employee status.')) return;
    try {
      await api.post(`/api/probation/reviews/${reviewId}/approve`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve review');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff;
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
        <h1 className="text-2xl font-bold text-gray-900">Probation Management</h1>
        <p className="text-gray-600">Track and review employees on probation</p>
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
            onClick={() => setActiveTab('employees')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'employees'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Employees on Probation ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reviews'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Probation Reviews ({reviews.length})
          </button>
        </nav>
      </div>

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Probation Ends</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviews</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No employees currently on probation
                  </td>
                </tr>
              ) : (
                employees.map((emp) => {
                  const daysRemaining = getDaysRemaining(emp.probation_end_date);
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{emp.job_title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {emp.department || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {formatDate(emp.hire_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{formatDate(emp.probation_end_date)}</div>
                        {daysRemaining !== null && (
                          <div className={`text-sm px-2 py-0.5 rounded inline-block mt-1 ${URGENCY_COLORS[emp.probation_urgency]}`}>
                            {daysRemaining < 0 ? `${Math.abs(daysRemaining)} days overdue` :
                             daysRemaining === 0 ? 'Due today' :
                             `${daysRemaining} days left`}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[emp.probation_status]}`}>
                          {emp.probation_status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                        {emp.review_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openReviewModal(emp)}
                          className="text-primary hover:text-primary/80"
                        >
                          Create Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Review Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommendation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reviews.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No probation reviews found
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
                      {review.review_type?.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(review.review_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{review.overall_score || '-'}</div>
                      <div className="text-sm text-gray-500">{review.overall_rating || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        review.recommendation === 'confirm' ? 'bg-green-100 text-green-800' :
                        review.recommendation === 'extend' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {review.recommendation}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[review.status]}`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {review.status === 'draft' && (
                        <button
                          onClick={() => handleSubmitReview(review.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Submit
                        </button>
                      )}
                      {review.status === 'submitted' && (
                        <button
                          onClick={() => handleApproveReview(review.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Review Modal */}
      {showModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                Probation Review: {selectedEmployee.first_name} {selectedEmployee.last_name}
              </h2>
              <form onSubmit={handleCreateReview} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Type</label>
                    <select
                      value={reviewForm.review_type}
                      onChange={(e) => setReviewForm({ ...reviewForm, review_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="mid_probation">Mid-Probation Review</option>
                      <option value="end_probation">End of Probation Review</option>
                      <option value="extension">Extension Review</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Review Date</label>
                    <input
                      type="date"
                      value={reviewForm.review_date}
                      onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-3">Performance Ratings (1-5)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'job_knowledge_score', label: 'Job Knowledge' },
                      { key: 'quality_of_work_score', label: 'Quality of Work' },
                      { key: 'productivity_score', label: 'Productivity' },
                      { key: 'attendance_punctuality_score', label: 'Attendance & Punctuality' },
                      { key: 'communication_score', label: 'Communication' },
                      { key: 'teamwork_score', label: 'Teamwork' },
                      { key: 'initiative_score', label: 'Initiative' },
                      { key: 'adaptability_score', label: 'Adaptability' }
                    ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm text-gray-700 mb-1">{field.label}</label>
                        <select
                          value={reviewForm[field.key]}
                          onChange={(e) => setReviewForm({ ...reviewForm, [field.key]: parseInt(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        >
                          <option value={1}>1 - Unsatisfactory</option>
                          <option value={2}>2 - Needs Improvement</option>
                          <option value={3}>3 - Satisfactory</option>
                          <option value={4}>4 - Good</option>
                          <option value={5}>5 - Excellent</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strengths</label>
                  <textarea
                    value={reviewForm.strengths}
                    onChange={(e) => setReviewForm({ ...reviewForm, strengths: e.target.value })}
                    rows="2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Areas for Improvement</label>
                  <textarea
                    value={reviewForm.areas_for_improvement}
                    onChange={(e) => setReviewForm({ ...reviewForm, areas_for_improvement: e.target.value })}
                    rows="2"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                    <select
                      value={reviewForm.recommendation}
                      onChange={(e) => setReviewForm({ ...reviewForm, recommendation: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="confirm">Confirm Employment</option>
                      <option value="extend">Extend Probation</option>
                      <option value="terminate">Terminate Employment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                    <input
                      type="text"
                      value={reviewForm.recommendation_comments}
                      onChange={(e) => setReviewForm({ ...reviewForm, recommendation_comments: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
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
                    className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                  >
                    {processing ? 'Creating...' : 'Create Review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
