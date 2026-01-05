import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  FunnelIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

const statusColors = {
  onboarding: 'badge-warning',
  active: 'badge-success',
  suspended: 'badge-warning',
  offboarded: 'badge'
};

const statusLabels = {
  onboarding: 'Onboarding',
  active: 'Active',
  suspended: 'Suspended',
  offboarded: 'Offboarded'
};

const industryOptions = [
  'Agriculture',
  'Banking & Finance',
  'Construction',
  'Education',
  'Energy & Utilities',
  'Healthcare',
  'Hospitality',
  'Information Technology',
  'Manufacturing',
  'Media & Entertainment',
  'Oil & Gas',
  'Real Estate',
  'Retail',
  'Telecommunications',
  'Transportation & Logistics',
  'Other'
];

const companyTypeOptions = [
  { value: 'llc', label: 'Limited Liability Company (LLC)' },
  { value: 'plc', label: 'Public Limited Company (PLC)' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'sole_proprietor', label: 'Sole Proprietorship' },
  { value: 'ngo', label: 'Non-Governmental Organization (NGO)' }
];

const wizardSteps = [
  { id: 'basic', title: 'Basic Info', description: 'Company name and type' },
  { id: 'contact', title: 'Contact', description: 'Contact and address' },
  { id: 'compliance', title: 'Compliance', description: 'Nigeria statutory' },
  { id: 'payroll', title: 'Payroll', description: 'Payment settings' }
];

