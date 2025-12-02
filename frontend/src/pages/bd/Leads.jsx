import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PlusIcon, MagnifyingGlassIcon, UserPlusIcon } from '@heroicons/react/24/outline';

function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
        <button className="btn-primary">
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Source</th>
                <th>Status</th>
                <th>Value</th>
                <th>Expected Close</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="cursor-pointer">
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
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No leads found
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

export default Leads;
