import { validateDistributionJSON, calculateJSONHash } from '../utils/validator.js';
import { db } from '../config/supabase.js';
import { LoopOpsMultisigProvider } from '../multisig/loopops-multisig.js';

/**
 * Parse and process distribution JSON
 */
export class DistributionParser {
  constructor() {
    this.multisigProvider = new LoopOpsMultisigProvider({
      rpcUrl: process.env.HYPEREVM_RPC_URL,
      multisigAddress: process.env.HYPEREVM_MULTISIG_ADDRESS,
      privateKey: process.env.EXECUTOR_PRIVATE_KEY
    });
  }

  /**
   * Parse and store distributions from JSON
   */
  async parseJSON(json) {
    // Validate JSON
    const validation = validateDistributionJSON(json);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const jsonHash = calculateJSONHash(json);
    const results = {
      loopDrops: [],
      loyaltyRewards: [],
      errors: []
    };

    // Process LoopDrops
    if (json.loopDrops && json.loopDrops.length > 0) {
      for (const drop of json.loopDrops) {
        try {
          const result = await this.processLoopDrop(drop.distribution, jsonHash);
          results.loopDrops.push(result);
        } catch (error) {
          results.errors.push({
            type: 'loopdrop',
            name: drop.distribution.name,
            error: error.message
          });
        }
      }
    }

    // Process Loyalty Rewards
    if (json.loyaltyRewards && json.loyaltyRewards.length > 0) {
      for (const reward of json.loyaltyRewards) {
        try {
          const result = await this.processLoyaltyReward(reward.distribution, jsonHash);
          results.loyaltyRewards.push(result);
        } catch (error) {
          results.errors.push({
            type: 'loyalty_reward',
            description: reward.distribution.description,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Process a single LoopDrop
   */
  async processLoopDrop(distribution, jsonHash) {
    // Calculate total amount
    const totalAmount = distribution.recipients.reduce(
      (sum, r) => sum + BigInt(r.amount),
      0n
    ).toString();

    // Create distribution record
    const dist = await db.createDistribution({
      type: 'loopdrop',
      name: distribution.name,
      token: distribution.token,
      total_amount: totalAmount,
      schedule: new Date(distribution.schedule).toISOString(),
      status: 'parsed',
      json_hash: jsonHash,
      description: distribution.description
    });

    // Create recipients
    const recipients = distribution.recipients.map(r => ({
      distribution_id: dist.id,
      address: r.address,
      amount: r.amount.toString()
    }));
    await db.createRecipients(recipients);

    // Create approvals (pending)
    for (const approver of distribution.approvers) {
      await db.createApproval({
        distribution_id: dist.id,
        approver: approver
      });
    }

    // Log creation
    await db.createLog({
      level: 'info',
      distribution_id: dist.id,
      message: `LoopDrop created: ${distribution.name}`,
      metadata: { schedule: distribution.schedule }
    });

    // Create multisig proposal
    try {
      await this.createMultisigProposal(dist.id, distribution);
      await db.updateDistribution(dist.id, { status: 'pending-approval' });
    } catch (error) {
      await db.createLog({
        level: 'error',
        distribution_id: dist.id,
        message: `Failed to create multisig proposal: ${error.message}`,
        metadata: { error: error.stack }
      });
    }

    return dist;
  }

  /**
   * Process a single Loyalty Reward
   */
  async processLoyaltyReward(distribution, jsonHash) {
    // Calculate total amount
    const totalAmount = distribution.recipients.reduce(
      (sum, r) => sum + BigInt(r.amount),
      0n
    ).toString();

    // Create distribution record
    const dist = await db.createDistribution({
      type: 'loyalty_reward',
      token: distribution.token,
      total_amount: totalAmount,
      frequency: distribution.frequency,
      start_date: distribution.startDate,
      end_date: distribution.endDate,
      status: 'parsed',
      json_hash: jsonHash,
      description: distribution.description
    });

    // Create recipients
    const recipients = distribution.recipients.map(r => ({
      distribution_id: dist.id,
      address: r.address,
      amount: r.amount.toString()
    }));
    await db.createRecipients(recipients);

    // Create approvals (pending)
    for (const approver of distribution.approvers) {
      await db.createApproval({
        distribution_id: dist.id,
        approver: approver
      });
    }

    // Log creation
    await db.createLog({
      level: 'info',
      distribution_id: dist.id,
      message: `Loyalty Reward created: ${distribution.description}`,
      metadata: { 
        frequency: distribution.frequency,
        startDate: distribution.startDate,
        endDate: distribution.endDate
      }
    });

    // Create multisig proposal
    try {
      await this.createMultisigProposal(dist.id, distribution);
      await db.updateDistribution(dist.id, { status: 'pending-approval' });
    } catch (error) {
      await db.createLog({
        level: 'error',
        distribution_id: dist.id,
        message: `Failed to create multisig proposal: ${error.message}`,
        metadata: { error: error.stack }
      });
    }

    return dist;
  }

  /**
   * Create multisig proposal for distribution
   */
  async createMultisigProposal(distributionId, distribution) {
    const recipients = await db.getRecipients(distributionId);
    
    // Get the actual threshold from the multisig contract
    const contractThreshold = await this.multisigProvider.getThreshold();
    
    // Use the contract threshold, not the number of approvers
    const threshold = contractThreshold;

    // For now, we'll create the proposal structure but not submit to chain yet
    // Submission happens when we have enough approvals
    const proposal = await db.createProposal({
      distribution_id: distributionId,
      multisig_address: process.env.HYPEREVM_MULTISIG_ADDRESS,
      threshold: threshold,
      calldata: JSON.stringify({
        token: distribution.token,
        recipients: recipients.map(r => ({
          address: r.address,
          amount: r.amount
        }))
      })
    });

    return proposal;
  }
}

export default DistributionParser;
