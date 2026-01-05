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
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../../components/BulkActions';

function Consultants() {
  const [consultants, setConsultants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    companyName: '',
    consultantType: 'HR',
    tier: 'professional'
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

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
                <tr
                  key={consultant.id}
                  className={`hover:bg-primary-50/50 ${isSelected(consultant.id) ? 'bg-accent-50' : ''}`}
                >
                  <td className="px-4 py-4">
                    <SelectCheckbox
                      checked={isSelected(consultant.id)}
                      onChange={() => toggleItem(consultant.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
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
    </div>
  );
}

export default Consultants;
