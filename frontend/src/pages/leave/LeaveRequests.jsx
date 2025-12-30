import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CalendarDaysIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

const getStatusBadge = (status) => {
  switch (status) {
    case 'pending':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        <ClockIcon className="w-3 h-3 mr-1" />Pending
      </span>;
    case 'approved':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
        <CheckIcon className="w-3 h-3 mr-1" />Approved
      </span>;
    case 'rejected':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        <XMarkIcon className="w-3 h-3 mr-1" />Rejected
      </span>;
    case 'cancelled':
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Cancelled</span>;
    default:
      return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{status}</span>;
  }
};

function LeaveRequests() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form data for new request
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState({
    staff_id: '',
    leave_type_id: '',
    start_date: '',
    end_date: '',
    reason: '',
    is_half_day: false,
    half_day_period: 'morning'
  });

  useEffect(() => {
    fetchRequests();
    fetchLeaveTypes();
    fetchStaff();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const response = await api.get('/api/leave-requests', { params });
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leave requests:', error);
      toast.error('Failed to load leave requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const response = await api.get('/api/leave-types');
      if (response.data.success) {
        setLeaveTypes(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get('/api/staff', { params: { status: 'active' } });
      if (response.data.success) {
        setStaffList(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const handleOpenModal = () => {
    setFormData({
      staff_id: '',
      leave_type_id: '',
      start_date: '',
      end_date: '',
      reason: '',
      is_half_day: false,
      half_day_period: 'morning'
    });
    setModalOpen(true);
  };

  const handleViewRequest = async (request) => {
    try {
      const response = await api.get(`/api/leave-requests/${request.id}`);
      if (response.data.success) {
        setSelectedRequest(response.data.data);
        setViewModalOpen(true);
      }
    } catch (error) {
      console.error('Failed to fetch request details:', error);
      toast.error('Failed to load request details');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/api/leave-requests', formData);
      toast.success('Leave request submitted successfully');
      fetchRequests();
      setModalOpen(false);
    } catch (error) {
      console.error('Failed to submit leave request:', error);
      toast.error(error.response?.data?.error || 'Failed to submit leave request');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (id) => {
    const confirmed = await confirm({
      title: 'Approve Leave Request',
      message: 'Are you sure you want to approve this leave request?',
      confirmText: 'Approve',
      variant: 'primary'
    });
    if (!confirmed) return;

    try {
      await api.put(`/api/leave-requests/${id}/approve`);
      toast.success('Leave request approved');
      fetchRequests();
      setViewModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to approve request');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Please provide a reason for rejection:');
    if (reason === null) return;

    try {
      await api.put(`/api/leave-requests/${id}/reject`, { rejection_reason: reason });
      toast.success('Leave request rejected');
      fetchRequests();
      setViewModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reject request');
    }
  };

  const handleCancel = async (id) => {
    const confirmed = await confirm({
      title: 'Cancel Leave Request',
      message: 'Are you sure you want to cancel this leave request?',
      confirmText: 'Cancel Request',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.put(`/api/leave-requests/${id}/cancel`, { cancellation_reason: 'Cancelled by admin' });
      toast.success('Leave request cancelled');
      fetchRequests();
      setViewModalOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to cancel request');
    }
  };

  const filteredRequests = requests.filter(r =>
    `${r.staff_first_name} ${r.staff_last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    r.leave_type_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Requests</h1>
          <p className="mt-1 text-sm text-gray-500">Manage employee leave requests and approvals</p>
        </div>
        <button onClick={handleOpenModal} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Request
        </button>
      </div>

      <div className="card">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee or leave type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input w-full sm:w-48"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leave Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRequests.map((request) => (
                <tr key={request.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewRequest(request)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {request.staff_first_name?.[0]}{request.staff_last_name?.[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {request.staff_first_name} {request.staff_last_name}
                        </p>
                        <p className="text-xs text-gray-500">{request.staff_department}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: `${request.leave_type_color}20`, color: request.leave_type_color }}
                    >
                      {request.leave_type_name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <CalendarDaysIcon className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {request.days_requested}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(request.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {request.status === 'pending' && (
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Approve"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Reject"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No leave requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* New Request Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Leave Request" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Employee *</label>
              <select
                required
                value={formData.staff_id}
                onChange={(e) => setFormData({ ...formData, staff_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select employee...</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Leave Type *</label>
              <select
                required
                value={formData.leave_type_id}
                onChange={(e) => setFormData({ ...formData, leave_type_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select leave type...</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name} ({lt.days_allowed} days)</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">End Date *</label>
              <input
                type="date"
                required
                value={formData.end_date}
                min={formData.start_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="form-input"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_half_day}
                  onChange={(e) => setFormData({ ...formData, is_half_day: e.target.checked })}
                  className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Half day only</span>
              </label>
              {formData.is_half_day && (
                <select
                  value={formData.half_day_period}
                  onChange={(e) => setFormData({ ...formData, half_day_period: e.target.value })}
                  className="form-input mt-2 w-48"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                </select>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Reason</label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="form-input"
                rows="3"
                placeholder="Optional: Provide a reason for the leave request"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Request Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Leave Request Details" size="lg">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="font-medium">{selectedRequest.staff_first_name} {selectedRequest.staff_last_name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Department</p>
                <p className="font-medium">{selectedRequest.staff_department || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Leave Type</p>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                  style={{ backgroundColor: `${selectedRequest.leave_type_color}20`, color: selectedRequest.leave_type_color }}
                >
                  {selectedRequest.leave_type_name}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                {getStatusBadge(selectedRequest.status)}
              </div>
              <div>
                <p className="text-xs text-gray-500">Start Date</p>
                <p className="font-medium">{formatDate(selectedRequest.start_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">End Date</p>
                <p className="font-medium">{formatDate(selectedRequest.end_date)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Days Requested</p>
                <p className="font-medium">{selectedRequest.days_requested} day(s)</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Available Balance</p>
                <p className="font-medium">{selectedRequest.available_days || '-'} days</p>
              </div>
            </div>

            {selectedRequest.reason && (
              <div>
                <p className="text-xs text-gray-500">Reason</p>
                <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedRequest.reason}</p>
              </div>
            )}

            {selectedRequest.rejection_reason && (
              <div>
                <p className="text-xs text-gray-500">Rejection Reason</p>
                <p className="mt-1 text-sm text-red-700 bg-red-50 p-3 rounded">{selectedRequest.rejection_reason}</p>
              </div>
            )}

            {selectedRequest.approver_first_name && (
              <div>
                <p className="text-xs text-gray-500">Approved/Rejected By</p>
                <p className="font-medium">{selectedRequest.approver_first_name} {selectedRequest.approver_last_name}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button onClick={() => setViewModalOpen(false)} className="btn-secondary">Close</button>
              {selectedRequest.status === 'pending' && (
                <>
                  <button onClick={() => handleReject(selectedRequest.id)} className="btn-danger">
                    Reject
                  </button>
                  <button onClick={() => handleApprove(selectedRequest.id)} className="btn-primary">
                    Approve
                  </button>
                </>
              )}
              {['pending', 'approved'].includes(selectedRequest.status) && (
                <button onClick={() => handleCancel(selectedRequest.id)} className="btn-secondary text-red-600">
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default LeaveRequests;
