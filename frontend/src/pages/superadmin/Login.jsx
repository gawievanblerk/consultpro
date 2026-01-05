import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/superadmin/auth/login', { email, password });

      if (response.data.success) {
        localStorage.setItem('superadmin_token', response.data.token);
        localStorage.setItem('superadmin', JSON.stringify(response.data.superadmin));
        navigate('/superadmin/dashboard');
      } else {
        setError(response.data.error || 'Login failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-danger-600/20 via-primary-800/50 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-danger-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-white text-xl font-semibold">CoreHR Admin</span>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-semibold text-white leading-tight tracking-tight mb-6">
              Platform Administration
            </h1>
            <p className="text-primary-300 text-lg leading-relaxed">
              Manage HR consultants, monitor platform health, and oversee all tenant operations from this secure dashboard.
            </p>
          </div>

          <div className="text-primary-400 text-sm">
            Rozitech Platform
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-24 -bottom-24 w-96 h-96 rounded-full bg-danger-600/10" />
        <div className="absolute -right-12 top-1/4 w-64 h-64 rounded-full bg-danger-500/10" />
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <div className="flex items-center justify-center gap-3">
              <div className="h-10 w-10 bg-danger-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span className="text-primary-900 text-xl font-semibold">CoreHR Admin</span>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-2xl font-semibold text-primary-900 tracking-tight">Super Admin Access</h2>
            <p className="mt-2 text-primary-500">Sign in with your administrator credentials</p>
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
                placeholder="admin@rozitech.com"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-danger-600 text-white font-medium rounded-lg transition-all duration-200 hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                'Sign in to Admin Portal'
              )}
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-10 pt-8 border-t border-primary-100">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-warning-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-warning-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-primary-700 mb-1">Restricted Access</p>
                <p className="text-sm text-primary-500">This portal is for authorized platform administrators only. All actions are logged and audited.</p>
              </div>
            </div>
          </div>

          {/* Mobile footer */}
          <p className="lg:hidden mt-10 text-center text-sm text-primary-400">
            Rozitech Platform
          </p>
        </div>
      </div>
    </div>
  );
}

export default SuperAdminLogin;
