import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

function ConsultantOnboard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const token = searchParams.get('token');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [invitation, setInvitation] = useState(null);
  const [form, setForm] = useState({
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    addressLine1: '',
    city: '',
    state: '',
    tin: '',
    rcNumber: '',
    website: '',
    primaryColor: '#0d2865',
    secondaryColor: '#41d8d1'
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
      const response = await api.get(`/api/onboard/consultant/verify/${token}`);
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
      const response = await api.post('/api/onboard/consultant/complete', {
        token,
        ...form
      });

      if (response.data.success) {
        setSuccess(true);
        // Use AuthContext to properly set authentication state
        setAuth(response.data.data.token, response.data.data.user);

        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600"></div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="h-16 w-16 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-danger-600" />
          </div>
          <h1 className="text-xl font-semibold text-primary-900 mb-2">Invalid Invitation</h1>
          <p className="text-primary-500 mb-6">{error}</p>
          <a href="/" className="text-accent-600 hover:text-accent-700 font-medium">
            Return to home
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-50 p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-xl font-semibold text-primary-900 mb-2">Welcome to CoreHR!</h1>
          <p className="text-primary-500 mb-4">Your account has been created successfully.</p>
          <p className="text-sm text-primary-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  const steps = [
    { number: 1, title: 'Account' },
    { number: 2, title: 'Profile' },
    { number: 3, title: 'Business' }
  ];

  return (
    <div className="min-h-screen bg-primary-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/corehr-logo.png"
            alt="CoreHR"
            className="h-10 mx-auto mb-4"
          />
          <h1 className="text-2xl font-semibold text-primary-900">Welcome, {invitation?.companyName}</h1>
          <p className="text-primary-500 mt-2">Complete your registration to get started</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {steps.map((s, index) => (
            <React.Fragment key={s.number}>
              <div className="flex items-center gap-2">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step >= s.number ? 'bg-accent-600 text-white' : 'bg-primary-200 text-primary-500'}`}>
                  {step > s.number ? <CheckCircleIcon className="h-5 w-5" /> : s.number}
                </div>
                <span className={`text-sm font-medium ${step >= s.number ? 'text-primary-900' : 'text-primary-400'}`}>
                  {s.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-0.5 mx-2 ${step > s.number ? 'bg-accent-600' : 'bg-primary-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-100 rounded-lg text-danger-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Account */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-primary-900 mb-1">Create Your Account</h2>
                  <p className="text-sm text-primary-500">Set up your login credentials</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">Last Name *</label>
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
                  <label className="block text-sm font-medium text-primary-700 mb-1">Email</label>
                  <input
                    type="email"
                    disabled
                    value={invitation?.email || ''}
                    className="w-full px-4 py-2.5 border border-primary-200 rounded-lg bg-primary-50 text-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="Minimum 8 characters"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Confirm Password *</label>
                  <input
                    type="password"
                    required
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Profile */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-primary-900 mb-1">Contact Information</h2>
                  <p className="text-sm text-primary-500">Help your clients reach you</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="+234 xxx xxx xxxx"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={form.addressLine1}
                    onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                    className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="Street address"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-1">State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                    placeholder="https://yourcompany.com"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Business */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-primary-900 mb-1">Business Details</h2>
                  <p className="text-sm text-primary-500">Your company registration info (optional)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">Tax Identification Number (TIN)</label>
                  <input
                    type="text"
                    value={form.tin}
                    onChange={(e) => setForm({ ...form, tin: e.target.value })}
                    className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-1">RC Number</label>
                  <input
                    type="text"
                    value={form.rcNumber}
                    onChange={(e) => setForm({ ...form, rcNumber: e.target.value })}
                    className="w-full px-4 py-2.5 border border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-500"
                  />
                </div>

                <div className="p-4 bg-accent-50 rounded-lg">
                  <h3 className="font-medium text-primary-900 mb-2">Your Subscription</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-600">Plan:</span>
                    <span className="font-medium text-primary-900 capitalize">{invitation?.tier}</span>
                  </div>
                  <p className="text-sm text-primary-500 mt-2">
                    You're starting with a 30-day free trial.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-4 mt-8">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 px-6 py-2.5 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50"
                >
                  <ArrowLeftIcon className="h-4 w-4" />
                  Back
                </button>
              )}
              <div className="flex-1" />
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent-600 text-white rounded-lg hover:bg-accent-700"
                >
                  Continue
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ConsultantOnboard;
