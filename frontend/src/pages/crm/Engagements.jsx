import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { PlusIcon, BriefcaseIcon, TrashIcon } from '@heroicons/react/24/outline';

function Engagements() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [engagements, setEngagements] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEngagement, setEditingEngagement] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    engagement_type: 'hr_outsourcing',
    status: 'active',
    contract_value: '',
    start_date: '',
    end_date: '',
    description: ''
  });

  useEffect(() => {
    fetchEngagements();
    fetchClients();
  }, []);

  const fetchEngagements = async () => {
    try {
      const response = await api.get('/api/engagements');
      if (response.data.success) {
        setEngagements(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch engagements:', error);
    } finally {
      setLoading(false);
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

  const handleOpenModal = (engagement = null) => {
    if (engagement) {
      setEditingEngagement(engagement);
      setFormData({
        client_id: engagement.client_id || '',
        name: engagement.name || '',
        engagement_type: engagement.engagement_type || 'hr_outsourcing',
        status: engagement.status || 'active',
        contract_value: engagement.contract_value || '',
        start_date: engagement.start_date ? engagement.start_date.split('T')[0] : '',
        end_date: engagement.end_date ? engagement.end_date.split('T')[0] : '',
        description: engagement.description || ''
      });
    } else {
      setEditingEngagement(null);
      setFormData({
        client_id: '',
        name: '',
        engagement_type: 'hr_outsourcing',
        status: 'active',
        contract_value: '',
        start_date: '',
        end_date: '',
        description: ''
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEngagement(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingEngagement) {
        await api.put(`/api/engagements/${editingEngagement.id}`, formData);
        toast.success('Engagement updated successfully');
      } else {
        await api.post('/api/engagements', formData);
        toast.success('Engagement created successfully');
      }
      fetchEngagements();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save engagement:', error);
      toast.error('Failed to save engagement');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Engagement',
      message: 'Are you sure you want to delete this engagement? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/engagements/${id}`);
      toast.success('Engagement deleted successfully');
      fetchEngagements();
    } catch (error) {
      console.error('Failed to delete engagement:', error);
      toast.error('Failed to delete engagement');
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
      case 'on_hold': return <span className="badge-warning">On Hold</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engagements</h1>
          <p className="mt-1 text-sm text-gray-500">Active projects and contracts</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Engagement
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {engagements.map((engagement) => (
            <div
              key={engagement.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOpenModal(engagement)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <BriefcaseIcon className="h-5 w-5 text-primary-700" />
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(engagement.status)}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(engagement.id); }}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{engagement.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{engagement.client_name}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{engagement.engagement_type?.replace('_', ' ')}</span>
                  <span className="font-medium text-primary-700">{formatCurrency(engagement.contract_value)}</span>
                </div>
              </div>
            </div>
          ))}
          {engagements.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">No engagements found</div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingEngagement ? 'Edit Engagement' : 'New Engagement'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Client *</label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.company_name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Engagement Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Type</label>
              <select
                value={formData.engagement_type}
                onChange={(e) => setFormData({ ...formData, engagement_type: e.target.value })}
                className="form-input"
              >
                <option value="hr_outsourcing">HR Outsourcing</option>
                <option value="recruitment">Recruitment</option>
                <option value="training">Training</option>
                <option value="consulting">Consulting</option>
                <option value="payroll">Payroll</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-input"
              >
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="form-label">Contract Value (NGN)</label>
              <input
                type="number"
                value={formData.contract_value}
                onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">End Date</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingEngagement ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Engagements;
