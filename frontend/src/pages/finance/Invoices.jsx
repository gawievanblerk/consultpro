import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useHelp } from '../../context/HelpContext';
import { HelpButton } from '../../components/HelpModal';
import {
  PlusIcon,
  DocumentTextIcon,
  TrashIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

function Invoices() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { showHelp } = useHelp();
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
    status: 'draft',
    notes: '',
    apply_vat: true,
    apply_wht: true,
    wht_type: 'services',
    items: [{ description: '', quantity: 1, unit_price: 0 }]
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

  const calculateTotals = (items, applyVat, applyWht, whtType) => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
    }, 0);

    const vatRate = 0.075; // 7.5% VAT
    const whtRate = whtType === 'professional' ? 0.10 : 0.05; // 10% or 5% WHT

    const vat = applyVat ? subtotal * vatRate : 0;
    const wht = applyWht ? subtotal * whtRate : 0;
    const total = subtotal + vat - wht;

    return { subtotal, vat, wht, total };
  };

  const handleOpenModal = async (invoice = null) => {
    if (invoice) {
      // Fetch full invoice with items
      try {
        const response = await api.get(`/api/invoices/${invoice.id}`);
        if (response.data.success) {
          const fullInvoice = response.data.data;
          setEditingInvoice(fullInvoice);

          const items = fullInvoice.items && fullInvoice.items.length > 0
            ? fullInvoice.items.map(item => ({
                description: item.description || '',
                quantity: item.quantity || 1,
                unit_price: item.unit_price || 0
              }))
            : [{ description: '', quantity: 1, unit_price: fullInvoice.subtotal || 0 }];

          setFormData({
            client_id: fullInvoice.client_id || '',
            invoice_number: fullInvoice.invoice_number || '',
            invoice_date: fullInvoice.invoice_date ? fullInvoice.invoice_date.split('T')[0] : '',
            due_date: fullInvoice.due_date ? fullInvoice.due_date.split('T')[0] : '',
            status: fullInvoice.status || 'draft',
            notes: fullInvoice.notes || '',
            apply_vat: fullInvoice.vat_amount > 0,
            apply_wht: fullInvoice.wht_amount > 0,
            wht_type: fullInvoice.wht_rate >= 10 ? 'professional' : 'services',
            items
          });
        }
      } catch (error) {
        console.error('Failed to fetch invoice details:', error);
        toast.error('Failed to load invoice details');
        return;
      }
    } else {
      setEditingInvoice(null);
      const today = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setFormData({
        client_id: '',
        invoice_number: generateInvoiceNumber(),
        invoice_date: today,
        due_date: dueDate,
        status: 'draft',
        notes: '',
        apply_vat: true,
        apply_wht: true,
        wht_type: 'services',
        items: [{ description: '', quantity: 1, unit_price: 0 }]
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingInvoice(null);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, unit_price: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        client_id: formData.client_id,
        invoice_date: formData.invoice_date,
        due_date: formData.due_date,
        notes: formData.notes,
        status: formData.status,
        apply_vat: formData.apply_vat,
        apply_wht: formData.apply_wht,
        wht_type: formData.wht_type,
        items: formData.items.filter(item => item.description || item.unit_price > 0)
      };

      if (editingInvoice) {
        await api.put(`/api/invoices/${editingInvoice.id}`, payload);
        toast.success('Invoice updated successfully');
      } else {
        await api.post('/api/invoices', payload);
        toast.success('Invoice created successfully');
      }
      fetchInvoices();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save invoice:', error);
      toast.error('Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/invoices/${id}`);
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const handleDownloadPdf = async (invoice) => {
    try {
      const response = await api.get(`/api/invoices/${invoice.id}/pdf`, {
        responseType: 'blob'
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoice_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('PDF downloaded');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      toast.error('Failed to download PDF. Please try again.');
    }
  };

  const handleSendEmail = async (invoice) => {
    const confirmed = await confirm({
      title: 'Send Invoice',
      message: `Send invoice ${invoice.invoice_number} to ${invoice.client_name}?`,
      confirmText: 'Send',
      variant: 'primary'
    });
    if (!confirmed) return;
    try {
      await api.post(`/api/invoices/${invoice.id}/send-email`);
      toast.success('Invoice sent successfully!');
      fetchInvoices();
    } catch (error) {
      console.error('Failed to send invoice:', error);
      toast.error('Failed to send invoice email. Please try again.');
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

  const totals = calculateTotals(formData.items, formData.apply_vat, formData.apply_wht, formData.wht_type);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="mt-1 text-sm text-gray-500">Manage billing and invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton onClick={() => showHelp('invoices')} />
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Invoice
          </button>
        </div>
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
        <div className="card overflow-x-auto">
          <table className="table min-w-full">
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
                <tr
                  key={invoice.id}
                  onClick={() => handleOpenModal(invoice)}
                  className="cursor-pointer hover:bg-gray-50"
                >
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
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(invoice); }}
                        className="p-1 text-gray-500 hover:text-accent-600"
                        title="Download PDF"
                      >
                        <DocumentArrowDownIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleSendEmail(invoice); }}
                        className="p-1 text-gray-500 hover:text-green-600"
                        title="Send Email"
                      >
                        <EnvelopeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(invoice.id); }}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
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

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingInvoice ? 'Edit Invoice' : 'Create Invoice'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Header Section */}
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
          </div>

          {/* Line Items Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="form-label mb-0">Line Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sm text-primary-700 hover:text-primary-800 font-medium flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 font-medium text-gray-600">Description</th>
                    <th className="text-right p-2 font-medium text-gray-600 w-24">Qty</th>
                    <th className="text-right p-2 font-medium text-gray-600 w-32">Unit Price</th>
                    <th className="text-right p-2 font-medium text-gray-600 w-32">Amount</th>
                    <th className="p-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => {
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                    return (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="p-2">
                          <input
                            type="text"
                            placeholder="Service description"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="form-input text-sm"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="form-input text-sm text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="form-input text-sm text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          {formatCurrency(amount)}
                        </td>
                        <td className="p-2">
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tax Options and Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="apply_vat"
                  checked={formData.apply_vat}
                  onChange={(e) => setFormData({ ...formData, apply_vat: e.target.checked })}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label htmlFor="apply_vat" className="ml-2 text-sm text-gray-700">
                  Apply VAT (7.5%)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="apply_wht"
                  checked={formData.apply_wht}
                  onChange={(e) => setFormData({ ...formData, apply_wht: e.target.checked })}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label htmlFor="apply_wht" className="ml-2 text-sm text-gray-700">
                  Apply WHT
                </label>
              </div>
              {formData.apply_wht && (
                <div className="ml-6">
                  <select
                    value={formData.wht_type}
                    onChange={(e) => setFormData({ ...formData, wht_type: e.target.value })}
                    className="form-input text-sm"
                  >
                    <option value="services">Services (5%)</option>
                    <option value="professional">Professional (10%)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              {formData.apply_vat && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">VAT (7.5%):</span>
                  <span className="font-medium text-green-700">+{formatCurrency(totals.vat)}</span>
                </div>
              )}
              {formData.apply_wht && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">WHT ({formData.wht_type === 'professional' ? '10%' : '5%'}):</span>
                  <span className="font-medium text-red-700">-{formatCurrency(totals.wht)}</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-bold text-primary-900">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input"
              rows={2}
              placeholder="Additional notes or payment terms..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingInvoice ? 'Update Invoice' : 'Create Invoice')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Invoices;
