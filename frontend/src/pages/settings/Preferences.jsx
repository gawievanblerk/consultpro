import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { useToast } from '../../context/ToastContext';
import {
  Cog6ToothIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

export default function Preferences() {
  const { user } = useAuth();
  const { preferences, updatePreferences } = useCompany();
  const { toast } = useToast();

  const [savingPreferences, setSavingPreferences] = useState(false);

  const isConsultant = user?.userType === 'consultant';

  const handleViewModeChange = async (newMode) => {
    setSavingPreferences(true);
    try {
      await updatePreferences({ viewMode: newMode });
      toast.success('Company view mode updated');
    } catch (err) {
      toast.error('Failed to update preferences');
    } finally {
      setSavingPreferences(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Preferences</h1>
        <p className="text-gray-500">Customize your CoreHR experience</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Profile</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  defaultValue={user?.firstName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  defaultValue={user?.lastName}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                defaultValue={user?.email}
                disabled
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                defaultValue={user?.phone}
                placeholder="+234..."
              />
            </div>
            <div>
              <button className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="bg-white rounded-lg shadow h-fit">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">Account</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500">Organization</p>
              <p className="font-medium text-gray-900">{user?.tenantName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Account Type</p>
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 capitalize">
                {user?.userType || user?.role}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Role</p>
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Company View Preferences - Only show for consultants */}
      {isConsultant && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-500" />
              <h2 className="font-semibold text-gray-900">Company View Preferences</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Choose how you want to switch between client companies
            </p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Header Dropdown Option */}
              <button
                onClick={() => handleViewModeChange('header')}
                disabled={savingPreferences}
                className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                  preferences?.viewMode === 'header' || !preferences?.viewMode
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {(preferences?.viewMode === 'header' || !preferences?.viewMode) && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Header Dropdown</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Compact dropdown in the header bar. Quick access with search, favorites, and recent companies.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Recommended for most users</p>
                  </div>
                </div>
              </button>

              {/* Sidebar Option */}
              <button
                onClick={() => handleViewModeChange('sidebar')}
                disabled={savingPreferences}
                className={`relative p-4 border-2 rounded-lg text-left transition-all ${
                  preferences?.viewMode === 'sidebar'
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {preferences?.viewMode === 'sidebar' && (
                  <div className="absolute top-2 right-2">
                    <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Sidebar Panel</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Persistent sidebar with company list. Always visible for quick switching between companies.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Best for power users with many clients</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Keyboard Shortcuts</h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">Cmd</kbd>
                  <span>+</span>
                  <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">K</kbd>
                  <span className="text-gray-500">Open company switcher</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Additional Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5 text-gray-500" />
            <h2 className="font-semibold text-gray-900">Display Settings</h2>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Currency Format</p>
              <p className="text-sm text-gray-500">Display amounts in your preferred currency format</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Date Format</p>
              <p className="text-sm text-gray-500">How dates are displayed across the application</p>
            </div>
            <select className="border border-gray-300 rounded-lg px-3 py-2">
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
