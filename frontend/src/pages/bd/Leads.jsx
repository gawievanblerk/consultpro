import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { PlusIcon, MagnifyingGlassIcon, UserPlusIcon, TrashIcon } from '@heroicons/react/24/outline';

function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    email: '',
    phone: '',
    industry: '',
    source: 'website',
    status: 'new',
    estimated_value: '',
    expected_close_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/api/leads');
      if (response.data.success) {
        setLeads(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (lead = null) => {
    if (lead) {
      setEditingLead(lead);
      setFormData({
        company_name: lead.company_name || '',
        contact_name: lead.contact_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        industry: lead.industry || '',
        source: lead.source || 'website',
        status: lead.status || 'new',
        estimated_value: lead.estimated_value || '',
        expected_close_date: lead.expected_close_date ? lead.expected_close_date.split('T')[0] : '',
        notes: lead.notes || ''
      });
    } else {
      setEditingLead(null);
      setFormData({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        industry: '',
        source: 'website',
        status: 'new',
        estimated_value: '',
        expected_close_date: '',
        notes: ''
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingLead(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingLead) {
        await api.put(`/api/leads/${editingLead.id}`, formData);
      } else {
        await api.post('/api/leads', formData);
      }
      fetchLeads();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save lead:', error);
      alert('Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/api/leads/${id}`);
      fetchLeads();
    } catch (error) {
      console.error('Failed to delete lead:', error);
      alert('Failed to delete lead');
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
      case 'new': return <span className="badge-primary">New</span>;
      case 'contacted': return <span className="badge-warning">Contacted</span>;
      case 'qualified': return <span className="badge-success">Qualified</span>;
      case 'converted': return <span className="badge-accent">Converted</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">Manage sales opportunities</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Lead
        </button>
      </div>

      <div className="card">
        <div className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
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
                <th>Company</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Status</th>
                <th>Value</th>
                <th>Expected Close</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => handleOpenModal(lead)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-accent-100 rounded-lg flex items-center justify-center">
                        <UserPlusIcon className="h-5 w-5 text-accent-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{lead.company_name}</p>
                        <p className="text-xs text-gray-500">{lead.industry}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <p>{lead.contact_name || '-'}</p>
                    <p className="text-xs text-gray-500">{lead.email}</p>
                  </td>
                  <td>{lead.source || '-'}</td>
                  <td>{getStatusBadge(lead.status)}</td>
                  <td className="font-medium">{formatCurrency(lead.estimated_value)}</td>
                  <td>{lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">No leads found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingLead ? 'Edit Lead' : 'Add Lead'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
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
              <label className="form-label">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
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
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
              <label className="form-label">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="form-input"
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="cold_call">Cold Call</option>
                <option value="event">Event</option>
                <option value="social_media">Social Media</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-input"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="form-label">Estimated Value (NGN)</label>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Expected Close Date</label>
              <input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="form-input"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingLead ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Leads;
