import React from 'react';
import { Link } from 'react-router-dom';
import {
  BanknotesIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    name: 'View Payslips',
    description: 'Access your monthly payslips and download PDF copies anytime.',
    icon: BanknotesIcon
  },
  {
    name: 'Request Leave',
    description: 'Submit leave requests and track your leave balances easily.',
    icon: CalendarDaysIcon
  },
  {
    name: 'Training & Compliance',
    description: 'Complete assigned training modules and earn certificates.',
    icon: AcademicCapIcon
  },
  {
    name: 'Policy Library',
    description: 'Access company policies and acknowledge important documents.',
    icon: ClipboardDocumentCheckIcon
  }
];

export default function ESSLanding() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/corehr-logo.png" alt="CoreHR" className="h-9 w-auto" />
              <span className="text-lg font-semibold text-primary-900">Employee Portal</span>
            </div>
            <Link
              to="/ess/login"
              className="btn-primary"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-primary-900 tracking-tight">
              Employee Self-Service
            </h1>
            <p className="mt-6 text-xl text-primary-600 max-w-2xl mx-auto">
              Access your payslips, request leave, complete training, and manage your HR information - all in one place.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/ess/login"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200"
              >
                Sign In to Your Account
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="mt-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature) => (
                <div
                  key={feature.name}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-primary-100 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-accent-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-accent-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-primary-900 mb-2">
                    {feature.name}
                  </h3>
                  <p className="text-primary-600 text-sm">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-20 text-center">
            <div className="inline-flex items-center gap-8 px-8 py-4 bg-white rounded-2xl border border-primary-100">
              <div className="flex items-center gap-2 text-primary-600">
                <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium">Secure & Encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-primary-600">
                <DevicePhoneMobileIcon className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Mobile Friendly</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-primary-100 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-primary-500">
              Powered by Rozitech
            </p>
            <div className="flex items-center gap-6 text-sm text-primary-500">
              <a href="mailto:support@corehr.africa" className="hover:text-primary-700">
                Need Help?
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
