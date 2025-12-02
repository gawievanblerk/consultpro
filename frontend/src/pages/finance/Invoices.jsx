import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { PlusIcon, DocumentTextIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    subtotal: '',
    vat_amount: '',
    wht_amount: '',
    total_amount: '',
    status: 'draft',
    notes: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchClients();
  }, [filter]);

  const fetchInvoices = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/api/invoices', { params });
      if (response.data.success) {
        setInvoices(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
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

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}${month}-${random}`;
  };

  const calculateTotals = (subtotal) => {
    const sub = parseFloat(subtotal) || 0;
    const vat = sub * 0.075; // 7.5% VAT
    const wht = sub * 0.05; // 5% WHT
    const total = sub + vat - wht;
    return { vat: vat.toFixed(2), wht: wht.toFixed(2), total: total.toFixed(2) };
  };

  const handleOpenModal = (invoice = null) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setFormData({
        client_id: invoice.client_id || '',
        invoice_number: invoice.invoice_number || '',
        invoice_date: invoice.invoice_date ? invoice.invoice_date.split('T')[0] : '',
        due_date: invoice.due_date ? invoice.due_date.split('T')[0] : '',
        subtotal: invoice.subtotal || '',
        vat_amount: invoice.vat_amount || '',
        wht_amount: invoice.wht_amount || '',
        total_amount: invoice.total_amount || '',
        status: invoice.status || 'draft',
        notes: invoice.notes || ''
      });
    } else {
      setEditingInvoice(null);
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFormData({
        client_id: '',
        invoice_number: generateInvoiceNumber(),
        invoice_date: today,
        due_date: dueDate,
        subtotal: '',
        vat_amount: '0',
        wht_amount: '0',
        total_amount: '0',
        status: 'draft',
        notes: ''
      });
    }
    setModalOpen(true);
  };

  const handleSubtotalChange = (value) => {
    const totals = calculateTotals(value);
    setFormData({
      ...formData,
      subtotal: value,
      vat_amount: totals.vat,
      wht_amount: totals.wht,
      total_amount: totals.total
    });
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingInvoice(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingInvoice) {
        await api.put(`/api/invoices/${editingInvoice.id}`, formData);
      } else {
        await api.post('/api/invoices', formData);
      }
      fetchInvoices();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save invoice:', error);
      alert('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.delete(`/api/invoices/${id}`);
      fetchInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      alert('Failed to delete invoice');
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
      case 'paid': return <span className="badge-success">Paid</span>;
      case 'sent': return <span className="badge-primary">Sent</span>;
      case 'partial': return <span className="badge-warning">Partial</span>;
      case 'overdue': return <span className="badge bg-red-100 text-red-700">Overdue</span>;
      case 'draft': return <span className="badge">Draft</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">Manage billing and invoices</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Invoice
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Outstanding</p>
          <p className="text-xl font-semibold text-gray-900">
            {formatCurrency(invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + parseFloat(i.total_amount) - parseFloat(i.paid_amount || 0), 0))}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Paid This Month</p>
          <p className="text-xl font-semibold text-green-700">
            {formatCurrency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total_amount), 0))}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-xl font-semibold text-red-700">
            {formatCurrency(invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.total_amount), 0))}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Draft</p>
          <p className="text-xl font-semibold text-gray-500">{invoices.filter(i => i.status === 'draft').length} invoices</p>
        </div>
      </div>

      <div className="card">
        <div className="p-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-input w-full sm:w-48"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Date</th>
                <th>Due Date</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="h-5 w-5 text-primary-700" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{invoice.invoice_number}</p>
                      </div>
                    </div>
                  </td>
                  <td>{invoice.client_name}</td>
                  <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                  <td>{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</td>
                  <td>
                    <p className="font-medium">{formatCurrency(invoice.total_amount)}</p>
                    {invoice.paid_amount > 0 && invoice.status !== 'paid' && (
                      <p className="text-xs text-gray-500">Paid: {formatCurrency(invoice.paid_amount)}</p>
                    )}
                  </td>
                  <td>{getStatusBadge(invoice.status)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleOpenModal(invoice)} className="p-1 text-gray-500 hover:text-primary-700">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button onClick={() => handleDelete(invoice.id)} className="p-1 text-gray-500 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">No invoices found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingInvoice ? 'Edit Invoice' : 'Create Invoice'} size="lg">
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
            <div>
              <label className="form-label">Invoice Number *</label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
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
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="form-label">Invoice Date *</label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Subtotal (NGN) *</label>
              <input
                type="number"
                required
                value={formData.subtotal}
                onChange={(e) => handleSubtotalChange(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">VAT 7.5%</label>
              <input
                type="number"
                value={formData.vat_amount}
                readOnly
                className="form-input bg-gray-50"
              />
            </div>
            <div>
              <label className="form-label">WHT 5%</label>
              <input
                type="number"
                value={formData.wht_amount}
                readOnly
                className="form-input bg-gray-50"
              />
            </div>
            <div>
              <label className="form-label">Total Amount</label>
              <input
                type="number"
                value={formData.total_amount}
                readOnly
                className="form-input bg-gray-50 font-semibold"
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
              {saving ? 'Saving...' : (editingInvoice ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Invoices;
