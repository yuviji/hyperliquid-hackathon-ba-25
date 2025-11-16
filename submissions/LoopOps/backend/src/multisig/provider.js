/**
 * Abstract Multisig Provider Interface
 * This abstraction allows swapping between different multisig implementations
 * (custom, Safe, Den) without changing the core distribution logic
 */
export class MultisigProvider {
  /**
   * Submit a transaction to the multisig
   * @param {Object} params - Transaction parameters
   * @returns {Promise<string>} Transaction ID
   */
  async submitTransaction(params) {
    throw new Error('submitTransaction must be implemented');
  }

  /**
   * Confirm/approve a transaction
   * @param {string} txId - Transaction ID
   * @param {string} signer - Signer address
   * @returns {Promise<Object>} Confirmation result
   */
  async confirmTransaction(txId, signer) {
    throw new Error('confirmTransaction must be implemented');
  }

  /**
   * Execute a transaction
   * @param {string} txId - Transaction ID
   * @returns {Promise<Object>} Execution result
   */
  async executeTransaction(txId) {
    throw new Error('executeTransaction must be implemented');
  }

  /**
   * Get transaction details
   * @param {string} txId - Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(txId) {
    throw new Error('getTransaction must be implemented');
  }

  /**
   * Get confirmations for a transaction
   * @param {string} txId - Transaction ID
   * @returns {Promise<Array>} List of confirmations
   */
  async getConfirmations(txId) {
    throw new Error('getConfirmations must be implemented');
  }

  /**
   * Check if transaction has enough confirmations
   * @param {string} txId - Transaction ID
   * @returns {Promise<boolean>} True if ready to execute
   */
  async isReadyToExecute(txId) {
    throw new Error('isReadyToExecute must be implemented');
  }
}
