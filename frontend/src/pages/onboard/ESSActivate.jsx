import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UserCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

function ESSActivate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!token) {
      setError('No activation token provided');
      setLoading(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await api.get(`/api/onboard/ess/verify/${token}`);
      if (response.data.success) {
        setInvitation(response.data.data);
      } else {
        setError(response.data.error || 'Invalid invitation');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to verify invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/onboard/ess/complete', {
        token,
        password: form.password
      });

      if (response.data.success) {
        setSuccess(true);
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.data.user));

        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Activation failed');
      setLoading(false);
    }
  };

  if (loading && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="h-16 w-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-danger-600" />
          </div>
          <h1 className="text-xl font-semibold text-primary-900 mb-2">Invalid Link</h1>
          <p className="text-primary-500 mb-6">{error}</p>
          <p className="text-sm text-primary-400">
            Please contact your HR administrator for a new invitation link.
          </p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-accent-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-primary-900 mb-2">Account Activated!</h1>
          <p className="text-primary-500 mb-4">
            Welcome to the Employee Self-Service portal.
          </p>
          <p className="text-sm text-primary-400">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-accent-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-accent-600 px-8 py-6 text-center">
          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <UserCircleIcon className="h-10 w-10 text-accent-600" />
          </div>
          <h1 className="text-xl font-semibold text-white">Activate Your Account</h1>
          <p className="text-accent-100 mt-1">Employee Self-Service Portal</p>
        </div>

        {/* Welcome Info */}
        <div className="px-8 py-6 bg-primary-50 border-b border-primary-100">
          <div className="text-center">
            <p className="text-sm text-primary-500 mb-1">Welcome,</p>
            <p className="text-lg font-semibold text-primary-900">
              {invitation?.firstName} {invitation?.lastName}
            </p>
            <p className="text-sm text-primary-500 mt-2">{invitation?.jobTitle}</p>
            <div className="mt-3 pt-3 border-t border-primary-200">
              <p className="text-xs text-primary-400">{invitation?.companyName}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-8 py-6">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-100 rounded-lg text-danger-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={invitation?.email || ''}
                className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-primary-50 text-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Create Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 pr-10"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Confirm Password *
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-600"
                >
                  {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-accent-600 text-white font-medium rounded-lg transition-all duration-200 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Activating...
                </span>
              ) : (
                'Activate Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-primary-400">
            By activating your account, you agree to access your employee information through this self-service portal.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ESSActivate;
