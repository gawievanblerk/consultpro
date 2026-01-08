import React, { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import api from '../utils/api';
import { useCompany } from '../context/CompanyContext';
import { useToast } from '../context/ToastContext';
import {
  XMarkIcon,
  ArrowDownTrayIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

// Column mapping for various Excel/CSV formats to our standard format
const COLUMN_MAPPINGS = {
  // Standard fields
  'first_name': 'first_name',
  'firstname': 'first_name',
  'first name': 'first_name',
  'last_name': 'last_name',
  'lastname': 'last_name',
  'last name': 'last_name',
  'surname': 'last_name',
  'middle_name': 'middle_name',
  'middlename': 'middle_name',
  'middle name': 'middle_name',
  'full_name': 'full_name',
  'fullname': 'full_name',
  'full name': 'full_name',
  'name': 'full_name',
  'email': 'email',
  'email_address': 'email',
  'email address': 'email',
  'phone': 'phone',
  'phone_number': 'phone',
  'phone number': 'phone',
  'mobile': 'phone',
  'mobile_number': 'phone',
  'date_of_birth': 'date_of_birth',
  'dateofbirth': 'date_of_birth',
  'date of birth': 'date_of_birth',
  'dob': 'date_of_birth',
  'birth_date': 'date_of_birth',
  'gender': 'gender',
  'sex': 'gender',
  'department': 'department',
  'dept': 'department',
  'job_title': 'job_title',
  'jobtitle': 'job_title',
  'job title': 'job_title',
  'position': 'job_title',
  'title': 'job_title',
  'role': 'job_title',
  'designation': 'job_title',
  'employment_type': 'employment_type',
  'employmenttype': 'employment_type',
  'employment type': 'employment_type',
  'emp_type': 'employment_type',
  'type': 'employment_type',
  'hire_date': 'hire_date',
  'hiredate': 'hire_date',
  'hire date': 'hire_date',
  'date_joined': 'hire_date',
  'datejoined': 'hire_date',
  'date joined': 'hire_date',
  'join_date': 'hire_date',
  'start_date': 'hire_date',
  'confirmation_date': 'confirmation_date',
  'confirmationdate': 'confirmation_date',
  'confirmation date': 'confirmation_date',
  'status': 'employment_status',
  'employment_status': 'employment_status',
  'emp_status': 'employment_status',
  'salary': 'salary',
  'basic_salary': 'salary',
  'monthly_salary': 'salary',
  // Nigeria compliance
  'nin': 'nin',
  'national_id': 'nin',
  'bvn': 'bvn',
  'bank_verification': 'bvn',
  'tax_id': 'tax_id',
  'taxid': 'tax_id',
  'tax id': 'tax_id',
  'tax id (tin)': 'tax_id',
  'tin': 'tax_id',
  'pension_pin': 'pension_pin',
  'pensionpin': 'pension_pin',
  'pension pin': 'pension_pin',
  'rsa_pin': 'pension_pin',
  'pension_pfa': 'pension_pfa',
  'pfa': 'pension_pfa',
  'nhf_number': 'nhf_number',
  'nhfnumber': 'nhf_number',
  'nhf number': 'nhf_number',
  'nhf_no': 'nhf_number',
  'nhf no': 'nhf_number',
  'nhis_number': 'nhis_number',
  'nhisnumber': 'nhis_number',
  'nhis': 'nhis_number',
  // Banking
  'bank_name': 'bank_name',
  'bankname': 'bank_name',
  'bank name': 'bank_name',
  'bank': 'bank_name',
  'bank_account_number': 'bank_account_number',
  'account_number': 'bank_account_number',
  'account number': 'bank_account_number',
  'account_no': 'bank_account_number',
  'bank_account_name': 'bank_account_name',
  'account_name': 'bank_account_name',
  'account name': 'bank_account_name',
};

// Split full name into first and last name
const splitFullName = (fullName) => {
  if (!fullName) return { first_name: '', last_name: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first_name: parts[0], last_name: '' };
  }
  if (parts.length === 2) {
    return { first_name: parts[0], last_name: parts[1] };
  }
  // For 3+ parts, first is first_name, last is last_name, middle is middle_name
  return {
    first_name: parts[0],
    middle_name: parts.slice(1, -1).join(' '),
    last_name: parts[parts.length - 1]
  };
};

// Normalize employment type values
const normalizeEmploymentType = (value) => {
  if (!value) return 'full_time';
  const lower = value.toString().toLowerCase().trim();
  if (lower.includes('full') || lower === 'ft') return 'full_time';
  if (lower.includes('part') || lower === 'pt') return 'part_time';
  if (lower.includes('contract')) return 'contract';
  if (lower.includes('intern')) return 'intern';
  return 'full_time';
};

// Normalize employment status values
const normalizeEmploymentStatus = (value) => {
  if (!value) return 'active';
  const lower = value.toString().toLowerCase().trim();
  if (lower === 'active' || lower === 'employed') return 'active';
  if (lower.includes('probation')) return 'probation';
  if (lower.includes('leave')) return 'on_leave';
  if (lower.includes('suspend')) return 'suspended';
  if (lower.includes('terminat') || lower.includes('exit') || lower === 'left') return 'terminated';
  return 'active';
};

// Parse date from various formats
const parseDate = (value) => {
  if (!value) return null;
  // If it's already a Date object (from Excel)
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  // If it's a number (Excel serial date)
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  // Try to parse string date
  const str = value.toString().trim();
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0];
  }
  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }
  // Try MM/DD/YYYY
  const mdyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    // Assume MM/DD/YYYY if month <= 12
    const month = parseInt(mdyMatch[1]);
    if (month <= 12) {
      return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`;
    }
  }
  return null;
};

// Clean phone number
const cleanPhoneNumber = (value) => {
  if (!value) return '';
  return value.toString().replace(/[\s\n\r]/g, '').trim();
};

// Map a row from any format to our standard format
const mapRowToStandard = (row) => {
  const mapped = {};

  // First pass: map known columns
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toString().toLowerCase().trim();
    const standardField = COLUMN_MAPPINGS[normalizedKey];
    if (standardField && value !== undefined && value !== null && value !== '') {
      mapped[standardField] = value;
    }
  }

  // Handle full_name splitting
  if (mapped.full_name && (!mapped.first_name || !mapped.last_name)) {
    const nameParts = splitFullName(mapped.full_name);
    if (!mapped.first_name) mapped.first_name = nameParts.first_name;
    if (!mapped.last_name) mapped.last_name = nameParts.last_name;
    if (!mapped.middle_name && nameParts.middle_name) mapped.middle_name = nameParts.middle_name;
  }
  delete mapped.full_name;

  // Normalize values
  if (mapped.employment_type) {
    mapped.employment_type = normalizeEmploymentType(mapped.employment_type);
  }
  if (mapped.employment_status) {
    mapped.employment_status = normalizeEmploymentStatus(mapped.employment_status);
  }
  if (mapped.hire_date) {
    mapped.hire_date = parseDate(mapped.hire_date);
  }
  if (mapped.date_of_birth) {
    mapped.date_of_birth = parseDate(mapped.date_of_birth);
  }
  if (mapped.confirmation_date) {
    mapped.confirmation_date = parseDate(mapped.confirmation_date);
  }
  if (mapped.phone) {
    mapped.phone = cleanPhoneNumber(mapped.phone);
  }

  // Trim string values
  for (const [key, value] of Object.entries(mapped)) {
    if (typeof value === 'string') {
      mapped[key] = value.trim();
    }
  }

  return mapped;
};

const STEPS = [
  { id: 1, name: 'Select Company', description: 'Choose target company' },
  { id: 2, name: 'Upload File', description: 'Upload CSV or Excel' },
  { id: 3, name: 'Preview Data', description: 'Review and validate' },
  { id: 4, name: 'Options', description: 'Configure import' },
  { id: 5, name: 'Results', description: 'Import complete' }
];

const REQUIRED_FIELDS = ['first_name', 'last_name'];

export default function EmployeeImportModal({ isOpen, onClose, onSuccess }) {
  const { companies, selectedCompany, isCompanyMode } = useCompany();
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  // State
  const [step, setStep] = useState(isCompanyMode ? 2 : 1);
  const [targetCompany, setTargetCompany] = useState(selectedCompany);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [parseErrors, setParseErrors] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [sendEssInvites, setSendEssInvites] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Reset state when modal closes
  const handleClose = () => {
    setStep(isCompanyMode ? 2 : 1);
    setTargetCompany(selectedCompany);
    setFile(null);
    setParsedData([]);
    setParseErrors([]);
    setValidationErrors([]);
    setSendEssInvites(false);
    setImporting(false);
    setImportResults(null);
    onClose();
  };

  // File handling
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = (selectedFile) => {
    const fileName = selectedFile.name.toLowerCase();
    const isCSV = fileName.endsWith('.csv');
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

    // Validate file type
    if (!isCSV && !isExcel) {
      toast.error('Please upload a CSV or Excel file (.csv, .xlsx, .xls)');
      return;
    }

    // Validate file size (5MB max for Excel, 2MB for CSV)
    const maxSize = isExcel ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error(`File size must be less than ${isExcel ? '5MB' : '2MB'}`);
      return;
    }

    setFile(selectedFile);

    if (isExcel) {
      parseExcel(selectedFile);
    } else {
      parseCSV(selectedFile);
    }
  };

  const parseExcel = (excelFile) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawData.length === 0) {
          toast.error('Excel file is empty');
          setFile(null);
          return;
        }

        if (rawData.length > 500) {
          toast.error('Maximum 500 employees per import. Please split your file.');
          setFile(null);
          return;
        }

        // Map to standard format
        const mappedData = rawData.map(row => mapRowToStandard(row));

        // Validate each row
        const rowErrors = [];
        mappedData.forEach((row, index) => {
          const rowNum = index + 2; // +2 for header row and 1-based indexing
          const missingFields = REQUIRED_FIELDS.filter(field => !row[field]?.toString().trim());

          if (missingFields.length > 0) {
            rowErrors.push({
              row: rowNum,
              error: `Missing required fields: ${missingFields.join(', ')}`,
              data: row
            });
          }

          // Validate email format if provided
          if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            rowErrors.push({
              row: rowNum,
              error: 'Invalid email format',
              data: row
            });
          }
        });

        setParsedData(mappedData);
        setParseErrors([]);
        setValidationErrors(rowErrors);

        // Show detected columns info
        const detectedFields = Object.keys(mappedData[0] || {}).filter(k => mappedData[0][k]);
        console.log('Detected fields:', detectedFields);
        toast.success(`Loaded ${mappedData.length} employees from Excel`);
      } catch (error) {
        toast.error('Failed to parse Excel file');
        console.error('Excel parse error:', error);
        setFile(null);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read Excel file');
      setFile(null);
    };
    reader.readAsArrayBuffer(excelFile);
  };

  const parseCSV = (csvFile) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rawData = results.data;
        const errors = results.errors;

        // Validate row count
        if (rawData.length > 500) {
          toast.error('Maximum 500 employees per import. Please split your file.');
          setFile(null);
          return;
        }

        if (rawData.length === 0) {
          toast.error('CSV file is empty');
          setFile(null);
          return;
        }

        // Map to standard format
        const mappedData = rawData.map(row => mapRowToStandard(row));

        // Validate each row
        const rowErrors = [];
        mappedData.forEach((row, index) => {
          const rowNum = index + 2; // +2 for header row and 1-based indexing
          const missingFields = REQUIRED_FIELDS.filter(field => !row[field]?.toString().trim());

          if (missingFields.length > 0) {
            rowErrors.push({
              row: rowNum,
              error: `Missing required fields: ${missingFields.join(', ')}`,
              data: row
            });
          }

          // Validate email format if provided
          if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
            rowErrors.push({
              row: rowNum,
              error: 'Invalid email format',
              data: row
            });
          }
        });

        setParsedData(mappedData);
        setParseErrors(errors);
        setValidationErrors(rowErrors);
      },
      error: (error) => {
        toast.error('Failed to parse CSV file');
        console.error('CSV parse error:', error);
      }
    });
  };

  const removeInvalidRows = () => {
    const invalidRowNums = new Set(validationErrors.map(e => e.row));
    const validData = parsedData.filter((_, index) => !invalidRowNums.has(index + 2));
    setParsedData(validData);
    setValidationErrors([]);
    toast.success(`Removed ${invalidRowNums.size} invalid row(s)`);
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/api/employees/import/template', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'employee_import_template.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download template');
      console.error('Template download error:', error);
    }
  };

  const handleImport = async () => {
    if (!targetCompany?.id) {
      toast.error('Please select a company');
      return;
    }

    setImporting(true);
    try {
      const response = await api.post('/api/employees/import', {
        companyId: targetCompany.id,
        employees: parsedData,
        sendEssInvites
      });

      setImportResults(response.data);
      setStep(5);

      if (response.data.data.success.length > 0) {
        onSuccess?.();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Import failed');
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  const validRowCount = parsedData.length - validationErrors.length;
  const employeesWithEmail = parsedData.filter(e => e.email?.trim()).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-primary-900/20 backdrop-blur-sm animate-fade-in"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Import Employees</h3>
              <p className="text-sm text-gray-500">
                Step {step} of {STEPS.length}: {STEPS[step - 1].description}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Progress */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {STEPS.map((s, idx) => (
                <div key={s.id} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${step > s.id ? 'bg-green-500 text-white' :
                      step === s.id ? 'bg-primary-600 text-white' :
                      'bg-gray-200 text-gray-500'}
                  `}>
                    {step > s.id ? <CheckCircleIcon className="h-5 w-5" /> : s.id}
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-12 lg:w-24 h-1 mx-2 ${step > s.id ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 min-h-[400px]">
            {/* Step 1: Company Selection */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Select Target Company</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Choose the company to import employees into.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                  <select
                    value={targetCompany?.id || ''}
                    onChange={(e) => {
                      const company = companies.find(c => c.id === e.target.value);
                      setTargetCompany(company);
                    }}
                    className="w-full form-input"
                  >
                    <option value="">Select a company...</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.trading_name || company.legal_name}
                      </option>
                    ))}
                  </select>
                </div>

                {targetCompany && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900">{targetCompany.trading_name || targetCompany.legal_name}</h5>
                    <p className="text-sm text-gray-500">{targetCompany.industry || 'No industry specified'}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Current employees: {targetCompany.employee_count || 0}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: File Upload */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Upload Employee File</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Upload a CSV or Excel file with employee data. Maximum 500 employees per import.
                  </p>
                </div>

                {/* Download Template */}
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download CSV Template
                </button>

                {/* Upload Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-lg p-8 text-center transition-colors
                    ${dragActive ? 'border-primary-500 bg-primary-50' :
                      file ? 'border-green-500 bg-green-50' :
                      'border-gray-300 hover:border-gray-400 cursor-pointer'}
                  `}
                >
                  {file ? (
                    <div className="space-y-2">
                      <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
                      <p className="font-medium text-gray-900">{file.name}</p>
                      <p className="text-sm text-gray-500">
                        {parsedData.length} employee(s) found
                      </p>
                      <button
                        onClick={() => {
                          setFile(null);
                          setParsedData([]);
                          setValidationErrors([]);
                        }}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <>
                      <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">
                        Drag and drop your file here, or{' '}
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                          browse
                        </button>
                      </p>
                      <p className="text-sm text-gray-400">CSV or Excel files (.csv, .xlsx, .xls)</p>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                {/* Column mapping info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <strong>Supported columns:</strong> Full Name (or First Name + Last Name), Email, Phone, Department, Job Title, Hire Date, Employment Type, Status, and Nigeria compliance fields (NIN, BVN, TIN, Pension PIN, NHF No).
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">Preview Data</h4>
                    <p className="text-sm text-gray-500">
                      Review the data before importing.
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-600">
                      <CheckCircleIcon className="h-4 w-4 inline mr-1" />
                      {validRowCount} valid
                    </span>
                    {validationErrors.length > 0 && (
                      <span className="text-red-600">
                        <ExclamationCircleIcon className="h-4 w-4 inline mr-1" />
                        {validationErrors.length} error(s)
                      </span>
                    )}
                  </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-medium text-red-800 flex items-center gap-2">
                          <ExclamationTriangleIcon className="h-5 w-5" />
                          Validation Errors
                        </h5>
                        <ul className="mt-2 text-sm text-red-700 space-y-1">
                          {validationErrors.slice(0, 5).map((err, idx) => (
                            <li key={idx}>Row {err.row}: {err.error}</li>
                          ))}
                          {validationErrors.length > 5 && (
                            <li>...and {validationErrors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                      <button
                        onClick={removeInvalidRows}
                        className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Remove invalid rows
                      </button>
                    </div>
                  </div>
                )}

                {/* Data Preview Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-64">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">#</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">First Name*</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Last Name*</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Email</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Job Title</th>
                          <th className="px-3 py-2 text-left font-medium text-gray-500">Department</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {parsedData.slice(0, 10).map((row, idx) => {
                          const hasError = validationErrors.some(e => e.row === idx + 2);
                          return (
                            <tr key={idx} className={hasError ? 'bg-red-50' : ''}>
                              <td className="px-3 py-2 text-gray-500">{idx + 1}</td>
                              <td className="px-3 py-2">{row.first_name || <span className="text-red-500">Missing</span>}</td>
                              <td className="px-3 py-2">{row.last_name || <span className="text-red-500">Missing</span>}</td>
                              <td className="px-3 py-2">{row.email || '-'}</td>
                              <td className="px-3 py-2">{row.job_title || '-'}</td>
                              <td className="px-3 py-2">{row.department || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 10 && (
                    <div className="px-3 py-2 bg-gray-50 text-sm text-gray-500 text-center">
                      Showing 10 of {parsedData.length} employees
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Options */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Import Options</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Configure how employees will be imported.
                  </p>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target Company</span>
                    <span className="font-medium">{targetCompany?.trading_name || targetCompany?.legal_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Employees to Import</span>
                    <span className="font-medium">{validRowCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Employees with Email</span>
                    <span className="font-medium">{employeesWithEmail}</span>
                  </div>
                </div>

                {/* ESS Invites Option */}
                {employeesWithEmail > 0 && (
                  <div className="border rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sendEssInvites}
                        onChange={(e) => setSendEssInvites(e.target.checked)}
                        className="mt-1 h-4 w-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Send ESS Invitations</span>
                        <p className="text-sm text-gray-500 mt-1">
                          Send self-service portal activation emails to {employeesWithEmail} employee(s) with email addresses.
                        </p>
                      </div>
                    </label>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <strong>Note:</strong> Employee numbers will be automatically generated. Duplicate emails or entries will be skipped.
                </div>
              </div>
            )}

            {/* Step 5: Results */}
            {step === 5 && importResults && (
              <div className="space-y-6">
                <div className="text-center">
                  {importResults.data.success.length > 0 ? (
                    <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  ) : (
                    <ExclamationCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  )}
                  <h4 className="text-xl font-medium text-gray-900 mb-2">
                    {importResults.data.success.length > 0 ? 'Import Complete!' : 'Import Failed'}
                  </h4>
                  <p className="text-gray-500">{importResults.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      {importResults.data.success.length}
                    </div>
                    <div className="text-sm text-green-700">Imported Successfully</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <div className="text-3xl font-bold text-red-600">
                      {importResults.data.errors.length}
                    </div>
                    <div className="text-sm text-red-700">Failed</div>
                  </div>
                </div>

                {/* Error Details */}
                {importResults.data.errors.length > 0 && (
                  <div className="border rounded-lg">
                    <div className="px-4 py-3 bg-gray-50 border-b font-medium text-sm">
                      Failed Rows
                    </div>
                    <div className="p-4 max-h-48 overflow-y-auto text-sm">
                      {importResults.data.errors.map((err, idx) => (
                        <div key={idx} className="py-2 border-b last:border-0">
                          <span className="text-gray-500">Row {err.row}:</span>{' '}
                          <span className="text-red-600">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sendEssInvites && importResults.data.success.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    ESS invitation emails have been queued for employees with email addresses.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div>
              {step > 1 && step < 5 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {step < 5 && (
                <button onClick={handleClose} className="btn-secondary">
                  Cancel
                </button>
              )}

              {step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  disabled={!targetCompany}
                  className="btn-primary disabled:opacity-50"
                >
                  Continue
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </button>
              )}

              {step === 2 && (
                <button
                  onClick={() => setStep(3)}
                  disabled={!file || parsedData.length === 0}
                  className="btn-primary disabled:opacity-50"
                >
                  Continue
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </button>
              )}

              {step === 3 && (
                <button
                  onClick={() => setStep(4)}
                  disabled={validRowCount === 0}
                  className="btn-primary disabled:opacity-50"
                >
                  Continue
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </button>
              )}

              {step === 4 && (
                <button
                  onClick={handleImport}
                  disabled={importing || validRowCount === 0}
                  className="btn-primary disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Importing...
                    </>
                  ) : (
                    `Import ${validRowCount} Employees`
                  )}
                </button>
              )}

              {step === 5 && (
                <button onClick={handleClose} className="btn-primary">
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
