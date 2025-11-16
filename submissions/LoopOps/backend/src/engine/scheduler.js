import cron from 'node-cron';
import { DistributionExecutor } from './executor.js';
import { db } from '../config/supabase.js';

/**
 * Scheduler for automated distribution execution
 */
export class DistributionScheduler {
  constructor() {
    this.executor = new DistributionExecutor();
    this.jobs = new Map();
  }

  /**
   * Start the scheduler
   */
  start() {
    console.log('Starting DistributionScheduler...');

    // Run every minute to check for pending distributions
    this.mainJob = cron.schedule('* * * * *', async () => {
      try {
        await this.checkPendingDistributions();
      } catch (error) {
        console.error('Error in scheduler:', error);
      }
    });

    // Run every hour to process loyalty rewards
    this.loyaltyJob = cron.schedule('0 * * * *', async () => {
      try {
        await this.processLoyaltyRewards();
      } catch (error) {
        console.error('Error processing loyalty rewards:', error);
      }
    });

    console.log('Scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    if (this.mainJob) {
      this.mainJob.stop();
    }
    if (this.loyaltyJob) {
      this.loyaltyJob.stop();
    }
    console.log('Scheduler stopped');
  }

  /**
   * Check and execute pending distributions
   */
  async checkPendingDistributions() {
    // First, check for expired pending approvals
    await this.checkExpiredApprovals();

    // Then execute approved distributions
    const distributions = await db.listDistributions({ status: 'approved' });

    for (const distribution of distributions) {
      try {
        const ready = await this.executor.isReadyToExecute(distribution.id);
        
        if (ready) {
          console.log(`Executing distribution ${distribution.id}...`);
          await this.executor.executeDistribution(distribution.id);
          console.log(`Distribution ${distribution.id} executed successfully`);
        }
      } catch (error) {
        console.error(`Error executing distribution ${distribution.id}:`, error);
        await db.createLog({
          level: 'error',
          distribution_id: distribution.id,
          message: `Scheduler execution failed: ${error.message}`,
          metadata: { error: error.stack }
        });
      }
    }
  }

  /**
   * Check for distributions that passed their schedule time while pending approval
   */
  async checkExpiredApprovals() {
    const pendingDistributions = await db.listDistributions({ 
      status: 'pending-approval' 
    });

    const now = new Date();

    for (const distribution of pendingDistributions) {
      try {
        if (distribution.schedule) {
          const scheduleTime = new Date(distribution.schedule);
          
          // If schedule time has passed, mark as expired
          if (now > scheduleTime) {
            console.log(`Distribution ${distribution.id} expired - schedule passed without approval`);
            
            await db.updateDistribution(distribution.id, { 
              status: 'failed' 
            });
            
            await db.createLog({
              level: 'warning',
              distribution_id: distribution.id,
              message: 'Distribution expired - scheduled time passed without sufficient approvals',
              metadata: { 
                scheduledTime: distribution.schedule,
                expiredAt: now.toISOString()
              }
            });
          }
        }
      } catch (error) {
        console.error(`Error checking expiration for distribution ${distribution.id}:`, error);
      }
    }
  }

  /**
   * Process loyalty rewards (recurring distributions)
   */
  async processLoyaltyRewards() {
    const loyaltyRewards = await db.listDistributions({ 
      type: 'loyalty_reward',
      status: 'executed'
    });

    const now = new Date();

    for (const reward of loyaltyRewards) {
      try {
        // Check if we need to create a new instance based on frequency
        const shouldCreateNew = this.shouldCreateNewInstance(reward, now);
        
        if (shouldCreateNew) {
          console.log(`Creating new instance for loyalty reward ${reward.id}`);
          // Create a new distribution instance
          // This would involve duplicating the distribution with a new schedule
          // Implementation depends on specific requirements
        }
      } catch (error) {
        console.error(`Error processing loyalty reward ${reward.id}:`, error);
      }
    }
  }

  /**
   * Determine if a new loyalty reward instance should be created
   */
  shouldCreateNewInstance(reward, now) {
    if (!reward.frequency || !reward.start_date) {
      return false;
    }

    const startDate = new Date(reward.start_date);
    if (now < startDate) {
      return false;
    }

    if (reward.end_date) {
      const endDate = new Date(reward.end_date);
      if (now > endDate) {
        return false;
      }
    }

    // Check frequency
    // This is a simplified version - would need more sophisticated logic
    const frequency = reward.frequency.toLowerCase();
    
    // For now, just return false - full implementation would check
    // when the last execution was and calculate if a new one is due
    return false;
  }
}

// If running as a standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
  const scheduler = new DistributionScheduler();
  scheduler.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    scheduler.stop();
    process.exit(0);
  });
}

export default DistributionScheduler;
