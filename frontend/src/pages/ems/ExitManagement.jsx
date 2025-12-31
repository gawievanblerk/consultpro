import { useState, useEffect } from 'react';
import api from '../../utils/api';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  scheduled: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-indigo-100 text-indigo-800'
};

const REQUEST_TYPES = {
  resignation: 'Resignation',
  retirement: 'Retirement',
  termination: 'Termination',
  redundancy: 'Redundancy',
  end_of_contract: 'End of Contract'
};

export default function ExitManagement() {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const [formData, setFormData] = useState({
    company_id: '',
    employee_id: '',
    request_type: 'resignation',
    request_date: new Date().toISOString().split('T')[0],
    requested_last_day: '',
    resignation_reason: '',
    resignation_reason_details: '',
    notice_period_days: 30
  });

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'requests') {
        const response = await api.get('/api/exit/requests');
        setRequests(response.data.data || []);
      } else if (activeTab === 'interviews') {
        const response = await api.get('/api/exit/interviews');
        setInterviews(response.data.data || []);
      } else if (activeTab === 'handovers') {
        const response = await api.get('/api/exit/handovers');
        setHandovers(response.data.data || []);
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

  const fetchEmployees = async (companyId) => {
    try {
      const response = await api.get(`/api/employees?company_id=${companyId}&status=active`);
      setEmployees(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const handleCompanyChange = (companyId) => {
    setFormData({ ...formData, company_id: companyId, employee_id: '' });
    if (companyId) {
      fetchEmployees(companyId);
    } else {
      setEmployees([]);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/api/exit/requests', formData);
      setShowModal(false);
      setFormData({
        company_id: '',
        employee_id: '',
        request_type: 'resignation',
        request_date: new Date().toISOString().split('T')[0],
        requested_last_day: '',
        resignation_reason: '',
        resignation_reason_details: '',
        notice_period_days: 30
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create exit request');
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveRequest = async (requestId) => {
    if (!confirm('Approve this exit request? This will set the employee status to "exiting".')) return;
    try {
      await api.post(`/api/exit/requests/${requestId}/approve`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleCompleteExit = async (requestId) => {
    if (!confirm('Complete this exit? The employee will be marked as terminated.')) return;
    try {
      await api.post(`/api/exit/requests/${requestId}/complete`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete exit');
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
          <h1 className="text-2xl font-bold text-gray-900">Exit Management</h1>
          <p className="text-gray-600">Manage employee exits, handovers, and exit interviews</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
        >
          + New Exit Request
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Pending Approval</div>
          <div className="text-2xl font-bold text-yellow-600">
            {requests.filter(r => r.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">In Progress</div>
          <div className="text-2xl font-bold text-blue-600">
            {requests.filter(r => r.status === 'approved').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Pending Interviews</div>
          <div className="text-2xl font-bold text-purple-600">
            {interviews.filter(i => i.status === 'scheduled').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-500">Completed This Month</div>
          <div className="text-2xl font-bold text-green-600">
            {requests.filter(r => r.status === 'completed').length}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['requests', 'interviews', 'handovers'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Exit {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Request Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Day</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checklist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No exit requests found
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{req.employee_name}</div>
                      <div className="text-sm text-gray-500">{req.job_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {REQUEST_TYPES[req.request_type] || req.request_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(req.request_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(req.actual_last_day || req.requested_last_day)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[req.status]}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[req.checklist_status] || 'bg-gray-100 text-gray-800'}`}>
                        {req.checklist_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {req.status === 'pending' && (
                        <button
                          onClick={() => handleApproveRequest(req.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Approve
                        </button>
                      )}
                      {req.status === 'approved' && req.checklist_status === 'completed' && (
                        <button
                          onClick={() => handleCompleteExit(req.id)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Complete
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

      {/* Interviews Tab */}
      {activeTab === 'interviews' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interview Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Interviewer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experience Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No exit interviews found
                  </td>
                </tr>
              ) : (
                interviews.map((interview) => (
                  <tr key={interview.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{interview.employee_name}</div>
                      <div className="text-sm text-gray-500">{interview.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(interview.interview_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {interview.interviewer_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {interview.overall_experience_rating ? (
                        <div className="flex items-center">
                          <span className="font-medium">{interview.overall_experience_rating}/5</span>
                          {interview.would_recommend_company && (
                            <span className="ml-2 text-xs text-green-600">Would recommend</span>
                          )}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[interview.status]}`}>
                        {interview.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-primary hover:text-primary/80">
                        {interview.status === 'scheduled' ? 'Conduct' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Handovers Tab */}
      {activeTab === 'handovers' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Departing Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Handover To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {handovers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No handover records found
                  </td>
                </tr>
              ) : (
                handovers.map((handover) => (
                  <tr key={handover.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{handover.departing_employee_name}</div>
                      <div className="text-sm text-gray-500">{handover.job_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {handover.receiving_employee_name || 'Not assigned'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700 text-sm">
                      {formatDate(handover.handover_start_date)} - {formatDate(handover.handover_end_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${handover.completion_percentage || 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{handover.completion_percentage || 0}%</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[handover.status]}`}>
                        {handover.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
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

      {/* Create Exit Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">New Exit Request</h2>
            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                <select
                  value={formData.company_id}
                  onChange={(e) => handleCompanyChange(e.target.value)}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                <select
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  required
                  disabled={!formData.company_id}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.job_title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
                  <select
                    value={formData.request_type}
                    onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {Object.entries(REQUEST_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notice Period (Days)</label>
                  <input
                    type="number"
                    value={formData.notice_period_days}
                    onChange={(e) => setFormData({ ...formData, notice_period_days: parseInt(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
                  <input
                    type="date"
                    value={formData.request_date}
                    onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Requested Last Day</label>
                  <input
                    type="date"
                    value={formData.requested_last_day}
                    onChange={(e) => setFormData({ ...formData, requested_last_day: e.target.value })}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              {formData.request_type === 'resignation' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Leaving</label>
                    <select
                      value={formData.resignation_reason}
                      onChange={(e) => setFormData({ ...formData, resignation_reason: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select reason</option>
                      <option value="better_opportunity">Better Opportunity</option>
                      <option value="personal">Personal Reasons</option>
                      <option value="relocation">Relocation</option>
                      <option value="further_studies">Further Studies</option>
                      <option value="health">Health Reasons</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional Details</label>
                    <textarea
                      value={formData.resignation_reason_details}
                      onChange={(e) => setFormData({ ...formData, resignation_reason_details: e.target.value })}
                      rows="2"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              )}
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
                  className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                >
                  {processing ? 'Creating...' : 'Create Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
