// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title LoopOpsMultisig
 * @dev Minimal M-of-N multisig wallet for batched ERC20 transfers
 * Designed for LoopOps distribution engine on HyperEVM
 */
contract LoopOpsMultisig {
    // Events
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event ThresholdChanged(uint256 threshold);
    event TransactionSubmitted(uint256 indexed txId, address indexed submitter);
    event TransactionConfirmed(uint256 indexed txId, address indexed confirmer);
    event ConfirmationRevoked(uint256 indexed txId, address indexed revoker);
    event TransactionExecuted(uint256 indexed txId, bool success);
    
    // Structs
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }
    
    // State variables
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public threshold;
    
    Transaction[] public transactions;
    mapping(uint256 => mapping(address => bool)) public isConfirmed;
    
    // Reentrancy protection
    bool private locked;
    
    // Modifiers
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }
    
    modifier txExists(uint256 _txId) {
        require(_txId < transactions.length, "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 _txId) {
        require(!isConfirmed[_txId][msg.sender], "Transaction already confirmed");
        _;
    }
    
    modifier noReentrant() {
        require(!locked, "No reentrancy");
        locked = true;
        _;
        locked = false;
    }
    
    /**
     * @dev Constructor sets initial owners and threshold
     * @param _owners List of initial owner addresses
     * @param _threshold Number of required confirmations
     */
    constructor(address[] memory _owners, uint256 _threshold) {
        require(_owners.length > 0, "Owners required");
        require(
            _threshold > 0 && _threshold <= _owners.length,
            "Invalid threshold"
        );
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
            emit OwnerAdded(owner);
        }
        
        threshold = _threshold;
        emit ThresholdChanged(_threshold);
    }
    
    /**
     * @dev Submit a new transaction
     * @param _to Destination address
     * @param _value ETH value to send
     * @param _data Transaction data
     * @return txId Transaction ID
     */
    function submitTransaction(
        address _to,
        uint256 _value,
        bytes memory _data
    ) public onlyOwner returns (uint256 txId) {
        require(_to != address(0), "Invalid destination address");
        
        txId = transactions.length;
        
        transactions.push(
            Transaction({
                to: _to,
                value: _value,
                data: _data,
                executed: false,
                numConfirmations: 0
            })
        );
        
        emit TransactionSubmitted(txId, msg.sender);
    }
    
    /**
     * @dev Confirm a transaction
     * @param _txId Transaction ID
     */
    function confirmTransaction(uint256 _txId)
        public
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notConfirmed(_txId)
    {
        Transaction storage transaction = transactions[_txId];
        transaction.numConfirmations += 1;
        isConfirmed[_txId][msg.sender] = true;
        
        emit TransactionConfirmed(_txId, msg.sender);
    }
    
    /**
     * @dev Execute a confirmed transaction
     * @param _txId Transaction ID
     */
    function executeTransaction(uint256 _txId)
        public
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        noReentrant
    {
        Transaction storage transaction = transactions[_txId];
        
        require(
            transaction.numConfirmations >= threshold,
            "Cannot execute: insufficient confirmations"
        );
        
        (bool success, ) = transaction.to.call{value: transaction.value}(
            transaction.data
        );
        
        require(success, "Transaction execution failed");
        
        transaction.executed = true;
        emit TransactionExecuted(_txId, success);
    }
    
    /**
     * @dev Revoke confirmation for a transaction
     * @param _txId Transaction ID
     */
    function revokeConfirmation(uint256 _txId)
        public
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
    {
        require(isConfirmed[_txId][msg.sender], "Transaction not confirmed");
        
        Transaction storage transaction = transactions[_txId];
        transaction.numConfirmations -= 1;
        isConfirmed[_txId][msg.sender] = false;
        
        emit ConfirmationRevoked(_txId, msg.sender);
    }
    
    /**
     * @dev Get owners
     * @return Array of owner addresses
     */
    function getOwners() public view returns (address[] memory) {
        return owners;
    }
    
    /**
     * @dev Get transaction count
     * @return Number of transactions
     */
    function getTransactionCount() public view returns (uint256) {
        return transactions.length;
    }
    
    /**
     * @dev Get transaction details
     * @param _txId Transaction ID
     */
    function getTransaction(uint256 _txId)
        public
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage transaction = transactions[_txId];
        
        return (
            transaction.to,
            transaction.value,
            transaction.data,
            transaction.executed,
            transaction.numConfirmations
        );
    }
    
    /**
     * @dev Get confirmations for a transaction
     * @param _txId Transaction ID
     * @return Array of addresses that confirmed
     */
    function getConfirmations(uint256 _txId)
        public
        view
        returns (address[] memory)
    {
        address[] memory confirmationsTemp = new address[](owners.length);
        uint256 count = 0;
        
        for (uint256 i = 0; i < owners.length; i++) {
            if (isConfirmed[_txId][owners[i]]) {
                confirmationsTemp[count] = owners[i];
                count += 1;
            }
        }
        
        // Resize array to actual count
        address[] memory confirmations = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            confirmations[i] = confirmationsTemp[i];
        }
        
        return confirmations;
    }
    
    /**
     * @dev Fallback function to accept ETH
     */
    receive() external payable {}
}
