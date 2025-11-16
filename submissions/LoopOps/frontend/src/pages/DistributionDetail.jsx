import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  ExternalLink,
  Play,
  AlertCircle
} from 'lucide-react';
import { getDistribution, executeDistribution } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

function DistributionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['distribution', id],
    queryFn: () => getDistribution(id),
    refetchInterval: 5000,
  });

  const executeMutation = useMutation({
    mutationFn: () => executeDistribution(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['distribution', id]);
      queryClient.invalidateQueries(['distributions']);
    },
  });

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading distribution details...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading distribution: {error?.message}</p>
        <button
          onClick={() => navigate('/operator')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const { distribution, recipients, approvals, proposal, logs } = data;

  const approvedCount = approvals.filter(a => a.approved_at && !a.rejected_at).length;
  const canExecute = distribution.status === 'approved' || distribution.status === 'scheduled';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/operator')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            {distribution.name || distribution.description || 'Distribution Details'}
          </h1>
          <p className="mt-1 text-gray-600">
            {distribution.type === 'loopdrop' ? 'LoopDrop' : 'Loyalty Reward'}
          </p>
        </div>
        <StatusBadge status={distribution.status} />
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Overview</h2>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-gray-600">Token Address</dt>
                <dd className="mt-1 font-mono text-sm text-gray-900 break-all">
                  {distribution.token}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Total Amount</dt>
                <dd className="mt-1 font-mono text-sm text-gray-900">
                  {(parseFloat(distribution.total_amount) / 1e18).toFixed(4)}
                </dd>
              </div>
              {distribution.schedule && (
                <div>
                  <dt className="text-sm text-gray-600">Scheduled</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(distribution.schedule).toLocaleString()}
                  </dd>
                </div>
              )}
              {distribution.frequency && (
                <div>
                  <dt className="text-sm text-gray-600">Frequency</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">
                    {distribution.frequency}
                  </dd>
                </div>
              )}
              {distribution.start_date && (
                <div>
                  <dt className="text-sm text-gray-600">Start Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(distribution.start_date).toLocaleDateString()}
                  </dd>
                </div>
              )}
              {distribution.end_date && (
                <div>
                  <dt className="text-sm text-gray-600">End Date</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(distribution.end_date).toLocaleDateString()}
                  </dd>
                </div>
              )}
            </dl>
            {distribution.description && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <dt className="text-sm text-gray-600">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{distribution.description}</dd>
              </div>
            )}
          </div>

          {/* Recipients */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Recipients ({recipients.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Address
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recipients.map((recipient) => (
                    <tr key={recipient.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm text-gray-900">
                        {recipient.address.slice(0, 10)}...{recipient.address.slice(-8)}
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-gray-900">
                        {(parseFloat(recipient.amount) / 1e18).toFixed(4)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={recipient.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Logs */}
          {logs && logs.length > 0 && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border ${
                      log.level === 'error'
                        ? 'bg-red-50 border-red-200'
                        : log.level === 'warning'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {log.level === 'error' && <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                      {log.level === 'warning' && <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{log.message}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Approvals */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Approvals ({approvedCount}/{proposal?.threshold || approvals.length})
            </h2>
            <div className="space-y-3">
              {approvals.map((approval) => (
                <div
                  key={approval.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {approval.approved_at ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : approval.rejected_at ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-gray-400" />
                    )}
                    <span className="font-mono text-sm text-gray-900">
                      {approval.approver.slice(0, 6)}...{approval.approver.slice(-4)}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {approval.approved_at
                      ? new Date(approval.approved_at).toLocaleDateString()
                      : approval.rejected_at
                      ? 'Rejected'
                      : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Proposal */}
          {proposal && (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Proposal Info</h2>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="text-gray-600">Multisig Address</dt>
                  <dd className="mt-1 font-mono text-gray-900 break-all">
                    {proposal.multisig_address}
                  </dd>
                </div>
                {proposal.multisig_tx_id && (
                  <div>
                    <dt className="text-gray-600">Transaction ID</dt>
                    <dd className="mt-1 font-mono text-gray-900">
                      {proposal.multisig_tx_id}
                    </dd>
                  </div>
                )}
                {proposal.tx_hash && (
                  <div>
                    <dt className="text-gray-600">Transaction Hash</dt>
                    <dd className="mt-1 font-mono text-gray-900 break-all flex items-center gap-2">
                      {proposal.tx_hash.slice(0, 10)}...{proposal.tx_hash.slice(-8)}
                      <a
                        href={`https://hyperevmscan.io/tx/${proposal.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Execute Button */}
          {canExecute && (
            <button
              onClick={() => executeMutation.mutate()}
              disabled={executeMutation.isPending}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
            >
              {executeMutation.isPending ? (
                <>
                  <Clock className="w-5 h-5 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Execute Now
                </>
              )}
            </button>
          )}

          {executeMutation.isError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                {executeMutation.error.response?.data?.error || executeMutation.error.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DistributionDetail;
