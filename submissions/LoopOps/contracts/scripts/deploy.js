const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying LoopOpsMultisig with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const owners = [
    deployer.address, // 0x027dc86aefe8aa96353c2aee9ff06d3be4ff40eb
    "0xc1ae83fab1bedaa40ac59fed0f450428d807a28e",
    "0x5e6c00799accf807044d62985c844c55d5dabf80"
  ];
  const threshold = 2;

  const LoopOpsMultisig = await hre.ethers.getContractFactory("LoopOpsMultisig");
  const multisig = await LoopOpsMultisig.deploy(owners, threshold);

  await multisig.waitForDeployment();

  const address = await multisig.getAddress();
  console.log("LoopOpsMultisig deployed to:", address);
  console.log("Owners:", owners);
  console.log("Threshold:", threshold);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
