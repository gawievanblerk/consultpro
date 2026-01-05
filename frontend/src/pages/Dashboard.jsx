import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useHelp } from '../context/HelpContext';
import { HelpButton } from '../components/HelpModal';
import { useAuth } from '../context/AuthContext';
import OnboardingWizard from '../components/OnboardingWizard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  BuildingOfficeIcon,
  UsersIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function Dashboard() {
  const { showHelp } = useHelp();
  const { isConsultant } = useAuth();
  const [stats, setStats] = useState(null);
  const [showWizard, setShowWizard] = useState(true);
  const [recentTasks, setRecentTasks] = useState([]);
  const [pipelineData, setPipelineData] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [clientBreakdown, setClientBreakdown] = useState([]);
  const [staffUtilization, setStaffUtilization] = useState(null);
  const [invoiceAging, setInvoiceAging] = useState(null);
  const [taskStatus, setTaskStatus] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [
        statsRes,
        tasksRes,
        pipelineRes,
        revenueTrendRes,
        clientBreakdownRes,
        staffUtilRes,
        agingRes,
        taskStatusRes
      ] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/tasks/my'),
        api.get('/api/dashboard/pipeline-summary'),
        api.get('/api/dashboard/revenue-trend'),
        api.get('/api/dashboard/client-breakdown'),
        api.get('/api/dashboard/staff-utilization'),
        api.get('/api/dashboard/invoice-aging'),
        api.get('/api/dashboard/task-status')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (tasksRes.data.success) setRecentTasks(tasksRes.data.data.slice(0, 5));
      if (pipelineRes.data.success) setPipelineData(pipelineRes.data.data);
      if (revenueTrendRes.data.success) setRevenueTrend(revenueTrendRes.data.data);
      if (clientBreakdownRes.data.success) setClientBreakdown(clientBreakdownRes.data.data);
      if (staffUtilRes.data.success) setStaffUtilization(staffUtilRes.data.data);
      if (agingRes.data.success) setInvoiceAging(agingRes.data.data);
      if (taskStatusRes.data.success) setTaskStatus(taskStatusRes.data.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent-200 border-t-accent-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Chart configurations with minimalist styling
  const chartColors = {
    primary: '#4f46e5',
    primaryLight: '#6366f1',
    accent: '#4f46e5',
    grid: '#f1f5f9',
    text: '#64748b'
  };

  const revenueChartData = {
    labels: revenueTrend.map(r => r.month),
    datasets: [{
      label: 'Revenue',
      data: revenueTrend.map(r => r.revenue),
      borderColor: chartColors.primary,
      backgroundColor: 'rgba(15, 23, 42, 0.05)',
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointBackgroundColor: chartColors.primary,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    }]
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#4f46e5',
        titleFont: { size: 12, weight: '500' },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => formatCurrency(context.raw)
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: chartColors.grid, drawBorder: false },
        ticks: {
          color: chartColors.text,
          font: { size: 11 },
          callback: (value) => formatCurrency(value)
        }
      },
      x: {
        grid: { display: false },
        ticks: { color: chartColors.text, font: { size: 11 } }
      }
    }
  };

  const pipelineChartData = {
    labels: pipelineData.map(p => p.stage),
    datasets: [{
      label: 'Leads',
      data: pipelineData.map(p => parseInt(p.count)),
      backgroundColor: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
      borderRadius: 4
    }]
  };

  const pipelineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#4f46e5',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: { grid: { color: chartColors.grid, drawBorder: false }, ticks: { color: chartColors.text } },
      y: { grid: { display: false }, ticks: { color: chartColors.text, font: { size: 11 } } }
    }
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

  const clientChartData = {
    labels: clientBreakdown.map(c => c.tier.charAt(0).toUpperCase() + c.tier.slice(1)),
    datasets: [{
      data: clientBreakdown.map(c => c.count),
      backgroundColor: ['#4f46e5', '#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'],
      borderWidth: 0
    }]
  };

  const taskChartData = {
    labels: taskStatus.map(t => t.status.charAt(0).toUpperCase() + t.status.slice(1).replace('_', ' ')),
    datasets: [{
      data: taskStatus.map(t => t.count),
      backgroundColor: ['#fbbf24', '#6366f1', '#4f46e5', '#ef4444'],
      borderWidth: 0
    }]
  };

  const statCards = [
    {
      name: 'Active Clients',
      value: stats?.clients?.active || 0,
      total: stats?.clients?.total || 0,
      icon: BuildingOfficeIcon,
      href: '/clients'
    },
    {
      name: 'Open Leads',
      value: stats?.leads?.open || 0,
      icon: UsersIcon,
      href: '/leads'
    },
    {
      name: 'Staff Deployed',
      value: staffUtilization?.deployed || 0,
      subtext: `${staffUtilization?.utilizationRate || 0}% utilization`,
      icon: UsersIcon,
      href: '/staff'
    },
    {
      name: 'Outstanding',
      value: formatCurrency(stats?.invoices?.pendingAmount),
      icon: BanknotesIcon,
      href: '/invoices'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">Dashboard</h1>
          <p className="mt-1 text-primary-500">
            Overview of your consulting operations
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
                {stat.total && (
                  <p className="mt-1 text-xs text-primary-400">of {stat.total} total</p>
                )}
              </div>
              <div className="p-2 bg-accent-50 rounded-lg group-hover:bg-accent-100 transition-colors">
                <stat.icon className="h-5 w-5 text-accent-600" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <div className="flex items-center gap-2">
              <ArrowTrendingUpIcon className="h-5 w-5 text-primary-400" />
              <h2 className="font-semibold text-primary-900">Revenue Trend</h2>
            </div>
            <p className="mt-1 text-sm text-primary-400">Last 6 months</p>
          </div>
          <div className="p-6">
            <div className="h-64">
              <Line data={revenueChartData} options={revenueChartOptions} />
            </div>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="h-5 w-5 text-primary-400" />
              <h2 className="font-semibold text-primary-900">Pipeline</h2>
            </div>
            <p className="mt-1 text-sm text-primary-400">Lead distribution by stage</p>
          </div>
          <div className="p-6">
            <div className="h-64">
              {pipelineData.length > 0 ? (
                <Bar data={pipelineChartData} options={pipelineChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-primary-400">No pipeline data</div>
              )}
            </div>
            <Link
              to="/pipeline"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors"
            >
              View pipeline <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Distribution */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <h2 className="font-semibold text-primary-900">Client Distribution</h2>
            <p className="mt-1 text-sm text-primary-400">By tier</p>
          </div>
          <div className="p-6">
            <div className="h-52">
              {clientBreakdown.length > 0 ? (
                <Doughnut data={clientChartData} options={doughnutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-primary-400">No client data</div>
              )}
            </div>
          </div>
        </div>

        {/* Task Status */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <h2 className="font-semibold text-primary-900">Task Status</h2>
            <p className="mt-1 text-sm text-primary-400">Current distribution</p>
          </div>
          <div className="p-6">
            <div className="h-52">
              {taskStatus.length > 0 ? (
                <Doughnut data={taskChartData} options={doughnutOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-primary-400">No task data</div>
              )}
            </div>
          </div>
        </div>

        {/* Staff Utilization */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <h2 className="font-semibold text-primary-900">Staff Utilization</h2>
            <p className="mt-1 text-sm text-primary-400">Current deployment</p>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-5xl font-semibold text-primary-900 tracking-tight">
                  {staffUtilization?.utilizationRate || 0}%
                </p>
                <p className="mt-2 text-sm text-primary-400">Utilization Rate</p>
              </div>
              <div>
                <div className="w-full bg-accent-100 rounded-full h-2">
                  <div
                    className="bg-accent-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${staffUtilization?.utilizationRate || 0}%` }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-sm">
                  <span className="text-accent-600 font-medium">{staffUtilization?.deployed || 0} Deployed</span>
                  <span className="text-primary-400">{staffUtilization?.available || 0} Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Aging */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-warning-500" />
              <h2 className="font-semibold text-primary-900">Invoice Aging</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-4 bg-accent-50 rounded-lg">
                <p className="text-xs font-medium text-accent-600 mb-1">Current</p>
                <p className="text-2xl font-semibold text-accent-700">
                  {invoiceAging?.current?.count || 0}
                </p>
                <p className="text-xs text-accent-600 mt-1">
                  {formatCurrency(invoiceAging?.current?.amount)}
                </p>
              </div>
              <div className="text-center p-4 bg-warning-50 rounded-lg">
                <p className="text-xs font-medium text-warning-600 mb-1">1-30 Days</p>
                <p className="text-2xl font-semibold text-warning-700">
                  {invoiceAging?.['1-30']?.count || 0}
                </p>
                <p className="text-xs text-warning-600 mt-1">
                  {formatCurrency(invoiceAging?.['1-30']?.amount)}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-xs font-medium text-orange-600 mb-1">31-60 Days</p>
                <p className="text-2xl font-semibold text-orange-700">
                  {invoiceAging?.['31-60']?.count || 0}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {formatCurrency(invoiceAging?.['31-60']?.amount)}
                </p>
              </div>
              <div className="text-center p-4 bg-danger-50 rounded-lg">
                <p className="text-xs font-medium text-danger-600 mb-1">60+ Days</p>
                <p className="text-2xl font-semibold text-danger-700">
                  {invoiceAging?.['60+']?.count || 0}
                </p>
                <p className="text-xs text-danger-600 mt-1">
                  {formatCurrency(invoiceAging?.['60+']?.amount)}
                </p>
              </div>
            </div>
            <Link
              to="/invoices"
              className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors"
            >
              View all invoices <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* My Tasks */}
        <div className="bg-white rounded-xl border border-primary-100">
          <div className="px-6 py-5 border-b border-primary-100">
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="h-5 w-5 text-primary-400" />
              <h2 className="font-semibold text-primary-900">My Tasks</h2>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  <div className={`
                    flex-shrink-0 w-2 h-2 mt-2 rounded-full
                    ${task.priority === 'urgent' ? 'bg-danger-500' :
                      task.priority === 'high' ? 'bg-warning-500' :
                      'bg-primary-300'}
                  `} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary-900 truncate">
                      {task.title}
                    </p>
                    {task.client_name && (
                      <p className="text-xs text-primary-400 mt-0.5">{task.client_name}</p>
                    )}
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1 text-xs text-primary-400">
                      <ClockIcon className="h-3.5 w-3.5" />
                      {new Date(task.due_date).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              ))}
              {recentTasks.length === 0 && (
                <div className="text-center py-8 text-primary-400">No pending tasks</div>
              )}
            </div>
            <Link
              to="/tasks"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-900 transition-colors"
            >
              View all tasks <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
