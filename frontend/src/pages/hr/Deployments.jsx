import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../../components/BulkActions';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { PlusIcon, ClipboardDocumentListIcon, TrashIcon } from '@heroicons/react/24/outline';

function Deployments() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [deployments, setDeployments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDeployment, setEditingDeployment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: '',
    client_id: '',
    role_title: '',
    status: 'active',
    start_date: '',
    end_date: '',
    billing_rate: '',
    billing_type: 'monthly'
  });

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected
  } = useBulkSelection(deployments);

  useEffect(() => {
    fetchDeployments();
    fetchStaff();
    fetchClients();
  }, []);

  const fetchDeployments = async () => {
    try {
      const response = await api.get('/api/deployments');
      if (response.data.success) {
        setDeployments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/staff');
      if (response.data.success) {
        setStaff(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients');
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleOpenModal = (deployment = null) => {
    if (deployment) {
      setEditingDeployment(deployment);
      setFormData({
        staff_id: deployment.staff_id || '',
        client_id: deployment.client_id || '',
        role_title: deployment.role_title || '',
        status: deployment.status || 'active',
        start_date: deployment.start_date ? deployment.start_date.split('T')[0] : '',
        end_date: deployment.end_date ? deployment.end_date.split('T')[0] : '',
        billing_rate: deployment.billing_rate || '',
        billing_type: deployment.billing_type || 'monthly'
      });
    } else {
      setEditingDeployment(null);
      setFormData({
        staff_id: '',
        client_id: '',
        role_title: '',
        status: 'active',
        start_date: '',
        end_date: '',
        billing_rate: '',
        billing_type: 'monthly'
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingDeployment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingDeployment) {
        await api.put(`/api/deployments/${editingDeployment.id}`, formData);
        toast.success('Deployment updated successfully');
      } else {
        await api.post('/api/deployments', formData);
        toast.success('Deployment created successfully');
      }
      fetchDeployments();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save deployment:', error);
      toast.error('Failed to save deployment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Deployment',
      message: 'Are you sure you want to delete this deployment? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/deployments/${id}`);
      toast.success('Deployment deleted successfully');
      fetchDeployments();
    } catch (error) {
      console.error('Failed to delete deployment:', error);
      toast.error('Failed to delete deployment');
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Deployments',
      message: `Are you sure you want to delete ${selectedCount} deployment(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/api/deployments/${id}`)));
      toast.success(`${selectedCount} deployment(s) deleted successfully`);
      clearSelection();
      fetchDeployments();
    } catch (error) {
      console.error('Failed to delete deployments:', error);
      toast.error('Failed to delete some deployments');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active': return <span className="badge-success">Active</span>;
      case 'completed': return <span className="badge-primary">Completed</span>;
      case 'terminated': return <span className="badge bg-red-100 text-red-700">Terminated</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="mt-1 text-sm text-gray-500">Staff assignments to clients</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Deployment
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-full">
            <thead>
              <tr>
                <th className="w-10">
                  <SelectCheckbox
                    checked={isAllSelected}
                    indeterminate={isPartiallySelected}
                    onChange={(e) => { e.stopPropagation(); toggleAll(); }}
                  />
                </th>
                <th>Staff</th>
                <th>Client</th>
                <th>Role</th>
                <th>Status</th>
                <th>Period</th>
                <th>Billing Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deployments.map((deployment) => (
                <tr
                  key={deployment.id}
                  onClick={() => handleOpenModal(deployment)}
                  className={`cursor-pointer hover:bg-gray-50 ${isSelected(deployment.id) ? 'bg-accent-50' : ''}`}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <SelectCheckbox
                      checked={isSelected(deployment.id)}
                      onChange={() => toggleItem(deployment.id)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-lg flex items-center justify-center">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-primary-700" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{deployment.staff_name}</p>
                      </div>
                    </div>
                  </td>
                  <td>{deployment.client_name}</td>
                  <td>{deployment.role_title || '-'}</td>
                  <td>{getStatusBadge(deployment.status)}</td>
                  <td>
                    <p className="text-sm">
                      {new Date(deployment.start_date).toLocaleDateString()} -
                      {deployment.end_date ? new Date(deployment.end_date).toLocaleDateString() : 'Ongoing'}
                    </p>
                  </td>
                  <td className="font-medium">{formatCurrency(deployment.billing_rate)}/{deployment.billing_type}</td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(deployment.id); }}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {deployments.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">No deployments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BulkActions
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
      />

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingDeployment ? 'Edit Deployment' : 'New Deployment'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Staff Member *</label>
              <select
                required
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select staff</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Client *</label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Role/Position</label>
              <input
                type="text"
                value={formData.role_title}
                onChange={(e) => setFormData({ ...formData, role_title: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-input"
              >
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Billing Rate (NGN)</label>
              <input
                type="number"
                value={formData.billing_rate}
                onChange={(e) => setFormData({ ...formData, billing_rate: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Billing Type</label>
              <select
                value={formData.billing_type}
                onChange={(e) => setFormData({ ...formData, billing_type: e.target.value })}
                className="form-input"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingDeployment ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Deployments;
