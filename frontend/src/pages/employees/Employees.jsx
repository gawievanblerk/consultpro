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
  ArrowUpTrayIcon,
  PaperAirplaneIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircleIcon
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

// Field name to user-friendly label mapping
const fieldLabels = {
  firstName: 'First Name',
  lastName: 'Last Name',
  middleName: 'Middle Name',
  email: 'Email',
  phone: 'Phone',
  dateOfBirth: 'Date of Birth',
  gender: 'Gender',
  jobTitle: 'Job Title',
  department: 'Department',
  hireDate: 'Hire Date',
  employmentType: 'Employment Type',
  employmentStatus: 'Employment Status',
  salary: 'Salary',
  salaryCurrency: 'Currency',
  companyId: 'Company'
};

// Map which step each field belongs to (1-indexed)
const fieldToStep = {
  firstName: 1,
  lastName: 1,
  middleName: 1,
  email: 1,
  phone: 1,
  dateOfBirth: 1,
  gender: 1,
  jobTitle: 2,
  department: 2,
  hireDate: 2,
  employmentType: 2,
  employmentStatus: 2,
  salary: 2,
  salaryCurrency: 2,
  nin: 3,
  bvn: 3,
  taxId: 3,
  pensionPin: 3,
  pensionPfa: 3,
  nhfNumber: 3,
  nhisNumber: 3,
  bankName: 4,
  bankAccountNumber: 4,
  bankAccountName: 4
};

// Wizard steps configuration
const WIZARD_STEPS = [
  { id: 1, name: 'Basic Info', description: 'Personal details', requiredFields: ['firstName', 'lastName'] },
  { id: 2, name: 'Employment', description: 'Job details', requiredFields: [] },
  { id: 3, name: 'Compliance', description: 'Nigeria statutory', requiredFields: [] },
  { id: 4, name: 'Banking', description: 'Payment details', requiredFields: [] }
];

