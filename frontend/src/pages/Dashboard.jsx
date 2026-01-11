import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api from '../utils/api';
import { useHelp } from '../context/HelpContext';
import { HelpButton } from '../components/HelpModal';
import { useAuth } from '../context/AuthContext';
import OnboardingWizard from '../components/OnboardingWizard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  BuildingOfficeIcon,
  UsersIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon,
  ArrowRightIcon,
  BuildingOffice2Icon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

function Dashboard() {
  const { showHelp } = useHelp();
  const { isConsultant, isEmployee } = useAuth();

  // Redirect employees to their onboarding wizard
  if (isEmployee) {
    return <Navigate to="/dashboard/my-onboarding-wizard" replace />;
  }

  const [data, setData] = useState(null);
  const [showWizard, setShowWizard] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/api/dashboard/consultant-overview');
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent-200 border-t-accent-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Chart configurations
  const chartColors = {
    primary: '#4f46e5',
    primaryLight: '#6366f1',
    accent: '#4f46e5',
    grid: '#f1f5f9',
    text: '#64748b'
  };

  const doughnutOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 16, font: { size: 11 }, color: chartColors.text }
      },
      tooltip: { backgroundColor: '#4f46e5', padding: 12, cornerRadius: 8 }
    },
    cutout: '65%'
  };

  const employeesByStatusData = {
    labels: data?.employeesByStatus?.map(e =>
      (e.status || 'Active').charAt(0).toUpperCase() + (e.status || 'active').slice(1).replace('_', ' ')
    ) || [],
    datasets: [{
      data: data?.employeesByStatus?.map(e => e.count) || [],
      backgroundColor: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#fbbf24', '#ef4444'],
      borderWidth: 0
    }]
  };

  const companiesByIndustryData = {
    labels: data?.companiesByIndustry?.map(c => c.industry) || [],
    datasets: [{
      label: 'Companies',
      data: data?.companiesByIndustry?.map(c => c.count) || [],
      backgroundColor: '#4f46e5',
      borderRadius: 4
    }]
  };

  const industryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#4f46e5', padding: 12, cornerRadius: 8 }
    },
    scales: {
      x: { grid: { color: chartColors.grid, drawBorder: false }, ticks: { color: chartColors.text } },
      y: { grid: { display: false }, ticks: { color: chartColors.text, font: { size: 11 } } }
    }
  };

  const statCards = [
    {
      name: 'Active Companies',
      value: data?.companies?.active || 0,
      subtext: `${data?.companies?.total || 0} total`,
      icon: BuildingOfficeIcon,
      href: '/dashboard/companies',
      color: 'accent'
    },
    {
      name: 'Total Employees',
      value: data?.employees?.total || 0,
      subtext: `Across all companies`,
      icon: UsersIcon,
      href: '/dashboard/employees',
      color: 'accent'
    },
    {
      name: 'ESS Enabled',
      value: data?.employees?.essEnabled || 0,
      subtext: `${data?.employees?.total > 0 ? Math.round((data?.employees?.essEnabled / data?.employees?.total) * 100) : 0}% of employees`,
      icon: CheckBadgeIcon,
      href: '/dashboard/employees',
      color: 'success'
    },
    {
      name: 'Onboarding',
      value: data?.companies?.onboarding || 0,
      subtext: 'Companies in setup',
      icon: ClockIcon,
      href: '/dashboard/companies',
      color: 'warning'
    }
  ];

  const getActivityIcon = (type) => {
    switch (type) {
      case 'company_created':
        return <BuildingOffice2Icon className="h-4 w-4" />;
      case 'employee_created':
      case 'employee_invited':
        return <UsersIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-primary-500">
            Overview of your HR consulting operations
          </p>
        </div>
        <HelpButton onClick={() => showHelp('dashboard')} />
      </div>

      {/* Onboarding Wizard for Consultants */}
      {isConsultant && showWizard && (
        <OnboardingWizard onDismiss={() => setShowWizard(false)} />
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="group bg-white rounded-xl border border-primary-100 p-6 transition-all duration-200 hover:border-primary-200 hover:shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-primary-500">{stat.name}</p>
                <p className="mt-2 text-3xl font-semibold text-primary-900 tracking-tight">{stat.value}</p>
                {stat.subtext && (
                  <p className="mt-1 text-xs text-primary-400">{stat.subtext}</p>
                )}
              </div>
              <div className={`p-2 rounded-lg transition-colors ${
                stat.color === 'success' ? 'bg-success-50 group-hover:bg-success-100' :
                stat.color === 'warning' ? 'bg-warning-50 group-hover:bg-warning-100' :
                'bg-accent-50 group-hover:bg-accent-100'
              }`}>
                <stat.icon className={`h-5 w-5 ${
                  stat.color === 'success' ? 'text-success-600' :
                  stat.color === 'warning' ? 'text-warning-600' :
                  'text-accent-600'
                }`} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-primary-100 p-6">
        <h2 className="font-semibold text-primary-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/companies/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Company
          </Link>
          <Link
            to="/dashboard/employees"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            <UserGroupIcon className="h-4 w-4" />
            Manage Employees
          </Link>
          <Link
            to="/dashboard/payroll"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 transition-colors"
          >
            <BuildingOfficeIcon className="h-4 w-4" />
            Run Payroll
          </Link>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees by Status */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <h2 className="font-semibold text-primary-900">Employees by Status</h2>
            <p className="mt-1 text-sm text-primary-400">Current distribution</p>
          </div>
          <div className="p-6">
            <div className="h-64">
              {data?.employeesByStatus?.length > 0 ? (
                <Doughnut data={employeesByStatusData} options={doughnutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-primary-400">
                  No employee data yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Companies by Industry */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <h2 className="font-semibold text-primary-900">Companies by Industry</h2>
            <p className="mt-1 text-sm text-primary-400">Distribution across sectors</p>
          </div>
          <div className="p-6">
            <div className="h-64">
              {data?.companiesByIndustry?.length > 0 ? (
                <Bar data={companiesByIndustryData} options={industryChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-primary-400">
                  No company data yet
                </div>
              )}
            </div>
            <Link
              to="/dashboard/companies"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors"
            >
              View all companies <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-primary-100">
        <div className="px-6 py-5 border-b border-primary-100">
          <h2 className="font-semibold text-primary-900">Recent Activity</h2>
          <p className="mt-1 text-sm text-primary-400">Latest updates across your companies</p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {data?.recentActivity?.length > 0 ? (
              data.recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <div className="flex-shrink-0 p-2 bg-accent-50 rounded-lg text-accent-600">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-900">
                      {activity.title}
                    </p>
                    {activity.companyName && (
                      <p className="text-xs text-primary-400 mt-0.5">{activity.companyName}</p>
                    )}
                    {activity.description && (
                      <p className="text-xs text-primary-500 mt-1">{activity.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-primary-400">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-primary-400">
                No recent activity. Start by adding a company!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
