import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import Modal from '../../components/Modal';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useCompany } from '../../context/CompanyContext';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  PencilIcon,
  TrashIcon,
  UsersIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

function Departments() {
  const { toast } = useToast();
  const { confirm } = useConfirm();
  const { selectedCompany, isCompanyMode } = useCompany();

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    manager_id: '',
    parent_department_id: ''
  });

  useEffect(() => {
    if (selectedCompany?.id) {
      fetchDepartments();
      fetchEmployees();
    } else {
      setDepartments([]);
      setLoading(false);
    }
  }, [selectedCompany?.id]);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/departments', {
        params: { company_id: selectedCompany.id }
      });
      if (response.data.success) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error);
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/api/employees', {
        params: { company_id: selectedCompany.id, limit: 500 }
      });
      if (response.data.success) {
        setEmployees(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        company_id: selectedCompany.id,
        manager_id: formData.manager_id || null,
        parent_department_id: formData.parent_department_id || null
      };

      if (editingDepartment) {
        await api.put(`/api/departments/${editingDepartment.id}`, payload);
        toast.success('Department updated successfully');
      } else {
        await api.post('/api/departments', payload);
        toast.success('Department created successfully');
      }

      setModalOpen(false);
      resetForm();
      fetchDepartments();
    } catch (error) {
      console.error('Failed to save department:', error);
      toast.error(error.response?.data?.error || 'Failed to save department');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (department) => {
    setEditingDepartment(department);
    setFormData({
      name: department.name || '',
      code: department.code || '',
      description: department.description || '',
      manager_id: department.managerId || '',
      parent_department_id: department.parentDepartmentId || ''
    });
    setModalOpen(true);
  };

  const handleDelete = async (department) => {
    const confirmed = await confirm({
      title: 'Delete Department',
      message: `Are you sure you want to delete "${department.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      try {
        await api.delete(`/api/departments/${department.id}`);
        toast.success('Department deleted successfully');
        fetchDepartments();
      } catch (error) {
        console.error('Failed to delete department:', error);
        toast.error(error.response?.data?.error || 'Failed to delete department');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      manager_id: '',
      parent_department_id: ''
    });
    setEditingDepartment(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const filteredDepartments = departments.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    (d.code && d.code.toLowerCase().includes(search.toLowerCase()))
  );

  if (!selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <BuildingOfficeIcon className="h-12 w-12 text-primary-300 mb-4" />
        <h2 className="text-lg font-medium text-primary-900">No Company Selected</h2>
        <p className="mt-1 text-sm text-primary-500">
          Please select a company from the header to manage departments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-primary-900 tracking-tight">Departments</h1>
          <p className="mt-1 text-primary-500">
            Manage departments for {selectedCompany.trading_name || selectedCompany.legal_name}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Department
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-primary-100 p-4">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400" />
          <input
            type="text"
            placeholder="Search departments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Departments list */}
      <div className="bg-white rounded-xl border border-primary-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-accent-200 border-t-accent-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <UserGroupIcon className="h-12 w-12 text-primary-300 mb-4" />
            <h3 className="text-lg font-medium text-primary-900">No departments found</h3>
            <p className="mt-1 text-sm text-primary-500">
              {search ? 'Try adjusting your search.' : 'Get started by creating a department.'}
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-primary-100">
            <thead className="bg-primary-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                  Department
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                  Parent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-primary-500 uppercase tracking-wider">
                  Employees
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-primary-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-primary-100">
              {filteredDepartments.map((department) => (
                <tr key={department.id} className="hover:bg-primary-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-accent-100 rounded-lg flex items-center justify-center">
                        <UserGroupIcon className="h-5 w-5 text-accent-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-primary-900">{department.name}</div>
                        {department.description && (
                          <div className="text-sm text-primary-500 truncate max-w-xs">{department.description}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-500">
                    {department.code || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-500">
                    {department.managerName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-primary-500">
                    {department.parentDepartmentName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent-100 text-accent-800">
                      <UsersIcon className="h-3 w-3 mr-1" />
                      {department.employeeCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <button
                      onClick={() => handleEdit(department)}
                      className="text-primary-600 hover:text-primary-900 mr-3"
                      title="Edit"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(department)}
                      className="text-danger-600 hover:text-danger-900"
                      title="Delete"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDepartment ? 'Edit Department' : 'Add Department'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Department Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input w-full"
              placeholder="e.g., Human Resources"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Code
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="input w-full"
              placeholder="e.g., HR"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input w-full"
              rows="2"
              placeholder="Brief description of the department"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Manager
            </label>
            <select
              value={formData.manager_id}
              onChange={(e) => setFormData({ ...formData, manager_id: e.target.value })}
              className="input w-full"
            >
              <option value="">Select a manager</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name} - {emp.job_title || 'No title'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1">
              Parent Department
            </label>
            <select
              value={formData.parent_department_id}
              onChange={(e) => setFormData({ ...formData, parent_department_id: e.target.value })}
              className="input w-full"
            >
              <option value="">None (Top-level department)</option>
              {departments
                .filter(d => d.id !== editingDepartment?.id)
                .map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
            >
              {saving ? 'Saving...' : editingDepartment ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Departments;
