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
  XMarkIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  CalculatorIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  TrophyIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';

// Navigation config with user_type filtering
// user_types: consultant (full access), company_admin (HR only), employee (ESS only)
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, userTypes: ['consultant', 'company_admin', 'employee'] },
  { name: 'CRM', userTypes: ['consultant'], children: [
    { name: 'Clients', href: '/dashboard/clients', icon: BuildingOfficeIcon },
    { name: 'Contacts', href: '/dashboard/contacts', icon: UserGroupIcon },
    { name: 'Engagements', href: '/dashboard/engagements', icon: BriefcaseIcon },
  ]},
  { name: 'Business Development', userTypes: ['consultant'], children: [
    { name: 'Leads', href: '/dashboard/leads', icon: UsersIcon },
    { name: 'Pipeline', href: '/dashboard/pipeline', icon: ChartBarIcon },
  ]},
  { name: 'HR Outsourcing', userTypes: ['consultant'], children: [
    { name: 'Staff Pool', href: '/dashboard/staff', icon: UsersIcon },
    { name: 'Deployments', href: '/dashboard/deployments', icon: ClipboardDocumentListIcon },
  ]},
  { name: 'Employees', userTypes: ['company_admin'], children: [
    { name: 'Staff', href: '/dashboard/staff', icon: UsersIcon },
  ]},
  { name: 'Leave Management', userTypes: ['consultant', 'company_admin'], children: [
    { name: 'Leave Requests', href: '/dashboard/leave-requests', icon: CalendarDaysIcon },
    { name: 'Leave Balances', href: '/dashboard/leave-balances', icon: ClockIcon },
  ]},
  { name: 'My Leave', userTypes: ['employee'], children: [
    { name: 'Request Leave', href: '/dashboard/leave-requests', icon: CalendarDaysIcon },
    { name: 'My Balances', href: '/dashboard/leave-balances', icon: ClockIcon },
  ]},
  { name: 'Finance', userTypes: ['consultant'], children: [
    { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentTextIcon },
    { name: 'Payments', href: '/dashboard/payments', icon: BanknotesIcon },
    { name: 'PAYE Calculator', href: '/dashboard/paye-calculator', icon: CalculatorIcon },
  ]},
  { name: 'Compliance', userTypes: ['consultant', 'company_admin'], children: [
    { name: 'Dashboard', href: '/dashboard/compliance', icon: ChartBarIcon },
    { name: 'Policies', href: '/dashboard/policies', icon: ClipboardDocumentCheckIcon },
    { name: 'Training', href: '/dashboard/training-modules', icon: AcademicCapIcon },
  ]},
  { name: 'My Compliance', userTypes: ['employee'], children: [
    { name: 'Policy Library', href: '/dashboard/policy-library', icon: BookOpenIcon },
    { name: 'My Training', href: '/dashboard/my-training', icon: AcademicCapIcon },
    { name: 'My Certificates', href: '/dashboard/my-certificates', icon: TrophyIcon },
  ]},
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckCircleIcon, userTypes: ['consultant', 'company_admin'] },
  { name: 'Settings', roles: ['admin'], userTypes: ['consultant', 'company_admin'], children: [
    { name: 'Users', href: '/dashboard/users', icon: UserCircleIcon },
  ]},
];

const getFilteredNavigation = (userRole, userType) => {
  return navigation.filter(item => {
    // Filter by user type first
    if (item.userTypes && !item.userTypes.includes(userType || 'consultant')) {
      return false;
    }
    // Then filter by role
    if (item.roles && !item.roles.includes(userRole)) {
      return false;
    }
    return true;
  });
};

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (href) => location.pathname === href;
  const filteredNav = getFilteredNavigation(user?.role, user?.userType);

  return (
    <div className="min-h-screen bg-primary-50/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-primary-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Clean white design */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-primary-100 transform transition-transform duration-300 ease-out flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-primary-100 flex-shrink-0">
          <div className="flex-1">
            <img
              src="/logo.svg"
              alt="CoreHR"
              className="h-12 w-auto"
            />
          </div>
          <button
            className="lg:hidden p-1.5 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto min-h-0">
          {filteredNav.map((item) => (
            item.children ? (
              <div key={item.name} className="mb-6">
                <div className="px-3 mb-2 text-[11px] font-semibold text-primary-400 uppercase tracking-widest">
                  {item.name}
                </div>
                <div className="space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      to={child.href}
                      className={`
                        flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                        ${isActive(child.href)
                          ? 'bg-accent-50 text-accent-700 border-l-2 border-accent-500'
                          : 'text-primary-600 hover:bg-primary-50 hover:text-primary-900'
                        }
                      `}
                    >
                      <child.icon className={`h-5 w-5 mr-3 ${isActive(child.href) ? 'text-accent-600' : 'text-primary-400'}`} />
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                  ${isActive(item.href)
                    ? 'bg-accent-50 text-accent-700 border-l-2 border-accent-500'
                    : 'text-primary-600 hover:bg-primary-50 hover:text-primary-900'
                  }
                `}
              >
                <item.icon className={`h-5 w-5 mr-3 ${isActive(item.href) ? 'text-accent-600' : 'text-primary-400'}`} />
                {item.name}
              </Link>
            )
          ))}
        </nav>

        {/* Help link */}
        <a
          href="/docs/manual.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center mx-4 px-3 py-2.5 text-sm font-medium text-primary-500 hover:bg-primary-50 hover:text-primary-700 rounded-lg transition-colors flex-shrink-0"
        >
          <QuestionMarkCircleIcon className="h-5 w-5 mr-3 text-primary-400" />
          User Manual
        </a>

        {/* User section */}
        <div className="border-t border-primary-100 p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-accent-100 flex items-center justify-center text-accent-700 font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary-900 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-primary-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-primary-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Sign out"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar - Minimal */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-primary-100">
          <div className="flex items-center h-16 px-4 sm:px-8">
            <button
              className="lg:hidden p-2 rounded-lg text-primary-500 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <a
              href="/docs/manual.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 text-sm text-primary-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors mr-4"
            >
              <QuestionMarkCircleIcon className="h-4 w-4" />
              <span className="hidden sm:inline font-medium">Help</span>
            </a>
            <div className="text-xs text-primary-400 font-medium tracking-wide">
              Powered by Rozitech
            </div>
          </div>
        </header>

        {/* Page content - More whitespace */}
        <main className="p-6 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
