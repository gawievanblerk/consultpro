import React, { useState, useEffect } from 'react';
import { EnvelopeIcon, ClipboardIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import api from '../../utils/api';

function SuperAdminInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('superadmin_token')}` }
  });

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/superadmin/invitations', getAuthHeaders());
      if (response.data.success) {
        setInvitations(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const handleCopyLink = (invitation) => {
    const link = `${window.location.origin}/onboard/consultant?token=${invitation.token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(invitation.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResend = async (invitationId) => {
    try {
      await api.post(`/api/superadmin/invitations/${invitationId}/resend`, {}, getAuthHeaders());
      alert('Invitation resent successfully');
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      alert('Failed to resend invitation');
    }
  };

  const handleDelete = async (invitationId) => {
    if (!confirm('Are you sure you want to delete this invitation?')) return;

    try {
      await api.delete(`/api/superadmin/invitations/${invitationId}`, getAuthHeaders());
      setInvitations(invitations.filter(inv => inv.id !== invitationId));
    } catch (error) {
      console.error('Failed to delete invitation:', error);
      alert('Failed to delete invitation');
    }
  };

  const getStatusBadge = (invitation) => {
    const now = new Date();
    const expiresAt = new Date(invitation.expires_at);

    if (invitation.accepted_at) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Accepted</span>;
    }
    if (expiresAt < now) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Expired</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">Pending</span>;
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900">Pending Invitations</h1>
          <p className="text-primary-500 mt-1">Manage consultant invitations</p>
        </div>
        <button
          onClick={fetchInvitations}
          className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:text-primary-900"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="text-center py-12">
            <EnvelopeIcon className="h-12 w-12 text-primary-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-primary-900 mb-2">No pending invitations</h3>
            <p className="text-primary-500">Invitations you send will appear here</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-primary-50 border-b border-primary-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Tier</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-primary-600 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-primary-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-100">
              {invitations.map((invitation) => (
                <tr key={invitation.id} className="hover:bg-primary-50/50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-primary-900">{invitation.email}</p>
                  </td>
                  <td className="px-6 py-4 text-primary-600">{invitation.company_name}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-700 capitalize">
                      {invitation.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(invitation)}</td>
                  <td className="px-6 py-4 text-sm text-primary-500">
                    {new Date(invitation.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopyLink(invitation)}
                        className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded-lg"
                        title="Copy invitation link"
                      >
                        {copiedId === invitation.id ? (
                          <CheckIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ClipboardIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleResend(invitation.id)}
                        className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-100 rounded-lg"
                        title="Resend invitation email"
                      >
                        <EnvelopeIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(invitation.id)}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        title="Delete invitation"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default SuperAdminInvitations;
