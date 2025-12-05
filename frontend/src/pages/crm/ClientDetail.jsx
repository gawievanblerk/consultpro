import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';

function ClientDetail() {
  const { toast } = useToast();
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    industry: '',
    email: '',
    phone: '',
    website: '',
    address_line1: '',
    city: '',
    state: '',
    tin: '',
    rc_number: '',
    client_type: 'prospect',
    client_tier: '',
    payment_terms: 30
  });

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await api.get(`/api/clients/${id}`);
      if (response.data.success) {
        setClient(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      company_name: client.company_name || '',
      industry: client.industry || '',
      email: client.email || '',
      phone: client.phone || '',
      website: client.website || '',
      address_line1: client.address_line1 || '',
      city: client.city || '',
      state: client.state || '',
      tin: client.tin || '',
      rc_number: client.rc_number || '',
      client_type: client.client_type || 'prospect',
      client_tier: client.client_tier || '',
      payment_terms: client.payment_terms || 30
    });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/api/clients/${id}`, formData);
      toast.success('Client updated successfully');
      await fetchClient();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to update client:', error);
      toast.error('Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Client not found</p>
        <Link to="/clients" className="text-primary-900 hover:underline mt-2 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/clients" className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.company_name}</h1>
            <p className="text-sm text-gray-500">{client.industry}</p>
          </div>
        </div>
        <button onClick={handleOpenModal} className="btn-secondary">
          <PencilIcon className="h-4 w-4 mr-2" />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Contact Information</h2>
            </div>
            <div className="card-body grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{client.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{client.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">
                  {client.address_line1 && (
                    <>
                      {client.address_line1}<br />
                      {client.city}, {client.state}
                    </>
                  ) || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Website</p>
                <p className="font-medium">{client.website || '-'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Compliance Information</h2>
            </div>
            <div className="card-body grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">TIN</p>
                <p className="font-medium">{client.tin || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">RC Number</p>
                <p className="font-medium">{client.rc_number || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Quick Stats</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="badge-success">{client.client_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tier</span>
                <span className="font-medium">{client.client_tier || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Terms</span>
                <span className="font-medium">{client.payment_terms} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title="Edit Client" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Company Name *</label>
              <input
                type="text"
                required
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Industry</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Client Type</label>
              <select
                value={formData.client_type}
                onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
                className="form-input"
              >
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="form-label">Client Tier</label>
              <select
                value={formData.client_tier}
                onChange={(e) => setFormData({ ...formData, client_tier: e.target.value })}
                className="form-input"
              >
                <option value="">Select tier</option>
                <option value="enterprise">Enterprise</option>
                <option value="mid-market">Mid-Market</option>
                <option value="sme">SME</option>
              </select>
            </div>
            <div>
              <label className="form-label">Payment Terms (days)</label>
              <input
                type="number"
                value={formData.payment_terms}
                onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Website</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Address</label>
              <input
                type="text"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                className="form-input"
                placeholder="Street address"
              />
            </div>
            <div>
              <label className="form-label">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">State</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">TIN</label>
              <input
                type="text"
                value={formData.tin}
                onChange={(e) => setFormData({ ...formData, tin: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">RC Number</label>
              <input
                type="text"
                value={formData.rc_number}
                onChange={(e) => setFormData({ ...formData, rc_number: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ClientDetail;
