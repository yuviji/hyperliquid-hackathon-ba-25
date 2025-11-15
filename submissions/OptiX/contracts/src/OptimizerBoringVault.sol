// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract OptimizerBoringVault is ERC20, ReentrancyGuard {
    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    address public owner;
    IERC20 public immutable asset;        // underlying (e.g. USDC)
    address public operator;              // off-chain optimizer bot
    address public immutable gluexRouter; // GlueX Router contract
    address public activeVault;           // currently chosen GlueX vault

    mapping(address => bool) public whitelistedVaults;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event OperatorSet(address indexed newOperator);
    event VaultWhitelisted(address indexed vault, bool allowed);
    event Rebalance(address indexed targetVault, bytes data);
    event Deposit(address indexed caller, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed caller, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "not operator");
        _;
    }

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(address _asset, address _gluexRouter)
        ERC20("Optimizer Vault Share", "OVSHARE")
    {
        require(_asset != address(0), "asset=0");
        require(_gluexRouter != address(0), "router=0");

        owner = msg.sender;
        asset = IERC20(_asset);
        gluexRouter = _gluexRouter;
    }

    // -----------------------------------------------------------------------
    // View helpers
    // -----------------------------------------------------------------------

    /// @notice Total underlying assets the vault controls.
    /// For now, we just look at what this contract holds directly.
    /// Later you can extend this to include GlueX vault positions too.
    function totalAssets() public view returns (uint256) {
        return asset.balanceOf(address(this));
    }

    /// @notice Convert an amount of underlying assets to vault shares.
    function _convertToShares(uint256 assets, uint256 _totalAssets, uint256 _totalSupply) internal pure returns (uint256) {
        if (_totalSupply == 0 || _totalAssets == 0) {
            // 1:1 on first deposit
            return assets;
        }
        return assets * _totalSupply / _totalAssets;
    }

    /// @notice Convert an amount of vault shares to underlying assets.
    function _convertToAssets(uint256 shares, uint256 _totalAssets, uint256 _totalSupply) internal pure returns (uint256) {
        require(_totalSupply > 0, "no shares");
        return shares * _totalAssets / _totalSupply;
    }

    // -----------------------------------------------------------------------
    // Owner functions
    // -----------------------------------------------------------------------

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

    // -----------------------------------------------------------------------
    // User functions (BoringVault-style shares)
    // -----------------------------------------------------------------------

    /// @notice Deposit underlying assets and receive vault shares.
    function deposit(uint256 assets, address receiver) external nonReentrant returns (uint256 shares) {
        require(assets > 0, "assets=0");

        uint256 _totalAssets = totalAssets();
        uint256 _totalSupply = totalSupply();

        shares = _convertToShares(assets, _totalAssets, _totalSupply);
        require(shares > 0, "shares=0");

        // pull underlying
        asset.transferFrom(msg.sender, address(this), assets);
        // mint shares
        _mint(receiver, shares);

        emit Deposit(msg.sender, receiver, assets, shares);
    }

    /// @notice Convenience: deposit to yourself.
    function deposit(uint256 assets) external returns (uint256 shares) {
        return this.deposit(assets, msg.sender);
    }


    /// @notice Burn shares and receive underlying assets.
    function withdraw(uint256 shares, address receiver, address owner_) external nonReentrant returns (uint256 assetsOut) {
        require(shares > 0, "shares=0");

        uint256 _totalSupply = totalSupply();
        uint256 _totalAssets = totalAssets();

        assetsOut = _convertToAssets(shares, _totalAssets, _totalSupply);
        require(assetsOut > 0, "assets=0");

        if (msg.sender != owner_) {
            uint256 allowed = allowance(owner_, msg.sender);
            require(allowed >= shares, "insufficient allowance");
            _approve(owner_, msg.sender, allowed - shares);
        }

        _burn(owner_, shares);
        asset.transfer(receiver, assetsOut);

        emit Withdraw(msg.sender, receiver, owner_, assetsOut, shares);
    }

    /// @notice Convenience: withdraw to yourself.
    function withdraw(uint256 shares) external returns (uint256 assetsOut) {
        return this.withdraw(shares, msg.sender, msg.sender);
    }

    // -----------------------------------------------------------------------
    // Operator-only: called by backend / off-chain optimizer
    // -----------------------------------------------------------------------

    function rebalance(address targetVault, bytes calldata routerCalldata)
        external
        onlyOperator
        nonReentrant
    {
        require(targetVault != address(0), "target=0");
        require(whitelistedVaults[targetVault], "not whitelisted");

        // Call GlueX Router (routerCalldata comes from GlueX Router API)
        (bool ok, ) = gluexRouter.call(routerCalldata);
        require(ok, "router call failed");

        activeVault = targetVault;
        emit Rebalance(targetVault, routerCalldata);
    }
}