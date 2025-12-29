import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import Modal from '../components/Modal';
import BulkActions, { SelectCheckbox, useBulkSelection } from '../components/BulkActions';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useHelp } from '../context/HelpContext';
import { HelpButton } from '../components/HelpModal';
import { PlusIcon, CheckIcon, ClockIcon, TrashIcon } from '@heroicons/react/24/outline';

function Tasks() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { showHelp } = useHelp();
  const [tasks, setTasks] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    client_id: '',
    priority: 'medium',
    status: 'pending',
    due_date: ''
  });

  const {
    selectedIds,
    selectedCount,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected
  } = useBulkSelection(tasks);

  useEffect(() => {
    fetchTasks();
    fetchClients();
  }, [filter]);

  const fetchTasks = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/api/tasks', { params });
      if (response.data.success) {
        setTasks(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await api.get('/api/clients');
      if (response.data.success) {
        setClients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch clients:', error);
    }
  };

  const handleOpenModal = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title || '',
        description: task.description || '',
        client_id: task.client_id || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        due_date: task.due_date ? task.due_date.split('T')[0] : ''
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        client_id: '',
        priority: 'medium',
        status: 'pending',
        due_date: ''
      });
    }
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTask) {
        await api.put(`/api/tasks/${editingTask.id}`, formData);
        toast.success('Task updated successfully');
      } else {
        await api.post('/api/tasks', formData);
        toast.success('Task created successfully');
      }
      fetchTasks();
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save task:', error);
      toast.error('Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await api.delete(`/api/tasks/${id}`);
      toast.success('Task deleted successfully');
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleBulkDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Tasks',
      message: `Are you sure you want to delete ${selectedCount} task(s)? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/api/tasks/${id}`)));
      toast.success(`${selectedCount} task(s) deleted successfully`);
      clearSelection();
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete tasks:', error);
      toast.error('Failed to delete some tasks');
    }
  };

  const completeTask = async (taskId) => {
    try {
      await api.put(`/api/tasks/${taskId}`, { status: 'completed' });
      fetchTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const getPriorityIndicator = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-danger-500';
      case 'high': return 'bg-warning-500';
      case 'medium': return 'bg-info-500';
      case 'low': return 'bg-primary-300';
      default: return 'bg-primary-300';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="badge-success">Completed</span>;
      case 'in_progress': return <span className="badge-info">In Progress</span>;
      case 'pending': return <span className="badge-warning">Pending</span>;
      default: return <span className="badge-neutral">{status}</span>;
    }
  };

  const filterTabs = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'completed', label: 'Completed' }
  ];

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">Tasks</h1>
          <p className="mt-1 text-primary-500">Manage your to-do list</p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton onClick={() => showHelp('tasks')} />
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <PlusIcon className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="bg-white rounded-xl border border-primary-100 p-2">
        <div className="flex gap-1 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${filter === tab.key
                  ? 'bg-primary-900 text-white'
                  : 'text-primary-600 hover:bg-primary-50 hover:text-primary-900'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks list */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-xl border border-primary-100 p-5 hover:border-primary-200 hover:shadow-sm transition-all duration-200 cursor-pointer ${isSelected(task.id) ? 'bg-accent-50 border-accent-200' : ''}`}
              onClick={() => handleOpenModal(task)}
            >
              <div className="flex items-start gap-4">
                {/* Selection checkbox */}
                <div onClick={(e) => e.stopPropagation()} className="mt-0.5">
                  <SelectCheckbox
                    checked={isSelected(task.id)}
                    onChange={() => toggleItem(task.id)}
                  />
                </div>

                {/* Completion button */}
                <button
                  onClick={(e) => { e.stopPropagation(); task.status !== 'completed' && completeTask(task.id); }}
                  className={`mt-0.5 h-6 w-6 rounded-full border-2 flex-shrink-0 transition-all duration-200 flex items-center justify-center
                    ${task.status === 'completed'
                      ? 'bg-accent-500 border-accent-500 text-white'
                      : 'border-primary-300 hover:border-primary-500 hover:bg-primary-50'
                    }`}
                >
                  {task.status === 'completed' && <CheckIcon className="h-3.5 w-3.5" />}
                </button>

                {/* Priority indicator */}
                <div className={`w-1 h-12 rounded-full flex-shrink-0 ${getPriorityIndicator(task.priority)}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className={`font-medium ${task.status === 'completed' ? 'text-primary-400 line-through' : 'text-primary-900'}`}>
                      {task.title}
                    </h3>
                    {getStatusBadge(task.status)}
                  </div>
                  {task.description && (
                    <p className="text-sm text-primary-500 mb-3 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-primary-400">
                    {task.client_name && (
                      <span className="font-medium">{task.client_name}</span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <span className="capitalize">{task.priority}</span>
                  </div>
                </div>

                {/* Delete button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                  className="p-2 text-primary-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="bg-white rounded-xl border border-primary-100 p-12 text-center">
              <CheckIcon className="h-12 w-12 text-primary-200 mx-auto mb-4" />
              <p className="text-primary-500 font-medium">No tasks found</p>
              <p className="text-sm text-primary-400 mt-1">Create a new task to get started</p>
            </div>
          )}
        </div>
      )}

      <BulkActions
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
      />

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editingTask ? 'Edit Task' : 'New Task'}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              placeholder="What needs to be done?"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-900 placeholder-primary-400 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              rows={3}
              placeholder="Add more details..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">Client</label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
              className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            >
              <option value="">No client</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-2">Due Date</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              className="w-full px-4 py-2.5 bg-primary-50/50 border border-primary-200 rounded-lg text-primary-700 transition-all focus:outline-none focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
            />
          </div>
          <div className="flex justify-end gap-3 pt-5 border-t border-primary-100">
            <button type="button" onClick={handleCloseModal} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : (editingTask ? 'Update Task' : 'Create Task')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Tasks;
