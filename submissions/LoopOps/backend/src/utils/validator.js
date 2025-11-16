import { ethers } from 'ethers';

/**
 * Validate distribution JSON schema
 */
export function validateDistributionJSON(json) {
  const errors = [];

  // Validate structure
  if (!json || typeof json !== 'object') {
    errors.push('Invalid JSON structure');
    return { valid: false, errors };
  }

  // Validate LoopDrops
  if (json.loopDrops && Array.isArray(json.loopDrops)) {
    json.loopDrops.forEach((drop, index) => {
      const dropErrors = validateLoopDrop(drop.distribution, `loopDrops[${index}]`);
      errors.push(...dropErrors);
    });
  }

  // Validate Loyalty Rewards
  if (json.loyaltyRewards && Array.isArray(json.loyaltyRewards)) {
    json.loyaltyRewards.forEach((reward, index) => {
      const rewardErrors = validateLoyaltyReward(reward.distribution, `loyaltyRewards[${index}]`);
      errors.push(...rewardErrors);
    });
  }

  // At least one distribution type should exist
  if ((!json.loopDrops || json.loopDrops.length === 0) && 
      (!json.loyaltyRewards || json.loyaltyRewards.length === 0)) {
    errors.push('At least one LoopDrop or Loyalty Reward is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a LoopDrop distribution
 */
function validateLoopDrop(distribution, path) {
  const errors = [];

  if (!distribution) {
    errors.push(`${path}: Distribution object is required`);
    return errors;
  }

  // Required fields
  if (!distribution.name) {
    errors.push(`${path}: Name is required`);
  }

  if (!distribution.schedule) {
    errors.push(`${path}: Schedule is required`);
  } else {
    const scheduleDate = new Date(distribution.schedule);
    if (isNaN(scheduleDate.getTime())) {
      errors.push(`${path}: Invalid schedule date format`);
    }
  }

  // Validate common fields
  const commonErrors = validateCommonFields(distribution, path);
  errors.push(...commonErrors);

  return errors;
}

/**
 * Validate a Loyalty Reward distribution
 */
function validateLoyaltyReward(distribution, path) {
  const errors = [];

  if (!distribution) {
    errors.push(`${path}: Distribution object is required`);
    return errors;
  }

  // Required fields
  if (!distribution.frequency) {
    errors.push(`${path}: Frequency is required`);
  } else {
    const validFrequencies = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (!validFrequencies.includes(distribution.frequency.toLowerCase())) {
      errors.push(`${path}: Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`);
    }
  }

  if (!distribution.startDate) {
    errors.push(`${path}: Start date is required`);
  } else {
    const startDate = new Date(distribution.startDate);
    if (isNaN(startDate.getTime())) {
      errors.push(`${path}: Invalid start date format`);
    }
  }

  if (distribution.endDate) {
    const endDate = new Date(distribution.endDate);
    if (isNaN(endDate.getTime())) {
      errors.push(`${path}: Invalid end date format`);
    } else if (distribution.startDate) {
      const startDate = new Date(distribution.startDate);
      if (endDate <= startDate) {
        errors.push(`${path}: End date must be after start date`);
      }
    }
  }

  // Validate common fields
  const commonErrors = validateCommonFields(distribution, path);
  errors.push(...commonErrors);

  return errors;
}

/**
 * Validate common fields across all distributions
 */
function validateCommonFields(distribution, path) {
  const errors = [];

  // Token address
  if (!distribution.token) {
    errors.push(`${path}: Token address is required`);
  } else if (!ethers.isAddress(distribution.token)) {
    errors.push(`${path}: Invalid token address`);
  } else {
    // Check if checksummed
    try {
      const checksummed = ethers.getAddress(distribution.token);
      if (checksummed !== distribution.token) {
        errors.push(`${path}: Token address must be checksummed`);
      }
    } catch (e) {
      errors.push(`${path}: Invalid token address format`);
    }
  }

  // Amount
  if (!distribution.amount) {
    errors.push(`${path}: Amount is required`);
  } else if (typeof distribution.amount === 'number' && distribution.amount <= 0) {
    errors.push(`${path}: Amount must be greater than 0`);
  }

  // Recipients
  if (!distribution.recipients || !Array.isArray(distribution.recipients)) {
    errors.push(`${path}: Recipients array is required`);
  } else if (distribution.recipients.length === 0) {
    errors.push(`${path}: At least one recipient is required`);
  } else {
    const uniqueAddresses = new Set();
    
    distribution.recipients.forEach((recipient, index) => {
      if (!recipient.address) {
        errors.push(`${path}.recipients[${index}]: Address is required`);
      } else if (!ethers.isAddress(recipient.address)) {
        errors.push(`${path}.recipients[${index}]: Invalid address`);
      } else {
        // Check if checksummed
        try {
          const checksummed = ethers.getAddress(recipient.address);
          if (checksummed !== recipient.address) {
            errors.push(`${path}.recipients[${index}]: Address must be checksummed`);
          }
        } catch (e) {
          errors.push(`${path}.recipients[${index}]: Invalid address format`);
        }

        // Check for duplicates
        if (uniqueAddresses.has(recipient.address.toLowerCase())) {
          errors.push(`${path}.recipients[${index}]: Duplicate address ${recipient.address}`);
        }
        uniqueAddresses.add(recipient.address.toLowerCase());
      }

      if (!recipient.amount) {
        errors.push(`${path}.recipients[${index}]: Amount is required`);
      } else if (typeof recipient.amount === 'number' && recipient.amount <= 0) {
        errors.push(`${path}.recipients[${index}]: Amount must be greater than 0`);
      }
    });
  }

  // Approvers
  if (!distribution.approvers || !Array.isArray(distribution.approvers)) {
    errors.push(`${path}: Approvers array is required`);
  } else if (distribution.approvers.length === 0) {
    errors.push(`${path}: At least one approver is required`);
  } else {
    const uniqueApprovers = new Set();
    
    distribution.approvers.forEach((approver, index) => {
      if (!ethers.isAddress(approver)) {
        errors.push(`${path}.approvers[${index}]: Invalid approver address`);
      } else {
        // Check if checksummed
        try {
          const checksummed = ethers.getAddress(approver);
          if (checksummed !== approver) {
            errors.push(`${path}.approvers[${index}]: Approver address must be checksummed`);
          }
        } catch (e) {
          errors.push(`${path}.approvers[${index}]: Invalid approver address format`);
        }

        // Check for duplicates
        if (uniqueApprovers.has(approver.toLowerCase())) {
          errors.push(`${path}.approvers[${index}]: Duplicate approver address`);
        }
        uniqueApprovers.add(approver.toLowerCase());
      }
    });
  }

  return errors;
}

/**
 * Calculate hash of JSON for tracking
 */
export function calculateJSONHash(json) {
  const jsonString = JSON.stringify(json, null, 0);
  return ethers.keccak256(ethers.toUtf8Bytes(jsonString));
}
