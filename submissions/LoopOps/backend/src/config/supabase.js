import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Helper functions for database operations
export const db = {
  // Distributions
  async createDistribution(data) {
    const { data: distribution, error } = await supabase
      .from('distributions')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return distribution;
  },

  async getDistribution(id) {
    const { data, error } = await supabase
      .from('distributions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async listDistributions(filters = {}) {
    let query = supabase
      .from('distributions')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async updateDistribution(id, updates) {
    const { data, error } = await supabase
      .from('distributions')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Proposals
  async createProposal(data) {
    const { data: proposal, error } = await supabase
      .from('proposals')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return proposal;
  },

  async getProposal(distributionId) {
    const { data, error } = await supabase
      .from('proposals')
      .select('*')
      .eq('distribution_id', distributionId)
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateProposal(id, updates) {
    const { data, error } = await supabase
      .from('proposals')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Recipients
  async createRecipients(recipients) {
    const { data, error } = await supabase
      .from('recipients')
      .insert(recipients)
      .select();
    
    if (error) throw error;
    return data;
  },

  async getRecipients(distributionId) {
    const { data, error } = await supabase
      .from('recipients')
      .select('*')
      .eq('distribution_id', distributionId);
    
    if (error) throw error;
    return data;
  },

  async updateRecipientStatus(id, status) {
    const { data, error } = await supabase
      .from('recipients')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Approvals
  async createApproval(data) {
    const { data: approval, error } = await supabase
      .from('approvals')
      .insert(data)
      .select()
      .single();
    
    if (error) throw error;
    return approval;
  },

  async getApprovals(distributionId) {
    const { data, error } = await supabase
      .from('approvals')
      .select('*')
      .eq('distribution_id', distributionId);
    
    if (error) throw error;
    return data;
  },

  async getApprovalsByApprover(approver) {
    const { data, error } = await supabase
      .from('approvals')
      .select('*, distributions(*)')
      .eq('approver', approver);
    
    if (error) throw error;
    return data;
  },

  async updateApproval(distributionId, approver, updates) {
    const { data, error } = await supabase
      .from('approvals')
      .update(updates)
      .eq('distribution_id', distributionId)
      .eq('approver', approver)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Logs
  async createLog(data) {
    const { error } = await supabase
      .from('logs')
      .insert(data);
    
    if (error) throw error;
  },

  async getLogs(distributionId, limit = 100) {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('distribution_id', distributionId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  }
};

export default supabase;
