import { useState, useEffect } from 'react';
import api from '../../utils/api';

export default function VersionHistoryPanel({ documentType, documentId, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewVersion, setPreviewVersion] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [documentType, documentId]);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/document-editor/${documentType}/${documentId}/versions`);
      setVersions(res.data.data || []);
    } catch (error) {
      console.error('Error loading versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (version) => {
    try {
      setLoadingPreview(true);
      const res = await api.get(`/api/document-editor/${documentType}/${documentId}/versions/${version.id}`);
      setPreviewVersion(res.data.data);
    } catch (error) {
      console.error('Error loading version:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Version History</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Versions List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm px-4">
            No version history yet. Changes are saved when you edit and save the document.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {versions.map((version, index) => (
              <div
                key={version.id}
                className="p-4 hover:bg-white cursor-pointer transition-colors"
                onClick={() => handlePreview(version)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900">
                    Version {version.version_number}
                  </span>
                  {index === 0 && (
                    <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                      Current
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {formatDate(version.created_at)}
                </div>
                {version.created_by_name && (
                  <div className="text-xs text-gray-500">
                    by {version.created_by_name}
                  </div>
                )}
                {version.change_summary && (
                  <div className="text-xs text-gray-600 mt-1 truncate">
                    {version.change_summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Version {previewVersion.version_number}</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(previewVersion.created_at)}
                  {previewVersion.created_by_name && ` by ${previewVersion.created_by_name}`}
                </p>
              </div>
              <button
                onClick={() => setPreviewVersion(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {previewVersion.change_summary && (
              <div className="px-4 py-2 bg-gray-50 border-b text-sm text-gray-600">
                <strong>Changes:</strong> {previewVersion.change_summary}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-primary-600 border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: previewVersion.content_snapshot }}
                />
              )}
            </div>

            <div className="p-4 border-t flex justify-between">
              <button
                onClick={() => setPreviewVersion(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onRestore(previewVersion);
                  setPreviewVersion(null);
                }}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                Restore This Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
