import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline';

function LeaveBalances() {
  const { toast } = useToast();
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchBalances();
  }, [year]);

  const fetchBalances = async () => {
    try {
      const response = await api.get('/api/leave-balances/summary', { params: { year } });
      if (response.data.success) {
        setBalances(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch leave balances:', error);
      toast.error('Failed to load leave balances');
    } finally {
      setLoading(false);
    }
  };

  const handleInitializeBalances = async () => {
    setInitializing(true);
    try {
      const response = await api.post('/api/leave-balances/initialize', { year });
      if (response.data.success) {
        toast.success(`Initialized ${response.data.data.created} new balance records`);
        fetchBalances();
      }
    } catch (error) {
      console.error('Failed to initialize balances:', error);
      toast.error('Failed to initialize leave balances');
    } finally {
      setInitializing(false);
    }
  };

  const filteredBalances = balances.filter(b =>
    `${b.first_name} ${b.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    b.department?.toLowerCase().includes(search.toLowerCase())
  );

  const getProgressColor = (used, total) => {
    if (total === 0) return 'bg-gray-200';
    const percentage = (used / total) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Balances</h1>
          <p className="mt-1 text-sm text-gray-500">View and manage employee leave entitlements</p>
        </div>
        <div className="flex gap-2">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="form-input w-32"
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={handleInitializeBalances}
            disabled={initializing}
            className="btn-secondary"
          >
            <ArrowPathIcon className={`h-5 w-5 mr-2 ${initializing ? 'animate-spin' : ''}`} />
            {initializing ? 'Initializing...' : 'Initialize Balances'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by employee name or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBalances.map((staff) => (
            <div key={staff.staff_id} className="card">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-700">
                        {staff.first_name?.[0]}{staff.last_name?.[0]}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-900">{staff.first_name} {staff.last_name}</p>
                      <p className="text-xs text-gray-500">{staff.employee_id} | {staff.department || 'No Department'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  {staff.balances?.filter(b => b.leave_type_id).map((balance) => (
                    <div key={balance.leave_type_id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ backgroundColor: `${balance.color}20`, color: balance.color }}
                        >
                          {balance.leave_type_code}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {balance.available}
                        <span className="text-xs font-normal text-gray-500"> / {balance.entitled}</span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Used: {balance.used} | Pending: {balance.pending}
                      </div>
                      <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getProgressColor(balance.used, balance.entitled)}`}
                          style={{ width: `${Math.min((balance.used / balance.entitled) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!staff.balances || staff.balances.filter(b => b.leave_type_id).length === 0) && (
                    <div className="col-span-full text-center py-4 text-gray-500 text-sm">
                      No leave balances configured. Click "Initialize Balances" to set up.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredBalances.length === 0 && (
            <div className="card p-12 text-center text-gray-500">
              No staff members found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LeaveBalances;
