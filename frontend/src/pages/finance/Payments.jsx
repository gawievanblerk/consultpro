import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PlusIcon, BanknotesIcon } from '@heroicons/react/24/outline';

function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
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
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Record Payment
        </button>
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
                <th>Date</th>
                <th>Invoice</th>
                <th>Client</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-success-50 rounded-lg flex items-center justify-center">
                        <BanknotesIcon className="h-5 w-5 text-success-700" />
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
                  <td className="font-semibold text-success-700">{formatCurrency(payment.amount)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No payments found
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

export default Payments;
