import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { ArrowLeftIcon, CheckCircleIcon, ExclamationCircleIcon, UserPlusIcon } from '@heroicons/react/24/outline';

function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const token = searchParams.get('token');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [inviteData, setInviteData] = useState(null);

  useEffect(() => {
    const verifyInvite = async () => {
      if (!token) {
        setValidating(false);
        return;
      }

      try {
        const response = await api.get(`/api/auth/verify-invite/${token}`);
        if (response.data.success) {
          setInviteData(response.data.data);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired invitation');
      } finally {
        setValidating(false);
      }
    };

    verifyInvite();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/auth/accept-invite', {
        token,
        password,
        firstName,
        lastName
      });

      if (response.data.success) {
        setSuccess(true);
        // Store auth data and redirect
        const { accessToken, user, organization } = response.data.data;

        // Update auth context
        setAuth(accessToken, {
          ...user,
          organizationName: organization.name
        });

        // Redirect after brief delay
        setTimeout(() => navigate('/'), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      manager: 'Manager',
      user: 'User'
    };
    return labels[role] || role;
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-800 to-primary-600">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-800 to-primary-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="bg-white rounded-lg px-4 py-3 inline-block mb-4">
            <img
              src="/teamace-icon.png"
              alt="TeamACE"
              className="h-12"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-3xl font-bold text-white">ConsultPro</h1>
          <p className="mt-2 text-primary-200">TeamACE HR Platform</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-xl shadow-xl p-8">
          {!token || !inviteData ? (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <ExclamationCircleIcon className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Invitation</h2>
              <p className="text-gray-600 mb-6">
                {error || 'This invitation link is invalid or has expired. Please contact your administrator for a new invitation.'}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium"
              >
                <ArrowLeftIcon className="h-4 w-4" />
                Go to login
              </Link>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Welcome!</h2>
              <p className="text-gray-600 mb-6">
                Your account has been created successfully. Redirecting to dashboard...
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="mx-auto h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                  <UserPlusIcon className="h-8 w-8 text-primary-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Accept Invitation</h2>
                <p className="text-gray-600">
                  You've been invited to join <strong>{inviteData.organizationName}</strong>
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Email</span>
                  <span className="text-sm font-medium">{inviteData.email}</span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-600">Role</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    inviteData.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    inviteData.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {getRoleLabel(inviteData.role)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="form-label">
                      First Name
                    </label>
                    <input
                      id="firstName"
                      type="text"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="form-input"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="form-label">
                      Last Name
                    </label>
                    <input
                      id="lastName"
                      type="text"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="form-input"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="form-label">
                    Password *
                  </label>
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    placeholder="Minimum 6 characters"
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm Password *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    placeholder="Confirm your password"
                    minLength={6}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary py-3"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium text-sm"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-primary-200">
          Powered by Rozitech CC
        </p>
      </div>
    </div>
  );
}

export default AcceptInvite;
