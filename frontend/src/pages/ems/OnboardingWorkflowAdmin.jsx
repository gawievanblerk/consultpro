import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useCompany } from '../../context/CompanyContext';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../../components/BulkActions';
import { DocumentTextIcon, PlayIcon } from '@heroicons/react/24/outline';

const PHASE_LABELS = {
  phase1: 'Employee File',
  phase2: 'Document Signing',
  phase3: 'Role Clarity',
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
  const [departments, setDepartments] = useState([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeOnboarding, setEmployeeOnboarding] = useState(null);

  // Bulk selection and assignment states
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [selectedDocTypes, setSelectedDocTypes] = useState([]);
  const [bulkDueDays, setBulkDueDays] = useState(7);
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Filter employees by department
  const filteredEmployees = departmentFilter === 'all'
    ? employees
    : employees.filter(e => e.department_id === departmentFilter);

  const filteredNewHires = departmentFilter === 'all'
    ? newHires
    : newHires.filter(e => e.department_id === departmentFilter);

  // Combine all employees for bulk selection (both new hires and in-progress)
  const allEmployeesForSelection = [
    ...filteredNewHires.map(e => ({ ...e, id: e.id || e.employee_id, _type: 'new' })),
    ...filteredEmployees.map(e => ({ ...e, id: e.employee_id, _type: 'onboarding' }))
  ];

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    selectedItems
  } = useBulkSelection(allEmployeesForSelection);

  useEffect(() => {
    fetchData();
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Always send company_id if a company is selected
      const params = selectedCompany?.id ? { company_id: selectedCompany.id } : {};
      console.log('[OnboardingWorkflow] Fetching with params:', params);

      const [employeesRes, newHiresRes, workflowsRes, departmentsRes] = await Promise.all([
        api.get('/api/onboarding-workflow/employees', { params }),
        api.get('/api/onboarding-workflow/new-hires', { params }),
        api.get('/api/onboarding-workflow/workflows', { params }),
        selectedCompany?.id ? api.get('/api/departments', { params }) : Promise.resolve({ data: { data: [] } })
      ]);

      console.log('[OnboardingWorkflow] New hires response:', newHiresRes.data);
      setDepartments(departmentsRes.data.data || []);

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

  const handleRefreshDocuments = async () => {
    if (!selectedEmployee) return;
    if (!confirm('Refresh documents for this employee? This will create any missing onboarding documents.')) return;

    setProcessing('refresh');
    try {
      const res = await api.post(`/api/onboarding-workflow/employees/${selectedEmployee.employee_id}/refresh-documents`);
      alert(`Documents refreshed: ${res.data.documentsCreated || 0} created`);
      handleViewEmployee(selectedEmployee);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to refresh documents');
    } finally {
      setProcessing(null);
    }
  };

  const getPhaseProgress = (phaseKey) => {
    // Extract phase number from key (e.g., 'phase1' -> 1)
    const phaseNum = parseInt(phaseKey.replace('phase', ''));
    const inPhase = filteredEmployees.filter(e => e.current_phase === phaseNum);
    return inPhase.length;
  };

  // Bulk operations handlers
  const handleOpenBulkAssign = async () => {
    try {
      const res = await api.get('/api/onboarding-workflow/document-types');
      setDocumentTypes(res.data.data || []);
      setSelectedDocTypes([]);
      setBulkDueDays(7);
      setShowBulkAssignModal(true);
    } catch (err) {
      setError('Failed to load document types');
    }
  };

  const handleBulkAssignDocuments = async () => {
    if (selectedDocTypes.length === 0) {
      setError('Please select at least one document type');
      return;
    }

    setBulkProcessing(true);
    try {
      const documents = documentTypes.filter(d => selectedDocTypes.includes(d.type));
      const employeeIds = Array.from(selectedIds);

      const res = await api.post('/api/onboarding-workflow/bulk-assign-documents', {
        employee_ids: employeeIds,
        documents,
        due_days: bulkDueDays
      });

      alert(res.data.message);
      setShowBulkAssignModal(false);
      clearSelection();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign documents');
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleBulkStartOnboarding = async () => {
    const newHireIds = selectedItems.filter(e => e._type === 'new').map(e => e.id);
    if (newHireIds.length === 0) {
      setError('No new hires selected. Bulk start only applies to new hires.');
      return;
    }

    if (!confirm(`Start onboarding for ${newHireIds.length} employee(s)?`)) return;

    setBulkProcessing(true);
    try {
      const res = await api.post('/api/onboarding-workflow/bulk-start-onboarding', {
        employee_ids: newHireIds
      });

      alert(res.data.message);
      clearSelection();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start onboarding');
    } finally {
      setBulkProcessing(false);
    }
  };

  const toggleDocType = (type) => {
    setSelectedDocTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
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
        <div className="flex items-center gap-4">
          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="form-input text-sm"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          )}
          {isCompanyMode && selectedCompany && (
            <span className="text-sm text-gray-500">
              Company: {selectedCompany.trading_name || selectedCompany.legal_name}
            </span>
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
            In Progress ({filteredEmployees.filter(e => e.overall_status !== 'completed').length})
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
            {filteredNewHires.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full">
                {filteredNewHires.length}
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
                <th className="px-4 py-3 text-left">
                  <SelectCheckbox
                    checked={isAllSelected}
                    indeterminate={isPartiallySelected}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Phase</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.filter(e => e.overall_status !== 'completed').map((employee) => (
                <tr key={employee.employee_id} className={`hover:bg-gray-50 ${isSelected(employee.employee_id) ? 'bg-primary-50' : ''}`}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <SelectCheckbox
                      checked={isSelected(employee.employee_id)}
                      onChange={() => toggleItem(employee.employee_id)}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {employee.first_name} {employee.last_name}
                    </div>
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
              {filteredEmployees.filter(e => e.overall_status !== 'completed').length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
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
                <th className="px-4 py-3 text-left">
                  <SelectCheckbox
                    checked={isAllSelected}
                    indeterminate={isPartiallySelected}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredNewHires.map((employee) => {
                const empId = employee.id || employee.employee_id;
                return (
                <tr key={empId} className={`hover:bg-gray-50 ${isSelected(empId) ? 'bg-primary-50' : ''}`}>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <SelectCheckbox
                      checked={isSelected(empId)}
                      onChange={() => toggleItem(empId)}
                    />
                  </td>
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
                      className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-50 shadow-sm"
                    >
                      {processing === (employee.id || employee.employee_id) ? 'Starting...' : 'Start Onboarding'}
                    </button>
                  </td>
                </tr>
              );
              })}
              {filteredNewHires.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
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
              {filteredEmployees.filter(e => e.overall_status === 'completed').map((employee) => (
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
              {filteredEmployees.filter(e => e.overall_status === 'completed').length === 0 && (
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
                <h3 className="text-lg font-semibold">{selectedEmployee.first_name} {selectedEmployee.last_name}</h3>
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
                    {PHASE_LABELS[employeeOnboarding?.current_phase] || 'Not Started'}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Profile Completion</div>
                  <div className="font-semibold text-gray-900">
                    {employeeOnboarding?.profile_completion_percentage || 0}%
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Employee File</div>
                  <div className="font-semibold text-gray-900">
                    {employeeOnboarding?.employee_file_complete ? (
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
              <div className="flex space-x-2">
                <button
                  onClick={handleMarkFileComplete}
                  disabled={processing === 'file' || employeeOnboarding.onboarding?.employee_file_complete}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-50"
                >
                  {processing === 'file' ? 'Processing...' :
                   employeeOnboarding.onboarding?.employee_file_complete ? 'File Complete' : 'Mark File Complete'}
                </button>
                <button
                  onClick={handleRefreshDocuments}
                  disabled={processing === 'refresh'}
                  className="px-4 py-2 border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 disabled:opacity-50"
                >
                  {processing === 'refresh' ? 'Refreshing...' : 'Refresh Documents'}
                </button>
              </div>
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

      {/* Bulk Actions Toolbar */}
      <BulkActions
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        customActions={[
          {
            label: 'Assign Documents',
            icon: DocumentTextIcon,
            onClick: handleOpenBulkAssign,
            className: 'bg-accent-600 hover:bg-accent-700'
          },
          {
            label: 'Start Onboarding',
            icon: PlayIcon,
            onClick: handleBulkStartOnboarding,
            className: 'bg-orange-600 hover:bg-orange-700'
          }
        ]}
      />

      {/* Bulk Document Assignment Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Assign Documents</h3>
                <p className="text-sm text-gray-500">
                  Assign documents to {selectedCount} selected employee(s)
                </p>
              </div>
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Due Days Setting */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date (days from hire date)
                </label>
                <input
                  type="number"
                  value={bulkDueDays}
                  onChange={(e) => setBulkDueDays(parseInt(e.target.value) || 7)}
                  className="w-32 px-3 py-2 border rounded-lg"
                  min={1}
                  max={90}
                />
              </div>

              {/* Document Type Selection */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Select Documents to Assign
                  </label>
                  <div className="text-sm text-gray-500">
                    {selectedDocTypes.length} selected
                  </div>
                </div>

                {/* Phase 1: Employee File (Uploads) */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-primary-700 mb-2 bg-primary-50 px-3 py-1 rounded">
                    Phase 1: Employee File (Uploads)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 pl-2">
                    {documentTypes.filter(d => d.phase === 1).map((doc) => (
                      <label
                        key={doc.type}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                          selectedDocTypes.includes(doc.type) ? 'bg-accent-50 border border-accent-200' : 'border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocTypes.includes(doc.type)}
                          onChange={() => toggleDocType(doc.type)}
                          className="h-4 w-4 text-accent-600 rounded"
                        />
                        <div>
                          <span className="text-sm font-medium">{doc.title}</span>
                          {doc.requires_upload && (
                            <span className="ml-1 text-xs text-orange-600">(Upload)</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Phase 2: Document Signing */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-primary-700 mb-2 bg-primary-50 px-3 py-1 rounded">
                    Phase 2: Document Signing
                  </h4>
                  <div className="grid grid-cols-2 gap-2 pl-2">
                    {documentTypes.filter(d => d.phase === 2).map((doc) => (
                      <label
                        key={doc.type}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                          selectedDocTypes.includes(doc.type) ? 'bg-accent-50 border border-accent-200' : 'border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocTypes.includes(doc.type)}
                          onChange={() => toggleDocType(doc.type)}
                          className="h-4 w-4 text-accent-600 rounded"
                        />
                        <div>
                          <span className="text-sm font-medium">{doc.title}</span>
                          {doc.requires_signature && (
                            <span className="ml-1 text-xs text-blue-600">(Sign)</span>
                          )}
                          {doc.requires_acknowledgment && (
                            <span className="ml-1 text-xs text-green-600">(Ack)</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Phase 3: Role Clarity */}
                <div className="mb-4">
                  <h4 className="text-sm font-semibold text-primary-700 mb-2 bg-primary-50 px-3 py-1 rounded">
                    Phase 3: Role Clarity
                  </h4>
                  <div className="grid grid-cols-2 gap-2 pl-2">
                    {documentTypes.filter(d => d.phase === 3).map((doc) => (
                      <label
                        key={doc.type}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-50 ${
                          selectedDocTypes.includes(doc.type) ? 'bg-accent-50 border border-accent-200' : 'border border-transparent'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDocTypes.includes(doc.type)}
                          onChange={() => toggleDocType(doc.type)}
                          className="h-4 w-4 text-accent-600 rounded"
                        />
                        <div>
                          <span className="text-sm font-medium">{doc.title}</span>
                          {doc.requires_acknowledgment && (
                            <span className="ml-1 text-xs text-green-600">(Ack)</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setSelectedDocTypes(documentTypes.filter(d => d.phase === 1).map(d => d.type))}
                    className="px-3 py-1.5 text-xs bg-primary-100 text-primary-700 rounded hover:bg-primary-200"
                  >
                    Select All Phase 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDocTypes(documentTypes.map(d => d.type))}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDocTypes([])}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Selected Employees Preview */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Employees</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItems.slice(0, 10).map((emp) => (
                    <span
                      key={emp.id}
                      className="px-2 py-1 bg-white border rounded text-sm"
                    >
                      {emp.first_name || emp.employee_name?.split(' ')[0]} {emp.last_name || ''}
                    </span>
                  ))}
                  {selectedItems.length > 10 && (
                    <span className="px-2 py-1 text-sm text-gray-500">
                      +{selectedItems.length - 10} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkAssignDocuments}
                disabled={bulkProcessing || selectedDocTypes.length === 0}
                className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
              >
                {bulkProcessing ? 'Assigning...' : `Assign ${selectedDocTypes.length} Document(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
