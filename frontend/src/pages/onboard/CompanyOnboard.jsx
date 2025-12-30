import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';

function CompanyOnboard() {
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
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided');
      setLoading(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await api.get(`/api/onboard/company/verify/${token}`);
      if (response.data.success) {
        setInvitation(response.data.data);
        setForm(prev => ({
          ...prev,
          firstName: response.data.data.firstName || '',
          lastName: response.data.data.lastName || ''
        }));
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

    if (!form.firstName || !form.lastName) {
      setError('First name and last name are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/onboard/company/complete', {
        token,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone
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
      setError(err.response?.data?.error || 'Registration failed');
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
            Please contact your HR consultant for a new invitation link.
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
          <h1 className="text-xl font-semibold text-primary-900 mb-2">Account Created!</h1>
          <p className="text-primary-500 mb-4">
            Welcome to the HR Management Portal.
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
        <div className="bg-primary-700 px-8 py-6 text-center">
          <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <BuildingOfficeIcon className="h-10 w-10 text-primary-700" />
          </div>
          <h1 className="text-xl font-semibold text-white">Complete Your Registration</h1>
          <p className="text-primary-200 mt-1">Company Administrator Account</p>
        </div>

        {/* Company Info */}
        <div className="px-8 py-6 bg-primary-50 border-b border-primary-100">
          <div className="text-center">
            <p className="text-sm text-primary-500 mb-1">You've been invited to manage</p>
            <p className="text-lg font-semibold text-primary-900">
              {invitation?.companyName}
            </p>
            {invitation?.tradingName && invitation.tradingName !== invitation.companyName && (
              <p className="text-sm text-primary-500">Trading as: {invitation.tradingName}</p>
            )}
            <div className="mt-3 pt-3 border-t border-primary-200">
              <p className="text-xs text-primary-400">Provided by {invitation?.consultantName}</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-primary-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                placeholder="+234..."
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
              className="w-full px-4 py-3 bg-primary-700 text-white font-medium rounded-lg transition-all duration-200 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Creating Account...
                </span>
              ) : (
                'Create Admin Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-primary-400">
            By creating your account, you agree to manage your company's HR operations through this platform.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CompanyOnboard;
