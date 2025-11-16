import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Distributions
export const uploadDistributionJSON = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/distributions/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const getDistributions = async (filters = {}) => {
  const response = await api.get('/distributions', { params: filters });
  return response.data.distributions;
};

export const getDistribution = async (id) => {
  const response = await api.get(`/distributions/${id}`);
  return response.data;
};

export const approveDistribution = async (id, approver, signature = null) => {
  const response = await api.post(`/distributions/${id}/approve`, {
    approver,
    signature,
  });
  return response.data;
};

export const rejectDistribution = async (id, approver, reason = '') => {
  const response = await api.post(`/distributions/${id}/reject`, {
    approver,
    reason,
  });
  return response.data;
};

export const executeDistribution = async (id) => {
  const response = await api.post(`/distributions/${id}/execute`);
  return response.data;
};

// Approvals
export const getApprovalsByApprover = async (approver) => {
  const response = await api.get(`/approvals/${approver}`);
  return response.data.approvals;
};

export const getPendingApprovals = async (approver) => {
  const response = await api.get(`/approvals/${approver}/pending`);
  return response.data.pending;
};

// Logs
export const getDistributionLogs = async (id, limit = 100) => {
  const response = await api.get(`/distributions/${id}/logs`, {
    params: { limit },
  });
  return response.data.logs;
};

// Multisig
export const getMultisigInfo = async () => {
  const response = await api.get('/multisig/info');
  return response.data;
};

// Health check
export const healthCheck = async () => {
  const response = await api.get('/health');
  return response.data;
};

export default api;
