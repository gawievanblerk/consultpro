import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ChartBarIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'CRM', children: [
    { name: 'Clients', href: '/clients', icon: BuildingOfficeIcon },
    { name: 'Contacts', href: '/contacts', icon: UserGroupIcon },
    { name: 'Engagements', href: '/engagements', icon: BriefcaseIcon },
  ]},
  { name: 'Business Development', children: [
    { name: 'Leads', href: '/leads', icon: UsersIcon },
    { name: 'Pipeline', href: '/pipeline', icon: ChartBarIcon },
  ]},
  { name: 'HR Outsourcing', children: [
    { name: 'Staff Pool', href: '/staff', icon: UsersIcon },
    { name: 'Deployments', href: '/deployments', icon: ClipboardDocumentListIcon },
  ]},
  { name: 'Finance', children: [
    { name: 'Invoices', href: '/invoices', icon: DocumentTextIcon },
    { name: 'Payments', href: '/payments', icon: BanknotesIcon },
  ]},
  { name: 'Tasks', href: '/tasks', icon: CheckCircleIcon },
];

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (href) => location.pathname === href;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-primary-700 transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center h-16 px-6 bg-primary-800">
          <div className="bg-white rounded px-2 py-1 mr-3">
            <img
              src="/teamace-icon.png"
              alt="TeamACE"
              className="h-6"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <span className="text-white font-semibold text-lg">ConsultPro</span>
          <button
            className="lg:hidden ml-auto text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            item.children ? (
              <div key={item.name} className="mb-3">
                <div className="px-3 py-2 text-xs font-semibold text-primary-300 uppercase tracking-wider">
                  {item.name}
                </div>
                {item.children.map((child) => (
                  <Link
                    key={child.name}
                    to={child.href}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${isActive(child.href)
                        ? 'bg-accent-500 text-primary-900'
                        : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                      }
                    `}
                  >
                    <child.icon className="h-5 w-5 mr-3" />
                    {child.name}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive(item.href)
                    ? 'bg-accent-500 text-primary-900'
                    : 'text-primary-100 hover:bg-primary-800 hover:text-white'
                  }
                `}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            )
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-primary-800 p-4">
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-full bg-accent-500 flex items-center justify-center text-primary-800 font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-primary-300 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="ml-2 p-2 text-primary-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors flex items-center gap-1"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              <span className="text-xs">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center h-16 px-4 sm:px-6">
            <button
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex-1" />
            <div className="text-sm text-gray-500">
              Powered by Rozitech CC
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
