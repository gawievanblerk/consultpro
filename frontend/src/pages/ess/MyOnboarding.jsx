import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function MyOnboarding() {
  const [checklist, setChecklist] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [activeTab, setActiveTab] = useState('checklist');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [checklistRes, policiesRes] = await Promise.all([
        api.get('/api/onboarding-checklist/my-checklist'),
        api.get('/api/onboarding-checklist/my-policies')
      ]);
      setChecklist(checklistRes.data.data);
      setPolicies(policiesRes.data.data || []);
    } catch (err) {
      setError('Failed to fetch onboarding data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteItem = async (itemIndex) => {
    setProcessing(itemIndex);
    try {
      await api.post(`/api/onboarding-checklist/my-checklist/${itemIndex}/complete`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete item');
    } finally {
      setProcessing(null);
    }
  };

  const handleAcknowledgePolicy = async (ackId) => {
    if (!confirm('I confirm that I have read and understood this policy')) return;
    setProcessing(ackId);
    try {
      await api.post(`/api/onboarding-checklist/policy-acknowledgements/${ackId}/acknowledge`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to acknowledge policy');
    } finally {
      setProcessing(null);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'hr': return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      );
      case 'documents': return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
      case 'policies': return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
      case 'it': return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
      case 'orientation': return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      );
      default: return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      );
    }
  };

  const groupItemsByCategory = (items) => {
    const groups = {};
    items?.forEach((item, index) => {
      const cat = item.category || 'general';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push({ ...item, index });
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const checklistItems = checklist?.items || [];
  const completedCount = checklistItems.filter(i => i.completed).length;
  const progress = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;
  const pendingPolicies = policies.filter(p => p.status === 'pending');
  const groupedItems = groupItemsByCategory(checklistItems);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Onboarding</h1>
        <p className="text-gray-600">Complete your onboarding tasks and acknowledge policies</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Progress Overview */}
      <div className="bg-gradient-to-r from-primary to-accent p-6 rounded-lg text-white">
        <h2 className="text-lg font-semibold mb-2">Onboarding Progress</h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="w-full bg-white/30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold">{progress}%</div>
        </div>
        <div className="mt-2 text-sm text-white/80">
          {completedCount} of {checklistItems.length} tasks completed
          {pendingPolicies.length > 0 && (
            <span className="ml-2">| {pendingPolicies.length} policies pending</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'checklist'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Onboarding Checklist
          </button>
          <button
            onClick={() => setActiveTab('policies')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
              activeTab === 'policies'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Policy Acknowledgements
            {pendingPolicies.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">
                {pendingPolicies.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Checklist Tab */}
      {activeTab === 'checklist' && (
        <>
          {!checklist ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No onboarding checklist</h3>
              <p className="mt-1 text-sm text-gray-500">Your onboarding checklist will appear here once created by HR.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b flex items-center">
                    <span className="text-gray-600 mr-3">
                      {getCategoryIcon(category)}
                    </span>
                    <h3 className="font-semibold text-gray-900 capitalize">
                      {category.replace('_', ' ')}
                    </h3>
                    <span className="ml-auto text-sm text-gray-500">
                      {items.filter(i => i.completed).length} / {items.length}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map((item) => (
                      <div
                        key={item.index}
                        className={`px-6 py-4 flex items-center ${item.completed ? 'bg-green-50/50' : ''}`}
                      >
                        <div className="flex-1">
                          <div className={`font-medium ${item.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {item.item}
                          </div>
                          {item.required && !item.completed && (
                            <span className="text-xs text-red-600">Required</span>
                          )}
                          {item.completed && item.completed_at && (
                            <span className="text-xs text-green-600">
                              Completed on {new Date(item.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        {item.completed ? (
                          <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <button
                            onClick={() => handleCompleteItem(item.index)}
                            disabled={processing === item.index}
                            className="px-3 py-1 bg-accent-600 text-white text-sm rounded hover:bg-accent-700 disabled:opacity-50"
                          >
                            {processing === item.index ? 'Saving...' : 'Mark Complete'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          {policies.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No policies to acknowledge</h3>
              <p className="mt-1 text-sm text-gray-500">All required policies have been acknowledged.</p>
            </div>
          ) : (
            policies.map((policy) => (
              <div
                key={policy.id}
                className={`bg-white rounded-lg shadow p-5 ${
                  policy.status === 'acknowledged' ? 'border-l-4 border-green-500' : 'border-l-4 border-yellow-500'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{policy.policy_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{policy.policy_description}</p>
                    <div className="mt-2 text-xs text-gray-400">
                      Type: {policy.policy_type} | Effective: {new Date(policy.effective_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="ml-4">
                    {policy.status === 'acknowledged' ? (
                      <div className="text-center">
                        <svg className="w-8 h-8 text-green-500 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs text-green-600">
                          {new Date(policy.acknowledged_at).toLocaleDateString()}
                        </span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleAcknowledgePolicy(policy.id)}
                        disabled={processing === policy.id}
                        className="px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 disabled:opacity-50"
                      >
                        {processing === policy.id ? 'Processing...' : 'Acknowledge'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completion Message */}
      {progress === 100 && pendingPolicies.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-lg font-semibold text-green-800">Onboarding Complete!</h3>
          <p className="text-green-600">
            Congratulations! You have completed all onboarding tasks and policy acknowledgements.
          </p>
        </div>
      )}
    </div>
  );
}
