import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { PlusIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';

function Staff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchStaff();
  }, [filter]);

  const fetchStaff = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await api.get('/api/staff', { params });
      if (response.data.success) {
        setStaff(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStaff = staff.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    s.job_title?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status, isAvailable) => {
    if (!isAvailable) return <span className="badge-warning">Deployed</span>;
    switch (status) {
      case 'active': return <span className="badge-success">Available</span>;
      case 'on_leave': return <span className="badge-primary">On Leave</span>;
      default: return <span className="badge">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Pool</h1>
          <p className="mt-1 text-sm text-gray-500">Outsourced personnel management</p>
        </div>
        <button className="btn-primary">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Staff
        </button>
      </div>

      <div className="card">
        <div className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="form-input w-full sm:w-48"
          >
            <option value="all">All Status</option>
            <option value="active">Available</option>
            <option value="deployed">Deployed</option>
            <option value="on_leave">On Leave</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-900"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStaff.map((person) => (
            <div key={person.id} className="card hover:shadow-md transition-shadow cursor-pointer">
              <div className="p-5">
                <div className="flex items-start">
                  <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-primary-900" />
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-gray-900">
                        {person.first_name} {person.last_name}
                      </p>
                      {getStatusBadge(person.status, person.is_available)}
                    </div>
                    <p className="text-sm text-gray-500">{person.job_title}</p>
                    <p className="text-xs text-gray-400 mt-1">ID: {person.employee_id}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex flex-wrap gap-1">
                    {person.skills?.slice(0, 3).map((skill, i) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredStaff.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              No staff found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Staff;
