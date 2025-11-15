// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OptimizerBoringVault.sol";
import "./mocks/ERC20Mock.sol";

contract OptimizerBoringVaultTest is Test {
    OptimizerBoringVault vault;
    ERC20Mock token;

    address user = address(0xBEEF);
    address user2 = address(0xB00B);
    address operator = address(0xDEAD);
    address gluexRouter = address(0xAAAA);
    address targetVault = address(0xCAFE);

    function setUp() public {
        token = new ERC20Mock();

        vault = new OptimizerBoringVault(
            address(token),
            gluexRouter
        );

        // Mint tokens to users
        token.mint(user, 1000 ether);
        token.mint(user2, 1000 ether);
    }

    // ------------------------------------------------------------------------
    // Constructor
    // ------------------------------------------------------------------------

    function testConstructorSetsState() public {
        assertEq(vault.owner(), address(this));
        assertEq(address(vault.asset()), address(token));
        assertEq(vault.gluexRouter(), gluexRouter);
    }

    // ------------------------------------------------------------------------
    // Deposits (share minting)
    // ------------------------------------------------------------------------

    /// First depositor: shares = assets 1:1
    function testFirstDepositMints1to1Shares() public {
        vm.startPrank(user);
        token.approve(address(vault), 100 ether);
        uint256 shares = vault.deposit(100 ether);

        assertEq(shares, 100 ether);
        assertEq(vault.balanceOf(user), 100 ether);
        assertEq(token.balanceOf(address(vault)), 100 ether);

        vm.stopPrank();
    }

    /// Second depositor gets shares based on totalAssets / totalSupply ratio
    function testSecondDepositGetsProportionalShares() public {
        // User1 deposits 100
        vm.startPrank(user);
        token.approve(address(vault), 100 ether);
        vault.deposit(100 ether);
        vm.stopPrank();

        // Simulate yield: vault now has 150 underlying
        token.mint(address(vault), 50 ether);

        // User2 deposits 100 → share price = 150/100 = 1.5
        vm.startPrank(user2);
        token.approve(address(vault), 100 ether);
        uint256 shares = vault.deposit(100 ether);

        assertApproxEqRel(
            uint256(shares),
            66.666666666666666666 ether,
            1e16
        );

        vm.stopPrank();
    }

    function testDepositRevertsZero() public {
        vm.startPrank(user);
        token.approve(address(vault), 1 ether);
        vm.expectRevert("assets=0");
        vault.deposit(0);
        vm.stopPrank();
    }

    // ------------------------------------------------------------------------
    // Withdrawals (share burning)
    // ------------------------------------------------------------------------

    function testWithdrawBurnsSharesAndReturnsAssets() public {
        // deposit 200
        vm.startPrank(user);
        token.approve(address(vault), 200 ether);
        vault.deposit(200 ether);

        uint256 shares = vault.balanceOf(user);

        // withdraw half
        uint256 halfShares = shares / 2;
        uint256 assetsOut = vault.withdraw(halfShares);

        assertEq(assetsOut, 100 ether);
        assertEq(vault.balanceOf(user), shares - halfShares);
        assertEq(token.balanceOf(user), 900 ether);

        vm.stopPrank();
    }

    function testWithdrawRevertsZeroShares() public {
        vm.startPrank(user);
        vm.expectRevert("shares=0");
        vault.withdraw(0);
        vm.stopPrank();
    }

    function testWithdrawRevertsIfNoSharesSupply() public {
        vm.expectRevert("no shares");
        vault.totalAssets(); // sanity check call later in convertToAssets
    }

    function testWithdrawUsingAllowance() public {
        // user deposits
        vm.startPrank(user);
        token.approve(address(vault), 100 ether);
        vault.deposit(100 ether);
        vm.stopPrank();

        uint256 shares = vault.balanceOf(user);

        // user approves user2 to withdraw shares
        vm.prank(user);
        vault.approve(user2, shares);

        // user2 withdraws on behalf of user
        vm.prank(user2);
        uint256 assetsOut = vault.withdraw(shares, user2, user);

        assertEq(assetsOut, 100 ether);
        assertEq(vault.balanceOf(user), 0);
        assertEq(token.balanceOf(user2), 1100 ether);
    }

    // ------------------------------------------------------------------------
    // Operator / Whitelist Access Control
    // ------------------------------------------------------------------------

    function testOnlyOwnerCanSetOperator() public {
        vm.expectRevert("not owner");
        vm.prank(user);
        vault.setOperator(operator);

        vault.setOperator(operator);
        assertEq(vault.operator(), operator);
    }

    function testSetOperatorRevertsZeroAddress() public {
        vm.expectRevert("operator=0");
        vault.setOperator(address(0));
    }

    function testWhitelistVaultWorks() public {
        vault.whitelistVault(targetVault, true);
        assertTrue(vault.whitelistedVaults(targetVault));

        vault.whitelistVault(targetVault, false);
        assertFalse(vault.whitelistedVaults(targetVault));
    }

    function testWhitelistRevertsZero() public {
        vm.expectRevert("vault=0");
        vault.whitelistVault(address(0), true);
    }

    // ------------------------------------------------------------------------
    // Rebalance Tests
    // ------------------------------------------------------------------------

    function testRebalanceRequiresOperator() public {
        vault.whitelistVault(targetVault, true);

        vm.expectRevert("not operator");
        vault.rebalance(targetVault, "");
    }

    function testRebalanceRequiresWhitelisted() public {
        vault.setOperator(operator);

        vm.prank(operator);
        vm.expectRevert("not whitelisted");
        vault.rebalance(targetVault, "");
    }

    function testRebalanceCallsGlueXRouter() public {
        vault.setOperator(operator);
        vault.whitelistVault(targetVault, true);

        // router responds successfully
        vm.mockCall(gluexRouter, bytes(""), hex"01");

        vm.prank(operator);
        vault.rebalance(targetVault, "");

        assertEq(vault.activeVault(), targetVault);
    }

    function testRebalanceFailsWhenRouterCallFails() public {
        vault.setOperator(operator);
        vault.whitelistVault(targetVault, true);

        // router returns false
        vm.mockCallRevert(gluexRouter, abi.encode(), "fail");

        vm.prank(operator);
        vm.expectRevert("router call failed");
        vault.rebalance(targetVault, "");
    }
}