function Employees() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { user, isConsultant } = useAuth();
  const { selectedCompany, isCompanyMode } = useCompany();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
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
    departmentId: '',
    reportsTo: '',
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
    if (selectedCompany?.id) {
      fetchDepartments();
    }
  }, [statusFilter, selectedCompany]);

  const fetchDepartments = async () => {
    if (!selectedCompany?.id) return;
    try {
      const response = await api.get('/api/departments', {
        params: { company_id: selectedCompany.id }
      });
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

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
        departmentId: employee.department_id || '',
        reportsTo: employee.reports_to || '',
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
        departmentId: '',
        reportsTo: '',
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
    setCurrentStep(1);
    setFieldErrors({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setFieldErrors({});
    setCurrentStep(1);
    setModalOpen(false);
    setEditingEmployee(null);
  };

  // Client-side validation before API call
  const validateForm = () => {
    const errors = {};

    if (!formData.firstName?.trim()) {
      errors.firstName = 'First name is required';
    }
    if (!formData.lastName?.trim()) {
      errors.lastName = 'Last name is required';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    return errors;
  };

  // Parse API validation errors into field errors
  const parseApiErrors = (apiErrors) => {
    const errors = {};
    if (Array.isArray(apiErrors)) {
      apiErrors.forEach(err => {
        // express-validator returns 'path' or 'param' for field name
        const fieldName = err.path || err.param;
        if (fieldName) {
          errors[fieldName] = err.msg || 'Invalid value';
        }
      });
    }
    return errors;
  };

  // Get steps that have errors
  const getStepsWithErrors = () => {
    const steps = new Set();
    Object.keys(fieldErrors).forEach(field => {
      const step = fieldToStep[field];
      if (step) steps.add(step);
    });
    return steps;
  };

  // Validate current step before proceeding
  const validateCurrentStep = () => {
    const currentStepConfig = WIZARD_STEPS.find(s => s.id === currentStep);
    const errors = {};

    // Check required fields for current step
    if (currentStepConfig?.requiredFields) {
      currentStepConfig.requiredFields.forEach(field => {
        if (!formData[field]?.trim()) {
          errors[field] = `${fieldLabels[field] || field} is required`;
        }
      });
    }

    // Additional validation for step 1
    if (currentStep === 1) {
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        errors.email = 'Please enter a valid email address';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Go to next step
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < WIZARD_STEPS.length) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  // Go to previous step
  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFieldErrors({}); // Clear errors when going back
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    // Client-side validation first
    const clientErrors = validateForm();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      // Navigate to the first step with errors
      const firstErrorField = Object.keys(clientErrors)[0];
      const targetStep = fieldToStep[firstErrorField] || 1;
      setCurrentStep(targetStep);
      toast.error('Please fix the highlighted errors');
      return;
    }

    setSaving(true);
    try {
      // For new employees, use selected company; for edits, use existing company
      const companyId = editingEmployee?.company_id || selectedCompany?.id;

      if (!companyId) {
        setFieldErrors({ companyId: 'Please select a company first' });
        toast.error('Please select a company first');
        setSaving(false);
        return;
      }

      const payload = {
        ...formData,
        companyId
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

      // Parse validation errors from API
      if (error.response?.data?.errors) {
        const apiFieldErrors = parseApiErrors(error.response.data.errors);
        setFieldErrors(apiFieldErrors);

        // Navigate to the first step with errors
        const firstErrorField = Object.keys(apiFieldErrors)[0];
        if (firstErrorField) {
          const targetStep = fieldToStep[firstErrorField] || 1;
          setCurrentStep(targetStep);
        }

        // Build error message
        const errorCount = Object.keys(apiFieldErrors).length;
        const fieldNames = Object.keys(apiFieldErrors)
          .map(f => fieldLabels[f] || f)
          .slice(0, 3)
          .join(', ');
        toast.error(`Please fix ${errorCount} error(s): ${fieldNames}${errorCount > 3 ? '...' : ''}`);
      } else {
        toast.error(error.response?.data?.error || 'Failed to save employee');
      }
    } finally {
      setSaving(false);
    }
  };

  // Clear error for a specific field when user changes it
  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
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

  const handleBulkEssInvite = async () => {
    const eligibleEmployees = employees.filter(emp =>
      selectedIds.has(emp.id) && emp.email && !emp.ess_activated_at
    );

    if (eligibleEmployees.length === 0) {
      toast.error('No eligible employees selected. Employees must have an email and not already have ESS access.');
      return;
    }

    const confirmed = await confirm({
      title: 'Send ESS Invitations',
      message: `Send ESS portal invitations to ${eligibleEmployees.length} employee(s)?${selectedCount > eligibleEmployees.length ? ` (${selectedCount - eligibleEmployees.length} will be skipped - no email or already activated)` : ''}`,
      confirmText: 'Send Invitations',
      variant: 'primary'
    });
    if (!confirmed) return;

    try {
      const response = await api.post('/api/employees/ess/bulk-invite', {
        employee_ids: Array.from(selectedIds)
      });

      if (response.data.success) {
        const { sent, skipped, failed } = response.data.data;
        let message = `${sent} invitation(s) sent`;
        if (skipped > 0) message += `, ${skipped} skipped`;
        if (failed > 0) message += `, ${failed} failed`;
        toast.success(message);
        clearSelection();
        fetchEmployees();
      }
    } catch (error) {
      console.error('Failed to send bulk ESS invites:', error);
      toast.error(error.response?.data?.error || 'Failed to send invitations');
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

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      emp.email?.toLowerCase().includes(search.toLowerCase()) ||
      emp.employee_number?.toLowerCase().includes(search.toLowerCase()) ||
      emp.department?.toLowerCase().includes(search.toLowerCase());

    const matchesDepartment = departmentFilter === 'all' || emp.department_id === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

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
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="form-input"
            >
              <option value="all">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
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
        customActions={[
          {
            label: 'Send ESS Invites',
            icon: PaperAirplaneIcon,
            onClick: handleBulkEssInvite,
            className: 'bg-accent-600 hover:bg-accent-700'
          }
        ]}
      />

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingEmployee ? 'Edit Employee' : 'Add New Employee'} size="xl">
        <form onSubmit={handleSubmit}>
          {/* Wizard Step Indicator */}
          <div className="mb-6 px-2">
            <div className="flex items-center justify-between">
              {WIZARD_STEPS.map((step, idx) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                      ${currentStep > step.id ? 'bg-green-500 text-white' :
                        currentStep === step.id ? 'bg-accent-600 text-white ring-4 ring-accent-100' :
                        getStepsWithErrors().has(step.id) ? 'bg-red-100 text-red-600 border-2 border-red-300' :
                        'bg-gray-100 text-gray-400'}
                    `}>
                      {currentStep > step.id ? <CheckCircleIcon className="h-6 w-6" /> : step.id}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-medium ${currentStep === step.id ? 'text-accent-600' : 'text-gray-500'}`}>
                        {step.name}
                      </div>
                      <div className="text-xs text-gray-400 hidden sm:block">{step.description}</div>
                    </div>
                  </div>
                  {idx < WIZARD_STEPS.length - 1 && (
                    <div className={`w-12 sm:w-20 h-1 mx-2 mt-[-20px] rounded ${currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Banner for Current Step */}
          {Object.keys(fieldErrors).length > 0 && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Please fix the following to continue:</h4>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {Object.entries(fieldErrors).map(([field, error]) => (
                      <li key={field}>
                        <strong>{fieldLabels[field] || field}:</strong> {error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`form-label ${fieldErrors.firstName ? 'text-red-600' : ''}`}>First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    className={`form-input ${fieldErrors.firstName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {fieldErrors.firstName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.firstName}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Middle Name</label>
                  <input
                    type="text"
                    value={formData.middleName}
                    onChange={(e) => handleFieldChange('middleName', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className={`form-label ${fieldErrors.lastName ? 'text-red-600' : ''}`}>Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    className={`form-input ${fieldErrors.lastName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {fieldErrors.lastName && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.lastName}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`form-label ${fieldErrors.email ? 'text-red-600' : ''}`}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className={`form-input ${fieldErrors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Required for ESS access"
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
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
                    onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleFieldChange('gender', e.target.value)}
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

          {/* Step 2: Employment */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`form-label ${fieldErrors.jobTitle ? 'text-red-600' : ''}`}>Job Title *</label>
                  <input
                    type="text"
                    value={formData.jobTitle}
                    onChange={(e) => handleFieldChange('jobTitle', e.target.value)}
                    className={`form-input ${fieldErrors.jobTitle ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {fieldErrors.jobTitle && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.jobTitle}</p>
                  )}
                </div>
                <div>
                  <label className={`form-label ${fieldErrors.departmentId ? 'text-red-600' : ''}`}>Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => {
                      const deptId = e.target.value;
                      const dept = departments.find(d => d.id === deptId);
                      handleFieldChange('departmentId', deptId);
                      handleFieldChange('department', dept?.name || '');
                    }}
                    className={`form-input ${fieldErrors.departmentId ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="">Select a department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  {fieldErrors.departmentId && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.departmentId}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Reports To</label>
                  <select
                    value={formData.reportsTo}
                    onChange={(e) => handleFieldChange('reportsTo', e.target.value)}
                    className="form-input"
                  >
                    <option value="">Select manager</option>
                    {employees
                      .filter(emp => emp.id !== editingEmployee?.id)
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.first_name} {emp.last_name} - {emp.job_title || 'No title'}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={`form-label ${fieldErrors.hireDate ? 'text-red-600' : ''}`}>Hire Date *</label>
                  <input
                    type="date"
                    value={formData.hireDate}
                    onChange={(e) => handleFieldChange('hireDate', e.target.value)}
                    className={`form-input ${fieldErrors.hireDate ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  />
                  {fieldErrors.hireDate && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.hireDate}</p>
                  )}
                </div>
                <div>
                  <label className={`form-label ${fieldErrors.employmentType ? 'text-red-600' : ''}`}>Employment Type</label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) => handleFieldChange('employmentType', e.target.value)}
                    className={`form-input ${fieldErrors.employmentType ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                  {fieldErrors.employmentType && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.employmentType}</p>
                  )}
                </div>
                <div>
                  <label className={`form-label ${fieldErrors.employmentStatus ? 'text-red-600' : ''}`}>Status</label>
                  <select
                    value={formData.employmentStatus}
                    onChange={(e) => handleFieldChange('employmentStatus', e.target.value)}
                    className={`form-input ${fieldErrors.employmentStatus ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="active">Active</option>
                    <option value="probation">Probation</option>
                    <option value="on_leave">On Leave</option>
                    <option value="suspended">Suspended</option>
                    <option value="terminated">Terminated</option>
                  </select>
                  {fieldErrors.employmentStatus && (
                    <p className="mt-1 text-sm text-red-600">{fieldErrors.employmentStatus}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Salary</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleFieldChange('salary', e.target.value)}
                    className="form-input"
                    placeholder="Monthly salary"
                  />
                </div>
                <div>
                  <label className="form-label">Currency</label>
                  <select
                    value={formData.salaryCurrency}
                    onChange={(e) => handleFieldChange('salaryCurrency', e.target.value)}
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

          {/* Step 3: Nigeria Compliance */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Nigerian statutory compliance information</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">NIN (National ID)</label>
                  <input
                    type="text"
                    value={formData.nin}
                    onChange={(e) => handleFieldChange('nin', e.target.value)}
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
                    onChange={(e) => handleFieldChange('bvn', e.target.value)}
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
                    onChange={(e) => handleFieldChange('taxId', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">Pension PIN (RSA)</label>
                  <input
                    type="text"
                    value={formData.pensionPin}
                    onChange={(e) => handleFieldChange('pensionPin', e.target.value)}
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
                    onChange={(e) => handleFieldChange('pensionPfa', e.target.value)}
                    className="form-input"
                    placeholder="e.g. ARM Pension"
                  />
                </div>
                <div>
                  <label className="form-label">NHF Number</label>
                  <input
                    type="text"
                    value={formData.nhfNumber}
                    onChange={(e) => handleFieldChange('nhfNumber', e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label">NHIS Number</label>
                  <input
                    type="text"
                    value={formData.nhisNumber}
                    onChange={(e) => handleFieldChange('nhisNumber', e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Banking */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Bank details for payroll</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    value={formData.bankName}
                    onChange={(e) => handleFieldChange('bankName', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Access Bank"
                  />
                </div>
                <div>
                  <label className="form-label">Account Number</label>
                  <input
                    type="text"
                    value={formData.bankAccountNumber}
                    onChange={(e) => handleFieldChange('bankAccountNumber', e.target.value)}
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
                  onChange={(e) => handleFieldChange('bankAccountName', e.target.value)}
                  className="form-input"
                  placeholder="Name on bank account"
                />
              </div>
            </div>
          )}

          {/* Wizard Navigation Footer */}
          <div className="flex justify-between items-center pt-4 mt-6 border-t">
            <div>
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <button type="button" onClick={handleCloseModal} className="btn-secondary">
                  Cancel
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Step {currentStep} of {WIZARD_STEPS.length}
              </span>
            </div>

            <div>
              {currentStep < WIZARD_STEPS.length ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
                >
                  Next
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button type="submit" disabled={saving} className="btn-primary px-6">
                  {saving ? 'Saving...' : (editingEmployee ? 'Update Employee' : 'Create Employee')}
                </button>
              )}
            </div>
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
