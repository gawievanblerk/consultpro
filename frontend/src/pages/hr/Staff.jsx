import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { PlusIcon, MagnifyingGlassIcon, UserIcon, TrashIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

// Badge helper for system role
const getRoleBadge = (role) => {
  switch (role) {
    case 'admin': return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Admin</span>;
    case 'manager': return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Manager</span>;
    case 'user': return <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">User</span>;
    default: return <span className="text-xs border border-gray-300 text-gray-500 px-2 py-0.5 rounded">No Access</span>;
  }
};

// Badge helper for employment type
const getEmploymentTypeBadge = (type) => {
  switch (type) {
    case 'permanent': return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Permanent</span>;
    case 'contract': return <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Contract</span>;
    case 'temporary': return <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Temporary</span>;
    default: return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Outsourced</span>;
  }
};

function Staff() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    job_title: '',
    department: '',
    skills: '',
    hourly_rate: '',
    employment_type: 'outsourced',
    status: 'active',
    is_available: true
  });

  useEffect(() => {
    fetchStaff();
  }, [filter]);

  const fetchStaff = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/api/staff', { params });
      if (response.data.success) {
        setStaff(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (person = null) => {
    if (person) {
      setEditingStaff(person);
      setFormData({
        employee_id: person.employee_id || '',
        first_name: person.first_name || '',
        last_name: person.last_name || '',
        email: person.email || '',
        phone: person.phone || '',
        job_title: person.job_title || '',
        department: person.department || '',
        skills: person.skills?.join(', ') || '',
        hourly_rate: person.hourly_rate || '',
        employment_type: person.employment_type || 'outsourced',
        status: person.status || 'active',
        is_available: person.is_available !== false
      });
    } else {
      setEditingStaff(null);
      setFormData({
        employee_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        job_title: '',
        department: '',
        skills: '',
        hourly_rate: '',
        employment_type: 'outsourced',
        status: 'active',
        is_available: true
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingStaff(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s)
      };
      if (editingStaff) {
        await api.put(`/api/staff/${editingStaff.id}`, data);
        toast.success('Staff updated successfully');
      } else {
        await api.post('/api/staff', data);
        toast.success('Staff created successfully');
      }
      fetchStaff();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save staff:', error);
      toast.error('Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Staff Member',
      message: 'Are you sure you want to delete this staff member? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/staff/${id}`);
      toast.success('Staff deleted successfully');
      fetchStaff();
    } catch (error) {
      console.error('Failed to delete staff:', error);
      toast.error('Failed to delete staff');
    }
  };

  const handleInvite = async (person) => {
    if (!person.email) {
      toast.warning('Staff member has no email address');
      return;
    }
    if (person.user_id) {
      toast.info('Staff member already has a user account');
      return;
    }

    setInviting(person.id);
    try {
      await api.post(`/api/staff/${person.id}/invite`, { role: 'user' });
      toast.success('Invitation sent successfully!');
      fetchStaff();
    } catch (error) {
      console.error('Failed to send invitation:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(null);
    }
  };

  const filteredStaff = staff.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.job_title?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status, isAvailable) => {
    if (!isAvailable) return <span className="badge-warning">Deployed</span>;
    switch (status) {
      case 'active': return <span className="badge-success">Available</span>;
      case 'on_leave': return <span className="badge-primary">On Leave</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Pool</h1>
          <p className="mt-1 text-sm text-gray-500">Outsourced personnel management</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Staff
        </button>
      </div>

      <div className="card">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
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
            <option value="all">All Status</option>
            <option value="active">Available</option>
            <option value="deployed">Deployed</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((person) => (
            <div
              key={person.id}
              className="card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOpenModal(person)}
            >
              <div className="p-5">
                <div className="flex items-start">
                  <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-primary-700" />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">{person.first_name} {person.last_name}</p>
                      {getStatusBadge(person.status, person.is_available)}
                    </div>
                    <p className="text-sm text-gray-500">{person.job_title}</p>
                    <p className="text-xs text-gray-400 mt-1">ID: {person.employee_id}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {getRoleBadge(person.user_role)}
                      {getEmploymentTypeBadge(person.employment_type)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div className="flex flex-wrap gap-1">
                    {person.skills?.slice(0, 3).map((skill, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">{skill}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {person.email && !person.user_id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleInvite(person); }}
                        disabled={inviting === person.id}
                        className="p-1 text-gray-500 hover:text-green-600 disabled:opacity-50"
                        title="Invite to create user account"
                      >
                        <EnvelopeIcon className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(person.id); }}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredStaff.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">No staff found</div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingStaff ? 'Edit Staff' : 'Add Staff'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Employee ID *</label>
              <input
                type="text"
                required
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-input"
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="form-label">First Name *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Last Name *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Job Title</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Department</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Hourly Rate (NGN)</label>
              <input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Employment Type</label>
              <select
                value={formData.employment_type}
                onChange={(e) => setFormData({ ...formData, employment_type: e.target.value })}
                className="form-input"
              >
                <option value="permanent">Permanent</option>
                <option value="contract">Contract</option>
                <option value="temporary">Temporary</option>
                <option value="outsourced">Outsourced</option>
              </select>
            </div>
            <div>
              <label className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Available for deployment</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Skills (comma separated)</label>
              <input
                type="text"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                className="form-input"
                placeholder="Excel, Project Management, HR"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingStaff ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Staff;
