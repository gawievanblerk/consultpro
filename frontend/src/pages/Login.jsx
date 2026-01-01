import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BuildingOfficeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

function Login() {
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
        // Show tenant selection step
        setTenants(result.tenants);
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
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-600/20 via-primary-800/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <img
              src="/logo.svg"
              alt="CoreHR"
              className="h-14 brightness-0 invert"
            />
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-semibold text-white leading-tight tracking-tight mb-6">
              Modern consulting management, simplified.
            </h1>
            <p className="text-primary-300 text-lg leading-relaxed">
              Streamline your HR operations, manage client relationships, and grow your business with our comprehensive platform.
            </p>
          </div>

          <div className="text-primary-400 text-sm">
            Powered by ConsultPro
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-accent-600/10" />
        <div className="absolute -right-12 top-1/4 w-64 h-64 rounded-full bg-accent-500/10" />
      </div>

      {/* Right side - Login form or Tenant Selection */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <img
              src="/logo.svg"
              alt="CoreHR"
              className="h-12 mx-auto"
            />
          </div>

          {/* Tenant Selection View */}
          {tenants ? (
            <>
              <button
                onClick={handleBackToLogin}
                className="flex items-center text-sm text-primary-500 hover:text-primary-700 mb-6 transition-colors"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-1" />
                Back to login
              </button>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-primary-900 tracking-tight">Select Organization</h2>
                <p className="mt-2 text-primary-500">
                  Your account is linked to multiple organizations. Please select one to continue.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-danger-50 border border-danger-100 rounded-lg text-danger-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleTenantSelect(tenant)}
                    disabled={loading && selectedTenant === tenant.id}
                    className={`
                      w-full p-4 border rounded-lg text-left transition-all duration-200
                      ${selectedTenant === tenant.id
                        ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-500'
                        : 'border-primary-200 hover:border-primary-400 hover:bg-primary-50'
                      }
                      ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-primary-900 truncate">{tenant.name}</p>
                        <p className="text-sm text-primary-500 capitalize">
                          {tenant.userType === 'consultant' ? 'Full Access' :
                           tenant.userType === 'company_admin' ? 'Company Admin' :
                           tenant.userType === 'tenant_user' ? 'Company Admin' :
                           tenant.userType === 'employee' ? 'Employee' :
                           tenant.role}
                        </p>
                      </div>
                      {loading && selectedTenant === tenant.id && (
                        <svg className="animate-spin h-5 w-5 text-accent-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Login Form View */
            <>
              <div className="mb-10">
                <h2 className="text-2xl font-semibold text-primary-900 tracking-tight">Welcome back</h2>
                <p className="mt-2 text-primary-500">Sign in to your account to continue</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-danger-50 border border-danger-100 rounded-lg text-danger-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-primary-700 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    placeholder="admin@teamace.ng"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-primary-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all duration-200 focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex items-center justify-end">
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 bg-accent-600 text-white font-medium rounded-lg transition-all duration-200 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              {/* Demo credentials */}
              <div className="mt-10 pt-8 border-t border-primary-100">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-accent-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-primary-700 mb-1">Demo Credentials</p>
                    <p className="text-sm text-primary-500">Email: admin@teamace.ng</p>
                    <p className="text-sm text-primary-500">Password: Demo123!</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Mobile footer */}
          <p className="lg:hidden mt-10 text-center text-sm text-primary-400">
            Powered by ConsultPro
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
