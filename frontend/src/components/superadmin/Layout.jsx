import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/superadmin/dashboard', icon: HomeIcon },
  { name: 'Consultants', href: '/superadmin/consultants', icon: BuildingOffice2Icon },
  { name: 'Invitations', href: '/superadmin/invitations', icon: EnvelopeIcon },
  { name: 'Audit Logs', href: '/superadmin/audit', icon: ClipboardDocumentListIcon },
];

function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('superadmin_token');
    const storedUser = localStorage.getItem('superadmin');

    if (!token || !storedUser) {
      navigate('/superadmin/login');
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (e) {
      navigate('/superadmin/login');
    }
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem('superadmin_token');
    localStorage.removeItem('superadmin');
    navigate('/superadmin/login');
  };

  const isActive = (href) => location.pathname === href;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-danger-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50/30">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-primary-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-primary-900 transform transition-transform duration-300 ease-out flex flex-col
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-primary-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-danger-500 rounded-lg flex items-center justify-center">
              <ShieldCheckIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-white font-semibold">CoreHR</div>
              <div className="text-primary-400 text-xs">Admin Portal</div>
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 text-primary-400 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`
                flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive(item.href)
                  ? 'bg-danger-600 text-white'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
                }
              `}
            >
              <item.icon className={`h-5 w-5 mr-3 ${isActive(item.href) ? 'text-white' : 'text-primary-400'}`} />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-primary-700 p-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-danger-600 flex items-center justify-center text-white font-semibold text-sm">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-primary-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-primary-400 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
              title="Sign out"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-primary-100">
          <div className="flex items-center h-16 px-4 sm:px-8">
            <button
              className="lg:hidden p-2 rounded-lg text-primary-500 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-danger-50 text-danger-700 rounded-full text-xs font-medium">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              Super Admin
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 sm:p-8 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default SuperAdminLayout;
