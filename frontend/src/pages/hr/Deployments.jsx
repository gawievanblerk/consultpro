import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PlusIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

function Deployments() {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeployments();
  }, []);

  const fetchDeployments = async () => {
    try {
      const response = await api.get('/api/deployments');
      if (response.data.success) {
        setDeployments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch deployments:', error);
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
      case 'active': return <span className="badge-success">Active</span>;
      case 'completed': return <span className="badge-primary">Completed</span>;
      case 'terminated': return <span className="badge-danger">Terminated</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployments</h1>
          <p className="mt-1 text-sm text-gray-500">Staff assignments to clients</p>
        </div>
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Deployment
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
                <th>Staff</th>
                <th>Client</th>
                <th>Role</th>
                <th>Status</th>
                <th>Period</th>
                <th>Billing Rate</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deployments.map((deployment) => (
                <tr key={deployment.id}>
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-lg flex items-center justify-center">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-primary-900" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{deployment.staff_name}</p>
                      </div>
                    </div>
                  </td>
                  <td>{deployment.client_name}</td>
                  <td>{deployment.role_title || '-'}</td>
                  <td>{getStatusBadge(deployment.status)}</td>
                  <td>
                    <p className="text-sm">
                      {new Date(deployment.start_date).toLocaleDateString()} -
                      {deployment.end_date ? new Date(deployment.end_date).toLocaleDateString() : 'Ongoing'}
                    </p>
                  </td>
                  <td className="font-medium">
                    {formatCurrency(deployment.billing_rate)}/{deployment.billing_type}
                  </td>
                </tr>
              ))}
              {deployments.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No deployments found
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

export default Deployments;
