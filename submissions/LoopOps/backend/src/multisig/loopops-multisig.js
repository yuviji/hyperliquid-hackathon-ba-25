import { ethers } from 'ethers';
import { MultisigProvider } from './provider.js';
import dotenv from 'dotenv';

dotenv.config();

// LoopOps Multisig ABI (minimal interface)
const MULTISIG_ABI = [
  "function submitTransaction(address to, uint256 value, bytes data) external returns (uint256 txId)",
  "function confirmTransaction(uint256 txId) external",
  "function executeTransaction(uint256 txId) external",
  "function revokeConfirmation(uint256 txId) external",
  "function getTransaction(uint256 txId) external view returns (address to, uint256 value, bytes data, bool executed, uint256 numConfirmations)",
  "function getConfirmations(uint256 txId) external view returns (address[] memory)",
  "function getTransactionCount() external view returns (uint256)",
  "function threshold() external view returns (uint256)",
  "function isOwner(address) external view returns (bool)",
  "event TransactionSubmitted(uint256 indexed txId, address indexed submitter)",
  "event TransactionConfirmed(uint256 indexed txId, address indexed confirmer)",
  "event TransactionExecuted(uint256 indexed txId, bool success)"
];

/**
 * LoopOps Custom Multisig Provider Implementation
 */
export class LoopOpsMultisigProvider extends MultisigProvider {
  constructor(config = {}) {
    super();
    
    const rpcUrl = config.rpcUrl;
    const multisigAddress = config.multisigAddress;
    const privateKey = config.privateKey;

    if (!rpcUrl || !multisigAddress) {
      throw new Error('Missing required configuration: rpcUrl and multisigAddress');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.multisigAddress = multisigAddress;
    this.contract = new ethers.Contract(multisigAddress, MULTISIG_ABI, this.provider);
    
    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.contractWithSigner = this.contract.connect(this.wallet);
    }
  }

  /**
   * Submit a transaction to the multisig
   */
  async submitTransaction(params) {
    const { to, value = 0, data } = params;

    if (!this.contractWithSigner) {
      throw new Error('No signer configured. Set EXECUTOR_PRIVATE_KEY in environment.');
    }

    const tx = await this.contractWithSigner.submitTransaction(to, value, data);
    const receipt = await tx.wait();

    // Extract txId from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = this.contract.interface.parseLog(log);
        return parsed.name === 'TransactionSubmitted';
      } catch {
        return false;
      }
    });

    if (!event) {
      throw new Error('TransactionSubmitted event not found');
    }

    const parsed = this.contract.interface.parseLog(event);
    const txId = parsed.args.txId.toString();

    return {
      txId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber
    };
  }

  /**
   * Confirm a transaction
   */
  async confirmTransaction(txId, signerPrivateKey = null) {
    const signer = signerPrivateKey 
      ? new ethers.Wallet(signerPrivateKey, this.provider)
      : this.wallet;

    if (!signer) {
      throw new Error('No signer available for confirmation');
    }

    const contract = this.contract.connect(signer);
    const tx = await contract.confirmTransaction(txId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      signer: signer.address
    };
  }

  /**
   * Execute a transaction
   */
  async executeTransaction(txId) {
    if (!this.contractWithSigner) {
      throw new Error('No signer configured. Set EXECUTOR_PRIVATE_KEY in environment.');
    }

    const tx = await this.contractWithSigner.executeTransaction(txId);
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'success' : 'failed'
    };
  }

  /**
   * Get transaction details
   */
  async getTransaction(txId) {
    const [to, value, data, executed, numConfirmations] = await this.contract.getTransaction(txId);

    return {
      to,
      value: value.toString(),
      data,
      executed,
      numConfirmations: Number(numConfirmations)
    };
  }

  /**
   * Get confirmations for a transaction
   */
  async getConfirmations(txId) {
    const confirmations = await this.contract.getConfirmations(txId);
    return confirmations;
  }

  /**
   * Check if transaction is ready to execute
   */
  async isReadyToExecute(txId) {
    const [, , , executed, numConfirmations] = await this.contract.getTransaction(txId);
    const threshold = await this.contract.threshold();

    return !executed && numConfirmations >= threshold;
  }

  /**
   * Get threshold
   */
  async getThreshold() {
    const threshold = await this.contract.threshold();
    return Number(threshold);
  }

  /**
   * Get transaction count
   */
  async getTransactionCount() {
    const count = await this.contract.getTransactionCount();
    return Number(count);
  }

  /**
   * Check if address is owner
   */
  async isOwner(address) {
    return await this.contract.isOwner(address);
  }

  /**
   * Encode batch ERC20 transfer calldata
   * This creates calldata for a multicall-style batch transfer
   */
  static encodeBatchTransfer(tokenAddress, recipients) {
    const erc20Interface = new ethers.Interface([
      "function transfer(address to, uint256 amount) returns (bool)"
    ]);

    // For simplicity, we'll encode multiple transfer calls
    // In production, consider using a batch transfer contract
    const calls = recipients.map(r => ({
      target: tokenAddress,
      callData: erc20Interface.encodeFunctionData('transfer', [r.address, r.amount])
    }));

    return calls;
  }

  /**
   * Create proposal for batch token distribution
   */
  async createBatchDistributionProposal(tokenAddress, recipients) {
    // For the custom multisig, we'll submit each transfer as a separate transaction
    // In production, consider deploying a batch transfer contract
    const proposals = [];

    for (const recipient of recipients) {
      const erc20Interface = new ethers.Interface([
        "function transfer(address to, uint256 amount) returns (bool)"
      ]);

      const data = erc20Interface.encodeFunctionData('transfer', [
        recipient.address,
        recipient.amount
      ]);

      const result = await this.submitTransaction({
        to: tokenAddress,
        value: 0,
        data
      });

      proposals.push({
        ...result,
        recipient: recipient.address,
        amount: recipient.amount
      });
    }

    return proposals;
  }
}

export default LoopOpsMultisigProvider;
