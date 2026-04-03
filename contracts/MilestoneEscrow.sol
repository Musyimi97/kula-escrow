// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IEscrow.sol";

contract MilestoneEscrow is IEscrow, ReentrancyGuard {
    using SafeERC20 for IERC20;

    //  Structs 
    struct Milestone {
        uint256 amount;
        MilestoneStatus status;
        uint256 submissionTime;
    }

    struct Escrow {
        address client;
        address contractor;
        address paymentToken;
        address arbitrator;      // optional, can be address(0)
        uint256 reviewWindow;    // seconds the client has to respond
        uint256 totalAmount;
        bool funded;
    }
        // ─── State ───────────────────────────────────────
    uint256 public escrowCounter;

    // escrowId → Escrow
    mapping(uint256 => Escrow) public escrows;

    // escrowId → milestoneIndex → who raised the dispute (address(0) means no dispute raised)
    mapping(uint256 => mapping(uint256 => address)) public disputeRaisedBy;


    // Constructor
    constructor() ReentrancyGuard() {
    // Start at 1 — escrowId 0 is intentionally invalid to prevent zero-value default mapping lookups which returning ghost escrow data.
    escrowCounter = 1;

    }

//  Modifiers 

    modifier onlyClient(uint256 escrowId) {
        if (msg.sender != escrows[escrowId].client) revert NotClient();
        _;
    }

    modifier onlyContractor(uint256 escrowId) {
        if (msg.sender != escrows[escrowId].contractor) revert NotContractor();
        _;
    }

    modifier escrowExists(uint256 escrowId) {
        if (escrows[escrowId].client == address(0)) revert InvalidMilestoneIndex();
        _;
    }

    modifier isFunded(uint256 escrowId) {
        if (!escrows[escrowId].funded) revert NotFunded();
        _;
    }

    modifier validMilestone(uint256 escrowId, uint256 milestoneIndex) {
        if (milestoneIndex >= milestones[escrowId].length)
            revert InvalidMilestoneIndex();
        _;
    }

    // Client calls this to set up the escrow agreement.
    // No funds move here — just configuration.
    // Funding is a separate step (fundEscrow).
    function createEscrow(EscrowParams calldata params)
        external
        returns (uint256 escrowId)
    {
        // Validate all inputs before touching state
        if (params.contractor == address(0)) revert ZeroAddress();
        if (params.paymentToken == address(0)) revert ZeroAddress();
        if (params.milestoneAmounts.length == 0) revert ZeroAmount();
        if (params.reviewWindow == 0) revert ZeroAmount();
        if (params.contractor == msg.sender) revert ZeroAddress();

        // Calculate total — every amount must be non-zero
        uint256 total;
        for (uint256 i = 0; i < params.milestoneAmounts.length; i++) {
            if (params.milestoneAmounts[i] == 0) revert ZeroAmount();
            total += params.milestoneAmounts[i];
        }

        // Assign ID then increment — so first ID = 1
        escrowId = escrowCounter;
        escrowCounter++;

        // Store escrow configuration
        escrows[escrowId] = Escrow({
            client: msg.sender,
            contractor: params.contractor,
            paymentToken: params.paymentToken,
            arbitrator: params.arbitrator,
            reviewWindow: params.reviewWindow,
            totalAmount: total,
            funded: false
        });

        // Push each milestone as PENDING
        for (uint256 i = 0; i < params.milestoneAmounts.length; i++) {
            milestones[escrowId].push(Milestone({
                amount: params.milestoneAmounts[i],
                status: MilestoneStatus.PENDING,
                submissionTime: 0
            }));
        }

        emit EscrowCreated(escrowId, msg.sender, params.contractor, total);
    }

    // Client deposits the full escrow amount in one transaction.
    // Uses SafeERC20 to handle non-standard tokens (USDT etc).
    // Can only be called once — funded flag prevents double funding.
    function fundEscrow(uint256 escrowId)
        external
        escrowExists(escrowId)
        onlyClient(escrowId)
        nonReentrant
    {
        Escrow storage escrow = escrows[escrowId];

        // Prevent funding twice
        if (escrow.funded) revert AlreadyFunded();

        // Mark funded BEFORE transfer — CEI pattern
        // Prevents reentrancy even though nonReentrant also guards this
        escrow.funded = true;

        // Pull full amount from client wallet into this contract
        // safeTransferFrom handles tokens that don't return bool
        IERC20(escrow.paymentToken).safeTransferFrom(
            msg.sender,
            address(this),
            escrow.totalAmount
        );

        emit EscrowFunded(escrowId, escrow.totalAmount);
    }

    // Contractor marks a milestone as submitted for reviewing.
    // Only PENDING or REJECTED milestones can be submitted.
    // Records submission time — used for review_window expiry.
    function submitMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        onlyContractor(escrowId)
        isFunded(escrowId)
        validMilestone(escrowId, milestoneIndex)
    {
        Milestone storage milestone = milestones[escrowId][milestoneIndex];

        // Only PENDING or REJECTED can be submitted
        // REJECTED means client rejected and contractor resubmits
        if (
            milestone.status != MilestoneStatus.PENDING &&
            milestone.status != MilestoneStatus.REJECTED
        ) revert InvalidStatus(milestone.status);

        // Record submission time — review window starts now
        milestone.status = MilestoneStatus.SUBMITTED;
        milestone.submissionTime = block.timestamp;

        emit MilestoneSubmitted(escrowId, milestoneIndex, block.timestamp);
    }

    // Client approves a submitted milestone.
    // Moves status to APPROVED — contractor can then withdraw.
    // Cannot approve disputed milestones.
    function approveMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        onlyClient(escrowId)
        isFunded(escrowId)
        validMilestone(escrowId, milestoneIndex)
    {
        Milestone storage milestone = milestones[escrowId][milestoneIndex];

        // Only SUBMITTED milestones can be approved
        if (milestone.status != MilestoneStatus.SUBMITTED)
            revert InvalidStatus(milestone.status);

        // Review window must not have expired
        // If expired, contractor uses claimExpiredMilestone instead
        if (block.timestamp > milestone.submissionTime + escrows[escrowId].reviewWindow)
            revert ReviewWindowExpired();

        milestone.status = MilestoneStatus.APPROVED;

        emit MilestoneApproved(escrowId, milestoneIndex);
    }

    // Client rejects a submitted milestone.
    // Moves back to REJECTED — contractor can resubmit.
    // Cannot reject disputed milestones.
    function rejectMilestone(uint256 escrowId, uint256 milestoneIndex)
        external
        escrowExists(escrowId)
        onlyClient(escrowId)
        isFunded(escrowId)
        validMilestone(escrowId, milestoneIndex)
    {
        Milestone storage milestone = milestones[escrowId][milestoneIndex];

        // Only SUBMITTED milestones can be rejected
        if (milestone.status != MilestoneStatus.SUBMITTED)
            revert InvalidStatus(milestone.status);

        // Review window must not have expired
        if (block.timestamp > milestone.submissionTime + escrows[escrowId].reviewWindow)
            revert ReviewWindowExpired();

        // Reset to REJECTED — contractor can resubmit
        milestone.status = MilestoneStatus.REJECTED;

        emit MilestoneRejected(escrowId, milestoneIndex);
    }


    function claimExpiredMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external {}

    function withdrawMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external {}

    function cancelMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external {}

    function raiseDispute(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external {}

    function resolveDispute(
        uint256 escrowId,
        uint256 milestoneIndex,
        address resolvedFor
    ) external {}





}