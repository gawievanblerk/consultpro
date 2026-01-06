import React, { useState, useEffect } from 'react';
import {
  BuildingOffice2Icon,
  PlusIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseCircleIcon,
  PlayIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  UsersIcon,
  IdentificationIcon,
  DocumentDuplicateIcon,
  ClipboardDocumentIcon,
  BeakerIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../../components/BulkActions';

function Consultants() {
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [expandedConsultant, setExpandedConsultant] = useState(null);
  const [consultantDetails, setConsultantDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [expandedCompany, setExpandedCompany] = useState(null);
  const [companyEmployees, setCompanyEmployees] = useState([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    companyName: '',
    consultantType: 'HR',
    tier: 'professional'
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  // Clone for testing state
  const [cloneLoading, setCloneLoading] = useState(null); // employee id being cloned
  const [showCloneResult, setShowCloneResult] = useState(false);
  const [cloneResult, setCloneResult] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected
  } = useBulkSelection(consultants);

  useEffect(() => {
    fetchConsultants();
  }, [search, statusFilter]);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('superadmin_token')}` }
  });

  const fetchConsultants = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/api/superadmin/consultants?${params}`, getAuthHeaders());

      if (response.data.success) {
        setConsultants(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch consultants:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const response = await api.post('/api/superadmin/consultants/invite', inviteForm, getAuthHeaders());

      if (response.data.success) {
        setInviteSuccess(`Invitation sent to ${inviteForm.email}`);
        setInviteForm({ email: '', companyName: '', consultantType: 'HR', tier: 'professional' });
        setTimeout(() => {
          setShowInviteModal(false);
          setInviteSuccess('');
        }, 2000);
      }
    } catch (err) {
      setInviteError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleStatusChange = async (consultantId, action) => {
    try {
      await api.put(`/api/superadmin/consultants/${consultantId}/${action}`, {}, getAuthHeaders());
      fetchConsultants();
    } catch (err) {
      console.error(`Failed to ${action} consultant:`, err);
    }
  };

  const handleImpersonate = async (consultant) => {
    try {
      const response = await api.post(
        `/api/superadmin/consultants/${consultant.id}/impersonate`,
        {},
        getAuthHeaders()
      );

      if (response.data.success) {
        const { token } = response.data.data;
        // Open in new window with impersonation token
        const url = `${window.location.origin}/dashboard?impersonate=${token}`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to impersonate consultant';
      alert(errorMsg);
      console.error('Impersonation failed:', err);
    }
  };

  const handleExpandConsultant = async (consultantId) => {
    if (expandedConsultant === consultantId) {
      setExpandedConsultant(null);
      setConsultantDetails(null);
      return;
    }

    setExpandedConsultant(consultantId);
    setDetailsLoading(true);

    try {
      const response = await api.get(
        `/api/superadmin/consultants/${consultantId}`,
        getAuthHeaders()
      );

      if (response.data.success) {
        setConsultantDetails(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch consultant details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleImpersonateCompanyAdmin = async (companyId, companyName) => {
    try {
      const response = await api.post(
        `/api/superadmin/companies/${companyId}/impersonate`,
        {},
        getAuthHeaders()
      );

      if (response.data.success) {
        const { redirectUrl } = response.data.data;
        window.open(`${window.location.origin}${redirectUrl}`, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to impersonate company admin';
      alert(errorMsg);
      console.error('Company admin impersonation failed:', err);
    }
  };

  const handleImpersonateEmployee = async (employeeId, employeeName) => {
    try {
      const response = await api.post(
        `/api/superadmin/employees/${employeeId}/impersonate`,
        {},
        getAuthHeaders()
      );

      if (response.data.success) {
        const { redirectUrl } = response.data.data;
        window.open(`${window.location.origin}${redirectUrl}`, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to impersonate employee';
      alert(errorMsg);
      console.error('Employee impersonation failed:', err);
    }
  };

  const handleExpandCompany = async (companyId) => {
    if (expandedCompany === companyId) {
      setExpandedCompany(null);
      setCompanyEmployees([]);
      return;
    }

    setExpandedCompany(companyId);
    setEmployeesLoading(true);

    try {
      const response = await api.get(
        `/api/superadmin/companies/${companyId}/employees`,
        getAuthHeaders()
      );

      if (response.data.success) {
        setCompanyEmployees(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch company employees:', err);
      setCompanyEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };

  const handleCloneEmployee = async (employeeId) => {
    setCloneLoading(employeeId);
    try {
      const response = await api.post(
        `/api/superadmin/employees/${employeeId}/clone`,
        {},
        getAuthHeaders()
      );

      if (response.data.success) {
        setCloneResult(response.data.data);
        setShowCloneResult(true);
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to clone employee';
      alert(errorMsg);
      console.error('Clone employee failed:', err);
    } finally {
      setCloneLoading(null);
    }
  };

  const handleCopyActivationLink = async () => {
    if (cloneResult?.invitation?.activationLink) {
      try {
        await navigator.clipboard.writeText(cloneResult.invitation.activationLink);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleOpenActivationLink = () => {
    if (cloneResult?.invitation?.activationLink) {
      window.open(cloneResult.invitation.activationLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleImpersonateClone = async () => {
    if (!cloneResult?.clonedEmployee?.id) return;

    try {
      const response = await api.post(
        `/api/superadmin/employees/${cloneResult.clonedEmployee.id}/impersonate`,
        {},
        getAuthHeaders()
      );

      if (response.data.success) {
        const { redirectUrl } = response.data.data;
        window.open(`${window.location.origin}${redirectUrl}`, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      // Clone might not have ESS access yet - need to activate first
      const errorMsg = err.response?.data?.error || 'Failed to impersonate clone';
      alert(`${errorMsg}\n\nNote: The clone needs to complete ESS activation first.`);
    }
  };

  const handleBulkSuspend = async () => {
    if (!confirm(`Are you sure you want to suspend ${selectedCount} consultant(s)?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          api.put(`/api/superadmin/consultants/${id}/suspend`, {}, getAuthHeaders())
        )
      );
      clearSelection();
      fetchConsultants();
    } catch (err) {
      console.error('Failed to bulk suspend:', err);
      alert('Failed to suspend some consultants');
    }
  };

  const handleBulkActivate = async () => {
    if (!confirm(`Are you sure you want to activate ${selectedCount} consultant(s)?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          api.put(`/api/superadmin/consultants/${id}/activate`, {}, getAuthHeaders())
        )
      );
      clearSelection();
      fetchConsultants();
    } catch (err) {
      console.error('Failed to bulk activate:', err);
      alert('Failed to activate some consultants');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { bg: 'bg-green-50', text: 'text-green-700', icon: CheckCircleIcon },
      trial: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: null },
      suspended: { bg: 'bg-red-50', text: 'text-red-700', icon: PauseCircleIcon },
      churned: { bg: 'bg-gray-50', text: 'text-gray-700', icon: XCircleIcon }
    };
    const badge = badges[status] || badges.active;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon && <badge.icon className="h-3 w-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getTierBadge = (tier) => {
    const colors = {
      starter: 'bg-blue-100 text-blue-700',
      professional: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-indigo-100 text-indigo-700'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[tier] || colors.starter}`}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)}
      </span>
    );
  };

  const bulkActions = [
    {
      label: 'Activate',
      icon: PlayIcon,
      onClick: handleBulkActivate,
      className: 'bg-green-600 hover:bg-green-700'
    },
    {
      label: 'Suspend',
      icon: PauseCircleIcon,
      onClick: handleBulkSuspend,
      className: 'bg-red-600 hover:bg-red-700'
    }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900">HR Consultants</h1>
          <p className="text-primary-500 mt-1">Manage consultant accounts and access</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Invite Consultant
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400" />
          <input
            type="text"
            placeholder="Search consultants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Consultants Table */}
      <div className="bg-white rounded-xl border border-primary-100 overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
          </div>
        ) : consultants.length === 0 ? (
          <div className="text-center py-12">
            <BuildingOffice2Icon className="h-12 w-12 text-primary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary-900 mb-2">No consultants found</h3>
            <p className="text-primary-500 mb-4">Get started by inviting your first HR consultant</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
            >
              <PlusIcon className="h-5 w-5" />
              Invite Consultant
            </button>
          </div>
        ) : (
          <table className="w-full min-w-[1100px]">
            <thead className="bg-primary-50 border-b border-primary-100">
              <tr>
                <th className="px-4 py-3 text-left">
                  <SelectCheckbox
                    checked={isAllSelected}
                    indeterminate={isPartiallySelected}
                    onChange={toggleAll}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Consultant</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Companies</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Employees</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-primary-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {consultants.map((consultant) => (
                <React.Fragment key={consultant.id}>
                  <tr
                    className={`hover:bg-primary-50/50 ${isSelected(consultant.id) ? 'bg-accent-50' : ''} ${expandedConsultant === consultant.id ? 'bg-primary-50' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <SelectCheckbox
                        checked={isSelected(consultant.id)}
                        onChange={() => toggleItem(consultant.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleExpandConsultant(consultant.id)}
                          className="p-1 hover:bg-primary-100 rounded"
                        >
                          {expandedConsultant === consultant.id ? (
                            <ChevronDownIcon className="h-4 w-4 text-primary-500" />
                          ) : (
                            <ChevronRightIcon className="h-4 w-4 text-primary-500" />
                          )}
                        </button>
                        <div className="h-10 w-10 rounded-lg bg-accent-100 flex items-center justify-center text-accent-700 font-semibold">
                          {consultant.company_name?.[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <p className="font-medium text-primary-900">{consultant.company_name}</p>
                          <p className="text-sm text-primary-500">{consultant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getTierBadge(consultant.tier)}</td>
                    <td className="px-6 py-4">{getStatusBadge(consultant.subscription_status)}</td>
                    <td className="px-6 py-4 text-primary-600">{consultant.company_count || 0}</td>
                    <td className="px-6 py-4 text-primary-600">{consultant.employee_count || 0}</td>
                    <td className="px-6 py-4 text-sm text-primary-500">
                      {new Date(consultant.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(consultant.subscription_status === 'active' || consultant.subscription_status === 'trial') && (
                          <button
                            onClick={() => handleImpersonate(consultant)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-accent-100 text-accent-700 rounded hover:bg-accent-200"
                            title="Login as this consultant"
                          >
                            <UserIcon className="h-4 w-4" />
                            Impersonate
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                          </button>
                        )}
                        {consultant.subscription_status === 'suspended' ? (
                          <button
                            onClick={() => handleStatusChange(consultant.id, 'activate')}
                            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Activate
                          </button>
                        ) : consultant.subscription_status !== 'churned' && (
                          <button
                            onClick={() => handleStatusChange(consultant.id, 'suspend')}
                            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Details Row */}
                  {expandedConsultant === consultant.id && (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 bg-primary-50/50">
                        {detailsLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-600"></div>
                          </div>
                        ) : consultantDetails ? (
                          <div className="space-y-4">
                            {/* Companies Section */}
                            <div>
                              <h4 className="text-sm font-semibold text-primary-700 mb-3 flex items-center gap-2">
                                <BuildingOffice2Icon className="h-4 w-4" />
                                Companies ({consultantDetails.companies?.length || 0})
                              </h4>
                              {consultantDetails.companies?.length > 0 ? (
                                <div className="space-y-2">
                                  {consultantDetails.companies.map((company) => (
                                    <div key={company.id} className="bg-white rounded-lg border border-primary-100 overflow-hidden">
                                      <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() => handleExpandCompany(company.id)}
                                            className="p-1 hover:bg-primary-100 rounded"
                                          >
                                            {expandedCompany === company.id ? (
                                              <ChevronDownIcon className="h-4 w-4 text-primary-500" />
                                            ) : (
                                              <ChevronRightIcon className="h-4 w-4 text-primary-500" />
                                            )}
                                          </button>
                                          <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">
                                            {company.legal_name?.[0]?.toUpperCase() || 'C'}
                                          </div>
                                          <div>
                                            <p className="text-sm font-medium text-primary-900">{company.legal_name}</p>
                                            <p className="text-xs text-primary-500">
                                              {company.employee_count || 0} employees • {company.status}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => handleImpersonateCompanyAdmin(company.id, company.legal_name)}
                                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-medium"
                                          title="Login as company admin"
                                        >
                                          <IdentificationIcon className="h-3.5 w-3.5" />
                                          Impersonate Admin
                                          <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                        </button>
                                      </div>
                                      {/* Expanded employees section */}
                                      {expandedCompany === company.id && (
                                        <div className="border-t border-primary-100 bg-primary-50/50 p-3">
                                          <h5 className="text-xs font-semibold text-primary-600 mb-2 flex items-center gap-1">
                                            <UsersIcon className="h-3.5 w-3.5" />
                                            Employees with ESS Access
                                          </h5>
                                          {employeesLoading ? (
                                            <div className="flex items-center justify-center py-4">
                                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-600"></div>
                                            </div>
                                          ) : companyEmployees.length > 0 ? (
                                            <div className="grid gap-1.5">
                                              {companyEmployees.map((emp) => (
                                                <div
                                                  key={emp.id}
                                                  className={`flex items-center justify-between p-2 rounded border ${
                                                    emp.is_test_clone
                                                      ? 'bg-purple-50 border-purple-200'
                                                      : 'bg-white border-primary-100'
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                                      emp.is_test_clone
                                                        ? 'bg-purple-200 text-purple-700'
                                                        : 'bg-green-100 text-green-700'
                                                    }`}>
                                                      {emp.is_test_clone ? (
                                                        <BeakerIcon className="h-3 w-3" />
                                                      ) : (
                                                        emp.first_name?.[0]?.toUpperCase() || 'E'
                                                      )}
                                                    </div>
                                                    <div>
                                                      <p className="text-xs font-medium text-primary-900 flex items-center gap-1">
                                                        {emp.first_name} {emp.last_name}
                                                        {emp.is_test_clone && (
                                                          <span className="px-1 py-0.5 bg-purple-200 text-purple-700 text-[9px] rounded font-semibold">
                                                            TEST
                                                          </span>
                                                        )}
                                                      </p>
                                                      <p className="text-[10px] text-primary-500">
                                                        {emp.job_title || emp.email}
                                                      </p>
                                                    </div>
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    {!emp.is_test_clone && (
                                                      <button
                                                        onClick={() => handleCloneEmployee(emp.id)}
                                                        disabled={cloneLoading === emp.id}
                                                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-purple-100 text-purple-700 rounded hover:bg-purple-200 font-medium disabled:opacity-50"
                                                        title="Clone for onboarding testing"
                                                      >
                                                        {cloneLoading === emp.id ? (
                                                          <span className="animate-spin h-3 w-3 border border-purple-700 border-t-transparent rounded-full" />
                                                        ) : (
                                                          <DocumentDuplicateIcon className="h-3 w-3" />
                                                        )}
                                                        Clone
                                                      </button>
                                                    )}
                                                    <button
                                                      onClick={() => handleImpersonateEmployee(emp.id, `${emp.first_name} ${emp.last_name}`)}
                                                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium"
                                                      title="Login as this employee (ESS)"
                                                    >
                                                      <UserIcon className="h-3 w-3" />
                                                      ESS
                                                      <ArrowTopRightOnSquareIcon className="h-2.5 w-2.5" />
                                                    </button>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-primary-500 italic py-2">
                                              No employees with ESS access. Invite employees to ESS first.
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-sm text-primary-500 italic">No companies yet</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-primary-500 text-center py-4">Failed to load details</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        customActions={bulkActions}
      />

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-accent-100 rounded-lg flex items-center justify-center">
                <EnvelopeIcon className="h-5 w-5 text-accent-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary-900">Invite Consultant</h2>
                <p className="text-sm text-primary-500">Send an invitation to onboard a new HR consultant</p>
              </div>
            </div>

            {inviteError && (
              <div className="mb-4 p-3 bg-danger-50 border border-danger-100 rounded-lg text-danger-700 text-sm">
                {inviteError}
              </div>
            )}

            {inviteSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-100 rounded-lg text-green-700 text-sm">
                {inviteSuccess}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Company Name</label>
                <input
                  type="text"
                  required
                  value={inviteForm.companyName}
                  onChange={(e) => setInviteForm({ ...inviteForm, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="e.g., HR Solutions Nigeria Ltd"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  placeholder="consultant@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">Tier</label>
                <select
                  value={inviteForm.tier}
                  onChange={(e) => setInviteForm({ ...inviteForm, tier: e.target.value })}
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  <option value="starter">Starter (5 companies, 50 employees each)</option>
                  <option value="professional">Professional (20 companies, 200 employees each)</option>
                  <option value="enterprise">Enterprise (Unlimited)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteLoading}
                  className="flex-1 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                >
                  {inviteLoading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clone Result Modal */}
      {showCloneResult && cloneResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <BeakerIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-primary-900">Test Clone Created</h2>
                <p className="text-sm text-primary-500">Ready for onboarding workflow testing</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              {/* Clone Details */}
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-0.5 bg-purple-200 text-purple-700 text-xs rounded font-semibold">
                    TEST CLONE
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-primary-500">Name:</span>{' '}
                    <span className="font-medium text-primary-900">
                      {cloneResult.clonedEmployee?.first_name} {cloneResult.clonedEmployee?.last_name}
                    </span>
                  </p>
                  <p>
                    <span className="text-primary-500">Employee #:</span>{' '}
                    <span className="font-medium text-primary-900">{cloneResult.clonedEmployee?.employee_number}</span>
                  </p>
                  <p>
                    <span className="text-primary-500">Email:</span>{' '}
                    <span className="font-mono text-xs text-primary-900">{cloneResult.clonedEmployee?.email}</span>
                  </p>
                  <p>
                    <span className="text-primary-500">Status:</span>{' '}
                    <span className="font-medium text-amber-600">{cloneResult.clonedEmployee?.employment_status}</span>
                  </p>
                </div>
              </div>

              {/* Source Info */}
              <div className="text-xs text-primary-500">
                Cloned from: <span className="font-medium">{cloneResult.sourceEmployee?.first_name} {cloneResult.sourceEmployee?.last_name}</span>
                {' '}({cloneResult.sourceEmployee?.employee_number})
              </div>

              {/* Activation Link */}
              <div className="bg-primary-50 rounded-lg p-3 border border-primary-100">
                <label className="block text-xs font-medium text-primary-600 mb-2">
                  ESS Activation Link
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={cloneResult.invitation?.activationLink || ''}
                    className="flex-1 text-xs font-mono bg-white px-2 py-1.5 rounded border border-primary-200 truncate"
                  />
                  <button
                    onClick={handleCopyActivationLink}
                    className={`p-1.5 rounded ${copySuccess ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'}`}
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  </button>
                </div>
                {copySuccess && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
                )}
                <p className="text-[10px] text-primary-400 mt-2">
                  Expires: {cloneResult.invitation?.expiresAt ? new Date(cloneResult.invitation.expiresAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={handleOpenActivationLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
              >
                <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                Open Activation Page
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleImpersonateClone}
                  className="flex items-center justify-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
                >
                  <UserIcon className="h-4 w-4" />
                  Impersonate Clone
                </button>
                <button
                  onClick={() => {
                    setShowCloneResult(false);
                    setCloneResult(null);
                  }}
                  className="px-3 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 text-sm"
                >
                  Close
                </button>
              </div>
            </div>

            <p className="text-[10px] text-center text-primary-400 mt-4">
              Test clones use fake email addresses and won't affect real employee data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Consultants;
