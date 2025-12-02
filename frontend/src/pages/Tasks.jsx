import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { PlusIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
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

  const completeTask = async (taskId) => {
    try {
      await api.put(`/api/tasks/${taskId}/complete`);
      fetchTasks();
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'border-l-danger-500';
      case 'high': return 'border-l-warning-500';
      case 'medium': return 'border-l-primary-500';
      case 'low': return 'border-l-gray-300';
      default: return 'border-l-gray-300';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed': return <span className="badge-success">Completed</span>;
      case 'in_progress': return <span className="badge-primary">In Progress</span>;
      case 'pending': return <span className="badge-warning">Pending</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your to-do list</p>
        </div>
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Task
        </button>
      </div>

      <div className="card">
        <div className="p-4 flex gap-2">
          {['all', 'pending', 'in_progress', 'completed'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${filter === status
                  ? 'bg-primary-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`card p-4 border-l-4 ${getPriorityColor(task.priority)} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start gap-4">
                <button
                  onClick={() => task.status !== 'completed' && completeTask(task.id)}
                  className={`mt-1 h-5 w-5 rounded-full border-2 flex-shrink-0 transition-colors
                    ${task.status === 'completed'
                      ? 'bg-success-500 border-success-500 text-white'
                      : 'border-gray-300 hover:border-primary-500'
                    }`}
                >
                  {task.status === 'completed' && (
                    <CheckCircleIcon className="h-4 w-4" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`font-medium ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </h3>
                    {getStatusBadge(task.status)}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    {task.client_name && (
                      <span>{task.client_name}</span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                    <span className="capitalize">{task.priority} priority</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="card p-8 text-center text-gray-500">
              No tasks found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Tasks;
