import { useState, useEffect } from 'react';
import api from '../../utils/api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CONTENT_TYPES = [
  { value: 'job_description', label: 'Job Description', icon: 'briefcase' },
  { value: 'kpi', label: 'KPI / Metric', icon: 'chart-bar' },
  { value: 'task', label: 'Task / Responsibility', icon: 'clipboard-list' },
  { value: 'clause', label: 'Contract Clause', icon: 'document-text' },
  { value: 'snippet', label: 'Policy Snippet', icon: 'shield-check' },
  { value: 'boilerplate', label: 'Boilerplate Text', icon: 'document-duplicate' }
];

export default function ContentLibrary() {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' or 'edit'
  const [currentItem, setCurrentItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '', icon: '' });

  // Apply to employee state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedContentItem, setSelectedContentItem] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDocuments, setEmployeeDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [applying, setApplying] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    content_type: 'snippet',
    content: '',
    category_id: '',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadItems();
  }, [selectedCategory, selectedType, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [categoriesRes] = await Promise.all([
        api.get('/api/content-library/categories')
      ]);
      setCategories(categoriesRes.data.data || []);
      await loadItems();
    } catch (error) {
      console.error('Error loading content library:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedType) params.append('content_type', selectedType);
      if (searchQuery) params.append('search', searchQuery);

      const res = await api.get(`/api/content-library/items?${params.toString()}`);
      setItems(res.data.data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const handleCreateItem = () => {
    setModalMode('create');
    setCurrentItem(null);
    setFormData({
      name: '',
      description: '',
      content_type: 'snippet',
      content: '',
      category_id: selectedCategory || '',
      tags: []
    });
    setShowModal(true);
  };

  const handleEditItem = (item) => {
    setModalMode('edit');
    setCurrentItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      content_type: item.content_type,
      content: item.content,
      category_id: item.category_id || '',
      tags: item.tags || []
    });
    setShowModal(true);
  };

  const handleSaveItem = async () => {
    if (!formData.name || !formData.content) {
      alert('Name and content are required');
      return;
    }

    setSaving(true);
    try {
      if (modalMode === 'create') {
        await api.post('/api/content-library/items', formData);
      } else {
        await api.put(`/api/content-library/items/${currentItem.id}`, formData);
      }
      setShowModal(false);
      loadItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert(error.response?.data?.error || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;

    try {
      await api.delete(`/api/content-library/items/${item.id}`);
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert(error.response?.data?.error || 'Failed to delete item');
    }
  };

  const handleDuplicateItem = async (item) => {
    try {
      await api.post(`/api/content-library/items/${item.id}/duplicate`);
      loadItems();
    } catch (error) {
      console.error('Error duplicating item:', error);
    }
  };

  const handleAddTag = () => {
    if (tagInput && !formData.tags.includes(tagInput.toLowerCase())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.toLowerCase()] });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
  };

  const handleCreateCategory = async () => {
    if (!categoryForm.name) {
      alert('Category name is required');
      return;
    }

    try {
      await api.post('/api/content-library/categories', categoryForm);
      setShowCategoryModal(false);
      setCategoryForm({ name: '', description: '', icon: '' });
      loadData();
    } catch (error) {
      console.error('Error creating category:', error);
      alert(error.response?.data?.error || 'Failed to create category');
    }
  };

  // Apply to employee handlers
  const handleOpenApplyModal = async (item) => {
    setSelectedContentItem(item);
    setSelectedEmployee(null);
    setEmployeeDocuments([]);
    setSelectedDocument('');
    setShowApplyModal(true);

    // Load employees
    try {
      const res = await api.get('/api/employees');
      setEmployees(res.data.data || res.data || []);
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const handleSelectEmployee = async (employee) => {
    setSelectedEmployee(employee);
    setSelectedDocument('');

    // Load employee's onboarding documents
    try {
      const res = await api.get(`/api/onboarding-workflow/employees/${employee.id}/documents`);
      // Filter to show only documents that can have content applied (like JDs)
      const docs = (res.data.data || res.data || []).filter(doc =>
        ['job_description', 'kpi_document', 'welcome_letter', 'offer_letter'].includes(doc.document_type)
      );
      setEmployeeDocuments(docs);
    } catch (error) {
      console.error('Error loading employee documents:', error);
      setEmployeeDocuments([]);
    }
  };

  const handleApplyContent = async () => {
    if (!selectedDocument) {
      alert('Please select a document to apply the content to');
      return;
    }

    setApplying(true);
    try {
      await api.post(`/api/content-library/items/${selectedContentItem.id}/apply-to-document`, {
        onboarding_document_id: selectedDocument
      });
      setShowApplyModal(false);
      alert('Content applied successfully! The employee\'s document has been updated.');
      loadItems(); // Refresh to update usage count
    } catch (error) {
      console.error('Error applying content:', error);
      alert(error.response?.data?.error || 'Failed to apply content');
    } finally {
      setApplying(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    !employeeSearch ||
    (emp.first_name + ' ' + emp.last_name).toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.employee_id?.toLowerCase().includes(employeeSearch.toLowerCase())
  );

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

  return (
    <div className="flex h-full">
      {/* Sidebar - Categories */}
      <div className="w-64 border-r border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Categories</h3>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="p-1 text-gray-500 hover:text-primary-600"
            title="Add category"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        <div className="space-y-1">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
              !selectedCategory ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
            }`}
          >
            All Items
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                selectedCategory === cat.id ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Content Type Filter */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Content Type</h4>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            {CONTENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
          <button
            onClick={handleCreateItem}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Content
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search content library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md border border-gray-300 rounded-lg px-4 py-2"
          />
        </div>

        {/* Items Grid */}
        {items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2">No content items found</p>
            <button
              onClick={handleCreateItem}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Create your first content item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {CONTENT_TYPES.find(t => t.value === item.content_type)?.label || item.content_type}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditItem(item)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDuplicateItem(item)}
                      className="p-1 text-gray-400 hover:text-primary-600"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleOpenApplyModal(item)}
                      className="p-1 text-gray-400 hover:text-green-600"
                      title="Apply to Employee"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </button>
                    {!item.is_system && (
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                )}

                <div
                  className="text-sm text-gray-500 line-clamp-3 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.content }}
                />

                {item.tags && item.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {item.tags.map(tag => (
                      <span key={tag} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-3 text-xs text-gray-400">
                  Used {item.usage_count || 0} times
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {modalMode === 'create' ? 'Add Content Item' : 'Edit Content Item'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Sales Manager Responsibilities"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content Type *</label>
                  <select
                    value={formData.content_type}
                    onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {CONTENT_TYPES.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    <option value="">No category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Brief description"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Add a tag and press Enter"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center bg-primary-50 text-primary-700 px-2 py-1 rounded text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 text-primary-500 hover:text-primary-700"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
                <ReactQuill
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  modules={quillModules}
                  className="bg-white"
                  style={{ height: '200px', marginBottom: '50px' }}
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveItem}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (modalMode === 'create' ? 'Create' : 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Add Category</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="e.g., Sales Templates"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  placeholder="Brief description"
                />
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCategory}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Apply to Employee Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">Apply Content to Employee</h2>
              <p className="text-sm text-gray-500 mt-1">
                Applying: <span className="font-medium text-gray-700">{selectedContentItem?.name}</span>
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Step 1: Select Employee */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">1. Select Employee</h3>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-3"
                />
                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredEmployees.length === 0 ? (
                    <p className="p-4 text-gray-500 text-center">No employees found</p>
                  ) : (
                    filteredEmployees.map(emp => (
                      <button
                        key={emp.id}
                        onClick={() => handleSelectEmployee(emp)}
                        className={`w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 ${
                          selectedEmployee?.id === emp.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                        }`}
                      >
                        <div className="font-medium text-gray-900">
                          {emp.first_name} {emp.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {emp.employee_id} • {emp.job_title || 'No title'}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Step 2: Select Document */}
              {selectedEmployee && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    2. Select Document for {selectedEmployee.first_name}
                  </h3>
                  {employeeDocuments.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
                      <p className="font-medium">No applicable documents found</p>
                      <p className="text-sm mt-1">
                        This employee doesn't have any documents that can be updated (e.g., Job Description, KPIs).
                        Make sure the employee has onboarding documents assigned.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {employeeDocuments.map(doc => (
                        <label
                          key={doc.id}
                          className={`flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                            selectedDocument === doc.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="document"
                            value={doc.id}
                            checked={selectedDocument === doc.id}
                            onChange={(e) => setSelectedDocument(e.target.value)}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {doc.document_title || doc.document_type.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm text-gray-500">
                              Type: {doc.document_type.replace(/_/g, ' ')} •
                              Status: <span className={`font-medium ${
                                doc.status === 'completed' ? 'text-green-600' :
                                doc.status === 'pending' ? 'text-yellow-600' : 'text-gray-600'
                              }`}>{doc.status}</span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              {selectedDocument && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">Ready to apply:</span> The content from "{selectedContentItem?.name}"
                    will replace the current content of the selected document for {selectedEmployee?.first_name} {selectedEmployee?.last_name}.
                    Previous content will be saved in version history.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedEmployee(null);
                  setEmployeeDocuments([]);
                  setSelectedDocument('');
                  setEmployeeSearch('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyContent}
                disabled={!selectedDocument || applying}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {applying ? 'Applying...' : 'Apply Content'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
