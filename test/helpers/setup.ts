import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { MilestoneEscrow, MockERC20 } from "../../typechain-types";

export interface TestContext {
  escrow: MilestoneEscrow;
  token: MockERC20;
  client: SignerWithAddress;
  contractor: SignerWithAddress;
  arbitrator: SignerWithAddress;
  stranger: SignerWithAddress;
}

export const REVIEW_WINDOW = 7 * 24 * 60 * 60; // 7 days in seconds

export const DEFAULT_MILESTONES = [
  ethers.parseEther("100"),
  ethers.parseEther("200"),
  ethers.parseEther("300"),
];

export const TOTAL_AMOUNT = DEFAULT_MILESTONES.reduce(
  (a, b) => a + b,
  BigInt(0)
);

export async function deployEscrow(): Promise<TestContext> {
  const [client, contractor, arbitrator, stranger] =
    await ethers.getSigners();

  // Deploy mock token
  const TokenFactory = await ethers.getContractFactory("MockERC20");
  const token = await TokenFactory.deploy();

  // Deploy escrow
  const EscrowFactory = await ethers.getContractFactory("MilestoneEscrow");
  const escrow = await EscrowFactory.deploy();

  // Mint tokens to client
  await token.mint(client.address, ethers.parseEther("10000"));

  // Approve escrow to spend client tokens
  await token
    .connect(client)
    .approve(await escrow.getAddress(), ethers.parseEther("10000"));

  return { escrow, token, client, contractor, arbitrator, stranger };
}

export async function createAndFundEscrow(ctx: TestContext): Promise<bigint> {
  const { escrow, token, client, contractor, arbitrator } = ctx;

  const tx = await escrow.connect(client).createEscrow({
    contractor: contractor.address,
    paymentToken: await token.getAddress(),
    milestoneAmounts: DEFAULT_MILESTONES,
    reviewWindow: REVIEW_WINDOW,
    arbitrator: arbitrator.address,
  });

  const receipt = await tx.wait();
  const event = receipt?.logs
    .map((log) => {
      try {
        return escrow.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e?.name === "EscrowCreated");

  if (!event) {
    throw new Error("EscrowCreated event not found in transaction logs");
  }
  const escrowId = event.args[0] as bigint;

  await escrow.connect(client).fundEscrow(escrowId);

  return escrowId;
}

// Advance blockchain time
export async function advanceTime(seconds: number): Promise<void> {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}