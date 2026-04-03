import { expect } from "chai";
import { ethers } from "hardhat";
import {
  deployEscrow,
  createAndFundEscrow,
  advanceTime,
  DEFAULT_MILESTONES,
  REVIEW_WINDOW,
  TOTAL_AMOUNT,
  TestContext,
} from "./helpers/setup";

describe("MilestoneEscrow", function () {
  let ctx: TestContext;

  beforeEach(async function () {
    ctx = await deployEscrow();
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 1: createEscrow
  // ─────────────────────────────────────────────────────────
  describe("createEscrow", function () {
    it("should create escrow with correct parameters", async function () {
      const { escrow, token, client, contractor, arbitrator } = ctx;

      await expect(
        escrow.connect(client).createEscrow({
          contractor: contractor.address,
          paymentToken: await token.getAddress(),
          milestoneAmounts: DEFAULT_MILESTONES,
          reviewWindow: REVIEW_WINDOW,
          arbitrator: arbitrator.address,
        })
      )
        .to.emit(escrow, "EscrowCreated")
        .withArgs(1, client.address, contractor.address, TOTAL_AMOUNT);

      const stored = await escrow.escrows(1);
      expect(stored.client).to.equal(client.address);
      expect(stored.contractor).to.equal(contractor.address);
      expect(stored.totalAmount).to.equal(TOTAL_AMOUNT);
      expect(stored.funded).to.equal(false);
    });

    it("should start escrow counter at 1", async function () {
      const { escrow, token, client, contractor } = ctx;

      await escrow.connect(client).createEscrow({
        contractor: contractor.address,
        paymentToken: await token.getAddress(),
        milestoneAmounts: DEFAULT_MILESTONES,
        reviewWindow: REVIEW_WINDOW,
        arbitrator: ethers.ZeroAddress,
      });

      // First escrow should have ID 1, never 0
      const stored = await escrow.escrows(1);
      expect(stored.client).to.equal(client.address);

      const ghost = await escrow.escrows(0);
      expect(ghost.client).to.equal(ethers.ZeroAddress);
    });

    it("should revert with zero address contractor", async function () {
      const { escrow, token, client } = ctx;

      await expect(
        escrow.connect(client).createEscrow({
          contractor: ethers.ZeroAddress,
          paymentToken: await token.getAddress(),
          milestoneAmounts: DEFAULT_MILESTONES,
          reviewWindow: REVIEW_WINDOW,
          arbitrator: ethers.ZeroAddress,
        })
      ).to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });

    it("should revert with zero address payment token", async function () {
      const { escrow, client, contractor } = ctx;

      await expect(
        escrow.connect(client).createEscrow({
          contractor: contractor.address,
          paymentToken: ethers.ZeroAddress,
          milestoneAmounts: DEFAULT_MILESTONES,
          reviewWindow: REVIEW_WINDOW,
          arbitrator: ethers.ZeroAddress,
        })
      ).to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });

    it("should revert with empty milestone amounts", async function () {
      const { escrow, token, client, contractor } = ctx;

      await expect(
        escrow.connect(client).createEscrow({
          contractor: contractor.address,
          paymentToken: await token.getAddress(),
          milestoneAmounts: [],
          reviewWindow: REVIEW_WINDOW,
          arbitrator: ethers.ZeroAddress,
        })
      ).to.be.revertedWithCustomError(escrow, "ZeroAmount");
    });

    it("should revert if contractor is same as client", async function () {
      const { escrow, token, client } = ctx;

      await expect(
        escrow.connect(client).createEscrow({
          contractor: client.address,
          paymentToken: await token.getAddress(),
          milestoneAmounts: DEFAULT_MILESTONES,
          reviewWindow: REVIEW_WINDOW,
          arbitrator: ethers.ZeroAddress,
        })
      ).to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });

    it("should revert with zero review window", async function () {
      const { escrow, token, client, contractor } = ctx;

      await expect(
        escrow.connect(client).createEscrow({
          contractor: contractor.address,
          paymentToken: await token.getAddress(),
          milestoneAmounts: DEFAULT_MILESTONES,
          reviewWindow: 0,
          arbitrator: ethers.ZeroAddress,
        })
      ).to.be.revertedWithCustomError(escrow, "ZeroAmount");
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 2: fundEscrow
  // ─────────────────────────────────────────────────────────
  describe("fundEscrow", function () {
    it("should fund escrow and transfer tokens", async function () {
      const { escrow, token, client, contractor, arbitrator } = ctx;

      await escrow.connect(client).createEscrow({
        contractor: contractor.address,
        paymentToken: await token.getAddress(),
        milestoneAmounts: DEFAULT_MILESTONES,
        reviewWindow: REVIEW_WINDOW,
        arbitrator: arbitrator.address,
      });

      const escrowAddress = await escrow.getAddress();
      const balanceBefore = await token.balanceOf(escrowAddress);

      await expect(escrow.connect(client).fundEscrow(1))
        .to.emit(escrow, "EscrowFunded")
        .withArgs(1, TOTAL_AMOUNT);

      const balanceAfter = await token.balanceOf(escrowAddress);
      expect(balanceAfter - balanceBefore).to.equal(TOTAL_AMOUNT);

      const stored = await escrow.escrows(1);
      expect(stored.funded).to.equal(true);
    });

    it("should revert if already funded", async function () {
      const { escrow, token, client, contractor } = ctx;

      await escrow.connect(client).createEscrow({
        contractor: contractor.address,
        paymentToken: await token.getAddress(),
        milestoneAmounts: DEFAULT_MILESTONES,
        reviewWindow: REVIEW_WINDOW,
        arbitrator: ethers.ZeroAddress,
      });

      await escrow.connect(client).fundEscrow(1);

      await expect(
        escrow.connect(client).fundEscrow(1)
      ).to.be.revertedWithCustomError(escrow, "AlreadyFunded");
    });

    it("should revert if not client", async function () {
      const { escrow, token, client, contractor } = ctx;

      await escrow.connect(client).createEscrow({
        contractor: contractor.address,
        paymentToken: await token.getAddress(),
        milestoneAmounts: DEFAULT_MILESTONES,
        reviewWindow: REVIEW_WINDOW,
        arbitrator: ethers.ZeroAddress,
      });

      await expect(
        escrow.connect(contractor).fundEscrow(1)
      ).to.be.revertedWithCustomError(escrow, "NotClient");
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 3: submitMilestone
  // ─────────────────────────────────────────────────────────
  describe("submitMilestone", function () {
    it("should submit a pending milestone", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await expect(escrow.connect(contractor).submitMilestone(escrowId, 0))
        .to.emit(escrow, "MilestoneSubmitted")
        .withArgs(escrowId, 0, await getBlockTimestamp());
    });

    it("should revert if not contractor", async function () {
      const { escrow, client } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await expect(
        escrow.connect(client).submitMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "NotContractor");
    });

    it("should revert if milestone already submitted", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(
        escrow.connect(contractor).submitMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
    });

    it("should revert with invalid milestone index", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await expect(
        escrow.connect(contractor).submitMilestone(escrowId, 99)
      ).to.be.revertedWithCustomError(escrow, "InvalidMilestoneIndex");
    });

    it("should allow resubmission after rejection", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).rejectMilestone(escrowId, 0);

      // Should succeed — REJECTED → SUBMITTED is valid
      await expect(
        escrow.connect(contractor).submitMilestone(escrowId, 0)
      ).to.emit(escrow, "MilestoneSubmitted");
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 4: approveMilestone + rejectMilestone
  // ─────────────────────────────────────────────────────────
  describe("approveMilestone", function () {
    it("should approve a submitted milestone", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(escrow.connect(client).approveMilestone(escrowId, 0))
        .to.emit(escrow, "MilestoneApproved")
        .withArgs(escrowId, 0);
    });

    it("should revert if not client", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(
        escrow.connect(contractor).approveMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "NotClient");
    });

    it("should revert if review window expired", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      // Advance time past review window
      await advanceTime(REVIEW_WINDOW + 1);

      await expect(
        escrow.connect(client).approveMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "ReviewWindowExpired");
    });
  });

  describe("rejectMilestone", function () {
    it("should reject a submitted milestone", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(escrow.connect(client).rejectMilestone(escrowId, 0))
        .to.emit(escrow, "MilestoneRejected")
        .withArgs(escrowId, 0);
    });

    it("should revert if review window expired", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await advanceTime(REVIEW_WINDOW + 1);

      await expect(
        escrow.connect(client).rejectMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "ReviewWindowExpired");
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 5: claimExpiredMilestone
  // ─────────────────────────────────────────────────────────
  describe("claimExpiredMilestone", function () {
    it("should auto-approve after review window expires", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await advanceTime(REVIEW_WINDOW + 1);

      await expect(
        escrow.connect(contractor).claimExpiredMilestone(escrowId, 0)
      ).to.emit(escrow, "MilestoneApproved");
    });

    it("should revert if review window not yet expired", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(
        escrow.connect(contractor).claimExpiredMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "ReviewWindowNotExpired");
    });

    it("should revert if not contractor", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await advanceTime(REVIEW_WINDOW + 1);

      await expect(
        escrow.connect(client).claimExpiredMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "NotContractor");
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 6: withdrawMilestone
  // ─────────────────────────────────────────────────────────
  describe("withdrawMilestone", function () {
    it("should transfer funds to contractor on withdrawal", async function () {
      const { escrow, token, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).approveMilestone(escrowId, 0);

      const balanceBefore = await token.balanceOf(contractor.address);

      await expect(escrow.connect(contractor).withdrawMilestone(escrowId, 0))
        .to.emit(escrow, "MilestoneWithdrawn")
        .withArgs(escrowId, 0, DEFAULT_MILESTONES[0]);

      const balanceAfter = await token.balanceOf(contractor.address);
      expect(balanceAfter - balanceBefore).to.equal(DEFAULT_MILESTONES[0]);
    });

    it("should revert if milestone not approved", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(
        escrow.connect(contractor).withdrawMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
    });

    it("should revert on double withdrawal", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).approveMilestone(escrowId, 0);
      await escrow.connect(contractor).withdrawMilestone(escrowId, 0);

      // Second withdrawal must fail — WITHDRAWN is terminal
      await expect(
        escrow.connect(contractor).withdrawMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
    });

    it("should revert if not contractor", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).approveMilestone(escrowId, 0);

      await expect(
        escrow.connect(client).withdrawMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "NotContractor");
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 7: cancelMilestone
  // ─────────────────────────────────────────────────────────
  describe("cancelMilestone", function () {
    it("should refund client on cancel", async function () {
      const { escrow, token, client } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      const balanceBefore = await token.balanceOf(client.address);

      await expect(escrow.connect(client).cancelMilestone(escrowId, 0))
        .to.emit(escrow, "MilestoneCancelled")
        .withArgs(escrowId, 0, DEFAULT_MILESTONES[0]);

      const balanceAfter = await token.balanceOf(client.address);
      expect(balanceAfter - balanceBefore).to.equal(DEFAULT_MILESTONES[0]);
    });

    it("should revert if milestone already submitted", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(
        escrow.connect(client).cancelMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
    });

    it("should revert if not client", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await expect(
        escrow.connect(contractor).cancelMilestone(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "NotClient");
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 8: disputes
  // ─────────────────────────────────────────────────────────
  describe("raiseDispute", function () {
    it("should allow client to raise dispute on submitted milestone", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(escrow.connect(client).raiseDispute(escrowId, 0))
        .to.emit(escrow, "DisputeRaised")
        .withArgs(escrowId, 0, client.address);
    });

    it("should allow contractor to raise dispute", async function () {
      const { escrow, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(escrow.connect(contractor).raiseDispute(escrowId, 0))
        .to.emit(escrow, "DisputeRaised")
        .withArgs(escrowId, 0, contractor.address);
    });

    it("should revert if no arbitrator set", async function () {
      const { escrow, token, client, contractor } = ctx;

      // Create escrow WITHOUT arbitrator
      await escrow.connect(client).createEscrow({
        contractor: contractor.address,
        paymentToken: await token.getAddress(),
        milestoneAmounts: DEFAULT_MILESTONES,
        reviewWindow: REVIEW_WINDOW,
        arbitrator: ethers.ZeroAddress,
      });
      await escrow.connect(client).fundEscrow(1);
      await escrow.connect(contractor).submitMilestone(1, 0);

      await expect(
        escrow.connect(client).raiseDispute(1, 0)
      ).to.be.revertedWithCustomError(escrow, "NoArbitrator");
    });

    it("should revert if milestone not submitted", async function () {
      const { escrow, client } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await expect(
        escrow.connect(client).raiseDispute(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
    });

    it("should revert if stranger raises dispute", async function () {
      const { escrow, contractor, stranger } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(
        escrow.connect(stranger).raiseDispute(escrowId, 0)
      ).to.be.revertedWithCustomError(escrow, "NotClient");
    });
  });

  describe("resolveDispute", function () {
    it("should resolve in favor of contractor — approve for withdrawal", async function () {
      const { escrow, token, client, contractor, arbitrator } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).raiseDispute(escrowId, 0);

      await expect(
        escrow
          .connect(arbitrator)
          .resolveDispute(escrowId, 0, contractor.address)
      )
        .to.emit(escrow, "DisputeResolved")
        .withArgs(escrowId, 0, contractor.address);

      // Contractor can now withdraw
      const balanceBefore = await token.balanceOf(contractor.address);
      await escrow.connect(contractor).withdrawMilestone(escrowId, 0);
      const balanceAfter = await token.balanceOf(contractor.address);
      expect(balanceAfter - balanceBefore).to.equal(DEFAULT_MILESTONES[0]);
    });

    it("should resolve in favor of client — refund immediately", async function () {
      const { escrow, token, client, contractor, arbitrator } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).raiseDispute(escrowId, 0);

      const balanceBefore = await token.balanceOf(client.address);

      await escrow
        .connect(arbitrator)
        .resolveDispute(escrowId, 0, client.address);

      const balanceAfter = await token.balanceOf(client.address);
      expect(balanceAfter - balanceBefore).to.equal(DEFAULT_MILESTONES[0]);
    });

    it("should revert if not arbitrator", async function () {
      const { escrow, client, contractor } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).raiseDispute(escrowId, 0);

      await expect(
        escrow.connect(client).resolveDispute(escrowId, 0, client.address)
      ).to.be.revertedWithCustomError(escrow, "NotArbitrator");
    });

    it("should revert if not disputed", async function () {
      const { escrow, contractor, arbitrator } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);

      await expect(
        escrow
          .connect(arbitrator)
          .resolveDispute(escrowId, 0, contractor.address)
      ).to.be.revertedWithCustomError(escrow, "InvalidStatus");
    });

    it("should revert if resolvedFor is not client or contractor", async function () {
      const { escrow, client, contractor, arbitrator, stranger } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).raiseDispute(escrowId, 0);

      await expect(
        escrow
          .connect(arbitrator)
          .resolveDispute(escrowId, 0, stranger.address)
      ).to.be.revertedWithCustomError(escrow, "ZeroAddress");
    });
  });

  // ─────────────────────────────────────────────────────────
  // SECTION 9: Full flow integration test
  // ─────────────────────────────────────────────────────────
  describe("Full flow", function () {
    it("should complete a full 3-milestone project lifecycle", async function () {
      const { escrow, token, client, contractor, arbitrator } = ctx;
      const escrowId = await createAndFundEscrow(ctx);

      // Milestone 0: normal approval flow
      await escrow.connect(contractor).submitMilestone(escrowId, 0);
      await escrow.connect(client).approveMilestone(escrowId, 0);
      await escrow.connect(contractor).withdrawMilestone(escrowId, 0);

      // Milestone 1: rejection then resubmission
      await escrow.connect(contractor).submitMilestone(escrowId, 1);
      await escrow.connect(client).rejectMilestone(escrowId, 1);
      await escrow.connect(contractor).submitMilestone(escrowId, 1);
      await escrow.connect(client).approveMilestone(escrowId, 1);
      await escrow.connect(contractor).withdrawMilestone(escrowId, 1);

      // Milestone 2: dispute resolved for contractor
      await escrow.connect(contractor).submitMilestone(escrowId, 2);
      await escrow.connect(client).raiseDispute(escrowId, 2);
      await escrow
        .connect(arbitrator)
        .resolveDispute(escrowId, 2, contractor.address);
      await escrow.connect(contractor).withdrawMilestone(escrowId, 2);

      // Contractor should have received all funds
      const contractorBalance = await token.balanceOf(contractor.address);
      expect(contractorBalance).to.equal(TOTAL_AMOUNT);

      // Contract should be empty
      const escrowBalance = await token.balanceOf(await escrow.getAddress());
      expect(escrowBalance).to.equal(0);
    });
  });
});

// Helper to get current block timestamp
async function getBlockTimestamp(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}