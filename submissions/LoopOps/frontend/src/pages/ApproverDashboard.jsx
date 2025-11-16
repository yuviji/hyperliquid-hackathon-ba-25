import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Wallet, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { getPendingApprovals, approveDistribution, rejectDistribution } from '../lib/api';
import StatusBadge from '../components/StatusBadge';

function ApproverDashboard() {
  const [walletAddress, setWalletAddress] = useState('');
  const [connected, setConnected] = useState(false);
  const queryClient = useQueryClient();

  const { data: pendingApprovals = [], isLoading, refetch } = useQuery({
    queryKey: ['pendingApprovals', walletAddress],
    queryFn: () => getPendingApprovals(walletAddress),
    enabled: connected && !!walletAddress,
    refetchInterval: 10000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ distributionId }) => 
      approveDistribution(distributionId, walletAddress),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingApprovals', walletAddress]);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ distributionId, reason }) => 
      rejectDistribution(distributionId, walletAddress, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['pendingApprovals', walletAddress]);
    },
  });

  const handleConnect = (e) => {
    e.preventDefault();
    if (walletAddress && walletAddress.startsWith('0x') && walletAddress.length === 42) {
      setConnected(true);
    } else {
      alert('Please enter a valid Ethereum address');
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    setWalletAddress('');
  };

  const handleApprove = (distributionId) => {
    if (window.confirm('Are you sure you want to approve this distribution?')) {
      approveMutation.mutate({ distributionId });
    }
  };

  const handleReject = (distributionId) => {
    const reason = window.prompt('Please provide a reason for rejection (optional):');
    if (reason !== null) {
      rejectMutation.mutate({ distributionId, reason });
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approver Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Review and approve pending distributions
        </p>
      </div>

      {/* Wallet Connection */}
      {!connected ? (
        <div className="max-w-md mx-auto">
          <div className="bg-white p-8 rounded-lg border border-gray-200">
            <div className="text-center mb-6">
              <Wallet className="w-16 h-16 mx-auto text-primary-600 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900">Connect Wallet</h2>
              <p className="text-sm text-gray-600 mt-2">
                Enter your wallet address to view pending approvals
              </p>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Wallet Address
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                  required
                />
                <p className="mt-2 text-xs text-gray-500">
                  This should be one of the approver addresses configured in the distributions
                </p>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Connect
              </button>
            </form>
          </div>
        </div>
      ) : (
        <>
          {/* Connected Header */}
          <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <div>
                <p className="text-sm text-gray-600">Connected as</p>
                <p className="font-mono text-sm text-gray-900">{walletAddress}</p>
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pending Approvals</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">
                    {pendingApprovals.length}
                  </p>
                </div>
                <Clock className="w-10 h-10 text-yellow-400" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {pendingApprovals.filter(a => a.approved_at).length}
                  </p>
                </div>
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Rejected</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">
                    {pendingApprovals.filter(a => a.rejected_at).length}
                  </p>
                </div>
                <XCircle className="w-10 h-10 text-red-400" />
              </div>
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                Pending Approvals
              </h2>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-gray-500">
                Loading approvals...
              </div>
            ) : pendingApprovals.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
                <p className="text-gray-600">No pending approvals</p>
                <p className="text-sm text-gray-500 mt-2">
                  You're all caught up!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pendingApprovals.map((approval) => {
                  const dist = approval.distributions;
                  if (!dist) return null;

                  return (
                    <div key={approval.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {dist.name || dist.description || 'Distribution'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {dist.description}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                              {dist.type === 'loopdrop' ? 'LoopDrop' : 'Loyalty Reward'}
                            </span>
                            <StatusBadge status={dist.status} />
                          </div>
                        </div>
                      </div>

                      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <dt className="text-xs text-gray-600">Token</dt>
                          <dd className="mt-1 font-mono text-sm text-gray-900">
                            {dist.token.slice(0, 10)}...
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-600">Amount</dt>
                          <dd className="mt-1 font-mono text-sm text-gray-900">
                            {(parseFloat(dist.total_amount) / 1e18).toFixed(4)}
                          </dd>
                        </div>
                        {dist.schedule && (
                          <div>
                            <dt className="text-xs text-gray-600">Schedule</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {new Date(dist.schedule).toLocaleDateString()}
                            </dd>
                          </div>
                        )}
                        {dist.frequency && (
                          <div>
                            <dt className="text-xs text-gray-600">Frequency</dt>
                            <dd className="mt-1 text-sm text-gray-900 capitalize">
                              {dist.frequency}
                            </dd>
                          </div>
                        )}
                      </dl>

                      {approval.approved_at || approval.rejected_at ? (
                        <div className={`p-3 rounded-lg flex items-center gap-2 ${
                          approval.approved_at 
                            ? 'bg-green-50 text-green-900' 
                            : 'bg-red-50 text-red-900'
                        }`}>
                          {approval.approved_at ? (
                            <>
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-medium">
                                You approved this on {new Date(approval.approved_at).toLocaleDateString()}
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5" />
                              <span className="text-sm font-medium">
                                You rejected this on {new Date(approval.rejected_at).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(dist.id)}
                            disabled={approveMutation.isPending}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(dist.id)}
                            disabled={rejectMutation.isPending}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-5 h-5" />
                            Reject
                          </button>
                        </div>
                      )}

                      {(approveMutation.isError || rejectMutation.isError) && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          <p className="text-sm text-red-900">
                            {approveMutation.error?.response?.data?.error || 
                             rejectMutation.error?.response?.data?.error ||
                             'An error occurred'}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default ApproverDashboard;
