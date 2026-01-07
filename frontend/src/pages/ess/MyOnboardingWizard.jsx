import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import SignaturePad from '../../components/onboarding/SignaturePad';

const PHASE_INFO = {
  phase1: {
    name: 'Document Signing',
    description: 'Sign essential employment documents',
    icon: 'document',
    hardGate: true
  },
  phase2: {
    name: 'Role Clarity',
    description: 'Understand your role and team structure',
    icon: 'users',
    hardGate: false
  },
  phase3: {
    name: 'Employee File',
    description: 'Complete your profile and upload documents',
    icon: 'folder',
    hardGate: true
  },
  phase4: {
    name: 'Policy Acknowledgments',
    description: 'Review and acknowledge company policies',
    icon: 'shield',
    hardGate: false
  },
  phase5: {
    name: 'Complete',
    description: 'Onboarding complete, awaiting activation',
    icon: 'check',
    hardGate: false
  }
};

export default function MyOnboardingWizard() {
  const navigate = useNavigate();
  const [onboarding, setOnboarding] = useState(null);
  const [documents, setDocuments] = useState({ all: [], byPhase: {} });
  const [profileCompletion, setProfileCompletion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [activePhase, setActivePhase] = useState('phase1');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [onboardingRes, documentsRes, profileRes] = await Promise.all([
        api.get('/api/onboarding-checklist/my-onboarding'),
        api.get('/api/onboarding-checklist/my-documents'),
        api.get('/api/onboarding-checklist/my-profile-completion')
      ]);

      setOnboarding(onboardingRes.data.data);
      setDocuments(documentsRes.data.data || { all: [], byPhase: {} });
      setProfileCompletion(profileRes.data.data);

      // Set active phase based on current onboarding phase
      // current_phase is an integer in DB, convert to 'phase1' format
      if (onboardingRes.data.data?.onboarding?.current_phase) {
        const phase = onboardingRes.data.data.onboarding.current_phase;
        setActivePhase(typeof phase === 'number' ? `phase${phase}` : phase);
      }
    } catch (err) {
      setError('Failed to fetch onboarding data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = async (doc) => {
    setSelectedDocument(doc);
    try {
      const res = await api.get(`/api/onboarding-checklist/my-document/${doc.id}/content`);
      setDocumentContent(res.data.data);
    } catch (err) {
      setDocumentContent({ type: 'error', content: 'Failed to load document' });
    }
  };

  const handleSignDocument = (doc) => {
    setSelectedDocument(doc);
    setShowSignatureModal(true);
  };

  const handleSignatureSubmit = async (signatureData) => {
    if (!selectedDocument) return;

    setProcessing(selectedDocument.id);
    try {
      await api.post(`/api/onboarding-checklist/my-documents/${selectedDocument.id}/sign`, {
        signature_data: signatureData
      });
      setShowSignatureModal(false);
      setSelectedDocument(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to sign document');
    } finally {
      setProcessing(null);
    }
  };

  const handleAcknowledgeDocument = async (doc) => {
    setProcessing(doc.id);
    try {
      await api.post(`/api/onboarding-checklist/my-documents/${doc.id}/acknowledge`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to acknowledge document');
    } finally {
      setProcessing(null);
    }
  };

  const handleUploadDocument = async (doc, file) => {
    if (!file) return;

    setProcessing(doc.id);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post(`/api/onboarding-checklist/my-documents/${doc.id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload document');
    } finally {
      setProcessing(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'signed':
      case 'acknowledged':
      case 'verified':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'uploaded':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getPhaseIcon = (iconType) => {
    switch (iconType) {
      case 'document':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'users':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'folder':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        );
      case 'shield':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        );
      case 'check':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!onboarding) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Onboarding</h1>
          <p className="text-gray-600">Complete your onboarding journey</p>
        </div>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Onboarding Not Started</h3>
          <p className="mt-1 text-sm text-gray-500">Your onboarding workflow will appear here once HR initiates it.</p>
        </div>
      </div>
    );
  }

  const { phases = {}, overallProgress = 0 } = onboarding;
  const currentPhaseNum = parseInt(activePhase.replace('phase', ''));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Onboarding</h1>
        <p className="text-gray-600">Complete your onboarding journey step by step</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Overall Progress */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-500 p-6 rounded-lg text-white">
        <h2 className="text-lg font-semibold mb-2">Overall Progress</h2>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="w-full bg-white/30 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
          <div className="text-2xl font-bold">{overallProgress}%</div>
        </div>
        {profileCompletion && (
          <div className="mt-2 text-sm text-white/80">
            Profile: {profileCompletion.percentage}% complete
            {profileCompletion.percentage < 80 && (
              <span className="ml-2 text-yellow-200">(Minimum 80% required)</span>
            )}
          </div>
        )}
      </div>

      {/* Phase Navigation */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between overflow-x-auto">
          {Object.entries(PHASE_INFO).map(([phaseKey, info], index) => {
            const phaseNum = index + 1;
            const phaseStatus = phases[phaseKey]?.status || 'pending';
            const isActive = activePhase === phaseKey;
            const isCompleted = phases[phaseKey]?.requiredCompleted === phases[phaseKey]?.requiredTotal && phases[phaseKey]?.requiredTotal > 0;
            const isLocked = phaseNum > currentPhaseNum + 1;

            return (
              <button
                key={phaseKey}
                onClick={() => !isLocked && setActivePhase(phaseKey)}
                disabled={isLocked}
                className={`flex flex-col items-center px-4 py-2 min-w-[100px] ${
                  isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : isLocked ? 'text-gray-300' : 'text-gray-500'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                  isActive ? 'bg-primary-600 text-white' :
                  isCompleted ? 'bg-green-100 text-green-600' :
                  isLocked ? 'bg-gray-100' : 'bg-gray-100'
                }`}>
                  {isCompleted ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <span className="text-lg font-bold">{phaseNum}</span>
                  )}
                </div>
                <span className="text-xs font-medium text-center whitespace-nowrap">{info.name}</span>
                {info.hardGate && !isCompleted && (
                  <span className="text-xs text-red-500">Required</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Phase Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center">
            <div className="text-primary-600 mr-3">
              {getPhaseIcon(PHASE_INFO[activePhase]?.icon)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Phase {currentPhaseNum}: {PHASE_INFO[activePhase]?.name}
              </h3>
              <p className="text-sm text-gray-500">{PHASE_INFO[activePhase]?.description}</p>
            </div>
          </div>
        </div>

        {/* Phase 3: Profile Completion Section */}
        {activePhase === 'phase3' && profileCompletion && (
          <div className="px-6 py-4 border-b bg-blue-50">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-blue-900">Profile Completion</h4>
                <p className="text-sm text-blue-700">
                  {profileCompletion.percentage}% complete - {profileCompletion.meetsMinimum ? 'Meets minimum requirement' : 'Complete at least 80% to proceed'}
                </p>
              </div>
              <button
                onClick={() => navigate('/ess/profile')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Complete Profile
              </button>
            </div>
            {/* Section breakdown */}
            <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(profileCompletion.sections || {}).map(([section, fields]) => {
                const completed = Object.values(fields).filter(Boolean).length;
                const total = Object.values(fields).length;
                return (
                  <div key={section} className="text-xs">
                    <span className="capitalize text-blue-800">{section}:</span>
                    <span className={completed === total ? 'text-green-600 ml-1' : 'text-orange-600 ml-1'}>
                      {completed}/{total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="divide-y divide-gray-100">
          {(documents.byPhase[activePhase] || []).length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {activePhase === 'phase5' ? (
                <>
                  <svg className="mx-auto h-12 w-12 text-green-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900">Almost There!</h3>
                  <p className="mt-1">Your onboarding is complete. HR will activate your account shortly.</p>
                </>
              ) : (
                <>No documents for this phase</>
              )}
            </div>
          ) : (
            documents.byPhase[activePhase].map((doc) => (
              <div key={doc.id} className="px-6 py-4 flex items-start hover:bg-gray-50">
                <div className="mr-4 mt-1">{getStatusIcon(doc.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    {doc.document_title || doc.document_name || doc.policy_name || 'Document'}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center flex-wrap gap-2">
                    {doc.requires_signature && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                        Sign
                      </span>
                    )}
                    {doc.requires_acknowledgment && !doc.requires_signature && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        Acknowledge
                      </span>
                    )}
                    {doc.requires_upload && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                        Upload
                      </span>
                    )}
                    {doc.is_required && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        Required
                      </span>
                    )}
                    {doc.status === 'signed' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Signed
                      </span>
                    )}
                    {doc.status === 'acknowledged' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Acknowledged
                      </span>
                    )}
                    {doc.status === 'verified' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Verified
                      </span>
                    )}
                  </div>
                  {doc.status === 'rejected' && doc.rejection_reason && (
                    <div className="text-sm text-red-600 mt-1">
                      Rejected: {doc.rejection_reason}
                    </div>
                  )}
                  {doc.status === 'uploaded' && (
                    <div className="text-sm text-blue-600 mt-1">
                      Awaiting HR verification
                    </div>
                  )}
                </div>
                <div className="ml-4 flex items-center justify-end space-x-2 flex-shrink-0 min-w-[180px]">
                  {/* View button - always show for pending docs that need action */}
                  {(doc.requires_signature || doc.requires_acknowledgment || doc.policy_id) && doc.status === 'pending' && (
                    <button
                      onClick={() => handleViewDocument(doc)}
                      className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
                    >
                      View
                    </button>
                  )}

                  {/* Sign button */}
                  {doc.requires_signature && doc.status === 'pending' && (
                    <button
                      onClick={() => handleSignDocument(doc)}
                      disabled={processing === doc.id}
                      className="px-4 py-1.5 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50 min-w-[110px] text-center"
                    >
                      {processing === doc.id ? 'Signing...' : 'Sign'}
                    </button>
                  )}

                  {/* Acknowledge button */}
                  {doc.requires_acknowledgment && !doc.requires_signature && doc.status === 'pending' && (
                    <button
                      onClick={() => handleAcknowledgeDocument(doc)}
                      disabled={processing === doc.id}
                      className="px-4 py-1.5 bg-accent-500 text-white text-sm rounded hover:bg-accent-600 disabled:opacity-50 min-w-[110px] text-center"
                    >
                      {processing === doc.id ? '...' : 'Acknowledge'}
                    </button>
                  )}

                  {/* Upload button */}
                  {doc.requires_upload && ['pending', 'rejected'].includes(doc.status) && (
                    <label className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer">
                      {processing === doc.id ? '...' : 'Upload'}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        onChange={(e) => handleUploadDocument(doc, e.target.files[0])}
                        disabled={processing === doc.id}
                      />
                    </label>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Sign Document</h3>
              <p className="text-sm text-gray-500">{selectedDocument.document_title || selectedDocument.document_name}</p>
            </div>

            {/* Document content preview */}
            {documentContent && (
              <div className="px-6 py-4 border-b bg-gray-50 max-h-48 overflow-y-auto">
                <div className="prose prose-sm" dangerouslySetInnerHTML={{ __html: documentContent.content || 'No preview available' }} />
              </div>
            )}

            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                By signing below, I confirm that I have read and agree to the terms of this document.
              </p>
              <SignaturePad
                onSave={handleSignatureSubmit}
                onCancel={() => {
                  setShowSignatureModal(false);
                  setSelectedDocument(null);
                }}
                disabled={processing === selectedDocument?.id}
              />
            </div>
          </div>
        </div>
      )}

      {/* Document View Modal */}
      {documentContent && !showSignatureModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{documentContent.name}</h3>
                <p className="text-sm text-gray-500">{documentContent.type}</p>
              </div>
              <button
                onClick={() => {
                  setDocumentContent(null);
                  setSelectedDocument(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              {documentContent.url ? (
                <a
                  href={documentContent.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Open Document in New Tab
                </a>
              ) : (
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: documentContent.content || 'No content available' }} />
              )}
            </div>
            {documentContent.requiresAcknowledgment && selectedDocument?.status === 'pending' && (
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                <button
                  onClick={() => {
                    handleAcknowledgeDocument(selectedDocument);
                    setDocumentContent(null);
                  }}
                  disabled={processing === selectedDocument?.id}
                  className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 disabled:opacity-50"
                >
                  {processing === selectedDocument?.id ? 'Processing...' : 'I Acknowledge'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
