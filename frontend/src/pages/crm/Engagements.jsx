import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PlusIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

function Engagements() {
  const [engagements, setEngagements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEngagements();
  }, []);

  const fetchEngagements = async () => {
    try {
      const response = await api.get('/api/engagements');
      if (response.data.success) {
        setEngagements(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch engagements:', error);
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
      case 'on_hold': return <span className="badge-warning">On Hold</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Engagements</h1>
          <p className="mt-1 text-sm text-gray-500">Active projects and contracts</p>
        </div>
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Engagement
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {engagements.map((engagement) => (
            <div key={engagement.id} className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <BriefcaseIcon className="h-5 w-5 text-primary-900" />
                  </div>
                  {getStatusBadge(engagement.status)}
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{engagement.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{engagement.client_name}</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{engagement.engagement_type}</span>
                  <span className="font-medium text-primary-900">
                    {formatCurrency(engagement.contract_value)}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {engagements.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No engagements found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Engagements;
