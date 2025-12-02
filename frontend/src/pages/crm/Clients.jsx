import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { PlusIcon, MagnifyingGlassIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchClients();
  }, [filter]);

  const fetchClients = async () => {
    try {
      const params = filter !== 'all' ? { client_type: filter } : {};
      const response = await api.get('/api/clients', { params });
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.company_name.toLowerCase().includes(search.toLowerCase()) ||
    client.industry?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (type) => {
    switch (type) {
      case 'active':
        return <span className="badge-success">Active</span>;
      case 'prospect':
        return <span className="badge-primary">Prospect</span>;
      case 'inactive':
        return <span className="badge bg-gray-100 text-gray-700">Inactive</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your client relationships
          </p>
        </div>
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-input w-full sm:w-48"
          >
            <option value="all">All Types</option>
            <option value="active">Active</option>
            <option value="prospect">Prospect</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Clients list */}
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
                <th>Industry</th>
                <th>Status</th>
                <th>City</th>
                <th>Contact</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td>
                    <Link
                      to={`/clients/${client.id}`}
                      className="flex items-center hover:text-primary-900"
                    >
                      <div className="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-lg flex items-center justify-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-primary-900" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{client.company_name}</p>
                        {client.rc_number && (
                          <p className="text-xs text-gray-500">RC: {client.rc_number}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td>{client.industry || '-'}</td>
                  <td>{getStatusBadge(client.client_type)}</td>
                  <td>{client.city || '-'}</td>
                  <td>{client.email || '-'}</td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No clients found
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

export default Clients;
