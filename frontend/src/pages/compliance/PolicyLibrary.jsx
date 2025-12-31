import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

function PolicyLibrary() {
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [signature, setSignature] = useState('');
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPolicies();
    fetchCategories();
  }, []);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      // Fetch all policies (pending and acknowledged) so employee can view them all
      const response = await api.get('/api/policies/employee/all');
      setPolicies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
      showError('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/policy-categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleAcknowledge = async () => {
    if (!selectedPolicy) return;

    try {
      setAcknowledging(true);
      await api.post(`/api/policies/${selectedPolicy.id}/acknowledge`, {
        signature_data: signature || null
      });
      showSuccess('Policy acknowledged successfully');
      setShowAcknowledgeModal(false);
      setSelectedPolicy(null);
      setSignature('');
      fetchPolicies();
    } catch (error) {
      console.error('Error acknowledging policy:', error);
      showError(error.response?.data?.error || 'Failed to acknowledge policy');
    } finally {
      setAcknowledging(false);
    }
  };

  const getStatusBadge = (policy) => {
    if (policy.acknowledged_at) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          <CheckCircleSolidIcon className="w-3 h-3" />
          Acknowledged
        </span>
      );
    }
    if (policy.acknowledgment_deadline && new Date(policy.acknowledgment_deadline) < new Date()) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          <ExclamationTriangleIcon className="w-3 h-3" />
          Overdue
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
        <ClockIcon className="w-3 h-3" />
        Pending
      </span>
    );
  };

  const filteredPolicies = policies.filter(policy => {
    const matchesCategory = !selectedCategory || policy.category_id === selectedCategory;
    const matchesSearch = !searchTerm ||
      policy.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingCount = policies.filter(p => !p.acknowledged_at).length;
  const overdueCount = policies.filter(p =>
    !p.acknowledged_at &&
    p.acknowledgment_deadline &&
    new Date(p.acknowledgment_deadline) < new Date()
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">Policy Library</h1>
          <p className="text-sm text-primary-500 mt-1">
            Review and acknowledge company policies
          </p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-700">
              <ClockIcon className="w-4 h-4" />
              {pendingCount} pending
            </span>
          )}
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700">
              <ExclamationTriangleIcon className="w-4 h-4" />
              {overdueCount} overdue
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-400" />
            <input
              type="text"
              placeholder="Search policies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-primary-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="border border-primary-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Policy Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
        </div>
      ) : filteredPolicies.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="mx-auto h-12 w-12 text-primary-300" />
          <h3 className="mt-2 text-sm font-medium text-primary-900">No policies found</h3>
          <p className="mt-1 text-sm text-primary-500">
            {policies.length === 0 ? 'No policies are available at this time.' : 'Try adjusting your search or filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPolicies.map(policy => (
            <div
              key={policy.id}
              className="bg-white rounded-xl shadow-sm border border-primary-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <span className="text-xs font-medium text-primary-400 uppercase tracking-wide">
                    {policy.category_name || 'General'}
                  </span>
                  <h3 className="text-lg font-semibold text-primary-900 mt-1 line-clamp-2">
                    {policy.title}
                  </h3>
                </div>
                {getStatusBadge(policy)}
              </div>

              {policy.description && (
                <p className="text-sm text-primary-600 line-clamp-2 mb-4">
                  {policy.description}
                </p>
              )}

              {policy.acknowledgment_deadline && !policy.acknowledged_at && (
                <p className="text-xs text-primary-500 mb-4">
                  Due by: {new Date(policy.acknowledgment_deadline).toLocaleDateString()}
                </p>
              )}

              <div className="flex items-center gap-2 pt-3 border-t border-primary-100">
                {policy.file_url && (
                  <a
                    href={policy.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                  >
                    <EyeIcon className="w-4 h-4" />
                    View
                  </a>
                )}
                {policy.requires_acknowledgment && !policy.acknowledged_at && (
                  <button
                    onClick={() => {
                      setSelectedPolicy(policy);
                      setShowAcknowledgeModal(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    Acknowledge
                  </button>
                )}
                {policy.acknowledged_at && (
                  <span className="flex-1 text-center text-sm text-green-600">
                    Acknowledged on {new Date(policy.acknowledged_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acknowledge Modal */}
      {showAcknowledgeModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-primary-900 mb-2">
                Acknowledge Policy
              </h2>
              <p className="text-sm text-primary-600 mb-4">
                Please confirm that you have read and understood this policy.
              </p>

              <div className="bg-primary-50 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-primary-900">{selectedPolicy.title}</h3>
                {selectedPolicy.description && (
                  <p className="text-sm text-primary-600 mt-1">{selectedPolicy.description}</p>
                )}
                {selectedPolicy.file_url && (
                  <a
                    href={selectedPolicy.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-accent-600 hover:text-accent-700 mt-2"
                  >
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    View/Download Policy Document
                  </a>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-primary-700 mb-2">
                  Electronic Signature (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Type your full name"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  className="w-full px-3 py-2 border border-primary-200 rounded-lg focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                />
                <p className="text-xs text-primary-400 mt-1">
                  By typing your name, you confirm that you have read, understood, and agree to comply with this policy.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowAcknowledgeModal(false);
                    setSelectedPolicy(null);
                    setSignature('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcknowledge}
                  disabled={acknowledging}
                  className="px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors disabled:opacity-50"
                >
                  {acknowledging ? 'Acknowledging...' : 'I Acknowledge'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PolicyLibrary;
