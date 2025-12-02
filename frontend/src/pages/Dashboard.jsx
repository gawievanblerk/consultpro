import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import {
  BuildingOfficeIcon,
  UsersIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        api.get('/api/dashboard/stats'),
        api.get('/api/tasks/my')
      ]);

      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
      if (tasksRes.data.success) {
        setRecentTasks(tasksRes.data.data.slice(0, 5));
      }
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

  const statCards = [
    {
      name: 'Active Clients',
      value: stats?.clients?.active || 0,
      icon: BuildingOfficeIcon,
      color: 'bg-blue-500',
      href: '/clients'
    },
    {
      name: 'Active Leads',
      value: stats?.leads?.active || 0,
      icon: UsersIcon,
      color: 'bg-green-500',
      href: '/leads'
    },
    {
      name: 'Deployed Staff',
      value: stats?.staff?.deployed || 0,
      icon: UsersIcon,
      color: 'bg-purple-500',
      href: '/deployments'
    },
    {
      name: 'Outstanding Revenue',
      value: formatCurrency(stats?.finance?.outstanding),
      icon: BanknotesIcon,
      color: 'bg-accent-500',
      href: '/invoices'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your consulting operations
        </p>
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
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline summary */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-accent-500" />
              Sales Pipeline
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              {stats?.pipeline?.map((stage, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{stage.name}</span>
                      <span className="text-gray-500">{stage.count} leads</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-accent-500 h-2 rounded-full"
                        style={{ width: `${(stage.count / (stats.leads?.total || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(stage.value)}
                    </span>
                  </div>
                </div>
              ))}
              {(!stats?.pipeline || stats.pipeline.length === 0) && (
                <p className="text-center text-gray-500 py-4">No pipeline data available</p>
              )}
            </div>
            <Link
              to="/pipeline"
              className="mt-4 block text-center text-sm text-primary-900 hover:text-primary-700"
            >
              View full pipeline
            </Link>
          </div>
        </div>

        {/* Recent tasks */}
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

      {/* Revenue summary */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-accent-500" />
            Revenue Summary
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">This Month</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(stats?.finance?.this_month)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Last Month</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(stats?.finance?.last_month)}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">YTD Revenue</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(stats?.finance?.ytd)}
              </p>
            </div>
            <div className="text-center p-4 bg-success-50 rounded-lg">
              <p className="text-sm text-success-700">Collection Rate</p>
              <p className="text-xl font-semibold text-success-700">
                {stats?.finance?.collection_rate || 0}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
