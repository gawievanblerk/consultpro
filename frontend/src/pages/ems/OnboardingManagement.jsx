import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function OnboardingManagement() {
  const [activeTab, setActiveTab] = useState('progress');
  const [checklists, setChecklists] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [policyAcks, setPolicyAcks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Default checklist items
  const defaultChecklistItems = [
    { item: 'Complete personal information form', category: 'hr', required: true },
    { item: 'Submit bank account details', category: 'hr', required: true },
    { item: 'Provide emergency contact information', category: 'hr', required: true },
    { item: 'Submit passport photographs', category: 'documents', required: true },
    { item: 'Submit copies of educational certificates', category: 'documents', required: true },
    { item: 'Submit copy of valid ID (NIN/Passport/Driver\'s License)', category: 'documents', required: true },
    { item: 'Submit birth certificate or age declaration', category: 'documents', required: false },
    { item: 'Complete tax registration (TIN)', category: 'documents', required: true },
    { item: 'Receive employee handbook', category: 'policies', required: true },
    { item: 'Review company policies', category: 'policies', required: true },
    { item: 'Sign confidentiality agreement', category: 'policies', required: true },
    { item: 'Receive workstation and IT equipment', category: 'it', required: true },
    { item: 'Set up email and system access', category: 'it', required: true },
    { item: 'Complete IT security training', category: 'it', required: true },
    { item: 'Meet with supervisor/manager', category: 'orientation', required: true },
    { item: 'Tour of office facilities', category: 'orientation', required: false },
    { item: 'Introduction to team members', category: 'orientation', required: true },
    { item: 'Review job description and expectations', category: 'orientation', required: true },
  ];

  const [newChecklist, setNewChecklist] = useState({
    employee_id: '',
    items: defaultChecklistItems.map(item => ({ ...item, completed: false }))
  });

  const [newPolicyAssignment, setNewPolicyAssignment] = useState({
    employee_id: '',
    policy_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [checklistsRes, employeesRes, policiesRes, acksRes] = await Promise.all([
        api.get('/api/onboarding-checklist/checklists'),
        api.get('/api/employees'),
        api.get('/api/policies'),
        api.get('/api/onboarding-checklist/policy-acknowledgements')
      ]);
      setChecklists(checklistsRes.data.data || []);
      setEmployees(employeesRes.data.data || []);
      setPolicies(policiesRes.data.data || []);
      setPolicyAcks(acksRes.data.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChecklist = async (e) => {
    e.preventDefault();
    if (!newChecklist.employee_id) {
      setError('Please select an employee');
      return;
    }
    setProcessing(true);
    try {
      await api.post('/api/onboarding-checklist/checklists', {
        employee_id: newChecklist.employee_id,
        items: newChecklist.items
      });
      setShowModal(false);
      setNewChecklist({
        employee_id: '',
        items: defaultChecklistItems.map(item => ({ ...item, completed: false }))
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create checklist');
    } finally {
      setProcessing(false);
    }
  };

  const handleAssignPolicy = async (e) => {
    e.preventDefault();
    if (!newPolicyAssignment.employee_id || !newPolicyAssignment.policy_id) {
      setError('Please select both employee and policy');
      return;
    }
    setProcessing(true);
    try {
      await api.post('/api/onboarding-checklist/policy-acknowledgements', {
        employee_id: newPolicyAssignment.employee_id,
        policy_id: newPolicyAssignment.policy_id
      });
      setShowModal(false);
      setNewPolicyAssignment({ employee_id: '', policy_id: '' });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign policy');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkAssignPolicies = async (employeeId) => {
    if (!confirm('Assign all mandatory policies to this employee?')) return;
    setProcessing(true);
    try {
      const mandatoryPolicies = policies.filter(p => p.is_mandatory);
      for (const policy of mandatoryPolicies) {
        try {
          await api.post('/api/onboarding-checklist/policy-acknowledgements', {
            employee_id: employeeId,
            policy_id: policy.id
          });
        } catch (err) {
          // Skip if already assigned
          console.log('Policy may already be assigned:', err.response?.data?.error);
        }
      }
      fetchData();
    } catch (err) {
      setError('Failed to assign policies');
    } finally {
      setProcessing(false);
    }
  };

  const openModal = (type, employee = null) => {
    setModalType(type);
    setSelectedEmployee(employee);
    if (employee) {
      setNewChecklist(prev => ({ ...prev, employee_id: employee.id }));
      setNewPolicyAssignment(prev => ({ ...prev, employee_id: employee.id }));
    }
    setShowModal(true);
  };

  const getChecklistProgress = (checklist) => {
    if (!checklist?.items?.length) return 0;
    const completed = checklist.items.filter(i => i.completed).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  const getEmployeePolicyStatus = (employeeId) => {
    const empAcks = policyAcks.filter(a => a.employee_id === employeeId);
    const pending = empAcks.filter(a => a.status === 'pending').length;
    const acknowledged = empAcks.filter(a => a.status === 'acknowledged').length;
    return { pending, acknowledged, total: empAcks.length };
  };

  const getNewEmployees = () => {
    // Employees hired in last 90 days without a checklist
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    return employees.filter(emp => {
      const hireDate = new Date(emp.hire_date);
      const hasChecklist = checklists.some(c => c.employee_id === emp.id);
      return hireDate >= ninetyDaysAgo || !hasChecklist;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Stats
  const activeChecklists = checklists.filter(c => c.status !== 'completed');
  const completedChecklists = checklists.filter(c => c.status === 'completed');
  const pendingAcks = policyAcks.filter(a => a.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboarding Management</h1>
          <p className="text-gray-600">Manage employee onboarding checklists and policy acknowledgements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('checklist')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            + New Checklist
          </button>
          <button
            onClick={() => openModal('policy')}
            className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
          >
            + Assign Policy
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500">Active Onboarding</div>
          <div className="text-3xl font-bold text-primary">{activeChecklists.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-3xl font-bold text-green-600">{completedChecklists.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500">Pending Policy Acks</div>
          <div className="text-3xl font-bold text-yellow-600">{pendingAcks.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <div className="text-sm text-gray-500">New Employees</div>
          <div className="text-3xl font-bold text-accent-600">{getNewEmployees().length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['progress', 'checklists', 'policies'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'progress' ? 'Onboarding Progress' :
               tab === 'checklists' ? 'Checklists' : 'Policy Assignments'}
            </button>
          ))}
        </nav>
      </div>

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hire Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Checklist</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policies</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getNewEmployees().map((emp) => {
                const checklist = checklists.find(c => c.employee_id === emp.id);
                const progress = checklist ? getChecklistProgress(checklist) : null;
                const policyStatus = getEmployeePolicyStatus(emp.id);

                return (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                      <div className="text-sm text-gray-500">{emp.job_title}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {checklist ? (
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-primary'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">{progress}%</span>
                        </div>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">No checklist</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {policyStatus.total > 0 ? (
                        <div className="text-sm">
                          <span className="text-green-600">{policyStatus.acknowledged} ack</span>
                          {policyStatus.pending > 0 && (
                            <span className="text-yellow-600 ml-2">{policyStatus.pending} pending</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">None assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {!checklist && (
                          <button
                            onClick={() => openModal('checklist', emp)}
                            className="text-sm text-primary hover:underline"
                          >
                            Create Checklist
                          </button>
                        )}
                        <button
                          onClick={() => handleBulkAssignPolicies(emp.id)}
                          disabled={processing}
                          className="text-sm text-accent-600 hover:underline"
                        >
                          Assign Policies
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {getNewEmployees().length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No new employees requiring onboarding
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Checklists Tab */}
      {activeTab === 'checklists' && (
        <div className="space-y-4">
          {checklists.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No onboarding checklists created yet</p>
              <button
                onClick={() => openModal('checklist')}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
              >
                Create First Checklist
              </button>
            </div>
          ) : (
            checklists.map((checklist) => {
              const emp = employees.find(e => e.id === checklist.employee_id);
              const progress = getChecklistProgress(checklist);

              return (
                <div key={checklist.id} className="bg-white rounded-lg shadow p-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown Employee'}
                      </h3>
                      <p className="text-sm text-gray-500">{emp?.job_title} | {emp?.department}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      checklist.status === 'completed' ? 'bg-green-100 text-green-800' :
                      checklist.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {checklist.status}
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Progress</span>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                    {['hr', 'documents', 'policies', 'it', 'orientation'].map(cat => {
                      const items = checklist.items?.filter(i => i.category === cat) || [];
                      const done = items.filter(i => i.completed).length;
                      return (
                        <div key={cat} className="bg-gray-50 rounded p-2">
                          <div className="capitalize font-medium text-gray-700">{cat}</div>
                          <div className="text-gray-500">{done}/{items.length}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-xs text-gray-400">
                    Created: {new Date(checklist.created_at).toLocaleDateString()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acknowledged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {policyAcks.map((ack) => {
                const emp = employees.find(e => e.id === ack.employee_id);
                const policy = policies.find(p => p.id === ack.policy_id);

                return (
                  <tr key={ack.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{policy?.name || ack.policy_name || 'Unknown Policy'}</div>
                      <div className="text-sm text-gray-500">{policy?.policy_type}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded ${
                        ack.status === 'acknowledged' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {ack.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {ack.acknowledged_at ? new Date(ack.acknowledged_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                );
              })}
              {policyAcks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No policy assignments yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">
                {modalType === 'checklist' ? 'Create Onboarding Checklist' : 'Assign Policy'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={modalType === 'checklist' ? handleCreateChecklist : handleAssignPolicy} className="p-6">
              {/* Employee Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                <select
                  value={modalType === 'checklist' ? newChecklist.employee_id : newPolicyAssignment.employee_id}
                  onChange={(e) => {
                    if (modalType === 'checklist') {
                      setNewChecklist(prev => ({ ...prev, employee_id: e.target.value }));
                    } else {
                      setNewPolicyAssignment(prev => ({ ...prev, employee_id: e.target.value }));
                    }
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.first_name} {emp.last_name} - {emp.job_title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Checklist Items */}
              {modalType === 'checklist' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Checklist Items ({newChecklist.items.length} items)
                  </label>
                  <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                    {newChecklist.items.map((item, index) => (
                      <div key={index} className="px-3 py-2 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex-1">
                          <span className="text-sm">{item.item}</span>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                            item.category === 'hr' ? 'bg-blue-100 text-blue-700' :
                            item.category === 'documents' ? 'bg-purple-100 text-purple-700' :
                            item.category === 'policies' ? 'bg-green-100 text-green-700' :
                            item.category === 'it' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.category}
                          </span>
                          {item.required && <span className="ml-1 text-xs text-red-500">*</span>}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewChecklist(prev => ({
                              ...prev,
                              items: prev.items.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-red-400 hover:text-red-600"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Default Nigerian onboarding checklist. Remove items as needed.
                  </p>
                </div>
              )}

              {/* Policy Selection */}
              {modalType === 'policy' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy *</label>
                  <select
                    value={newPolicyAssignment.policy_id}
                    onChange={(e) => setNewPolicyAssignment(prev => ({ ...prev, policy_id: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  >
                    <option value="">Select Policy</option>
                    {policies.map(policy => (
                      <option key={policy.id} value={policy.id}>
                        {policy.name} {policy.is_mandatory && '(Mandatory)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
                >
                  {processing ? 'Saving...' : modalType === 'checklist' ? 'Create Checklist' : 'Assign Policy'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
