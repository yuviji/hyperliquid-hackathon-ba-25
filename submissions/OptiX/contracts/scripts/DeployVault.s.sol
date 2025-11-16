// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptimizerBoringVault.sol";

contract DeployVault is Script {
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPk);

        // ---------------------------------------------------
        // SET THESE TO REAL ADDRESSES ON SEPOLIA
        // ---------------------------------------------------
        address asset = 0xd9CBEC81df392A88AEff575E962d149d57F4d6bc;       // ERC-20 underlying token (USDC, mock token, etc.)
        address gluexRouter = 0xe95F6EAeaE1E4d650576Af600b33D9F7e5f9f7fd; // GlueX Router address on Sepolia
        // ---------------------------------------------------

        OptimizerBoringVault vault = new OptimizerBoringVault(
            asset,
            gluexRouter
        );

        console.log("Vault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}