import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  AcademicCapIcon,
  PlayCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  TrophyIcon,
  ArrowRightIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

function MyTraining() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { showError } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/training-progress/my-assignments');
      setAssignments(response.data.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      showError('Failed to load training assignments');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (assignment) => {
    if (assignment.status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
          <CheckCircleSolidIcon className="w-3 h-3" />
          Completed
        </span>
      );
    }
    if (assignment.due_date && new Date(assignment.due_date) < new Date() && assignment.status !== 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          <ExclamationTriangleIcon className="w-3 h-3" />
          Overdue
        </span>
      );
    }
    if (assignment.status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
          <PlayCircleIcon className="w-3 h-3" />
          In Progress
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
        <ClockIcon className="w-3 h-3" />
        Not Started
      </span>
    );
  };

  const getProgressPercent = (assignment) => {
    if (assignment.total_lessons === 0) return 0;
    return Math.round((assignment.completed_lessons / assignment.total_lessons) * 100);
  };

  const filteredAssignments = assignments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return a.status === 'pending';
    if (filter === 'in_progress') return a.status === 'in_progress';
    if (filter === 'completed') return a.status === 'completed';
    if (filter === 'overdue') {
      return a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed';
    }
    return true;
  });

  const stats = {
    total: assignments.length,
    completed: assignments.filter(a => a.status === 'completed').length,
    in_progress: assignments.filter(a => a.status === 'in_progress').length,
    overdue: assignments.filter(a =>
      a.due_date && new Date(a.due_date) < new Date() && a.status !== 'completed'
    ).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900">My Training</h1>
          <p className="text-sm text-primary-500 mt-1">
            Complete your assigned training modules
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <AcademicCapIcon className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-900">{stats.total}</p>
              <p className="text-xs text-primary-500">Total Assigned</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-primary-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PlayCircleIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats.in_progress}</p>
              <p className="text-xs text-primary-500">In Progress</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-primary-100 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              <p className="text-xs text-primary-500">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'All' },
          { key: 'pending', label: 'Not Started' },
          { key: 'in_progress', label: 'In Progress' },
          { key: 'completed', label: 'Completed' },
          { key: 'overdue', label: 'Overdue' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              filter === tab.key
                ? 'bg-accent-600 text-white'
                : 'bg-white text-primary-600 border border-primary-200 hover:bg-primary-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Training List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-600"></div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-primary-100">
          <AcademicCapIcon className="mx-auto h-12 w-12 text-primary-300" />
          <h3 className="mt-2 text-sm font-medium text-primary-900">No training assignments</h3>
          <p className="mt-1 text-sm text-primary-500">
            {assignments.length === 0
              ? 'You have no training assigned at this time.'
              : 'No training matches the selected filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map(assignment => {
            const progress = getProgressPercent(assignment);
            const isOverdue = assignment.due_date &&
              new Date(assignment.due_date) < new Date() &&
              assignment.status !== 'completed';

            return (
              <div
                key={assignment.assignment_id}
                className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
                  isOverdue ? 'border-red-200' : 'border-primary-100'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Module Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        assignment.is_mandatory ? 'bg-red-100' : 'bg-primary-100'
                      }`}>
                        <AcademicCapIcon className={`w-6 h-6 ${
                          assignment.is_mandatory ? 'text-red-600' : 'text-primary-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-primary-900">
                            {assignment.module_title}
                          </h3>
                          {assignment.is_mandatory && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-700">
                              Mandatory
                            </span>
                          )}
                          {getStatusBadge(assignment)}
                        </div>
                        {assignment.module_description && (
                          <p className="text-sm text-primary-600 mt-1 line-clamp-2">
                            {assignment.module_description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-primary-500">
                          <span className="flex items-center gap-1">
                            <DocumentTextIcon className="w-4 h-4" />
                            {assignment.total_lessons} lessons
                          </span>
                          {assignment.due_date && (
                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600' : ''}`}>
                              <CalendarIcon className="w-4 h-4" />
                              Due: {new Date(assignment.due_date).toLocaleDateString()}
                            </span>
                          )}
                          {assignment.certificate_code && (
                            <span className="flex items-center gap-1 text-green-600">
                              <TrophyIcon className="w-4 h-4" />
                              Certificate Earned
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress & Action */}
                  <div className="flex items-center gap-4 lg:w-64">
                    {assignment.status !== 'completed' ? (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center justify-between text-xs text-primary-600 mb-1">
                            <span>Progress</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-2 bg-primary-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent-500 rounded-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => navigate(`/dashboard/take-training/${assignment.assignment_id}`)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-accent-600 rounded-lg hover:bg-accent-700 transition-colors whitespace-nowrap"
                        >
                          {assignment.status === 'in_progress' ? 'Continue' : 'Start'}
                          <ArrowRightIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-3">
                        {assignment.score !== null && (
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">{assignment.score}%</p>
                            <p className="text-xs text-primary-500">Score</p>
                          </div>
                        )}
                        <button
                          onClick={() => navigate(`/dashboard/take-training/${assignment.assignment_id}`)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors"
                        >
                          Review
                          <ArrowRightIcon className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyTraining;
