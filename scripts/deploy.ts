import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await ethers.provider.getBalance(deployer.address)).toString()
  );

  // Deploy MockERC20 (for testnet only)
  const TokenFactory = await ethers.getContractFactory("MockERC20");
  const token = await TokenFactory.deploy();
  await token.waitForDeployment();
  console.log("MockERC20 deployed to:", await token.getAddress());

  // Deploy MilestoneEscrow
  const EscrowFactory = await ethers.getContractFactory("MilestoneEscrow");
  const escrow = await EscrowFactory.deploy();
  await escrow.waitForDeployment();
  console.log("MilestoneEscrow deployed to:", await escrow.getAddress());

  // Deploy MilestoneEscrowFactory
  const FactoryContract = await ethers.getContractFactory(
    "MilestoneEscrowFactory"
  );
  const factory = await FactoryContract.deploy();
  await factory.waitForDeployment();
  console.log(
    "MilestoneEscrowFactory deployed to:",
    await factory.getAddress()
  );

  console.log("\n--- Deployment Summary ---");
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("MockERC20:", await token.getAddress());
  console.log("MilestoneEscrow:", await escrow.getAddress());
  console.log("MilestoneEscrowFactory:", await factory.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });