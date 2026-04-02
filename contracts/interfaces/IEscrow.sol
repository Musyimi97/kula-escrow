// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IEscrow {

    // Enums
    enum MilestoneStatus {
        PENDING,
        SUBMITTED,
        APPROVED,
        REJECTED,
        WITHDRAWN,
        CANCELLED,
        DISPUTED
    }

    // Structs 
    struct EscrowParams {
        address contractor;
        address paymentToken;
        uint256[] milestoneAmounts;
        uint256 reviewWindow;
        address arbitrator;
    }

    // Events
    event EscrowCreated(
        uint256 indexed escrowId,
        address indexed client,
        address indexed contractor,
        uint256 totalAmount
    );

    event EscrowFunded(
        uint256 indexed escrowId,
        uint256 amount
    );

    event MilestoneSubmitted(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        uint256 submissionTime
    );

    event MilestoneApproved(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex
    );

    event MilestoneRejected(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex
    );

    event MilestoneWithdrawn(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        uint256 amount
    );

    event MilestoneCancelled(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        uint256 refundAmount
    );

    event DisputeRaised(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        address indexed raisedBy
    );

    event DisputeResolved(
        uint256 indexed escrowId,
        uint256 indexed milestoneIndex,
        address resolvedFor
    );

    // Custom Errors 
    error NotClient();
    error NotContractor();
    error NotArbitrator();
    error AlreadyFunded();
    error NotFunded();
    error InvalidMilestoneIndex();
    error InvalidStatus(MilestoneStatus current);
    error ReviewWindowNotExpired();
    error ReviewWindowExpired();
    error ZeroAddress();
    error ZeroAmount();
    error NoArbitrator();
    error TransferFailed();

    //  Functions 
    function createEscrow(EscrowParams calldata params) 
        external returns (uint256 escrowId);

    function fundEscrow(uint256 escrowId) external;

    function submitMilestone(
        uint256 escrowId, 
        uint256 milestoneIndex
    ) external;

    function approveMilestone(
        uint256 escrowId, 
        uint256 milestoneIndex
    ) external;

    function rejectMilestone(
        uint256 escrowId, 
        uint256 milestoneIndex
    ) external;

    function claimExpiredMilestone(
        uint256 escrowId, 
        uint256 milestoneIndex
    ) external;

    function withdrawMilestone(
        uint256 escrowId, 
        uint256 milestoneIndex
    ) external;

    function cancelMilestone(
        uint256 escrowId, 
        uint256 milestoneIndex
    ) external;

    function raiseDispute(
        uint256 escrowId, 
        uint256 milestoneIndex
    ) external;

    function resolveDispute(
        uint256 escrowId,
        uint256 milestoneIndex,
        address resolvedFor
    ) external;
}