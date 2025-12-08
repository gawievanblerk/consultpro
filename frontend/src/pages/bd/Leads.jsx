import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { PlusIcon, MagnifyingGlassIcon, UserPlusIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';

function Leads() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
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
        toast.success('Lead updated successfully');
      } else {
        await api.post('/api/leads', formData);
        toast.success('Lead created successfully');
      }
      fetchLeads();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save lead:', error);
      toast.error('Failed to save lead');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Lead',
      message: 'Are you sure you want to delete this lead? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/leads/${id}`);
      toast.success('Lead deleted successfully');
      fetchLeads();
    } catch (error) {
      console.error('Failed to delete lead:', error);
      toast.error('Failed to delete lead');
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
      case 'new': return <span className="badge-info">New</span>;
      case 'contacted': return <span className="badge-warning">Contacted</span>;
      case 'qualified': return <span className="badge-success">Qualified</span>;
      case 'converted': return <span className="badge-success">Converted</span>;
      case 'lost': return <span className="badge-neutral">Lost</span>;
      default: return <span className="badge-neutral">{status}</span>;
    }
  };

  const filteredLeads = leads.filter(lead =>
    lead.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">Leads</h1>
          <p className="mt-1 text-primary-500">Manage sales opportunities</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Add Lead
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-primary-100 p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-primary-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>

      {/* Leads list */}
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Expected Close</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-primary-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead, idx) => (
                  <tr
                    key={lead.id}
                    onClick={() => handleOpenModal(lead)}
                    className={`cursor-pointer transition-colors hover:bg-primary-50/50 ${idx !== filteredLeads.length - 1 ? 'border-b border-primary-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-accent-50 rounded-lg flex items-center justify-center">
                          <UserPlusIcon className="h-5 w-5 text-accent-600" />
                        </div>
                        <div>
                          <p className="font-medium text-primary-900">{lead.company_name}</p>
                          <p className="text-xs text-primary-400">{lead.industry}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-primary-700">{lead.contact_name || '-'}</p>
                      <p className="text-xs text-primary-400">{lead.email}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary-600 capitalize">{lead.source?.replace('_', ' ') || '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(lead.status)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-primary-900">{formatCurrency(lead.estimated_value)}</td>
                    <td className="px-6 py-4 text-sm text-primary-600">{lead.expected_close_date ? new Date(lead.expected_close_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(lead); }}
                          className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(lead.id); }}
                          className="p-2 text-primary-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredLeads.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <UserPlusIcon className="h-12 w-12 text-primary-200 mx-auto mb-4" />
                      <p className="text-primary-500 font-medium">No leads found</p>
                      <p className="text-sm text-primary-400 mt-1">Add your first lead to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingLead ? 'Edit Lead' : 'New Lead'} size="lg">
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
              <label className="block text-sm font-medium text-primary-700 mb-2">Contact Name</label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
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
              <label className="block text-sm font-medium text-primary-700 mb-2">Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
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
              <label className="block text-sm font-medium text-primary-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Estimated Value (NGN)</label>
              <input
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 mb-2">Expected Close Date</label>
              <input
                type="date"
                value={formData.expected_close_date}
                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                rows={3}
                placeholder="Add any additional notes..."
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-5 border-t border-primary-100">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingLead ? 'Update Lead' : 'Create Lead')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Leads;
