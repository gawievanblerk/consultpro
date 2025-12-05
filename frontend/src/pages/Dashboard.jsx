import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useHelp } from '../context/HelpContext';
import { HelpButton } from '../components/HelpModal';
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
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Register Chart.js components
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
  const [stats, setStats] = useState(null);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
      </div>
    );
  }

  // Chart configurations
  const revenueChartData = {
    labels: revenueTrend.map(r => r.month),
    datasets: [{
      label: 'Revenue',
      data: revenueTrend.map(r => r.revenue),
      borderColor: '#0d2865',
      backgroundColor: 'rgba(13, 40, 101, 0.1)',
      fill: true,
      tension: 0.4
    }]
  };

  const revenueChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => formatCurrency(context.raw)
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value)
        }
      }
    }
  };

  const pipelineChartData = {
    labels: pipelineData.map(p => p.stage),
    datasets: [{
      label: 'Leads',
      data: pipelineData.map(p => parseInt(p.count)),
      backgroundColor: ['#0d2865', '#1e40af', '#3b82f6', '#60a5fa', '#93c5fd']
    }]
  };

  const pipelineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } }
  };

  const clientChartData = {
    labels: clientBreakdown.map(c => c.tier.charAt(0).toUpperCase() + c.tier.slice(1)),
    datasets: [{
      data: clientBreakdown.map(c => c.count),
      backgroundColor: ['#0d2865', '#41d8d1', '#f59e0b', '#ef4444', '#8b5cf6']
    }]
  };

  const taskChartData = {
    labels: taskStatus.map(t => t.status.charAt(0).toUpperCase() + t.status.slice(1).replace('_', ' ')),
    datasets: [{
      data: taskStatus.map(t => t.count),
      backgroundColor: ['#fbbf24', '#3b82f6', '#22c55e', '#ef4444']
    }]
  };

  const statCards = [
    {
      name: 'Active Clients',
      value: stats?.clients?.active || 0,
      total: stats?.clients?.total || 0,
      icon: BuildingOfficeIcon,
      color: 'bg-blue-500',
      href: '/clients'
    },
    {
      name: 'Open Leads',
      value: stats?.leads?.open || 0,
      icon: UsersIcon,
      color: 'bg-green-500',
      href: '/leads'
    },
    {
      name: 'Staff Deployed',
      value: staffUtilization?.deployed || 0,
      subtext: `${staffUtilization?.utilizationRate || 0}% utilization`,
      icon: UsersIcon,
      color: 'bg-purple-500',
      href: '/staff'
    },
    {
      name: 'Outstanding',
      value: formatCurrency(stats?.invoices?.pendingAmount),
      icon: BanknotesIcon,
      color: 'bg-accent-500',
      href: '/invoices'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your consulting operations
          </p>
        </div>
        <HelpButton onClick={() => showHelp('dashboard')} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.href}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className={`${stat.color} rounded-lg p-3`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  {stat.subtext && (
                    <p className="text-xs text-gray-400">{stat.subtext}</p>
                  )}
                  {stat.total && (
                    <p className="text-xs text-gray-400">of {stat.total} total</p>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-accent-500" />
              Revenue Trend (6 Months)
            </h2>
          </div>
          <div className="card-body">
            <div className="h-64">
              <Line data={revenueChartData} options={revenueChartOptions} />
            </div>
          </div>
        </div>

        {/* Pipeline Funnel */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-accent-500" />
              Pipeline Funnel
            </h2>
          </div>
          <div className="card-body">
            <div className="h-64">
              {pipelineData.length > 0 ? (
                <Bar data={pipelineChartData} options={pipelineChartOptions} />
              ) : (
                <p className="text-center text-gray-500 py-8">No pipeline data</p>
              )}
            </div>
            <Link
              to="/pipeline"
              className="mt-2 block text-center text-sm text-primary-900 hover:text-primary-700"
            >
              View full pipeline
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Distribution */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Client Distribution</h2>
          </div>
          <div className="card-body">
            <div className="h-48">
              {clientBreakdown.length > 0 ? (
                <Doughnut data={clientChartData} options={{ maintainAspectRatio: false }} />
              ) : (
                <p className="text-center text-gray-500 py-8">No client data</p>
              )}
            </div>
          </div>
        </div>

        {/* Task Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Task Status</h2>
          </div>
          <div className="card-body">
            <div className="h-48">
              {taskStatus.length > 0 ? (
                <Doughnut data={taskChartData} options={{ maintainAspectRatio: false }} />
              ) : (
                <p className="text-center text-gray-500 py-8">No task data</p>
              )}
            </div>
          </div>
        </div>

        {/* Staff Utilization */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Staff Utilization</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-primary-900">
                  {staffUtilization?.utilizationRate || 0}%
                </p>
                <p className="text-sm text-gray-500">Utilization Rate</p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-accent-500 h-4 rounded-full transition-all"
                  style={{ width: `${staffUtilization?.utilizationRate || 0}%` }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-green-600">{staffUtilization?.deployed || 0} Deployed</span>
                <span className="text-gray-500">{staffUtilization?.available || 0} Available</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Aging */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-warning-500" />
              Invoice Aging
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-green-700">Current</p>
                <p className="text-lg font-semibold text-green-700">
                  {invoiceAging?.current?.count || 0}
                </p>
                <p className="text-xs text-green-600">
                  {formatCurrency(invoiceAging?.current?.amount)}
                </p>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <p className="text-xs text-yellow-700">1-30 Days</p>
                <p className="text-lg font-semibold text-yellow-700">
                  {invoiceAging?.['1-30']?.count || 0}
                </p>
                <p className="text-xs text-yellow-600">
                  {formatCurrency(invoiceAging?.['1-30']?.amount)}
                </p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-700">31-60 Days</p>
                <p className="text-lg font-semibold text-orange-700">
                  {invoiceAging?.['31-60']?.count || 0}
                </p>
                <p className="text-xs text-orange-600">
                  {formatCurrency(invoiceAging?.['31-60']?.amount)}
                </p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-700">60+ Days</p>
                <p className="text-lg font-semibold text-red-700">
                  {invoiceAging?.['60+']?.count || 0}
                </p>
                <p className="text-xs text-red-600">
                  {formatCurrency(invoiceAging?.['60+']?.amount)}
                </p>
              </div>
            </div>
            <Link
              to="/invoices"
              className="mt-4 block text-center text-sm text-primary-900 hover:text-primary-700"
            >
              View all invoices
            </Link>
          </div>
        </div>

        {/* My Tasks */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2 text-accent-500" />
              My Tasks
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start p-3 rounded-lg hover:bg-gray-50"
                >
                  <div className={`
                    flex-shrink-0 w-2 h-2 mt-2 rounded-full
                    ${task.priority === 'urgent' ? 'bg-danger-500' :
                      task.priority === 'high' ? 'bg-warning-500' :
                      'bg-gray-400'}
                  `} />
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {task.title}
                    </p>
                    {task.client_name && (
                      <p className="text-xs text-gray-500">{task.client_name}</p>
                    )}
                  </div>
                  {task.due_date && (
                    <div className="ml-3 flex items-center text-xs text-gray-500">
                      <ClockIcon className="h-4 w-4 mr-1" />
                      {new Date(task.due_date).toLocaleDateString('en-NG', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              ))}
              {recentTasks.length === 0 && (
                <p className="text-center text-gray-500 py-4">No pending tasks</p>
              )}
            </div>
            <Link
              to="/tasks"
              className="mt-4 block text-center text-sm text-primary-900 hover:text-primary-700"
            >
              View all tasks
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