function Companies() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { user, isConsultant } = useAuth();
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [formData, setFormData] = useState({
    legalName: '',
    tradingName: '',
    companyType: 'llc',
    industry: '',
    employeeCountRange: '',
    email: '',
    phone: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    tin: '',
    rcNumber: '',
    pensionCode: '',
    nhfCode: '',
    nhisCode: '',
    itfCode: '',
    nsitfCode: '',
    defaultCurrency: 'NGN',
    payFrequency: 'monthly',
    payrollCutoffDay: '25',
    payDay: '28'
  });

  useEffect(() => {
    fetchCompanies();
  }, [statusFilter]);

  const fetchCompanies = async () => {
    try {
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const response = await api.get('/api/companies', { params });
      if (response.data.success) {
        setCompanies(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch companies:', error);
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      legalName: '',
      tradingName: '',
      companyType: 'llc',
      industry: '',
      employeeCountRange: '',
      email: '',
      phone: '',
      website: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      tin: '',
      rcNumber: '',
      pensionCode: '',
      nhfCode: '',
      nhisCode: '',
      itfCode: '',
      nsitfCode: '',
      defaultCurrency: 'NGN',
      payFrequency: 'monthly',
      payrollCutoffDay: '25',
      payDay: '28'
    });
  };

  const handleOpenModal = (company = null) => {
    if (company) {
      setEditingCompany(company);
      setFormData({
        legalName: company.legal_name || '',
        tradingName: company.trading_name || '',
        companyType: company.company_type || 'llc',
        industry: company.industry || '',
        employeeCountRange: company.employee_count_range || '',
        email: company.email || '',
        phone: company.phone || '',
        website: company.website || '',
        addressLine1: company.address_line1 || '',
        addressLine2: company.address_line2 || '',
        city: company.city || '',
        state: company.state || '',
        postalCode: company.postal_code || '',
        tin: company.tin || '',
        rcNumber: company.rc_number || '',
        pensionCode: company.pension_code || '',
        nhfCode: company.nhf_code || '',
        nhisCode: company.nhis_code || '',
        itfCode: company.itf_code || '',
        nsitfCode: company.nsitf_code || '',
        defaultCurrency: company.default_currency || 'NGN',
        payFrequency: company.pay_frequency || 'monthly',
        payrollCutoffDay: String(company.payroll_cutoff_day || 25),
        payDay: String(company.pay_day || 28)
      });
    } else {
      setEditingCompany(null);
      resetForm();
    }
    setCurrentStep(0);
    setErrors({});
    setTouched({});
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingCompany(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        payrollCutoffDay: parseInt(formData.payrollCutoffDay),
        payDay: parseInt(formData.payDay)
      };

      if (editingCompany) {
        await api.put(`/api/companies/${editingCompany.id}`, payload);
        toast.success('Company updated successfully');
      } else {
        await api.post('/api/companies', payload);
        toast.success('Company created successfully');
      }
      fetchCompanies();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save company:', error);
      toast.error(error.response?.data?.error || 'Failed to save company');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Offboard Company',
      message: 'Are you sure you want to offboard this company? This action will mark the company as offboarded.',
      confirmText: 'Offboard',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/companies/${id}`);
      toast.success('Company offboarded successfully');
      fetchCompanies();
    } catch (error) {
      console.error('Failed to offboard company:', error);
      toast.error('Failed to offboard company');
    }
  };

  const handleActivate = async (company) => {
    const confirmed = await confirm({
      title: 'Activate Company',
      message: `Are you sure you want to activate "${company.legal_name}"? This will mark the company as active and complete onboarding.`,
      confirmText: 'Activate',
      variant: 'primary'
    });
    if (!confirmed) return;
    try {
      await api.put(`/api/companies/${company.id}`, { status: 'active' });
      toast.success('Company activated successfully');
      fetchCompanies();
    } catch (error) {
      console.error('Failed to activate company:', error);
      toast.error('Failed to activate company');
    }
  };

  const handleViewEmployees = (companyId) => {
    // Navigate to employees page with company filter
    navigate(`/dashboard/employees?company=${companyId}`);
  };

  // Validation rules per step
  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) { // Basic Info
      if (!formData.legalName.trim()) {
        newErrors.legalName = 'Legal name is required';
      }
      if (!formData.industry) {
        newErrors.industry = 'Industry is required';
      }
    }

    if (step === 1) { // Contact
      if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Invalid email format';
      }
      if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
        newErrors.website = 'Website must start with http:// or https://';
      }
    }

    // Steps 2 & 3 (Compliance & Payroll) are optional

    return newErrors;
  };

  const getStepErrors = (step) => {
    const stepErrors = validateStep(step);
    return Object.keys(stepErrors).length > 0 ? stepErrors : null;
  };

  const isStepComplete = (step) => {
    return !getStepErrors(step);
  };

  const handleNext = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      // Mark all fields as touched
      const touchedFields = {};
      Object.keys(stepErrors).forEach(key => touchedFields[key] = true);
      setTouched(prev => ({ ...prev, ...touchedFields }));
      return;
    }
    setErrors({});
    if (currentStep < wizardSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    setTouched({ ...touched, [field]: true });
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  const filteredCompanies = companies.filter(company =>
    company.legal_name?.toLowerCase().includes(search.toLowerCase()) ||
    company.trading_name?.toLowerCase().includes(search.toLowerCase()) ||
    company.industry?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isConsultant) {
    return (
      <div className="text-center py-12">
        <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h3>
        <p className="mt-1 text-sm text-gray-500">Only consultants can manage companies.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Client Companies</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your client companies and their employees</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Company
        </button>
      </div>

      <div className="card">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by company name or industry..."
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
              <option value="onboarding">Onboarding</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="offboarded">Offboarded</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <div key={company.id} className="card hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="h-12 w-12 flex-shrink-0 bg-primary-100 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-medium text-gray-900">{company.legal_name}</h3>
                      {company.trading_name && company.trading_name !== company.legal_name && (
                        <p className="text-sm text-gray-500">t/a {company.trading_name}</p>
                      )}
                    </div>
                  </div>
                  <span className={statusColors[company.status] || 'badge'}>
                    {statusLabels[company.status] || company.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {company.industry && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Industry:</span> {company.industry}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      {company.employee_count || 0} employees
                    </div>
                    {company.ess_enabled_count > 0 && (
                      <div className="flex items-center text-accent-600">
                        <CheckCircleIcon className="h-4 w-4 mr-1" />
                        {company.ess_enabled_count} ESS active
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(company)}
                      className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
                      title="Edit Company"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleViewEmployees(company.id)}
                      className="p-2 text-gray-500 hover:text-accent-600 hover:bg-gray-100 rounded"
                      title="View Employees"
                    >
                      <UserGroupIcon className="h-4 w-4" />
                    </button>
                    {company.status !== 'offboarded' && (
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded"
                        title="Offboard Company"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {company.status === 'onboarding' && (
                    <button
                      onClick={() => handleActivate(company)}
                      className="btn-primary btn-sm"
                    >
                      <CheckCircleIcon className="h-4 w-4 mr-1" />
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredCompanies.length === 0 && (
            <div className="col-span-full text-center py-12">
              <BuildingOfficeIcon className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">No companies found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {search || statusFilter !== 'all'
                  ? 'No companies match your search criteria'
                  : 'Get started by adding your first client company'}
              </p>
              {!search && statusFilter === 'all' && (
                <button onClick={() => handleOpenModal()} className="btn-primary mt-4">
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Add Company
                </button>
              )}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingCompany ? 'Edit Company' : 'Add Company'} size="xl">
        <form onSubmit={handleSubmit}>
          {/* Wizard Progress Steps */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              {wizardSteps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        index < currentStep
                          ? 'bg-accent-600 text-white'
                          : index === currentStep
                          ? 'bg-accent-100 text-accent-700 ring-2 ring-accent-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {index < currentStep ? (
                        <CheckCircleIcon className="h-5 w-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <p className={`text-xs font-medium ${index === currentStep ? 'text-accent-700' : 'text-gray-500'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
                    </div>
                  </div>
                  {index < wizardSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-accent-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error Summary */}
          {Object.keys(errors).length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Please fix the following errors:</p>
                  <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                    {Object.values(errors).filter(Boolean).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Legal Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(e) => handleFieldChange('legalName', e.target.value)}
                    className={`form-input ${errors.legalName && touched.legalName ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="e.g. ABC Limited"
                  />
                  {errors.legalName && touched.legalName && (
                    <p className="mt-1 text-xs text-red-500">{errors.legalName}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Trading Name</label>
                  <input
                    type="text"
                    value={formData.tradingName}
                    onChange={(e) => handleFieldChange('tradingName', e.target.value)}
                    className="form-input"
                    placeholder="e.g. ABC"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Company Type</label>
                  <select
                    value={formData.companyType}
                    onChange={(e) => handleFieldChange('companyType', e.target.value)}
                    className="form-input"
                  >
                    {companyTypeOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Industry <span className="text-red-500">*</span></label>
                  <select
                    value={formData.industry}
                    onChange={(e) => handleFieldChange('industry', e.target.value)}
                    className={`form-input ${errors.industry && touched.industry ? 'border-red-500 focus:ring-red-500' : ''}`}
                  >
                    <option value="">Select industry...</option>
                    {industryOptions.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                  {errors.industry && touched.industry && (
                    <p className="mt-1 text-xs text-red-500">{errors.industry}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="form-label">Employee Count Range</label>
                <select
                  value={formData.employeeCountRange}
                  onChange={(e) => handleFieldChange('employeeCountRange', e.target.value)}
                  className="form-input"
                >
                  <option value="">Select range...</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501+">501+ employees</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Contact & Address */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className={`form-input ${errors.email && touched.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="info@company.com"
                  />
                  {errors.email && touched.email && (
                    <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                  )}
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="form-input"
                    placeholder="+234 XXX XXX XXXX"
                  />
                </div>
                <div>
                  <label className="form-label">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleFieldChange('website', e.target.value)}
                    className={`form-input ${errors.website && touched.website ? 'border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="https://www.company.com"
                  />
                  {errors.website && touched.website && (
                    <p className="mt-1 text-xs text-red-500">{errors.website}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="form-label">Address Line 1</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
                  className="form-input"
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="form-label">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => handleFieldChange('addressLine2', e.target.value)}
                  className="form-input"
                  placeholder="Suite, floor, building"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Lagos"
                  />
                </div>
                <div>
                  <label className="form-label">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    className="form-input"
                    placeholder="e.g. Lagos State"
                  />
                </div>
                <div>
                  <label className="form-label">Postal Code</label>
                  <input
                    type="text"
                    value={formData.postalCode}
                    onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                    className="form-input"
                    placeholder="e.g. 100001"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Nigeria Compliance */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Nigerian statutory registration numbers (optional - can be added later)</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">TIN (Tax ID Number)</label>
                  <input
                    type="text"
                    value={formData.tin}
                    onChange={(e) => handleFieldChange('tin', e.target.value)}
                    className="form-input"
                    placeholder="Company TIN"
                  />
                </div>
                <div>
                  <label className="form-label">RC Number (CAC)</label>
                  <input
                    type="text"
                    value={formData.rcNumber}
                    onChange={(e) => handleFieldChange('rcNumber', e.target.value)}
                    className="form-input"
                    placeholder="e.g. RC123456"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Pension Employer Code</label>
                  <input
                    type="text"
                    value={formData.pensionCode}
                    onChange={(e) => handleFieldChange('pensionCode', e.target.value)}
                    className="form-input"
                    placeholder="PenCom employer code"
                  />
                </div>
                <div>
                  <label className="form-label">NHF Employer Code</label>
                  <input
                    type="text"
                    value={formData.nhfCode}
                    onChange={(e) => handleFieldChange('nhfCode', e.target.value)}
                    className="form-input"
                    placeholder="National Housing Fund code"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">NHIS Code</label>
                  <input
                    type="text"
                    value={formData.nhisCode}
                    onChange={(e) => handleFieldChange('nhisCode', e.target.value)}
                    className="form-input"
                    placeholder="Health insurance code"
                  />
                </div>
                <div>
                  <label className="form-label">ITF Code</label>
                  <input
                    type="text"
                    value={formData.itfCode}
                    onChange={(e) => handleFieldChange('itfCode', e.target.value)}
                    className="form-input"
                    placeholder="Industrial Training Fund"
                  />
                </div>
                <div>
                  <label className="form-label">NSITF Code</label>
                  <input
                    type="text"
                    value={formData.nsitfCode}
                    onChange={(e) => handleFieldChange('nsitfCode', e.target.value)}
                    className="form-input"
                    placeholder="Social Insurance Trust Fund"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payroll Settings */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500 mb-4">Configure payroll processing settings</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Default Currency</label>
                  <select
                    value={formData.defaultCurrency}
                    onChange={(e) => handleFieldChange('defaultCurrency', e.target.value)}
                    className="form-input"
                  >
                    <option value="NGN">NGN - Nigerian Naira</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="GBP">GBP - British Pound</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Pay Frequency</label>
                  <select
                    value={formData.payFrequency}
                    onChange={(e) => handleFieldChange('payFrequency', e.target.value)}
                    className="form-input"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Payroll Cutoff Day</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={formData.payrollCutoffDay}
                    onChange={(e) => handleFieldChange('payrollCutoffDay', e.target.value)}
                    className="form-input"
                    placeholder="Day of month (1-28)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Day of the month when payroll data is finalized</p>
                </div>
                <div>
                  <label className="form-label">Pay Day</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.payDay}
                    onChange={(e) => handleFieldChange('payDay', e.target.value)}
                    className="form-input"
                    placeholder="Day of month (1-31)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Day of the month when salaries are paid</p>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Navigation */}
          <div className="flex justify-between items-center pt-6 mt-6 border-t">
            <button
              type="button"
              onClick={currentStep === 0 ? handleCloseModal : handlePrevious}
              className="btn-secondary inline-flex items-center gap-2"
            >
              {currentStep === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ArrowLeftIcon className="h-4 w-4" />
                  Previous
                </>
              )}
            </button>

            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {wizardSteps.length}
            </div>

            {currentStep < wizardSteps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary inline-flex items-center gap-2"
              >
                Next
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="btn-primary inline-flex items-center gap-2"
              >
                {saving ? 'Saving...' : (
                  <>
                    <CheckCircleIcon className="h-4 w-4" />
                    {editingCompany ? 'Update Company' : 'Create Company'}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Companies;
