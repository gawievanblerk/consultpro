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

    const vatRate = 0.075;
    const whtRate = whtType === 'professional' ? 0.10 : 0.05;

    const vat = applyVat ? subtotal * vatRate : 0;
    const wht = applyWht ? subtotal * whtRate : 0;
    const total = subtotal + vat - wht;

    return { subtotal, vat, wht, total };
  };

  const handleOpenModal = async (invoice = null) => {
    if (invoice) {
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
      case 'sent': return <span className="badge-info">Sent</span>;
      case 'partial': return <span className="badge-warning">Partial</span>;
      case 'overdue': return <span className="badge-danger">Overdue</span>;
      case 'draft': return <span className="badge-neutral">Draft</span>;
      default: return <span className="badge-neutral">{status}</span>;
    }
  };

  const totals = calculateTotals(formData.items, formData.apply_vat, formData.apply_wht, formData.wht_type);

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'sent', label: 'Sent' },
    { key: 'paid', label: 'Paid' },
    { key: 'overdue', label: 'Overdue' }
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">Invoices</h1>
          <p className="mt-1 text-primary-500">Manage billing and invoices</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton onClick={() => showHelp('invoices')} />
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Create Invoice
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-primary-100 p-5">
          <p className="text-sm font-medium text-primary-500">Outstanding</p>
          <p className="mt-2 text-2xl font-semibold text-primary-900 tracking-tight">
            {formatCurrency(invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + parseFloat(i.total_amount) - parseFloat(i.paid_amount || 0), 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-primary-100 p-5">
          <p className="text-sm font-medium text-primary-500">Paid</p>
          <p className="mt-2 text-2xl font-semibold text-accent-600 tracking-tight">
            {formatCurrency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total_amount), 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-primary-100 p-5">
          <p className="text-sm font-medium text-primary-500">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-danger-600 tracking-tight">
            {formatCurrency(invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.total_amount), 0))}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-primary-100 p-5">
          <p className="text-sm font-medium text-primary-500">Drafts</p>
          <p className="mt-2 text-2xl font-semibold text-primary-400 tracking-tight">
            {invoices.filter(i => i.status === 'draft').length}
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-xl border border-primary-100 p-2">
        <div className="flex gap-1 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${filter === tab.key
                  ? 'bg-primary-900 text-white'
                  : 'text-primary-600 hover:bg-primary-50 hover:text-primary-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices list */}
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
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Due</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-primary-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-primary-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice, idx) => (
                  <tr
                    key={invoice.id}
                    onClick={() => handleOpenModal(invoice)}
                    className={`cursor-pointer transition-colors hover:bg-primary-50/50 ${idx !== invoices.length - 1 ? 'border-b border-primary-50' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex-shrink-0 bg-primary-50 rounded-lg flex items-center justify-center">
                          <DocumentTextIcon className="h-5 w-5 text-primary-400" />
                        </div>
                        <p className="font-medium text-primary-900">{invoice.invoice_number}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary-700">{invoice.client_name}</td>
                    <td className="px-6 py-4 text-sm text-primary-600">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm text-primary-600">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-primary-900">{formatCurrency(invoice.total_amount)}</p>
                      {invoice.paid_amount > 0 && invoice.status !== 'paid' && (
                        <p className="text-xs text-primary-400">Paid: {formatCurrency(invoice.paid_amount)}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDownloadPdf(invoice); }}
                          className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <DocumentArrowDownIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendEmail(invoice); }}
                          className="p-2 text-primary-400 hover:text-accent-600 hover:bg-accent-50 rounded-lg transition-colors"
                          title="Send Email"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(invoice.id); }}
                          className="p-2 text-primary-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
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
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <DocumentTextIcon className="h-12 w-12 text-primary-200 mx-auto mb-4" />
                      <p className="text-primary-500 font-medium">No invoices found</p>
                      <p className="text-sm text-primary-400 mt-1">Create your first invoice to get started</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingInvoice ? 'Edit Invoice' : 'Create Invoice'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-primary-700 mb-2">Client *</label>
              <select
                required
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="">Select a client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Invoice Number *</label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Invoice Date *</label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Due Date</label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              />
            </div>
          </div>

          {/* Line Items Section */}
          <div className="border-t border-primary-100 pt-5">
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-primary-700">Line Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add Item
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-100">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-primary-500 uppercase">Description</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-primary-500 uppercase w-20">Qty</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-primary-500 uppercase w-28">Unit Price</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-primary-500 uppercase w-28">Amount</th>
                    <th className="py-3 px-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.items.map((item, index) => {
                    const amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
                    return (
                      <tr key={index} className="border-b border-primary-50">
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            placeholder="Service description"
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            className="w-full px-3 py-2 bg-primary-50/50 border border-primary-200 rounded-lg text-sm text-primary-900 placeholder-primary-400 focus:outline-none focus:bg-white focus:border-primary-400"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="w-full px-3 py-2 bg-primary-50/50 border border-primary-200 rounded-lg text-sm text-right text-primary-900 focus:outline-none focus:bg-white focus:border-primary-400"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            className="w-full px-3 py-2 bg-primary-50/50 border border-primary-200 rounded-lg text-sm text-right text-primary-900 focus:outline-none focus:bg-white focus:border-primary-400"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-primary-900">
                          {formatCurrency(amount)}
                        </td>
                        <td className="py-2 px-2">
                          {formData.items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-primary-400 hover:text-danger-500 transition-colors"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-primary-100 pt-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="apply_vat"
                  checked={formData.apply_vat}
                  onChange={(e) => setFormData({ ...formData, apply_vat: e.target.checked })}
                  className="h-4 w-4 text-primary-600 rounded border-primary-300 focus:ring-primary-500"
                />
                <label htmlFor="apply_vat" className="text-sm text-primary-700">
                  Apply VAT (7.5%)
                </label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="apply_wht"
                  checked={formData.apply_wht}
                  onChange={(e) => setFormData({ ...formData, apply_wht: e.target.checked })}
                  className="h-4 w-4 text-primary-600 rounded border-primary-300 focus:ring-primary-500"
                />
                <label htmlFor="apply_wht" className="text-sm text-primary-700">
                  Apply WHT
                </label>
              </div>
              {formData.apply_wht && (
                <div className="ml-7">
                  <select
                    value={formData.wht_type}
                    onChange={(e) => setFormData({ ...formData, wht_type: e.target.value })}
                    className="w-full px-3 py-2 bg-primary-50/50 border border-primary-200 rounded-lg text-sm text-primary-700 focus:outline-none focus:bg-white focus:border-primary-400"
                  >
                    <option value="services">Services (5%)</option>
                    <option value="professional">Professional (10%)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="bg-primary-50/50 p-5 rounded-xl space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-primary-500">Subtotal</span>
                <span className="font-medium text-primary-900">{formatCurrency(totals.subtotal)}</span>
              </div>
              {formData.apply_vat && (
                <div className="flex justify-between text-sm">
                  <span className="text-primary-500">VAT (7.5%)</span>
                  <span className="font-medium text-accent-600">+{formatCurrency(totals.vat)}</span>
                </div>
              )}
              {formData.apply_wht && (
                <div className="flex justify-between text-sm">
                  <span className="text-primary-500">WHT ({formData.wht_type === 'professional' ? '10%' : '5%'})</span>
                  <span className="font-medium text-danger-600">-{formatCurrency(totals.wht)}</span>
                </div>
              )}
              <div className="flex justify-between text-base pt-3 border-t border-primary-200">
                <span className="font-semibold text-primary-900">Total</span>
                <span className="font-bold text-primary-900">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              rows={2}
              placeholder="Additional notes or payment terms..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-5 border-t border-primary-100">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
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
