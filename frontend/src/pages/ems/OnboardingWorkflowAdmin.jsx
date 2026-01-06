import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useCompany } from '../../context/CompanyContext';

const PHASE_LABELS = {
  phase1: 'Document Signing',
  phase2: 'Role Clarity',
  phase3: 'Employee File',
  phase4: 'Policies',
  phase5: 'Complete'
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  blocked: 'bg-red-100 text-red-800',
  completed: 'bg-green-100 text-green-800'
};

export default function OnboardingWorkflowAdmin() {
  const { selectedCompany, isCompanyMode } = useCompany();
  const [activeTab, setActiveTab] = useState('overview');
  const [employees, setEmployees] = useState([]);
  const [newHires, setNewHires] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeOnboarding, setEmployeeOnboarding] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Always send company_id if a company is selected
      const params = selectedCompany?.id ? { company_id: selectedCompany.id } : {};
      console.log('[OnboardingWorkflow] Fetching with params:', params);

      const [employeesRes, newHiresRes, workflowsRes] = await Promise.all([
        api.get('/api/onboarding-workflow/employees', { params }),
        api.get('/api/onboarding-workflow/new-hires', { params }),
        api.get('/api/onboarding-workflow/workflows', { params })
      ]);

      console.log('[OnboardingWorkflow] New hires response:', newHiresRes.data);

      setEmployees(employeesRes.data.data || []);
      setNewHires(newHiresRes.data.data || []);
      setWorkflows(workflowsRes.data.data || []);

    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = async (employeeId) => {
    setProcessing(employeeId);
    try {
      await api.post(`/api/onboarding-workflow/employees/${employeeId}/start`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start onboarding');
    } finally {
      setProcessing(null);
    }
  };

  const handleViewEmployee = async (employee) => {
    setSelectedEmployee(employee);
    try {
      const res = await api.get(`/api/onboarding-workflow/employees/${employee.employee_id}/status`);
      setEmployeeOnboarding(res.data.data);
      setShowModal(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch employee details');
    }
  };

  const handleVerifyDocument = async (docId) => {
    if (!selectedEmployee) return;
    setProcessing(docId);
    try {
      await api.put(`/api/onboarding-workflow/employees/${selectedEmployee.employee_id}/documents/${docId}/verify`);
      handleViewEmployee(selectedEmployee);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify document');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectDocument = async (docId, reason) => {
    if (!selectedEmployee) return;
    const rejectionReason = prompt('Enter rejection reason:');
    if (!rejectionReason) return;

    setProcessing(docId);
    try {
      await api.put(`/api/onboarding-workflow/employees/${selectedEmployee.employee_id}/documents/${docId}/reject`, {
        rejection_reason: rejectionReason
      });
      handleViewEmployee(selectedEmployee);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject document');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkFileComplete = async () => {
    if (!selectedEmployee) return;
    if (!confirm('Mark employee file as complete? This allows the employee to be activated.')) return;

    setProcessing('file');
    try {
      await api.put(`/api/onboarding-workflow/employees/${selectedEmployee.employee_id}/file-complete`);
      handleViewEmployee(selectedEmployee);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark file complete');
    } finally {
      setProcessing(null);
    }
  };

  const handleActivateEmployee = async () => {
    if (!selectedEmployee) return;
    if (!confirm('Activate this employee? They will transition to Active status.')) return;

    setProcessing('activate');
    try {
      await api.post(`/api/onboarding-workflow/employees/${selectedEmployee.employee_id}/activate`);
      setShowModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to activate employee');
    } finally {
      setProcessing(null);
    }
  };

  const getPhaseProgress = (phaseKey) => {
    const inPhase = employees.filter(e => e.current_phase === phaseKey);
    return inPhase.length;
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
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Workflow</h1>
          <p className="text-gray-600">Manage employee onboarding with phased document verification</p>
        </div>
        {isCompanyMode && selectedCompany && (
          <span className="text-sm text-gray-500">
            Company: {selectedCompany.trading_name || selectedCompany.legal_name}
          </span>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Phase Overview Cards */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(PHASE_LABELS).map(([key, label], index) => (
          <div
            key={key}
            className="bg-white rounded-lg shadow p-4 text-center hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center mb-2 ${
              index < 2 ? 'bg-primary/10 text-primary' :
              index === 2 ? 'bg-orange-100 text-orange-600' :
              'bg-gray-100 text-gray-600'
            }`}>
              <span className="text-lg font-bold">{index + 1}</span>
            </div>
            <div className="text-sm font-medium text-gray-900">{label}</div>
            <div className="text-2xl font-bold text-gray-700 mt-1">{getPhaseProgress(key)}</div>
            <div className="text-xs text-gray-500">employees</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            In Progress ({employees.filter(e => e.overall_status !== 'completed').length})
          </button>
          <button
            onClick={() => setActiveTab('new')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'new'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            New Hires
            {newHires.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                {newHires.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'completed'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Workflow Templates
          </button>
        </nav>
      </div>

      {/* In Progress Tab */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Phase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.filter(e => e.overall_status !== 'completed').map((employee) => (
                <tr key={employee.employee_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{employee.employee_name}</div>
                    <div className="text-sm text-gray-500">{employee.job_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {PHASE_LABELS[employee.current_phase] || employee.current_phase}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${employee.progress || 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{employee.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${STATUS_COLORS[employee.overall_status] || STATUS_COLORS.pending}`}>
                      {employee.overall_status || 'pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.started_at ? new Date(employee.started_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleViewEmployee(employee)}
                      className="text-primary hover:text-primary/80"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
              {employees.filter(e => e.overall_status !== 'completed').length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No employees currently in onboarding
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Hires Tab */}
      {activeTab === 'new' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {newHires.map((employee) => (
                <tr key={employee.id || employee.employee_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {employee.employee_name || `${employee.first_name} ${employee.last_name}`}
                    </div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.job_title || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                      {employee.employment_status || 'New'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleStartOnboarding(employee.id || employee.employee_id)}
                      disabled={processing === (employee.id || employee.employee_id)}
                      className="px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-50 shadow-sm"
                    >
                      {processing === (employee.id || employee.employee_id) ? 'Starting...' : 'Start Onboarding'}
                    </button>
                  </td>
                </tr>
              ))}
              {newHires.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No new hires awaiting onboarding
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.filter(e => e.overall_status === 'completed').map((employee) => (
                <tr key={employee.employee_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{employee.employee_name}</div>
                    <div className="text-sm text-gray-500">{employee.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {employee.job_title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.completed_at ? new Date(employee.completed_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {employee.started_at && employee.completed_at
                      ? `${Math.ceil((new Date(employee.completed_at) - new Date(employee.started_at)) / (1000 * 60 * 60 * 24))} days`
                      : '-'}
                  </td>
                </tr>
              ))}
              {employees.filter(e => e.overall_status === 'completed').length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No completed onboarding records
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Workflow Templates</h3>
            <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
              Create Template
            </button>
          </div>
          <div className="space-y-4">
            {workflows.map((workflow) => (
              <div key={workflow.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium text-gray-900">{workflow.name}</h4>
                    <p className="text-sm text-gray-500">{workflow.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {workflow.is_default && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Default</span>
                    )}
                    {workflow.is_active ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Active</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Inactive</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No workflow templates configured. A default template will be used.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {showModal && selectedEmployee && employeeOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <div>
                <h3 className="text-lg font-semibold">{selectedEmployee.employee_name}</h3>
                <p className="text-sm text-gray-500">{selectedEmployee.job_title} | {selectedEmployee.department}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Overview */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Current Phase</div>
                  <div className="font-semibold text-gray-900">
                    {PHASE_LABELS[employeeOnboarding.onboarding?.current_phase] || 'Not Started'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Profile Completion</div>
                  <div className="font-semibold text-gray-900">
                    {employeeOnboarding.profile_completion || 0}%
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Employee File</div>
                  <div className="font-semibold text-gray-900">
                    {employeeOnboarding.onboarding?.employee_file_complete ? (
                      <span className="text-green-600">Complete</span>
                    ) : (
                      <span className="text-orange-600">Pending</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Documents by Phase */}
              {employeeOnboarding.documents && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900">Documents</h4>
                  {Object.entries(employeeOnboarding.documents.byPhase || {}).map(([phase, docs]) => (
                    <div key={phase} className="border rounded-lg">
                      <div className="px-4 py-3 bg-gray-50 border-b font-medium">
                        {PHASE_LABELS[phase] || phase}
                      </div>
                      <div className="divide-y">
                        {docs.map((doc) => (
                          <div key={doc.id} className="px-4 py-3 flex items-center">
                            <div className="flex-1">
                              <div className="font-medium text-sm">{doc.document_name}</div>
                              <div className="text-xs text-gray-500">
                                Status: <span className={
                                  doc.status === 'verified' ? 'text-green-600' :
                                  doc.status === 'uploaded' ? 'text-blue-600' :
                                  doc.status === 'signed' || doc.status === 'acknowledged' ? 'text-green-600' :
                                  doc.status === 'rejected' ? 'text-red-600' : 'text-gray-600'
                                }>{doc.status}</span>
                                {doc.is_required && <span className="ml-2 text-red-500">(Required)</span>}
                              </div>
                            </div>
                            {doc.status === 'uploaded' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => handleVerifyDocument(doc.id)}
                                  disabled={processing === doc.id}
                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                                >
                                  {processing === doc.id ? '...' : 'Verify'}
                                </button>
                                <button
                                  onClick={() => handleRejectDocument(doc.id)}
                                  disabled={processing === doc.id}
                                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Hard Gates Check */}
              {employeeOnboarding.hardGatesPassed && (
                <div className={`p-4 rounded-lg ${
                  employeeOnboarding.hardGatesPassed.passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    employeeOnboarding.hardGatesPassed.passed ? 'text-green-800' : 'text-red-800'
                  }`}>
                    Hard Gates Status: {employeeOnboarding.hardGatesPassed.passed ? 'PASSED' : 'BLOCKED'}
                  </h4>
                  {!employeeOnboarding.hardGatesPassed.passed && employeeOnboarding.hardGatesPassed.errors && (
                    <ul className="text-sm text-red-700 space-y-1">
                      {employeeOnboarding.hardGatesPassed.errors.map((err, idx) => (
                        <li key={idx}>- {err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
              <button
                onClick={handleMarkFileComplete}
                disabled={processing === 'file' || employeeOnboarding.onboarding?.employee_file_complete}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                {processing === 'file' ? 'Processing...' :
                 employeeOnboarding.onboarding?.employee_file_complete ? 'File Complete' : 'Mark File Complete'}
              </button>
              <button
                onClick={handleActivateEmployee}
                disabled={processing === 'activate' || !employeeOnboarding.hardGatesPassed?.passed}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === 'activate' ? 'Activating...' : 'Activate Employee'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
