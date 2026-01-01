import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import EmployeeImportModal from '../../components/EmployeeImportModal';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../../components/BulkActions';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  TrashIcon,
  EnvelopeIcon,
  FunnelIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

const statusColors = {
  active: 'badge-success',
  on_leave: 'badge-warning',
  suspended: 'badge-warning',
  terminated: 'badge',
  probation: 'badge-info'
};

const statusLabels = {
  active: 'Active',
  on_leave: 'On Leave',
  suspended: 'Suspended',
  terminated: 'Terminated',
  probation: 'Probation'
};

function Employees() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { user, isConsultant } = useAuth();
  const { selectedCompany, isCompanyMode } = useCompany();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    jobTitle: '',
    department: '',
    hireDate: '',
    employmentType: 'full_time',
    employmentStatus: 'active',
    salary: '',
    salaryCurrency: 'NGN',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    nin: '',
    bvn: '',
    taxId: '',
    pensionPin: '',
    pensionPfa: '',
    nhfNumber: '',
    nhisNumber: ''
  });

  const {
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    selectedIds
  } = useBulkSelection(employees);

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter, selectedCompany]);

  const fetchEmployees = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      // Filter by selected company when in Company Mode
      if (isCompanyMode && selectedCompany?.id) {
        params.company_id = selectedCompany.id;
      }
      const response = await api.get('/api/employees', { params });
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
      toast.error('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        firstName: employee.first_name || '',
        lastName: employee.last_name || '',
        middleName: employee.middle_name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        dateOfBirth: employee.date_of_birth ? employee.date_of_birth.split('T')[0] : '',
        gender: employee.gender || '',
        jobTitle: employee.job_title || '',
        department: employee.department || '',
        hireDate: employee.hire_date ? employee.hire_date.split('T')[0] : '',
        employmentType: employee.employment_type || 'full_time',
        employmentStatus: employee.employment_status || 'active',
        salary: employee.salary || '',
        salaryCurrency: employee.salary_currency || 'NGN',
        bankName: employee.bank_name || '',
        bankAccountNumber: employee.bank_account_number || '',
        bankAccountName: employee.bank_account_name || '',
        nin: employee.nin || '',
        bvn: employee.bvn || '',
        taxId: employee.tax_id || '',
        pensionPin: employee.pension_pin || '',
        pensionPfa: employee.pension_pfa || '',
        nhfNumber: employee.nhf_number || '',
        nhisNumber: employee.nhis_number || ''
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        firstName: '',
        lastName: '',
        middleName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        gender: '',
        jobTitle: '',
        department: '',
        hireDate: new Date().toISOString().split('T')[0],
        employmentType: 'full_time',
        employmentStatus: 'active',
        salary: '',
        salaryCurrency: 'NGN',
        bankName: '',
        bankAccountNumber: '',
        bankAccountName: '',
        nin: '',
        bvn: '',
        taxId: '',
        pensionPin: '',
        pensionPfa: '',
        nhfNumber: '',
        nhisNumber: ''
      });
    }
    setActiveTab('basic');
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingEmployee(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        companyId: user.organizationId
      };

      if (editingEmployee) {
        await api.put(`/api/employees/${editingEmployee.id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/api/employees', payload);
        toast.success('Employee created successfully');
      }
      fetchEmployees();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save employee:', error);
      toast.error(error.response?.data?.error || 'Failed to save employee');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Terminate Employee',
      message: 'Are you sure you want to terminate this employee? This action will mark them as terminated.',
      confirmText: 'Terminate',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/employees/${id}`);
      toast.success('Employee terminated successfully');
      fetchEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
      toast.error('Failed to terminate employee');
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Terminate Employees',
      message: `Are you sure you want to terminate ${selectedCount} employee(s)?`,
      confirmText: 'Terminate All',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.delete(`/api/employees/${id}`))
      );
      toast.success(`${selectedCount} employee(s) terminated successfully`);
      clearSelection();
      fetchEmployees();
    } catch (error) {
      console.error('Failed to bulk delete:', error);
      toast.error('Failed to terminate some employees');
    }
  };

  const handleSendEssInvite = async (employee) => {
    if (!employee.email) {
      toast.error('Employee does not have an email address');
      return;
    }

    const confirmed = await confirm({
      title: 'Send ESS Invitation',
      message: `Send self-service portal invitation to ${employee.first_name} ${employee.last_name} at ${employee.email}?`,
      confirmText: 'Send Invite',
      variant: 'primary'
    });
    if (!confirmed) return;

    try {
      await api.post(`/api/employees/${employee.id}/ess/invite`);
      toast.success('ESS invitation sent successfully');
      fetchEmployees();
    } catch (error) {
      console.error('Failed to send ESS invite:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    }
  };

  const filteredEmployees = employees.filter(emp =>
    `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    emp.email?.toLowerCase().includes(search.toLowerCase()) ||
    emp.employee_number?.toLowerCase().includes(search.toLowerCase()) ||
    emp.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your company employees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setImportModalOpen(true)} className="btn-secondary">
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            Import Employees
          </button>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Employee
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, ID, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="probation">Probation</option>
              <option value="on_leave">On Leave</option>
              <option value="suspended">Suspended</option>
              <option value="terminated">Terminated</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-full">
            <thead>
              <tr>
                <th className="w-12">
                  <SelectCheckbox
                    checked={isAllSelected}
                    indeterminate={isPartiallySelected}
                    onChange={toggleAll}
                  />
                </th>
                <th>Employee</th>
                <th>Job Title</th>
                <th>Department</th>
                <th>Status</th>
                <th>Hire Date</th>
                <th>ESS</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEmployees.map((employee) => (
                <tr
                  key={employee.id}
                  className={`cursor-pointer hover:bg-gray-50 ${isSelected(employee.id) ? 'bg-accent-50' : ''}`}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <SelectCheckbox
                      checked={isSelected(employee.id)}
                      onChange={() => toggleItem(employee.id)}
                    />
                  </td>
                  <td onClick={() => handleOpenModal(employee)}>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-accent-100 rounded-full flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-accent-600" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                        <p className="text-xs text-gray-500">{employee.employee_number}</p>
                        {employee.email && (
                          <p className="text-xs text-gray-400">{employee.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td onClick={() => handleOpenModal(employee)}>{employee.job_title || '-'}</td>
                  <td onClick={() => handleOpenModal(employee)}>{employee.department || '-'}</td>
                  <td onClick={() => handleOpenModal(employee)}>
                    <span className={statusColors[employee.employment_status] || 'badge'}>
                      {statusLabels[employee.employment_status] || employee.employment_status}
                    </span>
                  </td>
                  <td onClick={() => handleOpenModal(employee)}>
                    {employee.hire_date ? new Date(employee.hire_date).toLocaleDateString() : '-'}
                  </td>
                  <td onClick={() => handleOpenModal(employee)}>
                    {employee.ess_activated_at ? (
                      <span className="badge-success">Active</span>
                    ) : employee.ess_invitation_sent_at ? (
                      <span className="badge-warning">Pending</span>
                    ) : (
                      <span className="badge">No Access</span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {!employee.ess_activated_at && employee.email && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSendEssInvite(employee); }}
                          className="p-1 text-gray-500 hover:text-accent-600"
                          title="Send ESS Invite"
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(employee.id); }}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Terminate"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    {search || statusFilter !== 'all' ? 'No employees found matching your criteria' : 'No employees yet. Add your first employee to get started.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BulkActions
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
      />

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingEmployee ? 'Edit Employee' : 'Add Employee'} size="xl">
        <form onSubmit={handleSubmit}>
          {/* Tabs */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'basic' ? 'border-b-2 border-accent-500 text-accent-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('employment')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'employment' ? 'border-b-2 border-accent-500 text-accent-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Employment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('compliance')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'compliance' ? 'border-b-2 border-accent-500 text-accent-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Nigeria Compliance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('banking')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'banking' ? 'border-b-2 border-accent-500 text-accent-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Banking
            </button>
          </div>

          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="form-input"
                    placeholder="Required for ESS access"
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="form-input"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Employment Tab */}
          {activeTab === 'employment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.jobTitle}
                    onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Department *</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Hire Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => setFormData({ ...formData, employmentType: e.target.value })}
                    className="form-input"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                    className="form-input"
                  >
                    <option value="active">Active</option>
                    <option value="probation">Probation</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Salary</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                    className="form-input"
                    placeholder="Monthly salary"
                  />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    value={formData.salaryCurrency}
                    onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value })}
                    className="form-input"
                  >
                    <option value="NGN">NGN - Nigerian Naira</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Nigeria Compliance Tab */}
          {activeTab === 'compliance' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Nigerian statutory compliance information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">NIN (National ID)</label>
                  <input
                    type="text"
                    value={formData.nin}
                    onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                    className="form-input"
                    placeholder="11-digit NIN"
                    maxLength={11}
                  />
                </div>
                <div>
                  <label className="form-label">BVN (Bank Verification)</label>
                  <input
                    type="text"
                    value={formData.bvn}
                    onChange={(e) => setFormData({ ...formData, bvn: e.target.value })}
                    className="form-input"
                    placeholder="11-digit BVN"
                    maxLength={11}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Tax ID (TIN)</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Pension PIN (RSA)</label>
                  <input
                    type="text"
                    value={formData.pensionPin}
                    onChange={(e) => setFormData({ ...formData, pensionPin: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Pension PFA</label>
                  <input
                    type="text"
                    value={formData.pensionPfa}
                    onChange={(e) => setFormData({ ...formData, pensionPfa: e.target.value })}
                    className="form-input"
                    placeholder="e.g. ARM Pension"
                  />
                </div>
                <div>
                  <label className="form-label">NHF Number</label>
                  <input
                    type="text"
                    value={formData.nhfNumber}
                    onChange={(e) => setFormData({ ...formData, nhfNumber: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">NHIS Number</label>
                  <input
                    type="text"
                    value={formData.nhisNumber}
                    onChange={(e) => setFormData({ ...formData, nhisNumber: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Banking Tab */}
          {activeTab === 'banking' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Bank details for payroll</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    className="form-input"
                    placeholder="e.g. Access Bank"
                  />
                </div>
                <div>
                  <label className="form-label">Account Number</label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    className="form-input"
                    placeholder="10-digit NUBAN"
                    maxLength={10}
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Account Name</label>
                <input
                  type="text"
                  value={formData.bankAccountName}
                  onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                  className="form-input"
                  placeholder="Name on bank account"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingEmployee ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Import Modal */}
      <EmployeeImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          fetchEmployees();
          toast.success('Employees imported successfully');
        }}
      />
    </div>
  );
}

export default Employees;
