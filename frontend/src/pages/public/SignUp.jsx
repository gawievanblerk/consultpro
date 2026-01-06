import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  UserIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { useCurrency } from '../../context/CurrencyContext';
import api from '../../utils/api';

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [plans, setPlans] = useState([]);
  const { currency, currencyConfig } = useCurrency();

  const [formData, setFormData] = useState({
    accountType: 'business',
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    planId: searchParams.get('plan') || 'professional',
    agreeToTerms: false,
  });

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPlans(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const getPrice = (plan) => {
    const priceKey = `price_${currency.toLowerCase()}`;
    return plan[priceKey] || plan.price_usd;
  };

  const formatPrice = (amount) => {
    return `${currencyConfig?.symbol || '$'}${amount.toLocaleString()}`;
  };

  const validateStep = () => {
    switch (step) {
      case 1:
        return true;
      case 2:
        if (!formData.email || !formData.email.includes('@')) {
          setError('Please enter a valid email address');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        return true;
      case 3:
        if (!formData.firstName || !formData.lastName) {
          setError('Please enter your full name');
          return false;
        }
        if (formData.accountType === 'business' && !formData.companyName) {
          setError('Please enter your company name');
          return false;
        }
        return true;
      case 4:
        if (!formData.agreeToTerms) {
          setError('Please agree to the terms and conditions');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      if (step < 4) {
        setStep(step + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post('/api/register', {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        companyName: formData.companyName,
        phone: formData.phone,
        planId: formData.planId,
        accountType: formData.accountType,
        currency: currency,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-primary-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center mb-6">
            <EnvelopeIcon className="h-8 w-8 text-accent-600" />
          </div>
          <h2 className="text-2xl font-bold text-primary-900 mb-2">Check your email</h2>
          <p className="text-primary-600 mb-6">
            We've sent a verification link to <strong>{formData.email}</strong>.
            Please click the link to activate your account.
          </p>
          <p className="text-sm text-primary-500 mb-8">
            Didn't receive the email? Check your spam folder or{' '}
            <button className="text-accent-600 hover:text-accent-700 font-medium">
              resend verification email
            </button>
          </p>
          <Link
            to="/login"
            className="inline-flex items-center text-sm font-medium text-accent-600 hover:text-accent-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50">
      {/* Header */}
      <header className="bg-white border-b border-primary-100">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src="/corehr-logo.svg" alt="CoreHR" className="h-9 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-primary-500">
              {currencyConfig?.flag} {currency}
            </span>
            <div className="text-sm text-primary-600">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-12">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                    s < step
                      ? 'bg-accent-600 text-white'
                      : s === step
                      ? 'bg-accent-600 text-white ring-4 ring-accent-100'
                      : 'bg-primary-100 text-primary-400'
                  }`}
                >
                  {s < step ? <CheckCircleIcon className="h-5 w-5" /> : s}
                </div>
                {s < 4 && (
                  <div
                    className={`w-full h-1 mx-2 rounded ${
                      s < step ? 'bg-accent-600' : 'bg-primary-100'
                    }`}
                    style={{ width: '60px' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-primary-500">
            <span>Type</span>
            <span>Account</span>
            <span>Details</span>
            <span>Plan</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-danger-50 border border-danger-100 rounded-lg text-danger-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Account Type */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-primary-900 mb-2">Choose your account type</h2>
              <p className="text-primary-600 mb-6">Select the option that best describes you.</p>

              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => updateField('accountType', 'business')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    formData.accountType === 'business'
                      ? 'border-accent-600 bg-accent-50'
                      : 'border-primary-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${formData.accountType === 'business' ? 'bg-accent-100' : 'bg-primary-100'}`}>
                      <BuildingOfficeIcon className={`h-6 w-6 ${formData.accountType === 'business' ? 'text-accent-600' : 'text-primary-500'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-900">Business / Consulting Firm</h3>
                      <p className="text-sm text-primary-500 mt-1">
                        I'm setting up CoreHR for my consulting firm or staffing agency.
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => updateField('accountType', 'individual')}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    formData.accountType === 'individual'
                      ? 'border-accent-600 bg-accent-50'
                      : 'border-primary-200 hover:border-primary-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${formData.accountType === 'individual' ? 'bg-accent-100' : 'bg-primary-100'}`}>
                      <UserIcon className={`h-6 w-6 ${formData.accountType === 'individual' ? 'text-accent-600' : 'text-primary-500'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary-900">Independent Consultant</h3>
                      <p className="text-sm text-primary-500 mt-1">
                        I'm a freelance consultant or independent professional.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Account Details */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-primary-900 mb-2">Create your account</h2>
              <p className="text-primary-600 mb-6">Enter your email and create a secure password.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="form-input"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateField('password', e.target.value)}
                    className="form-input"
                    placeholder="At least 8 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Confirm password
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateField('confirmPassword', e.target.value)}
                    className="form-input"
                    placeholder="Re-enter your password"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Personal/Business Details */}
          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-primary-900 mb-2">Tell us about yourself</h2>
              <p className="text-primary-600 mb-6">We'll use this to personalize your experience.</p>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">
                      First name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      className="form-input"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      className="form-input"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                {formData.accountType === 'business' && (
                  <div>
                    <label className="block text-sm font-medium text-primary-700 mb-2">
                      Company name
                    </label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => updateField('companyName', e.target.value)}
                      className="form-input"
                      placeholder="Acme Consulting Ltd"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-primary-700 mb-2">
                    Phone number <span className="text-primary-400">(optional)</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="form-input"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Plan Selection */}
          {step === 4 && (
            <div>
              <h2 className="text-xl font-bold text-primary-900 mb-2">Choose your plan</h2>
              <p className="text-primary-600 mb-2">All plans include a 30-day free trial. Cancel anytime.</p>
              <p className="text-sm text-primary-500 mb-6">
                Prices shown in {currencyConfig?.name} ({currency})
              </p>

              <div className="space-y-3 mb-6">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => updateField('planId', plan.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      formData.planId === plan.id
                        ? 'border-accent-600 bg-accent-50'
                        : 'border-primary-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-primary-900">{plan.name}</h3>
                          {plan.popular && (
                            <span className="text-xs bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full font-medium">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-primary-500 mt-0.5">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-primary-900">
                          {formatPrice(getPrice(plan))}
                        </span>
                        <span className="text-sm text-primary-500">/mo</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => updateField('agreeToTerms', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-primary-300 text-accent-600 focus:ring-accent-500"
                />
                <span className="text-sm text-primary-600">
                  I agree to the{' '}
                  <Link to="/terms" className="text-accent-600 hover:text-accent-700 font-medium">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-accent-600 hover:text-accent-700 font-medium">
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-900"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </button>
            ) : (
              <div />
            )}
            <button
              type="button"
              onClick={nextStep}
              disabled={loading}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-accent-600 text-white font-semibold hover:bg-accent-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : step === 4 ? (
                'Start Free Trial'
              ) : (
                <>
                  Continue
                  <ArrowRightIcon className="h-4 w-4 ml-2" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-8 text-center">
          <p className="text-sm text-primary-500 mb-4">Trusted by consulting firms worldwide</p>
          <div className="flex items-center justify-center gap-6 text-primary-400">
            <span className="text-xs">256-bit SSL</span>
            <span className="text-xs">GDPR Compliant</span>
            <span className="text-xs">SOC 2 Type II</span>
          </div>
        </div>
      </div>
    </div>
  );
}
