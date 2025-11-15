// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OptimizerVault is ReentrancyGuard {
    // State

    address public owner;
    IERC20 public asset;
    address public operator;
    address public activeVault;

    mapping(address => uint256) public balances;
    mapping(address => bool) public whitelistedVaults;

    // Events

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event OperatorSet(address indexed newOperator);
    event VaultWhitelisted(address indexed vault, bool allowed);
    event Rebalance(address indexed targetVault, bytes data);

    // Modifiers

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "not operator");
        _;
    }

    // Constructor

    constructor(address _asset) {
        require(_asset != address(0), "asset=0");
        owner = msg.sender;
        asset = IERC20(_asset);
    }

    // Owner functions

    function setOperator(address _operator) external onlyOwner {
        require(_operator != address(0), "operator=0");
        operator = _operator;
        emit OperatorSet(_operator);
    }

    function whitelistVault(address vault, bool allowed) external onlyOwner {
        require(vault != address(0), "vault=0");
        whitelistedVaults[vault] = allowed;
        emit VaultWhitelisted(vault, allowed);
    }

    // User functions

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "amount=0");

        asset.transferFrom(msg.sender, address(this), amount);
        balances[msg.sender] += amount;

        emit Deposit(msg.sender, amount);
    }

    // Optional but useful; does not break existing tests
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "amount=0");
        require(balances[msg.sender] >= amount, "insufficient");

        balances[msg.sender] -= amount;
        asset.transfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount);
    }

    // Operator-only: called by backend / off-chain optimizer

    function rebalance(address targetVault, bytes calldata data)
        external
        onlyOperator
        nonReentrant
    {
        require(targetVault != address(0), "target=0");
        require(whitelistedVaults[targetVault], "not whitelisted");

        // Low-level router call (GlueX Router calldata)
        (bool ok, ) = targetVault.call(data);
        require(ok, "rebalance failed");

        activeVault = targetVault;
        emit Rebalance(targetVault, data);
    }
}
