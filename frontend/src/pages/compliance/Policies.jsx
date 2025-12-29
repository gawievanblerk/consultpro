import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../../components/BulkActions';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  TrashIcon,
  PencilIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
  EyeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

const statusBadge = (status) => {
  switch (status) {
    case 'published':
      return <span className="badge-success">Published</span>;
    case 'draft':
      return <span className="badge-warning">Draft</span>;
    case 'archived':
      return <span className="badge">Archived</span>;
    default:
      return <span className="badge">{status}</span>;
  }
};

function Policies() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [policies, setPolicies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    document_type: 'pdf',
    external_url: '',
    requires_acknowledgment: true,
    new_hire_due_days: 30,
    renewal_frequency_months: 12,
    effective_date: '',
    tags: ''
  });

  const {
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    selectedIds
  } = useBulkSelection(policies);

  useEffect(() => {
    fetchPolicies();
    fetchCategories();
  }, [statusFilter, categoryFilter]);

  const fetchPolicies = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('category_id', categoryFilter);

      const response = await api.get(`/api/policies?${params}`);
      if (response.data.success) {
        setPolicies(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      toast.error('Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/policy-categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleOpenModal = (policy = null) => {
    if (policy) {
      setEditingPolicy(policy);
      setFormData({
        category_id: policy.category_id || '',
        title: policy.title || '',
        description: policy.description || '',
        document_type: policy.document_type || 'pdf',
        external_url: policy.external_url || '',
        requires_acknowledgment: policy.requires_acknowledgment ?? true,
        new_hire_due_days: policy.new_hire_due_days || 30,
        renewal_frequency_months: policy.renewal_frequency_months || 12,
        effective_date: policy.effective_date ? policy.effective_date.split('T')[0] : '',
        tags: policy.tags?.join(', ') || ''
      });
    } else {
      setEditingPolicy(null);
      setFormData({
        category_id: '',
        title: '',
        description: '',
        document_type: 'pdf',
        external_url: '',
        requires_acknowledgment: true,
        new_hire_due_days: 30,
        renewal_frequency_months: 12,
        effective_date: '',
        tags: ''
      });
    }
    setSelectedFile(null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingPolicy(null);
    setSelectedFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== '' && value !== null) {
          data.append(key, value);
        }
      });

      if (selectedFile) {
        data.append('file', selectedFile);
      }

      if (editingPolicy) {
        await api.put(`/api/policies/${editingPolicy.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Policy updated successfully');
      } else {
        await api.post('/api/policies', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Policy created successfully');
      }
      fetchPolicies();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save policy:', error);
      toast.error(error.response?.data?.error || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (policy) => {
    const confirmed = await confirm({
      title: 'Publish Policy',
      message: `Publish "${policy.title}"? This will make it visible to employees.`,
      confirmText: 'Publish',
      variant: 'primary'
    });
    if (!confirmed) return;

    try {
      await api.put(`/api/policies/${policy.id}/publish`);
      toast.success('Policy published successfully');
      fetchPolicies();
    } catch (error) {
      toast.error('Failed to publish policy');
    }
  };

  const handleArchive = async (policy) => {
    const confirmed = await confirm({
      title: 'Archive Policy',
      message: `Archive "${policy.title}"? Employees will no longer see this policy.`,
      confirmText: 'Archive',
      variant: 'warning'
    });
    if (!confirmed) return;

    try {
      await api.put(`/api/policies/${policy.id}/archive`);
      toast.success('Policy archived');
      fetchPolicies();
    } catch (error) {
      toast.error('Failed to archive policy');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Policy',
      message: 'Are you sure you want to delete this policy? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.delete(`/api/policies/${id}`);
      toast.success('Policy deleted');
      fetchPolicies();
    } catch (error) {
      toast.error('Failed to delete policy');
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Policies',
      message: `Delete ${selectedCount} policy(ies)? This cannot be undone.`,
      confirmText: 'Delete All',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.delete(`/api/policies/${id}`))
      );
      toast.success(`${selectedCount} policy(ies) deleted`);
      clearSelection();
      fetchPolicies();
    } catch (error) {
      toast.error('Failed to delete some policies');
    }
  };

  const filteredPolicies = policies.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
          <p className="mt-1 text-sm text-gray-500">Manage company policies and compliance documents</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Policy
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search policies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-input"
          >
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-input"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Policy List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table min-w-full">
            <thead>
              <tr>
                <th className="w-12">
                  <SelectCheckbox
                    checked={isAllSelected}
                    indeterminate={isPartiallySelected}
                    onChange={toggleAll}
                  />
                </th>
                <th>Policy</th>
                <th>Category</th>
                <th>Version</th>
                <th>Status</th>
                <th>Acknowledgments</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPolicies.map((policy) => (
                <tr
                  key={policy.id}
                  className={`hover:bg-gray-50 ${isSelected(policy.id) ? 'bg-accent-50' : ''}`}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <SelectCheckbox
                      checked={isSelected(policy.id)}
                      onChange={() => toggleItem(policy.id)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-primary-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="h-5 w-5 text-primary-700" />
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{policy.title}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{policy.description}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-gray-600">{policy.category_name || '-'}</span>
                  </td>
                  <td>
                    <span className="text-sm font-mono">{policy.version}</span>
                  </td>
                  <td>{statusBadge(policy.status)}</td>
                  <td>
                    <span className="text-sm">{policy.acknowledgment_count || 0}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {policy.file_path && (
                        <a
                          href={`/api/policies/${policy.id}/download`}
                          className="p-1 text-gray-500 hover:text-primary-600"
                          title="Download"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </a>
                      )}
                      <button
                        onClick={() => handleOpenModal(policy)}
                        className="p-1 text-gray-500 hover:text-primary-600"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {policy.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(policy)}
                          className="p-1 text-gray-500 hover:text-green-600"
                          title="Publish"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                      {policy.status === 'published' && (
                        <button
                          onClick={() => handleArchive(policy)}
                          className="p-1 text-gray-500 hover:text-yellow-600"
                          title="Archive"
                        >
                          <ArchiveBoxIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(policy.id)}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPolicies.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No policies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BulkActions
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
      />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={handleCloseModal}
        title={editingPolicy ? 'Edit Policy' : 'Add Policy'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="form-input"
                placeholder="e.g., Code of Conduct Policy"
              />
            </div>

            <div>
              <label className="form-label">Category *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="form-input"
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Document Type</label>
              <select
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                className="form-input"
              >
                <option value="pdf">PDF Document</option>
                <option value="video">Video</option>
                <option value="link">External Link</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="Brief description of the policy..."
              />
            </div>

            {formData.document_type === 'link' ? (
              <div className="md:col-span-2">
                <label className="form-label">External URL</label>
                <input
                  type="url"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  className="form-input"
                  placeholder="https://..."
                />
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="form-label">Upload Document</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                  <div className="space-y-1 text-center">
                    <ArrowUpTrayIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                      <label className="relative cursor-pointer rounded-md font-medium text-primary-600 hover:text-primary-500">
                        <span>Upload a file</span>
                        <input
                          type="file"
                          className="sr-only"
                          accept=".pdf,.doc,.docx,.mp4,.webm"
                          onChange={(e) => setSelectedFile(e.target.files[0])}
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOC, DOCX, MP4, WebM up to 50MB</p>
                    {selectedFile && (
                      <p className="text-sm text-primary-600 font-medium">{selectedFile.name}</p>
                    )}
                    {editingPolicy?.file_name && !selectedFile && (
                      <p className="text-sm text-gray-600">Current: {editingPolicy.file_name}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="form-label">New Hire Due (Days)</label>
              <input
                type="number"
                min="1"
                value={formData.new_hire_due_days}
                onChange={(e) => setFormData({ ...formData, new_hire_due_days: e.target.value })}
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">Days after hire to complete</p>
            </div>

            <div>
              <label className="form-label">Renewal Frequency (Months)</label>
              <input
                type="number"
                min="0"
                value={formData.renewal_frequency_months}
                onChange={(e) => setFormData({ ...formData, renewal_frequency_months: e.target.value })}
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">0 = one-time only</p>
            </div>

            <div>
              <label className="form-label">Effective Date</label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Tags</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="form-input"
                placeholder="Comma separated tags"
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.requires_acknowledgment}
                  onChange={(e) => setFormData({ ...formData, requires_acknowledgment: e.target.checked })}
                  className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Require employee acknowledgment</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingPolicy ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Policies;
