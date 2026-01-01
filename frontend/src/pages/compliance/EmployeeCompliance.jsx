import React, { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  AcademicCapIcon,
  DocumentCheckIcon,
  UserIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';

function EmployeeCompliance() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedEmployee, setExpandedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const { showToast } = useToast();

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/api/compliance/employees?${params.toString()}`);
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      showToast('Failed to load employee compliance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchEmployees();
  };

  const fetchEmployeeDetails = async (employeeId) => {
    if (expandedEmployee === employeeId) {
      setExpandedEmployee(null);
      setEmployeeDetails(null);
      return;
    }

    try {
      setDetailsLoading(true);
      setExpandedEmployee(employeeId);
      const response = await api.get(`/api/compliance/employees/${employeeId}`);
      if (response.data.success) {
        setEmployeeDetails(response.data.data);
      }
    } catch (error) {
      showToast('Failed to load employee details', 'error');
      setExpandedEmployee(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'compliant':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Compliant
          </span>
        );
      case 'overdue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            Overdue
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-4 h-4 mr-1" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const ProgressBar = ({ percent, color = 'primary' }) => (
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div
        className={`h-2.5 rounded-full ${
          color === 'green' ? 'bg-green-500' :
          color === 'yellow' ? 'bg-yellow-500' :
          color === 'red' ? 'bg-red-500' :
          'bg-primary-600'
        }`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Employee Compliance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track policy acknowledgments and training completion for each employee
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
            </div>
          </form>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full sm:w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option value="">All Statuses</option>
            <option value="compliant">Compliant</option>
            <option value="in_progress">In Progress</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Compliant</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {employees.filter(e => e.overall_status === 'compliant').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Progress</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {employees.filter(e => e.overall_status === 'in_progress').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {employees.filter(e => e.overall_status === 'overdue').length}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Employee List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading...</p>
          </div>
        ) : employees.length === 0 ? (
          <div className="p-8 text-center">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No employees found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No employees match your search criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {employees.map((employee) => (
              <div key={employee.id}>
                <div
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => fetchEmployeeDetails(employee.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 font-medium text-sm">
                          {employee.first_name?.[0]}{employee.last_name?.[0]}
                        </span>
                      </div>
                      <div className="ml-4 min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {employee.first_name} {employee.last_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {employee.job_title} {employee.department ? `- ${employee.department}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                      {/* Policies */}
                      <div className="text-center">
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                          <DocumentCheckIcon className="w-4 h-4 mr-1" />
                          Policies
                        </div>
                        <div className="w-24">
                          <ProgressBar
                            percent={employee.policy_compliance_percent}
                            color={employee.policy_compliance_percent === 100 ? 'green' : 'yellow'}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {employee.policies_acknowledged}/{employee.total_policies_required}
                        </p>
                      </div>

                      {/* Training */}
                      <div className="text-center">
                        <div className="flex items-center text-xs text-gray-500 mb-1">
                          <AcademicCapIcon className="w-4 h-4 mr-1" />
                          Training
                        </div>
                        <div className="w-24">
                          <ProgressBar
                            percent={employee.training_compliance_percent}
                            color={employee.training_overdue > 0 ? 'red' : employee.training_compliance_percent === 100 ? 'green' : 'yellow'}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {employee.training_completed}/{employee.total_training_assigned}
                          {employee.training_overdue > 0 && (
                            <span className="text-red-500 ml-1">({employee.training_overdue} overdue)</span>
                          )}
                        </p>
                      </div>

                      {/* Certificates */}
                      <div className="text-center w-16">
                        <div className="text-xs text-gray-500 mb-1">Certs</div>
                        <p className="text-lg font-semibold text-gray-900">{employee.certificates_earned}</p>
                      </div>
                    </div>

                    <div className="ml-4 flex items-center space-x-4">
                      {getStatusBadge(employee.overall_status)}
                      {expandedEmployee === employee.id ? (
                        <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="md:hidden mt-3 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Policies</p>
                      <p className="text-sm font-medium">{employee.policies_acknowledged}/{employee.total_policies_required}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Training</p>
                      <p className="text-sm font-medium">{employee.training_completed}/{employee.total_training_assigned}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Certs</p>
                      <p className="text-sm font-medium">{employee.certificates_earned}</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedEmployee === employee.id && (
                  <div className="bg-gray-50 border-t border-gray-200 p-4">
                    {detailsLoading ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                      </div>
                    ) : employeeDetails ? (
                      <div className="space-y-6">
                        {/* Policy Acknowledgments */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <DocumentCheckIcon className="w-5 h-5 mr-2 text-gray-400" />
                            Policy Acknowledgments
                          </h4>
                          {employeeDetails.policies.length === 0 ? (
                            <p className="text-sm text-gray-500">No policies require acknowledgment.</p>
                          ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Policy</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deadline</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {employeeDetails.policies.map((policy) => (
                                    <tr key={policy.id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">{policy.title}</td>
                                      <td className="px-4 py-2 text-sm text-gray-500">{policy.category_name || '-'}</td>
                                      <td className="px-4 py-2 text-sm text-gray-500">
                                        {policy.acknowledgment_deadline
                                          ? new Date(policy.acknowledgment_deadline).toLocaleDateString()
                                          : '-'}
                                      </td>
                                      <td className="px-4 py-2">
                                        {policy.status === 'acknowledged' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                                            Acknowledged
                                          </span>
                                        ) : policy.status === 'overdue' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                            <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                                            Overdue
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <ClockIcon className="w-3 h-3 mr-1" />
                                            Pending
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Training Assignments */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <AcademicCapIcon className="w-5 h-5 mr-2 text-gray-400" />
                            Training Assignments
                          </h4>
                          {employeeDetails.training.length === 0 ? (
                            <p className="text-sm text-gray-500">No training assigned.</p>
                          ) : (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Module</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {employeeDetails.training.map((training) => (
                                    <tr key={training.assignment_id}>
                                      <td className="px-4 py-2 text-sm text-gray-900">
                                        {training.module_title}
                                        {training.is_mandatory && (
                                          <span className="ml-1 text-xs text-red-500">*</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-500">
                                        {training.due_date
                                          ? new Date(training.due_date).toLocaleDateString()
                                          : '-'}
                                      </td>
                                      <td className="px-4 py-2">
                                        <div className="flex items-center">
                                          <div className="w-16 mr-2">
                                            <ProgressBar percent={training.progress_percent} />
                                          </div>
                                          <span className="text-xs text-gray-500">{training.progress_percent}%</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-sm text-gray-500">
                                        {training.score !== null ? `${training.score}%` : '-'}
                                      </td>
                                      <td className="px-4 py-2">
                                        {training.status === 'completed' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                                            Completed
                                          </span>
                                        ) : training.status === 'in_progress' ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                            <ClockIcon className="w-3 h-3 mr-1" />
                                            In Progress
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            Pending
                                          </span>
                                        )}
                                        {training.certificate_code && (
                                          <span className="ml-2 text-xs text-primary-600">
                                            Cert: {training.certificate_code}
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Certificates */}
                        {employeeDetails.certificates.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Earned Certificates</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {employeeDetails.certificates.map((cert) => (
                                <div key={cert.id} className="bg-white border border-gray-200 rounded-lg p-3">
                                  <p className="text-sm font-medium text-gray-900">{cert.module_title}</p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Issued: {new Date(cert.issue_date || cert.created_at).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-primary-600 mt-1">
                                    Code: {cert.verification_code}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Failed to load details.</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeCompliance;
