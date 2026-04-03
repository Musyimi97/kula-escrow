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

      //  Function Stubs 
    function createEscrow(EscrowParams calldata params)
        external returns (uint256) {}

    function fundEscrow(uint256 escrowId) external {}

    function submitMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external {}

    function approveMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external {}

    function rejectMilestone(
        uint256 escrowId,
        uint256 milestoneIndex
    ) external {}

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