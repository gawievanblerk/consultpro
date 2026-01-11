import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function ESSProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [profileCompletion, setProfileCompletion] = useState(null);

  const [formData, setFormData] = useState({
    phone: '',
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    nin: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    stateOfResidence: '',
    country: 'Nigeria',
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    bvn: '',
    taxId: ''
  });

  useEffect(() => {
    fetchProfile();
    fetchProfileCompletion();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get('/api/employees/ess/profile');
      const data = response.data.data;
      setProfile(data);

      // Map backend snake_case to frontend camelCase
      setFormData({
        phone: data.phone || '',
        dateOfBirth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
        gender: data.gender || '',
        maritalStatus: data.marital_status || '',
        nin: data.nin || '',
        addressLine1: data.address_line1 || '',
        addressLine2: data.address_line2 || '',
        city: data.city || '',
        stateOfResidence: data.state_of_residence || '',
        country: data.country || 'Nigeria',
        bankName: data.bank_name || '',
        bankAccountNumber: data.bank_account_number || '',
        bankAccountName: data.bank_account_name || '',
        bvn: data.bvn || '',
        taxId: data.tax_id || ''
      });
    } catch (err) {
      setError('Failed to load profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileCompletion = async () => {
    try {
      const response = await api.get('/api/onboarding-checklist/my-profile-completion');
      setProfileCompletion(response.data.data);
    } catch (err) {
      console.error('Failed to fetch profile completion:', err);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.put('/api/employees/ess/profile', formData);
      setSuccess('Profile updated successfully!');
      fetchProfileCompletion(); // Refresh completion percentage
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const NIGERIAN_STATES = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
    'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
    'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
    'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
  ];

  const NIGERIAN_BANKS = [
    'Access Bank', 'Citibank', 'Ecobank', 'Fidelity Bank', 'First Bank of Nigeria',
    'First City Monument Bank (FCMB)', 'Guaranty Trust Bank (GTBank)', 'Heritage Bank',
    'Keystone Bank', 'Polaris Bank', 'Providus Bank', 'Stanbic IBTC Bank',
    'Standard Chartered Bank', 'Sterling Bank', 'Union Bank of Nigeria',
    'United Bank for Africa (UBA)', 'Unity Bank', 'Wema Bank', 'Zenith Bank'
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/dashboard/my-onboarding-wizard')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2"
          >
            &larr; Back to Onboarding
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Complete Your Profile</h1>
          <p className="text-gray-600">
            Fill in your details below. Fields marked with * are required for onboarding completion.
          </p>
        </div>
        {profileCompletion && (
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{profileCompletion.percentage}%</div>
            <div className="text-sm text-gray-500">Profile Complete</div>
          </div>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
          {success}
          <button onClick={() => setSuccess(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Read-only Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Employee Information</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Name:</span>
            <span className="ml-2 font-medium">{profile?.first_name} {profile?.last_name}</span>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <span className="ml-2 font-medium">{profile?.email}</span>
          </div>
          <div>
            <span className="text-gray-500">Employee #:</span>
            <span className="ml-2 font-medium">{profile?.employee_number || 'N/A'}</span>
          </div>
          <div>
            <span className="text-gray-500">Company:</span>
            <span className="ml-2 font-medium">{profile?.company_name}</span>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">
            Personal Information
            {profileCompletion?.sections?.personal && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({Object.values(profileCompletion.sections.personal).filter(Boolean).length}/
                {Object.values(profileCompletion.sections.personal).length} complete)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="+234..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
              <input
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status *</label>
              <select
                value={formData.maritalStatus}
                onChange={(e) => handleChange('maritalStatus', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select status</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="divorced">Divorced</option>
                <option value="widowed">Widowed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NIN (National Identification Number) *</label>
              <input
                type="text"
                value={formData.nin}
                onChange={(e) => handleChange('nin', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="11-digit NIN"
                maxLength={11}
              />
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">
            Address Information
            {profileCompletion?.sections?.address && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({Object.values(profileCompletion.sections.address).filter(Boolean).length}/
                {Object.values(profileCompletion.sections.address).length} complete)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1 *</label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => handleChange('addressLine1', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Street address"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => handleChange('addressLine2', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Apartment, suite, etc."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
              <select
                value={formData.stateOfResidence}
                onChange={(e) => handleChange('stateOfResidence', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select state</option>
                {NIGERIAN_STATES.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => handleChange('country', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">
            Banking Information
            {profileCompletion?.sections?.banking && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({Object.values(profileCompletion.sections.banking).filter(Boolean).length}/
                {Object.values(profileCompletion.sections.banking).length} complete)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name *</label>
              <select
                value={formData.bankName}
                onChange={(e) => handleChange('bankName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">Select bank</option>
                {NIGERIAN_BANKS.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Number *</label>
              <input
                type="text"
                value={formData.bankAccountNumber}
                onChange={(e) => handleChange('bankAccountNumber', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="10-digit account number"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
              <input
                type="text"
                value={formData.bankAccountName}
                onChange={(e) => handleChange('bankAccountName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Name on account"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">BVN (Bank Verification Number)</label>
              <input
                type="text"
                value={formData.bvn}
                onChange={(e) => handleChange('bvn', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="11-digit BVN"
                maxLength={11}
              />
            </div>
          </div>
        </div>

        {/* Tax Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 border-b pb-2">
            Tax Information
            {profileCompletion?.sections?.employment && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({Object.values(profileCompletion.sections.employment).filter(Boolean).length}/
                {Object.values(profileCompletion.sections.employment).length} complete)
              </span>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax ID (TIN)</label>
              <input
                type="text"
                value={formData.taxId}
                onChange={(e) => handleChange('taxId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="Tax Identification Number"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard/my-onboarding-wizard')}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
