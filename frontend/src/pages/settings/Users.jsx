import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  PencilIcon,
  TrashIcon,
  KeyIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  ArrowPathIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

function Users() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user'
  });
  const [passwordData, setPasswordData] = useState({
    userId: null,
    password: '',
    confirmPassword: ''
  });
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'user'
  });

  useEffect(() => {
    fetchUsers();
    fetchInvites();
  }, [filter]);

  const fetchUsers = async () => {
    try {
      const params = {};
      if (filter === 'active') params.status = 'active';
      if (filter === 'inactive') params.status = 'inactive';
      if (search) params.search = search;

      const response = await api.get('/api/users', { params });
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
      if (error.response?.status === 403) {
        alert('Access denied. Admin privileges required.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await api.get('/api/users/invites');
      if (response.data.success) {
        setInvites(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email || '',
        password: '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || 'user'
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        role: 'user'
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        // Update - don't send password
        const { password, email, ...updateData } = formData;
        await api.put(`/api/users/${editingUser.id}`, updateData);
      } else {
        // Create - password required
        if (!formData.password || formData.password.length < 6) {
          alert('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        await api.post('/api/users', formData);
      }
      fetchUsers();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save user:', error);
      alert(error.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/api/users/${user.id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      alert(error.response?.data?.error || 'Failed to update user');
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      return;
    }
    try {
      await api.delete(`/api/users/${user.id}`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleOpenPasswordModal = (user) => {
    setPasswordData({
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      password: '',
      confirmPassword: ''
    });
    setPasswordModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (passwordData.password !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (passwordData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/api/users/${passwordData.userId}/password`, {
        password: passwordData.password
      });
      setPasswordModalOpen(false);
      alert('Password updated successfully');
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert(error.response?.data?.error || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Invite handlers
  const handleOpenInviteModal = () => {
    setInviteData({ email: '', role: 'user' });
    setInviteModalOpen(true);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/users/invite', inviteData);
      setInviteModalOpen(false);
      fetchInvites();
      alert('Invitation sent successfully!');
    } catch (error) {
      console.error('Failed to send invite:', error);
      alert(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelInvite = async (inviteId) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }
    try {
      await api.delete(`/api/users/invites/${inviteId}`);
      fetchInvites();
    } catch (error) {
      console.error('Failed to cancel invite:', error);
      alert(error.response?.data?.error || 'Failed to cancel invitation');
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      await api.post(`/api/users/invites/${inviteId}/resend`);
      fetchInvites();
      alert('Invitation resent successfully!');
    } catch (error) {
      console.error('Failed to resend invite:', error);
      alert(error.response?.data?.error || 'Failed to resend invitation');
    }
  };

  const filteredUsers = users.filter(user => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.email?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage users and their access</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleOpenInviteModal}
            className="btn-secondary flex items-center gap-2"
          >
            <EnvelopeIcon className="h-5 w-5" />
            Invite User
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center gap-2"
          >
            <PlusIcon className="h-5 w-5" />
            Add User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input pl-10 w-full"
              />
            </div>
          </form>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-input w-full sm:w-40"
          >
            <option value="all">All Users</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-red-100 text-red-800 hover:bg-red-200'
                      }`}
                    >
                      {user.isActive ? (
                        <>
                          <CheckCircleIcon className="h-4 w-4" />
                          Active
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="h-4 w-4" />
                          Inactive
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : 'Never'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenPasswordModal(user)}
                        className="p-1 text-gray-400 hover:text-yellow-600"
                        title="Reset Password"
                      >
                        <KeyIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-1 text-gray-400 hover:text-primary-600"
                        title="Edit User"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete User"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <UserIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No users found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {invites.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-500" />
              Pending Invitations ({invites.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {invites.map((invite) => (
              <div key={invite.id} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <EnvelopeIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor(invite.role)}`}>
                        {invite.role}
                      </span>
                      <span className="text-xs text-gray-500">
                        Invited by {invite.invitedBy}
                      </span>
                      {invite.isExpired && (
                        <span className="text-xs text-red-600 font-medium">Expired</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvite(invite.id)}
                    className="p-2 text-gray-400 hover:text-primary-600 rounded-lg hover:bg-gray-100"
                    title="Resend Invitation"
                  >
                    <ArrowPathIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleCancelInvite(invite.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100"
                    title="Cancel Invitation"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit User Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingUser ? 'Edit User' : 'Add New User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="form-input"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="form-input"
                placeholder="Last name"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
              placeholder="user@example.com"
              disabled={editingUser}
            />
            {editingUser && (
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            )}
          </div>

          {!editingUser && (
            <div>
              <label className="form-label">Password *</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="form-input"
                placeholder="Minimum 6 characters"
                minLength={6}
              />
            </div>
          )}

          <div>
            <label className="form-label">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="form-input"
            >
              <option value="user">User - Basic access</option>
              <option value="manager">Manager - Can manage clients, leads, staff</option>
              <option value="admin">Administrator - Full access</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleCloseModal}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Reset Password"
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="text-sm text-gray-600">
            Set a new password for <strong>{passwordData.userName}</strong>
          </p>

          <div>
            <label className="form-label">New Password *</label>
            <input
              type="password"
              required
              value={passwordData.password}
              onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
              className="form-input"
              placeholder="Minimum 6 characters"
              minLength={6}
            />
          </div>

          <div>
            <label className="form-label">Confirm Password *</label>
            <input
              type="password"
              required
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              className="form-input"
              placeholder="Confirm new password"
              minLength={6}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
            >
              {saving ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Invite User Modal */}
      <Modal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite User"
      >
        <form onSubmit={handleSendInvite} className="space-y-4">
          <p className="text-sm text-gray-600">
            Send an invitation email to a new user. They will receive a link to set up their account.
          </p>

          <div>
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              required
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              className="form-input"
              placeholder="user@example.com"
            />
          </div>

          <div>
            <label className="form-label">Role *</label>
            <select
              value={inviteData.role}
              onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
              className="form-input"
            >
              <option value="user">User - Basic access</option>
              <option value="manager">Manager - Can manage clients, leads, staff</option>
              <option value="admin">Administrator - Full access</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              The user will have this role when they accept the invitation
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setInviteModalOpen(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                'Sending...'
              ) : (
                <>
                  <EnvelopeIcon className="h-4 w-4" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Users;
