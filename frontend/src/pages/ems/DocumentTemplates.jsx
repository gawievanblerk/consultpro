import { useState, useEffect } from 'react';
import api from '../../utils/api';

const TEMPLATE_TYPES = [
  { value: 'offer_letter', label: 'Offer Letter', category: 'onboarding' },
  { value: 'employment_contract', label: 'Employment Contract', category: 'onboarding' },
  { value: 'nda', label: 'Non-Disclosure Agreement (NDA)', category: 'onboarding' },
  { value: 'ndpa_consent', label: 'NDPA Data Protection Consent', category: 'onboarding' },
  { value: 'code_of_conduct', label: 'Code of Conduct', category: 'onboarding' },
  { value: 'job_description', label: 'Job Description Template', category: 'onboarding' },
  { value: 'org_chart', label: 'Organizational Chart', category: 'onboarding' },
  { value: 'key_contacts', label: 'Key Contacts & Escalation', category: 'onboarding' },
  { value: 'employee_handbook', label: 'Employee Handbook', category: 'policies' },
  { value: 'confirmation_letter', label: 'Confirmation Letter', category: 'hr' },
  { value: 'warning_letter', label: 'Warning Letter', category: 'disciplinary' },
  { value: 'termination_letter', label: 'Termination Letter', category: 'exit' }
];

const PLACEHOLDERS = [
  { key: '{{employee_name}}', description: 'Full name (First + Last)' },
  { key: '{{employee_first_name}}', description: 'First name only' },
  { key: '{{employee_last_name}}', description: 'Last name only' },
  { key: '{{employee_email}}', description: 'Email address' },
  { key: '{{employee_number}}', description: 'Employee number' },
  { key: '{{job_title}}', description: 'Job title/position' },
  { key: '{{department}}', description: 'Department name' },
  { key: '{{hire_date}}', description: 'Hire/start date' },
  { key: '{{company_name}}', description: 'Company name' },
  { key: '{{salary}}', description: 'Basic salary amount' },
  { key: '{{manager_name}}', description: 'Line manager name' },
  { key: '{{current_date}}', description: 'Current date' },
  { key: '{{probation_end_date}}', description: 'Probation end date' }
];

export default function DocumentTemplates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template_type: '',
    category: 'onboarding',
    content: '',
    is_active: true
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [filterCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = filterCategory ? `?category=${filterCategory}` : '';
      const res = await api.get(`/api/document-templates${params}`);
      setTemplates(res.data.data || []);
    } catch (err) {
      setError('Failed to load templates');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingTemplate) {
        await api.put(`/api/document-templates/${editingTemplate.id}`, formData);
      } else {
        await api.post('/api/document-templates', formData);
      }
      setShowModal(false);
      setEditingTemplate(null);
      resetForm();
      fetchTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      template_type: template.template_type,
      category: template.category || 'onboarding',
      content: template.content,
      is_active: template.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      await api.delete(`/api/document-templates/${template.id}`);
      fetchTemplates();
    } catch (err) {
      setError('Failed to delete template');
    }
  };

  const handlePreview = async (template) => {
    try {
      const res = await api.post(`/api/document-templates/${template.id}/preview`);
      setPreviewContent(res.data.data);
      setShowPreview(true);
    } catch (err) {
      setError('Failed to preview template');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      template_type: '',
      category: 'onboarding',
      content: '',
      is_active: true
    });
  };

  const insertPlaceholder = (placeholder) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content + placeholder
    }));
  };

  const categories = [...new Set(TEMPLATE_TYPES.map(t => t.category))];

  const getCategoryColor = (category) => {
    const colors = {
      onboarding: 'bg-blue-100 text-blue-800',
      policies: 'bg-purple-100 text-purple-800',
      hr: 'bg-green-100 text-green-800',
      disciplinary: 'bg-red-100 text-red-800',
      exit: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
          <p className="text-gray-600">Create and manage document templates for onboarding and HR processes</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingTemplate(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          + New Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="float-right font-bold">&times;</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Category:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No templates</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new document template.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{template.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {template.description || 'No description'}
                    </p>
                  </div>
                  {!template.is_active && (
                    <span className="ml-2 px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">Inactive</span>
                  )}
                </div>
                <div className="mt-3 flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded ${getCategoryColor(template.category)}`}>
                    {template.category}
                  </span>
                  <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                    {TEMPLATE_TYPES.find(t => t.value === template.template_type)?.label || template.template_type}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-3">
                  <span className="text-xs text-gray-400">v{template.version}</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handlePreview(template)}
                      className="text-sm text-gray-600 hover:text-gray-900"
                    >
                      Preview
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      Edit
                    </button>
                    {!template.is_system_template && (
                      <button
                        onClick={() => handleDelete(template)}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g., Standard Employment Contract"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Template Type *</label>
                    <select
                      value={formData.template_type}
                      onChange={(e) => {
                        const selected = TEMPLATE_TYPES.find(t => t.value === e.target.value);
                        setFormData({
                          ...formData,
                          template_type: e.target.value,
                          category: selected?.category || formData.category
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      required
                    >
                      <option value="">Select type...</option>
                      {TEMPLATE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Brief description of this template"
                  />
                </div>

                {/* Placeholder Reference */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Available Placeholders (click to insert)</h4>
                  <div className="flex flex-wrap gap-2">
                    {PLACEHOLDERS.map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => insertPlaceholder(p.key)}
                        className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-100"
                        title={p.description}
                      >
                        {p.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Content (HTML) *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                    rows={15}
                    placeholder={`<h2>Employment Contract</h2>
<p>This Employment Contract is made between <strong>{{company_name}}</strong> and <strong>{{employee_name}}</strong>.</p>

<h3>Position Details</h3>
<ul>
  <li><strong>Position:</strong> {{job_title}}</li>
  <li><strong>Department:</strong> {{department}}</li>
  <li><strong>Start Date:</strong> {{hire_date}}</li>
  <li><strong>Reporting To:</strong> {{manager_name}}</li>
</ul>

<h3>Compensation</h3>
<p>Your gross monthly salary will be <strong>{{salary}}</strong>.</p>

<p>Please sign below to acknowledge acceptance of these terms.</p>`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use HTML formatting. Placeholders like {`{{employee_name}}`} will be replaced with actual values.
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-primary-600 rounded border-gray-300"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                    Template is active and available for use
                  </label>
                </div>
              </div>

              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : (editingTemplate ? 'Update Template' : 'Create Template')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{previewContent.name}</h3>
                <p className="text-sm text-gray-500">Preview with sample data</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <div
                className="prose prose-sm max-w-none border border-gray-200 rounded-lg p-6 bg-white"
                dangerouslySetInnerHTML={{ __html: previewContent.content }}
              />
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
