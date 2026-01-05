import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../../components/BulkActions';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useHelp } from '../../context/HelpContext';
import { HelpButton } from '../../components/HelpModal';
import { PlusIcon, MagnifyingGlassIcon, BuildingOfficeIcon, TrashIcon, PencilIcon, RocketLaunchIcon, ArrowPathIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

function Clients() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { showHelp } = useHelp();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    rc_number: '',
    industry: '',
    client_type: 'prospect',
    email: '',
    phone: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria'
  });

  // Onboarding state
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);
  const [onboardingClient, setOnboardingClient] = useState(null);
  const [onboarding, setOnboarding] = useState(false);
  const [onboardData, setOnboardData] = useState({
    admin_email: '',
    admin_first_name: '',
    admin_last_name: ''
  });

  // Bulk selection
  const {
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    selectedIds
  } = useBulkSelection(clients);

  useEffect(() => {
    fetchClients();
  }, [filter]);

  const fetchClients = async () => {
    try {
      const params = filter !== 'all' ? { client_type: filter } : {};
      const response = await api.get('/api/clients', { params });
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (client = null) => {
    if (client) {
      setEditingClient(client);
      setFormData({
        company_name: client.company_name || '',
        rc_number: client.rc_number || '',
        industry: client.industry || '',
        client_type: client.client_type || 'prospect',
        email: client.email || '',
        phone: client.phone || '',
        website: client.website || '',
        address: client.address || '',
        city: client.city || '',
        state: client.state || '',
        country: client.country || 'Nigeria'
      });
    } else {
      setEditingClient(null);
      setFormData({
        company_name: '',
        rc_number: '',
        industry: '',
        client_type: 'prospect',
        email: '',
        phone: '',
        website: '',
        address: '',
        city: '',
        state: '',
        country: 'Nigeria'
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingClient(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingClient) {
        await api.put(`/api/clients/${editingClient.id}`, formData);
        toast.success('Client updated successfully');
      } else {
        await api.post('/api/clients', formData);
        toast.success('Client created successfully');
      }
      fetchClients();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save client:', error);
      toast.error(error.response?.data?.error || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/clients/${id}`);
      toast.success('Client deleted successfully');
      fetchClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
      toast.error(error.response?.data?.error || 'Failed to delete client');
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Clients',
      message: `Are you sure you want to delete ${selectedCount} client(s)? This action cannot be undone.`,
      confirmText: 'Delete All',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.delete(`/api/clients/${id}`))
      );
      toast.success(`${selectedCount} client(s) deleted successfully`);
      clearSelection();
      fetchClients();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      toast.error('Failed to delete some clients');
    }
  };

  // Onboarding handlers
  const handleOpenOnboardModal = (client) => {
    setOnboardingClient(client);
    setOnboardData({
      admin_email: client.email || '',
      admin_first_name: '',
      admin_last_name: ''
    });
    setOnboardModalOpen(true);
  };

  const handleCloseOnboardModal = () => {
    setOnboardModalOpen(false);
    setOnboardingClient(null);
  };

  const handleOnboard = async (e) => {
    e.preventDefault();
    setOnboarding(true);
    try {
      const response = await api.post(`/api/clients/${onboardingClient.id}/onboard`, onboardData);
      if (response.data.success) {
        toast.success('Client onboarded successfully. Invitation sent to admin.');
        fetchClients();
        handleCloseOnboardModal();
      }
    } catch (error) {
      console.error('Failed to onboard client:', error);
      toast.error(error.response?.data?.error || 'Failed to onboard client');
    } finally {
      setOnboarding(false);
    }
  };

  const handleResendInvite = async (clientId) => {
    try {
      const response = await api.post(`/api/clients/${clientId}/resend-invite`);
      if (response.data.success) {
        toast.success('Invitation resent successfully');
      }
    } catch (error) {
      console.error('Failed to resend invite:', error);
      toast.error(error.response?.data?.error || 'Failed to resend invitation');
    }
  };

  const filteredClients = clients.filter(client =>
    client.company_name.toLowerCase().includes(search.toLowerCase()) ||
    client.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (type) => {
    switch (type) {
      case 'active':
        return <span className="badge-success">Active</span>;
      case 'prospect':
        return <span className="badge-info">Prospect</span>;
      case 'inactive':
        return <span className="badge-neutral">Inactive</span>;
      default:
        return null;
    }
  };

  const getOnboardingBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success-100 text-success-700">
            <CheckBadgeIcon className="h-3.5 w-3.5" />
            Onboarded
          </span>
        );
      case 'invited':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
            Invited
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-500">
            Not Started
          </span>
        );
    }
  };

  const canOnboard = (client) => {
    return client.client_type === 'active' && client.onboarding_status !== 'active';
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">Clients</h1>
          <p className="mt-1 text-primary-500">Manage your client relationships</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton onClick={() => showHelp('clients')} />
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Add Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-primary-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full sm:w-44 px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all duration-200 focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          >
            <option value="all">All Types</option>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Clients list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-primary-100">
                  <th className="px-4 py-4 text-left">
                    <SelectCheckbox
                      checked={isAllSelected}
                      indeterminate={isPartiallySelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Industry</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Onboarding</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-primary-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client, idx) => (
                  <tr
                    key={client.id}
                    className={`cursor-pointer transition-colors hover:bg-primary-50/50 ${isSelected(client.id) ? 'bg-accent-50' : ''} ${idx !== filteredClients.length - 1 ? 'border-b border-primary-50' : ''}`}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <SelectCheckbox
                        checked={isSelected(client.id)}
                        onChange={() => toggleItem(client.id)}
                      />
                    </td>
                    <td className="px-6 py-4" onClick={() => handleOpenModal(client)}>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-primary-50 rounded-lg flex items-center justify-center">
                          <BuildingOfficeIcon className="h-5 w-5 text-primary-400" />
                        </div>
                        <div>
                          <p className="font-medium text-primary-900">{client.company_name}</p>
                          {client.rc_number && <p className="text-xs text-primary-400">RC: {client.rc_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary-600">{client.industry || '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(client.client_type)}</td>
                    <td className="px-6 py-4">{getOnboardingBadge(client.onboarding_status)}</td>
                    <td className="px-6 py-4 text-sm text-primary-600">{client.city || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        {canOnboard(client) && (
                          client.onboarding_status === 'invited' ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleResendInvite(client.id); }}
                              className="p-2 text-warning-500 hover:text-warning-700 hover:bg-warning-50 rounded-lg transition-colors"
                              title="Resend Invitation"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleOpenOnboardModal(client); }}
                              className="p-2 text-accent-500 hover:text-accent-700 hover:bg-accent-50 rounded-lg transition-colors"
                              title="Onboard Client"
                            >
                              <RocketLaunchIcon className="h-4 w-4" />
                            </button>
                          )
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                          className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                          className="p-2 text-primary-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <BuildingOfficeIcon className="h-12 w-12 text-primary-200 mx-auto mb-4" />
                      <p className="text-primary-500 font-medium">No clients found</p>
                      <p className="text-sm text-primary-400 mt-1">Try adjusting your search or filter</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      <BulkActions
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
      />

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingClient ? 'Edit Client' : 'New Client'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">RC Number</label>
              <input
                type="text"
                value={formData.rc_number}
                onChange={(e) => setFormData({ ...formData, rc_number: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Status</label>
              <select
                value={formData.client_type}
                onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 mb-2">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 mb-2">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-5 border-t border-primary-100">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingClient ? 'Update Client' : 'Create Client')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Onboard Modal */}
      <Modal isOpen={onboardModalOpen} onClose={handleCloseOnboardModal} title="Onboard Client to HR Platform" size="md">
        <form onSubmit={handleOnboard} className="space-y-6">
          <div className="bg-primary-50 rounded-lg p-4 mb-4">
            <p className="text-sm text-primary-700">
              Onboarding <strong>{onboardingClient?.company_name}</strong> will create a company record in the HR platform
              and send an invitation to the company administrator.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Admin Email *</label>
              <input
                type="email"
                required
                value={onboardData.admin_email}
                onChange={(e) => setOnboardData({ ...onboardData, admin_email: e.target.value })}
                placeholder="admin@company.com"
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
              <p className="text-xs text-primary-400 mt-1">The company admin will receive an invitation to set up their account</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">First Name</label>
                <input
                  type="text"
                  value={onboardData.admin_first_name}
                  onChange={(e) => setOnboardData({ ...onboardData, admin_first_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-2">Last Name</label>
                <input
                  type="text"
                  value={onboardData.admin_last_name}
                  onChange={(e) => setOnboardData({ ...onboardData, admin_last_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-5 border-t border-primary-100">
            <button type="button" onClick={handleCloseOnboardModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={onboarding} className="btn-primary">
              <RocketLaunchIcon className="h-4 w-4 mr-2" />
              {onboarding ? 'Onboarding...' : 'Onboard & Send Invite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Clients;
