import { useState, useEffect } from 'react';
import api from '../../utils/api';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  closed: 'bg-green-100 text-green-800',
  appealed: 'bg-purple-100 text-purple-800',
  submitted: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  investigating: 'bg-indigo-100 text-indigo-800',
  resolved: 'bg-green-100 text-green-800'
};

const ACTION_TYPES = {
  verbal_warning: { label: 'Verbal Warning', severity: 'low' },
  written_warning: { label: 'Written Warning', severity: 'medium' },
  final_warning: { label: 'Final Warning', severity: 'high' },
  suspension: { label: 'Suspension', severity: 'high' },
  termination: { label: 'Termination', severity: 'critical' }
};

const GRIEVANCE_CATEGORIES = [
  { value: 'harassment', label: 'Harassment' },
  { value: 'discrimination', label: 'Discrimination' },
  { value: 'working_conditions', label: 'Working Conditions' },
  { value: 'management', label: 'Management Issues' },
  { value: 'pay', label: 'Pay & Benefits' },
  { value: 'other', label: 'Other' }
];

export default function Disciplinary() {
  const [activeTab, setActiveTab] = useState('actions');
  const [actions, setActions] = useState([]);
  const [grievances, setGrievances] = useState([]);
  const [changes, setChanges] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('action');
  const [processing, setProcessing] = useState(false);

  const [actionForm, setActionForm] = useState({
    company_id: '',
    employee_id: '',
    action_type: 'verbal_warning',
    incident_date: new Date().toISOString().split('T')[0],
    action_date: new Date().toISOString().split('T')[0],
    incident_description: '',
    incident_location: '',
    witnesses: ''
  });

  const [grievanceForm, setGrievanceForm] = useState({
    company_id: '',
    employee_id: '',
    category: '',
    subject: '',
    description: '',
    expected_resolution: ''
  });

  useEffect(() => {
    fetchData();
    fetchCompanies();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'actions') {
        const response = await api.get('/api/disciplinary/actions');
        setActions(response.data.data || []);
      } else if (activeTab === 'grievances') {
        const response = await api.get('/api/disciplinary/grievances');
        setGrievances(response.data.data || []);
      } else if (activeTab === 'changes') {
        const response = await api.get('/api/disciplinary/changes');
        setChanges(response.data.data || []);
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
      const response = await api.get(`/api/employees?company_id=${companyId}`);
      setEmployees(response.data.data || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const openActionModal = () => {
    setModalType('action');
    setShowModal(true);
  };

  const openGrievanceModal = () => {
    setModalType('grievance');
    setShowModal(true);
  };

  const handleCompanyChange = (companyId, formType) => {
    if (formType === 'action') {
      setActionForm({ ...actionForm, company_id: companyId, employee_id: '' });
    } else {
      setGrievanceForm({ ...grievanceForm, company_id: companyId, employee_id: '' });
    }
    if (companyId) {
      fetchEmployees(companyId);
    }
  };

  const handleCreateAction = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/api/disciplinary/actions', actionForm);
      setShowModal(false);
      setActionForm({
        company_id: '',
        employee_id: '',
        action_type: 'verbal_warning',
        incident_date: new Date().toISOString().split('T')[0],
        action_date: new Date().toISOString().split('T')[0],
        incident_description: '',
        incident_location: '',
        witnesses: ''
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create action');
    } finally {
      setProcessing(false);
    }
  };

  const handleCreateGrievance = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await api.post('/api/disciplinary/grievances', grievanceForm);
      setShowModal(false);
      setGrievanceForm({
        company_id: '',
        employee_id: '',
        category: '',
        subject: '',
        description: '',
        expected_resolution: ''
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit grievance');
    } finally {
      setProcessing(false);
    }
  };

  const handleCloseAction = async (actionId) => {
    if (!confirm('Close this disciplinary action?')) return;
    try {
      await api.post(`/api/disciplinary/actions/${actionId}/close`, { outcome: 'upheld' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to close action');
    }
  };

  const handleResolveGrievance = async (grievanceId) => {
    const resolution = prompt('Enter resolution description:');
    if (!resolution) return;
    try {
      await api.post(`/api/disciplinary/grievances/${grievanceId}/resolve`, {
        resolution_description: resolution,
        resolution_outcome: 'resolved'
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resolve grievance');
    }
  };

  const handleApproveChange = async (changeId) => {
    if (!confirm('Approve this change? Employee record will be updated.')) return;
    try {
      await api.post(`/api/disciplinary/changes/${changeId}/approve`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve change');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const getSeverityColor = (actionType) => {
    const type = ACTION_TYPES[actionType];
    if (!type) return 'bg-gray-100 text-gray-800';
    switch (type.severity) {
      case 'low': return 'bg-yellow-100 text-yellow-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'high': return 'bg-red-100 text-red-800';
      case 'critical': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Employee Relations</h1>
          <p className="text-gray-600">Manage disciplinary actions, grievances, and employee changes</p>
        </div>
        <div className="space-x-2">
          {activeTab === 'actions' && (
            <button
              onClick={openActionModal}
              className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
            >
              + New Action
            </button>
          )}
          {activeTab === 'grievances' && (
            <button
              onClick={openGrievanceModal}
              className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
            >
              + Submit Grievance
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('actions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'actions'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Disciplinary Actions ({actions.length})
          </button>
          <button
            onClick={() => setActiveTab('grievances')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'grievances'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Grievances ({grievances.length})
          </button>
          <button
            onClick={() => setActiveTab('changes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'changes'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Employee Changes ({changes.length})
          </button>
        </nav>
      </div>

      {/* Disciplinary Actions Tab */}
      {activeTab === 'actions' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Incident Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {actions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No disciplinary actions found
                  </td>
                </tr>
              ) : (
                actions.map((action) => (
                  <tr key={action.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{action.employee_name}</div>
                      <div className="text-sm text-gray-500">{action.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(action.action_type)}`}>
                        {ACTION_TYPES[action.action_type]?.label || action.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(action.incident_date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-xs truncate">
                        {action.incident_description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[action.status]}`}>
                        {action.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {action.status === 'pending' && (
                        <button
                          onClick={() => handleCloseAction(action.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Close
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

      {/* Grievances Tab */}
      {activeTab === 'grievances' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {grievances.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    No grievances found
                  </td>
                </tr>
              ) : (
                grievances.map((grievance) => (
                  <tr key={grievance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-700">
                      {grievance.grievance_reference}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{grievance.employee_name}</div>
                      <div className="text-sm text-gray-500">{grievance.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {GRIEVANCE_CATEGORIES.find(c => c.value === grievance.category)?.label || grievance.category}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 max-w-xs truncate">
                        {grievance.subject}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(grievance.grievance_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[grievance.status]}`}>
                        {grievance.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {!['resolved', 'closed'].includes(grievance.status) && (
                        <button
                          onClick={() => handleResolveGrievance(grievance.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Resolve
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

      {/* Employee Changes Tab */}
      {activeTab === 'changes' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Change Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effective Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {changes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No employee changes found
                  </td>
                </tr>
              ) : (
                changes.map((change) => (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{change.employee_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        change.change_type === 'promotion' ? 'bg-green-100 text-green-800' :
                        change.change_type === 'demotion' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {change.change_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {change.new_job_title && (
                          <div>Title: {change.previous_job_title} &rarr; {change.new_job_title}</div>
                        )}
                        {change.new_department && (
                          <div>Dept: {change.previous_department} &rarr; {change.new_department}</div>
                        )}
                        {change.new_salary && (
                          <div>Salary change applied</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(change.effective_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[change.status] || 'bg-gray-100 text-gray-800'}`}>
                        {change.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      {change.status === 'pending' && (
                        <button
                          onClick={() => handleApproveChange(change.id)}
                          className="text-green-600 hover:text-green-800"
                        >
                          Approve
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

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {modalType === 'action' ? (
              <>
                <h2 className="text-xl font-bold mb-4">New Disciplinary Action</h2>
                <form onSubmit={handleCreateAction} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      value={actionForm.company_id}
                      onChange={(e) => handleCompanyChange(e.target.value, 'action')}
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
                      value={actionForm.employee_id}
                      onChange={(e) => setActionForm({ ...actionForm, employee_id: e.target.value })}
                      required
                      disabled={!actionForm.company_id}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                    <select
                      value={actionForm.action_type}
                      onChange={(e) => setActionForm({ ...actionForm, action_type: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      {Object.entries(ACTION_TYPES).map(([value, info]) => (
                        <option key={value} value={value}>{info.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Incident Date</label>
                      <input
                        type="date"
                        value={actionForm.incident_date}
                        onChange={(e) => setActionForm({ ...actionForm, incident_date: e.target.value })}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Action Date</label>
                      <input
                        type="date"
                        value={actionForm.action_date}
                        onChange={(e) => setActionForm({ ...actionForm, action_date: e.target.value })}
                        required
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Incident Description</label>
                    <textarea
                      value={actionForm.incident_description}
                      onChange={(e) => setActionForm({ ...actionForm, incident_description: e.target.value })}
                      required
                      rows="3"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={actionForm.incident_location}
                      onChange={(e) => setActionForm({ ...actionForm, incident_location: e.target.value })}
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
                      className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                    >
                      {processing ? 'Creating...' : 'Create Action'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4">Submit Grievance</h2>
                <form onSubmit={handleCreateGrievance} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <select
                      value={grievanceForm.company_id}
                      onChange={(e) => handleCompanyChange(e.target.value, 'grievance')}
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
                      value={grievanceForm.employee_id}
                      onChange={(e) => setGrievanceForm({ ...grievanceForm, employee_id: e.target.value })}
                      required
                      disabled={!grievanceForm.company_id}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={grievanceForm.category}
                      onChange={(e) => setGrievanceForm({ ...grievanceForm, category: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    >
                      <option value="">Select category</option>
                      {GRIEVANCE_CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input
                      type="text"
                      value={grievanceForm.subject}
                      onChange={(e) => setGrievanceForm({ ...grievanceForm, subject: e.target.value })}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={grievanceForm.description}
                      onChange={(e) => setGrievanceForm({ ...grievanceForm, description: e.target.value })}
                      required
                      rows="4"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expected Resolution</label>
                    <textarea
                      value={grievanceForm.expected_resolution}
                      onChange={(e) => setGrievanceForm({ ...grievanceForm, expected_resolution: e.target.value })}
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
                      className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                    >
                      {processing ? 'Submitting...' : 'Submit Grievance'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
