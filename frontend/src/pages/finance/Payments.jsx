import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { PlusIcon, BanknotesIcon, TrashIcon } from '@heroicons/react/24/outline';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    invoice_id: '',
    payment_date: '',
    amount: '',
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchInvoices();
  }, []);

  const fetchPayments = async () => {
    try {
      const response = await api.get('/api/payments');
      if (response.data.success) {
        setPayments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/api/invoices');
      if (response.data.success) {
        setInvoices(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const handleOpenModal = (payment = null) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        invoice_id: payment.invoice_id || '',
        payment_date: payment.payment_date ? payment.payment_date.split('T')[0] : '',
        amount: payment.amount || '',
        payment_method: payment.payment_method || 'bank_transfer',
        reference_number: payment.reference_number || '',
        notes: payment.notes || ''
      });
    } else {
      setEditingPayment(null);
      setFormData({
        invoice_id: '',
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPayment(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingPayment) {
        await api.put(`/api/payments/${editingPayment.id}`, formData);
      } else {
        await api.post('/api/payments', formData);
      }
      fetchPayments();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save payment:', error);
      alert('Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this payment?')) return;
    try {
      await api.delete(`/api/payments/${id}`);
      fetchPayments();
    } catch (error) {
      console.error('Failed to delete payment:', error);
      alert('Failed to delete payment');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">Track received payments</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Record Payment
        </button>
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
                <th>Date</th>
                <th>Invoice</th>
                <th>Client</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr
                  key={payment.id}
                  onClick={() => handleOpenModal(payment)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-green-50 rounded-lg flex items-center justify-center">
                        <BanknotesIcon className="h-5 w-5 text-green-700" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{new Date(payment.payment_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>
                  <td>{payment.invoice_number}</td>
                  <td>{payment.client_name}</td>
                  <td className="capitalize">{payment.payment_method?.replace('_', ' ') || '-'}</td>
                  <td>{payment.reference_number || '-'}</td>
                  <td className="font-semibold text-green-700">{formatCurrency(payment.amount)}</td>
                  <td>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(payment.id); }}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">No payments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingPayment ? 'Edit Payment' : 'Record Payment'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Invoice *</label>
            <select
              required
              value={formData.invoice_id}
              onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
              className="form-input"
            >
              <option value="">Select an invoice</option>
              {invoices.filter(i => i.status !== 'paid').map(invoice => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - {invoice.client_name} ({formatCurrency(invoice.total_amount)})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Payment Date *</label>
              <input
                type="date"
                required
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Amount (NGN) *</label>
              <input
                type="number"
                required
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Payment Method</label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                className="form-input"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="form-label">Reference Number</label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="form-input"
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingPayment ? 'Update' : 'Record')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Payments;
