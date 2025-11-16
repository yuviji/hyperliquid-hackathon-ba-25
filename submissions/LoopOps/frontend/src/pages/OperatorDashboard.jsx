import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Package, Calendar, Clock, Users, ExternalLink, Filter } from 'lucide-react';
import { getDistributions } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

function OperatorDashboard() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: distributions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['distributions', { status: statusFilter, type: typeFilter }],
    queryFn: () => getDistributions({ status: statusFilter || undefined, type: typeFilter || undefined }),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const stats = React.useMemo(() => {
    return {
      total: distributions.length,
      pending: distributions.filter(d => d.status === 'pending-approval').length,
      approved: distributions.filter(d => d.status === 'approved').length,
      executed: distributions.filter(d => d.status === 'executed').length,
    };
  }, [distributions]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading distributions: {error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Operator Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage and monitor all distributions
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
            </div>
            <Package className="w-10 h-10 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Approval</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{stats.approved}</p>
            </div>
            <Users className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Executed</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.executed}</p>
            </div>
            <Calendar className="w-10 h-10 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="font-medium text-gray-700">Filters:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="parsed">Parsed</option>
          <option value="pending-approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="executing">Executing</option>
          <option value="executed">Executed</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        >
          <option value="">All Types</option>
          <option value="loopdrop">LoopDrop</option>
          <option value="loyalty_reward">Loyalty Reward</option>
        </select>

        {(statusFilter || typeFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setTypeFilter('');
            }}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Distributions Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distribution
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    Loading distributions...
                  </td>
                </tr>
              ) : distributions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                    No distributions found. Upload a JSON file to get started.
                  </td>
                </tr>
              ) : (
                distributions.map((dist) => (
                  <tr
                    key={dist.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/operator/distribution/${dist.id}`)}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {dist.name || dist.description || 'Unnamed Distribution'}
                        </p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">
                          {dist.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-700">
                        {dist.type === 'loopdrop' ? 'LoopDrop' : 'Loyalty Reward'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={dist.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {dist.schedule ? (
                        new Date(dist.schedule).toLocaleDateString()
                      ) : dist.frequency ? (
                        <span className="capitalize">{dist.frequency}</span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                      {(parseFloat(dist.total_amount) / 1e18).toFixed(4)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/operator/distribution/${dist.id}`);
                        }}
                        className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        View <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OperatorDashboard;
