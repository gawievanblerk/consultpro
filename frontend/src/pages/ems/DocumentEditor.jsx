import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import ContentLibraryPanel from '../../components/documents/ContentLibraryPanel';
import VersionHistoryPanel from '../../components/documents/VersionHistoryPanel';

export default function DocumentEditor() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [document, setDocument] = useState(null);
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [changeSummary, setChangeSummary] = useState('');

  // Panel visibility
  const [showLibrary, setShowLibrary] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [type, id]);

  useEffect(() => {
    setHasChanges(content !== originalContent);
  }, [content, originalContent]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/api/document-editor/${type}/${id}`);
      const doc = res.data.data;
      setDocument(doc);

      // Get content from appropriate field
      const docContent = doc.content || doc.document_content || '';
      setContent(docContent);
      setOriginalContent(docContent);
    } catch (err) {
      console.error('Error loading document:', err);
      setError(err.response?.data?.error || 'Failed to load document');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    setSaving(true);
    try {
      await api.put(`/api/document-editor/${type}/${id}`, {
        content,
        change_summary: changeSummary || 'Document updated'
      });
      setOriginalContent(content);
      setHasChanges(false);
      setChangeSummary('');
      alert('Document saved successfully');
    } catch (err) {
      console.error('Error saving document:', err);
      alert(err.response?.data?.error || 'Failed to save document');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!hasChanges) return;
    if (!confirm('Discard all changes? This cannot be undone.')) return;
    setContent(originalContent);
    setChangeSummary('');
  };

  const handleInsertContent = (libraryContent) => {
    // Insert at cursor position or append to end
    setContent(prev => prev + libraryContent);
  };

  const handleRestoreVersion = async (version) => {
    if (!confirm(`Restore to version ${version.version_number}? Current content will be saved as a new version first.`)) return;

    try {
      await api.post(`/api/document-editor/${type}/${id}/versions/${version.id}/restore`);
      await loadDocument();
      setShowVersions(false);
      alert('Document restored successfully');
    } catch (err) {
      console.error('Error restoring version:', err);
      alert(err.response?.data?.error || 'Failed to restore version');
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {document?.document_name || document?.document_title || 'Edit Document'}
            </h1>
            <p className="text-sm text-gray-500">
              {document?.employee_name && `For: ${document.employee_name}`}
              {document?.current_version && ` | Version ${document.current_version}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Unsaved changes
            </span>
          )}

          <button
            onClick={() => setShowVersions(!showVersions)}
            className={`px-3 py-2 rounded-lg border ${showVersions ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button
            onClick={() => setShowLibrary(!showLibrary)}
            className={`px-3 py-2 rounded-lg border ${showLibrary ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-300 hover:bg-gray-50'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </button>

          <button
            onClick={handleDiscard}
            disabled={!hasChanges}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Discard
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Change Summary (when there are changes) */}
          {hasChanges && (
            <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Describe your changes (optional)"
                className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          )}

          {/* Rich Text Editor */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border">
              <ReactQuill
                value={content}
                onChange={setContent}
                modules={quillModules}
                className="h-full"
                style={{ minHeight: '500px' }}
              />
            </div>
          </div>
        </div>

        {/* Content Library Panel */}
        {showLibrary && (
          <ContentLibraryPanel
            onInsert={handleInsertContent}
            onClose={() => setShowLibrary(false)}
          />
        )}

        {/* Version History Panel */}
        {showVersions && (
          <VersionHistoryPanel
            documentType={type}
            documentId={id}
            onRestore={handleRestoreVersion}
            onClose={() => setShowVersions(false)}
          />
        )}
      </div>
    </div>
  );
}
