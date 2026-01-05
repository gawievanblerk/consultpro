import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../../components/BulkActions';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  AcademicCapIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  CheckCircleIcon,
  ClockIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon
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

function TrainingModules() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const [modules, setModules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    objectives: '',
    estimated_duration_minutes: 30,
    passing_score: 70,
    max_attempts: 3,
    is_mandatory: true,
    new_hire_due_days: 30,
    renewal_frequency_months: 12
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
  } = useBulkSelection(modules);

  useEffect(() => {
    fetchModules();
    fetchCategories();
  }, [statusFilter]);

  const fetchModules = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/api/training-modules?${params}`);
      if (response.data.success) {
        setModules(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error);
      toast.error('Failed to load training modules');
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

  const handleOpenModal = (module = null) => {
    if (module) {
      setEditingModule(module);
      setFormData({
        category_id: module.category_id || '',
        title: module.title || '',
        description: module.description || '',
        objectives: module.objectives?.join('\n') || '',
        estimated_duration_minutes: module.estimated_duration_minutes || 30,
        passing_score: module.passing_score || 70,
        max_attempts: module.max_attempts || 3,
        is_mandatory: module.is_mandatory ?? true,
        new_hire_due_days: module.new_hire_due_days || 30,
        renewal_frequency_months: module.renewal_frequency_months || 12
      });
    } else {
      setEditingModule(null);
      setFormData({
        category_id: '',
        title: '',
        description: '',
        objectives: '',
        estimated_duration_minutes: 30,
        passing_score: 70,
        max_attempts: 3,
        is_mandatory: true,
        new_hire_due_days: 30,
        renewal_frequency_months: 12
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingModule(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const data = {
        ...formData,
        objectives: formData.objectives.split('\n').filter(o => o.trim())
      };

      if (editingModule) {
        await api.put(`/api/training-modules/${editingModule.id}`, data);
        toast.success('Module updated successfully');
      } else {
        await api.post('/api/training-modules', data);
        toast.success('Module created successfully');
      }
      fetchModules();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save module:', error);
      toast.error(error.response?.data?.error || 'Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (module) => {
    const confirmed = await confirm({
      title: 'Publish Module',
      message: `Publish "${module.title}"? Module must have at least one lesson.`,
      confirmText: 'Publish',
      variant: 'primary'
    });
    if (!confirmed) return;

    try {
      await api.put(`/api/training-modules/${module.id}/publish`);
      toast.success('Module published successfully');
      fetchModules();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to publish module');
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Module',
      message: 'Are you sure you want to delete this training module?',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.delete(`/api/training-modules/${id}`);
      toast.success('Module deleted');
      fetchModules();
    } catch (error) {
      toast.error('Failed to delete module');
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Modules',
      message: `Delete ${selectedCount} module(s)?`,
      confirmText: 'Delete All',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id => api.delete(`/api/training-modules/${id}`))
      );
      toast.success(`${selectedCount} module(s) deleted`);
      clearSelection();
      fetchModules();
    } catch (error) {
      toast.error('Failed to delete some modules');
    }
  };

  const filteredModules = modules.filter(m =>
    m.title?.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Modules</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage compliance training courses</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Module
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search modules..."
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
        </div>
      </div>

      {/* Module Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <>
          {filteredModules.length > 0 && (
            <div className="flex items-center gap-3 px-2 py-2 bg-white rounded-lg border border-primary-100 mb-4">
              <SelectCheckbox
                checked={isAllSelected}
                indeterminate={isPartiallySelected}
                onChange={toggleAll}
              />
              <span className="text-sm text-gray-600">
                {isAllSelected ? 'Deselect all' : 'Select all'}
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module) => (
              <div
                key={module.id}
                className={`card hover:shadow-md transition-shadow ${isSelected(module.id) ? 'ring-2 ring-accent-400' : ''}`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div onClick={(e) => e.stopPropagation()}>
                      <SelectCheckbox
                        checked={isSelected(module.id)}
                        onChange={() => toggleItem(module.id)}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div className="h-12 w-12 bg-accent-100 rounded-lg flex items-center justify-center">
                          <AcademicCapIcon className="h-6 w-6 text-accent-700" />
                        </div>
                        {statusBadge(module.status)}
                      </div>

                      <h3 className="mt-3 font-semibold text-gray-900">{module.title}</h3>
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{module.description}</p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {module.estimated_duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpenIcon className="h-4 w-4" />
                          {module.lesson_count || 0} lessons
                        </span>
                        <span className="flex items-center gap-1">
                          <QuestionMarkCircleIcon className="h-4 w-4" />
                          {module.quiz_count || 0} quizzes
                        </span>
                      </div>

                      {module.category_name && (
                        <span className="mt-2 inline-block text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {module.category_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {module.completion_count || 0} completions
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenModal(module)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      {module.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(module)}
                          className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          title="Publish"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(module.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredModules.length === 0 && (
              <div className="col-span-full text-center py-12 text-gray-500">
                <AcademicCapIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>No training modules found</p>
                <button onClick={() => handleOpenModal()} className="mt-3 btn-primary">
                  Create your first module
                </button>
              </div>
            )}
          </div>
        </>
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
        title={editingModule ? 'Edit Training Module' : 'Create Training Module'}
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
                placeholder="e.g., Code of Conduct Training"
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Category</label>
              <select
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

            <div className="md:col-span-2">
              <label className="form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="Brief description of this training module..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label">Learning Objectives</label>
              <textarea
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                className="form-input"
                rows={3}
                placeholder="One objective per line..."
              />
              <p className="text-xs text-gray-500 mt-1">Enter one learning objective per line</p>
            </div>

            <div>
              <label className="form-label">Duration (minutes)</label>
              <input
                type="number"
                min="1"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Passing Score (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.passing_score}
                onChange={(e) => setFormData({ ...formData, passing_score: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Max Quiz Attempts</label>
              <input
                type="number"
                min="0"
                value={formData.max_attempts}
                onChange={(e) => setFormData({ ...formData, max_attempts: e.target.value })}
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">0 = unlimited</p>
            </div>

            <div>
              <label className="form-label">New Hire Due (Days)</label>
              <input
                type="number"
                min="1"
                value={formData.new_hire_due_days}
                onChange={(e) => setFormData({ ...formData, new_hire_due_days: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Renewal (Months)</label>
              <input
                type="number"
                min="0"
                value={formData.renewal_frequency_months}
                onChange={(e) => setFormData({ ...formData, renewal_frequency_months: e.target.value })}
                className="form-input"
              />
              <p className="text-xs text-gray-500 mt-1">0 = no renewal</p>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_mandatory}
                  onChange={(e) => setFormData({ ...formData, is_mandatory: e.target.checked })}
                  className="rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Mandatory for all employees</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingModule ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default TrainingModules;
