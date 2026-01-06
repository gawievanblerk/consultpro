import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeftIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function ESSLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState(null);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      if (result.requiresTenantSelection) {
        // Filter to only show employee accounts
        const employeeTenants = result.tenants.filter(
          t => t.userType === 'employee'
        );

        if (employeeTenants.length === 0) {
          setError('No employee account found. Please use the main portal to login.');
          setLoading(false);
          return;
        }

        if (employeeTenants.length === 1) {
          // Auto-select if only one employee account
          handleTenantSelect(employeeTenants[0]);
          return;
        }

        setTenants(employeeTenants);
        setLoading(false);
        return;
      }
      navigate('/dashboard');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleTenantSelect = async (tenant) => {
    setSelectedTenant(tenant.id);
    setLoading(true);
    setError('');

    const result = await login(email, password, tenant.id);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleBackToLogin = () => {
    setTenants(null);
    setSelectedTenant(null);
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Employee Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-800 to-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-600/20 via-primary-800/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <img
              src="/corehr-logo-light.svg"
              alt="CoreHR"
              className="h-12"
            />
            <span className="mt-2 block text-white/80 text-lg font-medium">Employee Portal</span>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-semibold text-white leading-tight tracking-tight mb-6">
              Your HR information, at your fingertips.
            </h1>
            <p className="text-primary-300 text-lg leading-relaxed">
              Access payslips, request leave, complete training, and manage your employment information securely.
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-primary-200">
                <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>View and download payslips</span>
              </div>
              <div className="flex items-center gap-3 text-primary-200">
                <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Submit leave requests</span>
              </div>
              <div className="flex items-center gap-3 text-primary-200">
                <div className="w-8 h-8 rounded-full bg-accent-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span>Complete assigned training</span>
              </div>
            </div>
          </div>

          <div className="text-primary-400 text-sm">
            Powered by Rozitech
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-accent-600/10" />
        <div className="absolute -right-12 top-1/4 w-64 h-64 rounded-full bg-accent-500/10" />
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <img
              src="/corehr-logo.svg"
              alt="CoreHR"
              className="h-10 mx-auto"
            />
            <p className="text-primary-600 mt-2">Employee Portal</p>
          </div>

          {tenants ? (
            // Company Selection
            <div>
              <button
                onClick={handleBackToLogin}
                className="flex items-center text-sm text-primary-600 hover:text-primary-800 mb-6"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to login
              </button>

              <h2 className="text-2xl font-semibold text-primary-900 mb-2">
                Select Your Company
              </h2>
              <p className="text-primary-500 mb-8">
                You have access to multiple companies. Select one to continue.
              </p>

              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleTenantSelect(tenant)}
                    disabled={loading && selectedTenant === tenant.id}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedTenant === tenant.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-primary-100 hover:border-primary-300 hover:bg-primary-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-primary-900">{tenant.name}</div>
                        <div className="text-sm text-primary-500">{tenant.companyName}</div>
                      </div>
                      {loading && selectedTenant === tenant.id && (
                        <div className="animate-spin h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // Login Form
            <div>
              <h2 className="text-2xl font-semibold text-primary-900 mb-2">
                Employee Sign In
              </h2>
              <p className="text-primary-500 mb-8">
                Enter your credentials to access your employee portal.
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-primary-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 hover:text-primary-800"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-primary-100 text-center">
                <p className="text-sm text-primary-500">
                  Not an employee?{' '}
                  <a
                    href="https://corehr.africa/login"
                    className="text-primary-600 hover:text-primary-800 font-medium"
                  >
                    Go to main portal
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
