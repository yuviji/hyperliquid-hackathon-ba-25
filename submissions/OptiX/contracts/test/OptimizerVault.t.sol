// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OptimizerVault.sol";
import "./mocks/ERC20Mock.sol";

contract OptimizerVaultTest is Test {
    OptimizerVault vault;
    ERC20Mock token;
    address user = address(0xBEEF);
    address operator = address(0xDEAD);
    address targetVault = address(0xCAFE);

    function setUp() public {
        token = new ERC20Mock();
        vault = new OptimizerVault(address(token));

        // Mint tokens to user
        token.mint(user, 1000 ether);
    }

    // Constructor

    function testOwnerIsDeployer() public {
        assertEq(vault.owner(), address(this));
    }

    // Deposit

    function testDeposit() public {
        vm.startPrank(user);
        token.approve(address(vault), 500 ether);

        vault.deposit(500 ether);

        assertEq(vault.balances(user), 500 ether);
        assertEq(token.balanceOf(address(vault)), 500 ether);

        vm.stopPrank();
    }

    function testDepositRevertsZero() public {
        vm.startPrank(user);
        vm.expectRevert("amount=0");
        vault.deposit(0);
        vm.stopPrank();
    }

    // Operator

    function testOnlyOwnerCanSetOperator() public {
        vm.expectRevert();
        vm.prank(user);
        vault.setOperator(operator);

        vault.setOperator(operator); // works from owner
        assertEq(vault.operator(), operator);
    }

    // Whitelist

    function testWhitelistVault() public {
        vault.whitelistVault(targetVault, true);
        assertTrue(vault.whitelistedVaults(targetVault));

        vault.whitelistVault(targetVault, false);
        assertFalse(vault.whitelistedVaults(targetVault));
    }

    // Rebalance

    function testRebalanceRevertsIfNotOperator() public {
        vault.whitelistVault(targetVault, true);

        vm.expectRevert();
        vault.rebalance(targetVault, "");
    }

    function testRebalanceRevertsIfNotWhitelisted() public {
        vault.setOperator(operator);

        vm.prank(operator);
        vm.expectRevert("not whitelisted");
        vault.rebalance(targetVault, "");
    }

    function testRebalanceCallsTargetVault() public {
        vault.setOperator(operator);
        vault.whitelistVault(targetVault, true);

        // Build a mock target vault that returns true on call
        vm.mockCall(
            targetVault,
            bytes(""),
            hex"01"
        );


        vm.prank(operator);
        vault.rebalance(targetVault, "");

        assertEq(vault.activeVault(), targetVault);
    }

    // Additional tests for production-ready features:
    function testWithdraw() public {
        // user deposits
        vm.startPrank(user);
        token.approve(address(vault), 500 ether);
        vault.deposit(500 ether);

        vault.withdraw(200 ether);

        assertEq(vault.balances(user), 300 ether);
        assertEq(token.balanceOf(user), 700 ether);

        vm.stopPrank();
    }

    function testWithdrawRevertsZero() public {
        vm.startPrank(user);
        vm.expectRevert("amount=0");
        vault.withdraw(0);
        vm.stopPrank();
    }

    function testWithdrawRevertsInsufficient() public {
        vm.startPrank(user);
        vm.expectRevert("insufficient");
        vault.withdraw(1 ether);
        vm.stopPrank();
    }

    function testSetOperatorZeroReverts() public {
        vm.expectRevert("operator=0");
        vault.setOperator(address(0));
    }

    function testActiveVaultUpdatedOnRebalance() public {
        vault.setOperator(operator);
        vault.whitelistVault(targetVault, true);

        vm.mockCall(targetVault, bytes(""), hex"01");

        vm.prank(operator);
        vault.rebalance(targetVault, "");

        assertEq(vault.activeVault(), targetVault);
    }

    function testDepositEmitsEvent() public {
        vm.startPrank(user);
        token.approve(address(vault), 100 ether);

        vm.expectEmit(true, false, false, true);
        emit OptimizerVault.Deposit(user, 100 ether);

        vault.deposit(100 ether);

        vm.stopPrank();
    }

}