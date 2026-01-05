import React, { useState, useEffect, useMemo } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import CompanySwitcher from './CompanySwitcher';
import CompanySidebar from './CompanySidebar';
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
  BookOpenIcon,
  ShieldExclamationIcon,
  StarIcon,
  UserMinusIcon,
  RocketLaunchIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

// Navigation config with user_type filtering
// user_types: consultant (full access), staff (deployed companies), company_admin (HR only), employee (ESS only)
const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, userTypes: ['consultant', 'staff', 'company_admin', 'employee'] },
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
  { name: 'Employees', userTypes: ['consultant', 'staff', 'company_admin'], children: [
    { name: 'Companies', href: '/dashboard/companies', icon: BuildingOfficeIcon, userTypes: ['consultant'] },
    { name: 'All Employees', href: '/dashboard/employees', icon: UsersIcon },
  ]},
  { name: 'Leave Management', userTypes: ['consultant', 'staff', 'company_admin'], children: [
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
  { name: 'Payroll', userTypes: ['consultant', 'staff', 'company_admin'], children: [
    { name: 'Payroll Runs', href: '/dashboard/payroll', icon: BanknotesIcon },
    { name: 'Remittances', href: '/dashboard/remittances', icon: DocumentTextIcon },
    { name: 'PAYE Calculator', href: '/dashboard/paye-calculator', icon: CalculatorIcon },
  ]},
  { name: 'My Payslips', href: '/dashboard/my-payslips', icon: BanknotesIcon, userTypes: ['employee'] },
  { name: 'Compliance', userTypes: ['consultant', 'staff', 'company_admin'], children: [
    { name: 'Dashboard', href: '/dashboard/compliance', icon: ChartBarIcon },
    { name: 'Employee Compliance', href: '/dashboard/employee-compliance', icon: UsersIcon },
    { name: 'Policies', href: '/dashboard/policies', icon: ClipboardDocumentCheckIcon },
    { name: 'Training', href: '/dashboard/training-modules', icon: AcademicCapIcon },
  ]},
  { name: 'My Compliance', userTypes: ['employee'], children: [
    { name: 'Policy Library', href: '/dashboard/policy-library', icon: BookOpenIcon },
    { name: 'My Training', href: '/dashboard/my-training', icon: AcademicCapIcon },
    { name: 'My Certificates', href: '/dashboard/my-certificates', icon: TrophyIcon },
  ]},
  { name: 'Employee Management', userTypes: ['consultant', 'staff', 'company_admin'], children: [
    { name: 'Onboarding', href: '/dashboard/onboarding-admin', icon: RocketLaunchIcon },
    { name: 'Probation', href: '/dashboard/probation', icon: ClockIcon },
    { name: 'Performance', href: '/dashboard/performance', icon: StarIcon },
    { name: 'Disciplinary', href: '/dashboard/disciplinary', icon: ShieldExclamationIcon },
    { name: 'Exit Management', href: '/dashboard/exit-management', icon: UserMinusIcon },
  ]},
  { name: 'My Onboarding', href: '/dashboard/my-onboarding', icon: RocketLaunchIcon, userTypes: ['employee'] },
  { name: 'Tasks', href: '/dashboard/tasks', icon: CheckCircleIcon, userTypes: ['consultant', 'staff', 'company_admin'] },
  { name: 'Settings', roles: ['admin'], userTypes: ['consultant', 'company_admin'], children: [
    { name: 'Users', href: '/dashboard/users', icon: UserCircleIcon },
    { name: 'Preferences', href: '/dashboard/preferences', icon: Cog6ToothIcon },
  ]},
];

const getFilteredNavigation = (userRole, userType) => {
  // Map tenant_user to company_admin for navigation purposes
  const effectiveUserType = userType === 'tenant_user' ? 'company_admin' : (userType || 'consultant');

  return navigation.filter(item => {
    // Filter by user type first
    if (item.userTypes && !item.userTypes.includes(effectiveUserType)) {
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
  const [expandedSection, setExpandedSection] = useState(null);
  const { user, logout, isStaff, isConsultant, activeCompanyId, switchCompany, getActiveCompany, isImpersonating, impersonation, endImpersonation } = useAuth();
  const { companies, selectedCompany, isCompanyMode, preferences, loading: companyLoading } = useCompany();
  const location = useLocation();

  const isActive = (href) => location.pathname === href;

  // Memoize filtered navigation to prevent unnecessary re-renders
  const filteredNav = useMemo(() =>
    getFilteredNavigation(user?.role, user?.userType),
    [user?.role, user?.userType]
  );

  // Toggle accordion section
  const toggleSection = (sectionName) => {
    setExpandedSection(prev => prev === sectionName ? null : sectionName);
  };

  // Close mobile sidebar when clicking a nav item
  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Auto-expand section containing active page - only on route changes
  useEffect(() => {
    const activeSection = filteredNav.find(item =>
      item.children?.some(child => location.pathname === child.href)
    );
    if (activeSection) {
      setExpandedSection(activeSection.name);
    }
  }, [location.pathname]); // Only depend on pathname, not filteredNav

  const activeCompany = getActiveCompany();
  const hasMultipleDeployments = isStaff && user?.deployedCompanies?.length > 1;
  const showCompanySwitcher = isConsultant && companies.length > 0;
  const useSidebarMode = showCompanySwitcher && preferences?.viewMode === 'sidebar';
  const useHeaderMode = showCompanySwitcher && preferences?.viewMode !== 'sidebar';

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
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
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

        {/* Company Switcher for Staff Users */}
        {isStaff && user?.deployedCompanies?.length > 0 && (
          <div className="px-4 py-3 border-b border-primary-100 flex-shrink-0">
            <label className="block text-xs font-medium text-primary-500 mb-1">Active Company</label>
            {hasMultipleDeployments ? (
              <select
                value={activeCompanyId || ''}
                onChange={(e) => switchCompany(e.target.value)}
                className="w-full text-sm bg-primary-50 border-0 rounded-lg py-2 px-3 text-primary-700 font-medium focus:ring-2 focus:ring-accent-500"
              >
                {user.deployedCompanies.map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-sm font-medium text-primary-700 bg-primary-50 rounded-lg py-2 px-3">
                {activeCompany?.company_name || 'No company assigned'}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto min-h-0">
          {filteredNav.map((item) => (
            item.children ? (
              <div key={item.name} className="mb-2">
                <button
                  onClick={() => toggleSection(item.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-[11px] font-semibold text-primary-500 uppercase tracking-widest hover:bg-primary-50 rounded-lg transition-colors"
                >
                  <span>{item.name}</span>
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${
                      expandedSection === item.name ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div className={`space-y-0.5 overflow-hidden transition-all duration-200 ${
                  expandedSection === item.name ? 'max-h-96 opacity-100 mt-1' : 'max-h-0 opacity-0'
                }`}>
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      to={child.href}
                      onClick={handleNavClick}
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
                onClick={handleNavClick}
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
              <p className="text-xs text-primary-500 truncate">{user?.organizationName}</p>
              <p className="text-xs text-primary-400 capitalize">
                {user?.userType === 'consultant' ? 'Full Access' :
                 user?.userType === 'staff' ? 'Staff (Deployed)' :
                 user?.userType === 'company_admin' ? 'Company Admin' :
                 user?.userType === 'tenant_user' ? 'Company Admin' :
                 user?.userType === 'employee' ? 'Employee' :
                 user?.role}
              </p>
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
      <div className={`lg:pl-72 flex ${useSidebarMode ? 'h-screen' : ''}`}>
        {/* Company Sidebar (Sidebar Mode) */}
        {useSidebarMode && (
          <div className="hidden lg:block flex-shrink-0 h-screen sticky top-0">
            <CompanySidebar />
          </div>
        )}

        <div className="flex-1 flex flex-col min-h-screen">
        {/* Impersonation Banner */}
        {isImpersonating && (
          <div className="bg-warning-500 text-warning-900 px-4 py-2 flex items-center justify-between z-40">
            <div className="flex items-center gap-2 text-sm font-medium">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span>
                Impersonating: <strong>{user?.firstName} {user?.lastName}</strong> ({user?.organizationName})
              </span>
              <span className="text-warning-700 text-xs">
                | By: {impersonation?.impersonatedBy?.name}
              </span>
            </div>
            <button
              onClick={endImpersonation}
              className="px-3 py-1 bg-warning-600 hover:bg-warning-700 text-white text-sm font-medium rounded transition-colors"
            >
              End Session
            </button>
          </div>
        )}

        {/* Top bar - Minimal */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-primary-100">
          <div className="flex items-center h-16 px-4 sm:px-8">
            <button
              className="lg:hidden p-2 rounded-lg text-primary-500 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>

            {/* Company Switcher for Consultants (Header Mode) */}
            {useHeaderMode && (
              <div className="ml-4">
                <CompanySwitcher />
              </div>
            )}

            {/* Mode indicator badge */}
            {showCompanySwitcher && isCompanyMode && (
              <div className="ml-3 hidden sm:flex items-center">
                <span className="px-2 py-1 text-xs font-medium bg-accent-100 text-accent-700 rounded-full">
                  {selectedCompany?.trading_name || selectedCompany?.legal_name || 'Company Mode'}
                </span>
              </div>
            )}

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
              Powered by ConsultPro | Rozitech
            </div>
          </div>
        </header>

        {/* Page content - More whitespace */}
        <main className="flex-1 p-6 sm:p-8 lg:p-10">
          <Outlet />
        </main>
        </div>
      </div>
    </div>
  );
}

export default Layout;
