import { db } from '../config/supabase.js';
import { LoopOpsMultisigProvider } from '../multisig/loopops-multisig.js';

/**
 * Execute distributions
 */
export class DistributionExecutor {
  constructor() {
    this.multisigProvider = new LoopOpsMultisigProvider({
      rpcUrl: process.env.HYPEREVM_RPC_URL,
      multisigAddress: process.env.HYPEREVM_MULTISIG_ADDRESS,
      privateKey: process.env.EXECUTOR_PRIVATE_KEY
    });
  }

  /**
   * Execute a distribution
   */
  async executeDistribution(distributionId) {
    const distribution = await db.getDistribution(distributionId);
    
    if (!distribution) {
      throw new Error(`Distribution ${distributionId} not found`);
    }

    await db.createLog({
      level: 'info',
      distribution_id: distributionId,
      message: 'Starting distribution execution',
      metadata: { status: distribution.status }
    });

    // Check if distribution has enough approvals
    const approvals = await db.getApprovals(distributionId);
    const approvedCount = approvals.filter(a => a.approved_at && !a.rejected_at).length;
    const proposal = await db.getProposal(distributionId);

    if (approvedCount < proposal.threshold) {
      throw new Error(`Insufficient approvals: ${approvedCount}/${proposal.threshold}`);
    }

    // Update status
    await db.updateDistribution(distributionId, { status: 'executing' });

    try {
      // Get recipients
      const recipients = await db.getRecipients(distributionId);
      
      // Submit transactions to multisig
      const calldata = JSON.parse(proposal.calldata);
      const results = await this.multisigProvider.createBatchDistributionProposal(
        calldata.token,
        calldata.recipients
      );

      // Store multisig tx IDs
      await db.updateProposal(proposal.id, {
        multisig_tx_id: results[0]?.txId,
        tx_hash: results[0]?.txHash
      });

      // Mark distribution as executed
      await db.updateDistribution(distributionId, { status: 'executed' });

      // Update recipients status
      for (const recipient of recipients) {
        await db.updateRecipientStatus(recipient.id, 'executed');
      }

      await db.createLog({
        level: 'info',
        distribution_id: distributionId,
        message: 'Distribution executed successfully',
        metadata: { 
          txHashes: results.map(r => r.txHash),
          recipientCount: recipients.length
        }
      });

      return {
        success: true,
        txHashes: results.map(r => r.txHash),
        recipients: recipients.length
      };
    } catch (error) {
      await db.updateDistribution(distributionId, { status: 'failed' });
      
      await db.createLog({
        level: 'error',
        distribution_id: distributionId,
        message: `Execution failed: ${error.message}`,
        metadata: { error: error.stack }
      });

      throw error;
    }
  }

  /**
   * Check if distribution is ready to execute
   */
  async isReadyToExecute(distributionId) {
    const distribution = await db.getDistribution(distributionId);
    
    if (!distribution) {
      return false;
    }

    // Check status
    if (!['approved', 'scheduled'].includes(distribution.status)) {
      return false;
    }

    // Check approvals
    const approvals = await db.getApprovals(distributionId);
    const proposal = await db.getProposal(distributionId);
    const approvedCount = approvals.filter(a => a.approved_at && !a.rejected_at).length;

    if (approvedCount < proposal.threshold) {
      return false;
    }

    // Check schedule for LoopDrops
    if (distribution.type === 'loopdrop' && distribution.schedule) {
      const scheduleTime = new Date(distribution.schedule);
      const now = new Date();
      
      if (now < scheduleTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Process pending distributions
   */
  async processPendingDistributions() {
    const distributions = await db.listDistributions({ 
      status: 'approved' 
    });

    const results = [];

    for (const distribution of distributions) {
      try {
        const ready = await this.isReadyToExecute(distribution.id);
        
        if (ready) {
          await db.updateDistribution(distribution.id, { status: 'queued' });
          const result = await this.executeDistribution(distribution.id);
          results.push({
            distributionId: distribution.id,
            success: true,
            ...result
          });
        }
      } catch (error) {
        results.push({
          distributionId: distribution.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

export default DistributionExecutor;
