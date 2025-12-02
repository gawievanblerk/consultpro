import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchInvoices();
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
      case 'overdue': return <span className="badge-danger">Overdue</span>;
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
        <button className="btn-primary">
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
          <p className="text-xl font-semibold text-success-700">
            {formatCurrency(invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + parseFloat(i.total_amount), 0))}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Overdue</p>
          <p className="text-xl font-semibold text-danger-700">
            {formatCurrency(invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + parseFloat(i.total_amount), 0))}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Draft</p>
          <p className="text-xl font-semibold text-gray-500">
            {invoices.filter(i => i.status === 'draft').length} invoices
          </p>
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="cursor-pointer hover:bg-gray-50">
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="h-5 w-5 text-primary-900" />
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
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No invoices found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Invoices;
