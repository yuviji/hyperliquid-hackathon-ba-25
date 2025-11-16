import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import { db } from './config/supabase.js';
import { DistributionParser } from './engine/parser.js';
import { DistributionExecutor } from './engine/executor.js';
import { DistributionScheduler } from './engine/scheduler.js';
import { LoopOpsMultisigProvider } from './multisig/loopops-multisig.js';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const parser = new DistributionParser();
const executor = new DistributionExecutor();
const scheduler = new DistributionScheduler();
const multisigProvider = new LoopOpsMultisigProvider({
  rpcUrl: process.env.HYPEREVM_RPC_URL,
  multisigAddress: process.env.HYPEREVM_MULTISIG_ADDRESS,
  privateKey: process.env.EXECUTOR_PRIVATE_KEY
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Upload and parse distribution JSON
app.post('/api/distributions/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const jsonContent = req.file.buffer.toString('utf-8');
    const json = JSON.parse(jsonContent);

    const results = await parser.parseJSON(json);

    res.json({
      success: true,
      results: {
        loopDrops: results.loopDrops.length,
        loyaltyRewards: results.loyaltyRewards.length,
        errors: results.errors
      },
      distributions: [
        ...results.loopDrops,
        ...results.loyaltyRewards
      ]
    });
  } catch (error) {
    console.error('Error uploading distribution:', error);
    res.status(500).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// Get all distributions
app.get('/api/distributions', async (req, res) => {
  try {
    const { status, type } = req.query;
    const filters = {};
    
    if (status) filters.status = status;
    if (type) filters.type = type;

    const distributions = await db.listDistributions(filters);
    res.json({ distributions });
  } catch (error) {
    console.error('Error fetching distributions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get distribution by ID with full details
app.get('/api/distributions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const distribution = await db.getDistribution(id);
    if (!distribution) {
      return res.status(404).json({ error: 'Distribution not found' });
    }

    const recipients = await db.getRecipients(id);
    const approvals = await db.getApprovals(id);
    const proposal = await db.getProposal(id);
    const logs = await db.getLogs(id);

    res.json({
      distribution,
      recipients,
      approvals,
      proposal,
      logs
    });
  } catch (error) {
    console.error('Error fetching distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve a distribution
app.post('/api/distributions/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approver, signature } = req.body;

    if (!approver) {
      return res.status(400).json({ error: 'Approver address is required' });
    }

    // Check if approver exists in the distribution
    const approvals = await db.getApprovals(id);
    const approval = approvals.find(a => a.approver.toLowerCase() === approver.toLowerCase());

    if (!approval) {
      return res.status(403).json({ error: 'Not authorized to approve this distribution' });
    }

    if (approval.approved_at) {
      return res.status(400).json({ error: 'Already approved' });
    }

    // Update approval
    const updated = await db.updateApproval(id, approver, {
      approved_at: new Date().toISOString(),
      signature: signature || null
    });

    // Check if we have enough approvals
    const allApprovals = await db.getApprovals(id);
    const approvedCount = allApprovals.filter(a => a.approved_at && !a.rejected_at).length;
    const proposal = await db.getProposal(id);

    if (approvedCount >= proposal.threshold) {
      await db.updateDistribution(id, { status: 'approved' });
      
      await db.createLog({
        level: 'info',
        distribution_id: id,
        message: 'Distribution approved - threshold reached',
        metadata: { approvedCount, threshold: proposal.threshold }
      });
    }

    await db.createLog({
      level: 'info',
      distribution_id: id,
      message: `Approved by ${approver}`,
      metadata: { approver, timestamp: new Date().toISOString() }
    });

    res.json({ 
      success: true,
      approval: updated,
      approvedCount,
      threshold: proposal.threshold
    });
  } catch (error) {
    console.error('Error approving distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject a distribution
app.post('/api/distributions/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { approver, reason } = req.body;

    if (!approver) {
      return res.status(400).json({ error: 'Approver address is required' });
    }

    // Check if approver exists in the distribution
    const approvals = await db.getApprovals(id);
    const approval = approvals.find(a => a.approver.toLowerCase() === approver.toLowerCase());

    if (!approval) {
      return res.status(403).json({ error: 'Not authorized to reject this distribution' });
    }

    // Update approval
    const updated = await db.updateApproval(id, approver, {
      rejected_at: new Date().toISOString()
    });

    await db.createLog({
      level: 'warning',
      distribution_id: id,
      message: `Rejected by ${approver}`,
      metadata: { approver, reason, timestamp: new Date().toISOString() }
    });

    res.json({ 
      success: true,
      approval: updated
    });
  } catch (error) {
    console.error('Error rejecting distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute a distribution manually
app.post('/api/distributions/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;

    const ready = await executor.isReadyToExecute(id);
    if (!ready) {
      return res.status(400).json({ 
        error: 'Distribution is not ready to execute',
        details: 'Check approvals and schedule'
      });
    }

    const result = await executor.executeDistribution(id);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error executing distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get approvals for an approver
app.get('/api/approvals/:approver', async (req, res) => {
  try {
    const { approver } = req.params;
    const approvals = await db.getApprovalsByApprover(approver);

    res.json({ approvals });
  } catch (error) {
    console.error('Error fetching approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get pending approvals for an approver
app.get('/api/approvals/:approver/pending', async (req, res) => {
  try {
    const { approver } = req.params;
    const allApprovals = await db.getApprovalsByApprover(approver);
    
    const pending = allApprovals.filter(a => 
      !a.approved_at && !a.rejected_at &&
      a.distributions && 
      ['pending-approval', 'parsed'].includes(a.distributions.status)
    );

    res.json({ pending });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get logs for a distribution
app.get('/api/distributions/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 100;
    
    const logs = await db.getLogs(id, limit);
    res.json({ logs });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Multisig info
app.get('/api/multisig/info', async (req, res) => {
  try {
    const threshold = await multisigProvider.getThreshold();
    const txCount = await multisigProvider.getTransactionCount();

    res.json({
      address: process.env.HYPEREVM_MULTISIG_ADDRESS,
      threshold,
      transactionCount: txCount
    });
  } catch (error) {
    console.error('Error fetching multisig info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`LoopOps API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  // Start the scheduler for automated execution and expiration checks
  scheduler.start();
  console.log('✓ Scheduler started - checking for expired approvals and ready distributions every minute');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  scheduler.stop();
  process.exit(0);
});

export default app;
