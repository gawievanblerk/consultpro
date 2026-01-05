import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  DocumentTextIcon,
  AcademicCapIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  BellAlertIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

function ComplianceDashboard() {
  const [stats, setStats] = useState(null);
  const [overdue, setOverdue] = useState({ policies: [], training: [] });
  const [loading, setLoading] = useState(true);
  const [sendingReminders, setSendingReminders] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, overdueRes] = await Promise.all([
        api.get('/api/compliance/dashboard'),
        api.get('/api/compliance/overdue?type=all')
      ]);
      setStats(dashboardRes.data.data);
      setOverdue({
        policies: overdueRes.data.data.overdue_policies || [],
        training: overdueRes.data.data.overdue_training || []
      });
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      showError('Failed to load compliance dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async (type, ids) => {
    try {
      setSendingReminders(true);
      await api.post('/api/compliance/send-reminders', {
        type,
        item_ids: ids
      });
      showSuccess('Reminders sent successfully');
    } catch (error) {
      console.error('Error sending reminders:', error);
      showError('Failed to send reminders');
    } finally {
      setSendingReminders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
      </div>
    );
  }

  const totalOverdue = overdue.policies.length + overdue.training.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Compliance Dashboard</h1>
          <p className="text-sm text-primary-500 mt-1">
            Monitor policy acknowledgments and training completion
          </p>
        </div>
        {totalOverdue > 0 && (
          <button
            onClick={() => {
              const policyIds = overdue.policies.map(p => p.policy_id);
              const trainingIds = overdue.training.map(t => t.assignment_id);
              if (policyIds.length > 0) handleSendReminders('policy', policyIds);
              if (trainingIds.length > 0) handleSendReminders('training', trainingIds);
            }}
            disabled={sendingReminders}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
          >
            <BellAlertIcon className="w-5 h-5" />
            {sendingReminders ? 'Sending...' : `Send All Reminders (${totalOverdue})`}
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Policies Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-primary-600">Policies</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary-900">{stats?.policies?.published || 0}</p>
            <p className="text-xs text-primary-500">
              Published ({stats?.policies?.draft || 0} draft)
            </p>
          </div>
        </div>

        {/* Training Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <AcademicCapIcon className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-primary-600">Training Modules</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary-900">{stats?.training?.published_modules || 0}</p>
            <p className="text-xs text-primary-500">
              {stats?.training?.mandatory_modules || 0} mandatory
            </p>
          </div>
        </div>

        {/* Completion Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-primary-600">Completions</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600">{stats?.assignments?.completed || 0}</p>
            <p className="text-xs text-primary-500">
              of {stats?.assignments?.total || 0} assignments
            </p>
          </div>
        </div>

        {/* Overdue Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <span className="text-sm font-medium text-primary-600">Overdue</span>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-red-600">{stats?.assignments?.overdue || 0}</p>
            <p className="text-xs text-primary-500">
              need attention
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Completion Rates */}
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-hidden">
          <div className="p-4 border-b border-primary-100 flex items-center justify-between">
            <h2 className="font-semibold text-primary-900 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5 text-primary-400" />
              Module Completion Rates
            </h2>
            <Link
              to="/dashboard/training-modules"
              className="text-sm text-accent-600 hover:text-accent-700"
            >
              View all
            </Link>
          </div>
          <div className="divide-y divide-primary-100">
            {stats?.module_completion_rates?.length > 0 ? (
              stats.module_completion_rates.map(module => (
                <div key={module.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-primary-900">{module.title}</span>
                      {module.is_mandatory && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">
                          Mandatory
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-accent-600">
                      {module.completion_rate}%
                    </span>
                  </div>
                  <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-500 rounded-full transition-all duration-300"
                      style={{ width: `${module.completion_rate}%` }}
                    />
                  </div>
                  <p className="text-xs text-primary-500 mt-1">
                    {module.completed} of {module.total_assigned} completed
                  </p>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-primary-500">
                No training modules yet
              </div>
            )}
          </div>
        </div>

        {/* Recent Completions */}
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 overflow-hidden">
          <div className="p-4 border-b border-primary-100 flex items-center justify-between">
            <h2 className="font-semibold text-primary-900 flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-primary-400" />
              Recent Completions
            </h2>
          </div>
          <div className="divide-y divide-primary-100">
            {stats?.recent_completions?.length > 0 ? (
              stats.recent_completions.map(completion => (
                <div key={completion.id} className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-900 truncate">
                      {completion.employee_name}
                    </p>
                    <p className="text-xs text-primary-500 truncate">
                      {completion.module_title}
                    </p>
                  </div>
                  <div className="text-right">
                    {completion.score !== null && (
                      <p className="text-sm font-semibold text-green-600">{completion.score}%</p>
                    )}
                    <p className="text-xs text-primary-400">
                      {new Date(completion.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-primary-500">
                No completions yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overdue Items */}
      {(overdue.policies.length > 0 || overdue.training.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 overflow-hidden">
          <div className="p-4 border-b border-red-200 bg-red-50">
            <h2 className="font-semibold text-red-900 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5" />
              Overdue Items ({totalOverdue})
            </h2>
          </div>

          {overdue.training.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-medium text-primary-700 mb-3">
                Overdue Training ({overdue.training.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-primary-500 border-b border-primary-100">
                      <th className="pb-2 font-medium">Employee</th>
                      <th className="pb-2 font-medium">Training</th>
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 font-medium">Due Date</th>
                      <th className="pb-2 font-medium">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50">
                    {overdue.training.slice(0, 10).map((item, index) => (
                      <tr key={index}>
                        <td className="py-2">
                          <p className="font-medium text-primary-900">{item.employee_name}</p>
                          <p className="text-xs text-primary-500">{item.employee_email}</p>
                        </td>
                        <td className="py-2">
                          <div className="flex items-center gap-1">
                            {item.is_mandatory && (
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                            {item.module_title}
                          </div>
                        </td>
                        <td className="py-2 text-primary-600">{item.company_name || '-'}</td>
                        <td className="py-2 text-primary-600">
                          {new Date(item.due_date).toLocaleDateString()}
                        </td>
                        <td className="py-2">
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                            {Math.floor(item.days_overdue)} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {overdue.training.length > 10 && (
                <p className="text-sm text-primary-500 mt-2">
                  +{overdue.training.length - 10} more overdue items
                </p>
              )}
            </div>
          )}

          {overdue.policies.length > 0 && (
            <div className="p-4 border-t border-primary-100">
              <h3 className="text-sm font-medium text-primary-700 mb-3">
                Overdue Policy Acknowledgments ({overdue.policies.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-primary-500 border-b border-primary-100">
                      <th className="pb-2 font-medium">Employee</th>
                      <th className="pb-2 font-medium">Policy</th>
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 font-medium">Deadline</th>
                      <th className="pb-2 font-medium">Days Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-primary-50">
                    {overdue.policies.slice(0, 10).map((item, index) => (
                      <tr key={index}>
                        <td className="py-2">
                          <p className="font-medium text-primary-900">{item.employee_name}</p>
                          <p className="text-xs text-primary-500">{item.employee_email}</p>
                        </td>
                        <td className="py-2">{item.policy_title}</td>
                        <td className="py-2 text-primary-600">{item.company_name || '-'}</td>
                        <td className="py-2 text-primary-600">
                          {new Date(item.acknowledgment_deadline).toLocaleDateString()}
                        </td>
                        <td className="py-2">
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                            {Math.floor(item.days_overdue)} days
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/dashboard/policies"
          className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-primary-100 hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-blue-100 rounded-lg">
            <DocumentTextIcon className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="font-medium text-primary-900">Manage Policies</p>
            <p className="text-sm text-primary-500">Upload and publish policies</p>
          </div>
        </Link>

        <Link
          to="/dashboard/training-modules"
          className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-primary-100 hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-purple-100 rounded-lg">
            <AcademicCapIcon className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-primary-900">Training Modules</p>
            <p className="text-sm text-primary-500">Create and manage training</p>
          </div>
        </Link>

        <Link
          to="/dashboard/employee-compliance"
          className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-primary-100 hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-green-100 rounded-lg">
            <UserGroupIcon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-primary-900">Employee Status</p>
            <p className="text-sm text-primary-500">View individual compliance</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default ComplianceDashboard;
