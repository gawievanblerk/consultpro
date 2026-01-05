import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BuildingOffice2Icon,
  BuildingOfficeIcon,
  UsersIcon,
  EnvelopeIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

function SuperAdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('superadmin_token');
      const response = await api.get('/api/superadmin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-danger-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-100 rounded-lg text-danger-700">
        {error}
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Consultants',
      value: stats?.consultants?.total || 0,
      icon: BuildingOffice2Icon,
      color: 'bg-blue-500',
      href: '/superadmin/consultants'
    },
    {
      name: 'Active Consultants',
      value: stats?.consultants?.active || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Total Companies',
      value: stats?.companies?.total || 0,
      icon: BuildingOfficeIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Total Employees',
      value: stats?.employees?.total || 0,
      icon: UsersIcon,
      color: 'bg-accent-500'
    },
    {
      name: 'ESS Enabled',
      value: stats?.employees?.essEnabled || 0,
      icon: ArrowTrendingUpIcon,
      color: 'bg-indigo-500'
    },
    {
      name: 'Pending Invites',
      value: stats?.pendingInvitations || 0,
      icon: EnvelopeIcon,
      color: 'bg-warning-500',
      href: '/superadmin/invitations'
    }
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-primary-900">Platform Dashboard</h1>
        <p className="text-primary-500 mt-1">Overview of CoreHR platform metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl border border-primary-100 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-primary-500">{stat.name}</p>
                <p className="text-2xl font-semibold text-primary-900">{stat.value.toLocaleString()}</p>
              </div>
            </div>
            {stat.href && (
              <Link
                to={stat.href}
                className="mt-4 block text-sm text-accent-600 hover:text-accent-700 font-medium"
              >
                View details →
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Consultant Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-primary-100 p-6">
          <h2 className="text-lg font-semibold text-primary-900 mb-4">Consultants by Status</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-primary-600">Active</span>
              </div>
              <span className="font-medium text-primary-900">{stats?.consultants?.active || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm text-primary-600">Trial</span>
              </div>
              <span className="font-medium text-primary-900">{stats?.consultants?.trial || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm text-primary-600">Suspended</span>
              </div>
              <span className="font-medium text-primary-900">{stats?.consultants?.suspended || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-primary-100 p-6">
          <h2 className="text-lg font-semibold text-primary-900 mb-4">Consultants by Tier</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                <span className="text-sm text-primary-600">Starter</span>
              </div>
              <span className="font-medium text-primary-900">{stats?.consultants?.byTier?.starter || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-sm text-primary-600">Professional</span>
              </div>
              <span className="font-medium text-primary-900">{stats?.consultants?.byTier?.professional || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600"></div>
                <span className="text-sm text-primary-600">Enterprise</span>
              </div>
              <span className="font-medium text-primary-900">{stats?.consultants?.byTier?.enterprise || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-primary-100 p-6">
        <h2 className="text-lg font-semibold text-primary-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/superadmin/consultants"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors"
          >
            <BuildingOffice2Icon className="h-5 w-5" />
            Manage Consultants
          </Link>
          <Link
            to="/superadmin/invitations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <EnvelopeIcon className="h-5 w-5" />
            View Invitations
          </Link>
          <Link
            to="/superadmin/audit"
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <ClockIcon className="h-5 w-5" />
            Audit Logs
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminDashboard;
