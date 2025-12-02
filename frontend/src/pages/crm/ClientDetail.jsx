import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../utils/api';
import { ArrowLeftIcon, PencilIcon } from '@heroicons/react/24/outline';

function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClient();
  }, [id]);

  const fetchClient = async () => {
    try {
      const response = await api.get(`/api/clients/${id}`);
      if (response.data.success) {
        setClient(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch client:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Client not found</p>
        <Link to="/clients" className="text-primary-900 hover:underline mt-2 inline-block">
          Back to clients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/clients" className="mr-4 p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.company_name}</h1>
            <p className="text-sm text-gray-500">{client.industry}</p>
          </div>
        </div>
        <button className="btn-secondary">
          <PencilIcon className="h-4 w-4 mr-2" />
          Edit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Contact Information</h2>
            </div>
            <div className="card-body grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{client.email || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{client.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">
                  {client.address_line1 && (
                    <>
                      {client.address_line1}<br />
                      {client.city}, {client.state}
                    </>
                  ) || '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Website</p>
                <p className="font-medium">{client.website || '-'}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Compliance Information</h2>
            </div>
            <div className="card-body grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">TIN</p>
                <p className="font-medium">{client.tin || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">RC Number</p>
                <p className="font-medium">{client.rc_number || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <div className="card-header">
              <h2 className="font-semibold">Quick Stats</h2>
            </div>
            <div className="card-body space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="badge-success">{client.client_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tier</span>
                <span className="font-medium">{client.client_tier || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Terms</span>
                <span className="font-medium">{client.payment_terms} days</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientDetail;
