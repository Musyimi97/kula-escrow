// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./MilestoneEscrow.sol";

/**
 * Deploys isolated MilestoneEscrow contracts per agreement.
 * Each escrow is a separate contract instance — blast radius of
 * any_single_bug or exploit is limited to that single escrow agreement.
 * This contrasts with a mapping-based approach where all agreements
 * share one contract's state and attack surface.
 */
contract MilestoneEscrowFactory {

    // All deployed escrow contracts
    address[] public deployedEscrows;

    // creator address → their deployed escrow contracts
    mapping(address => address[]) public escrowsByCreator;

    event EscrowDeployed(
        address indexed escrowAddress,
        address indexed creator,
        uint256 deployedAt
    );

    /**
     * Deploy a fresh isolated MilestoneEscrow contract
     * Caller becomes the deployer — they must then call
     * createEscrow() on the returned contract to initialize an agreement.
     * return: escrowAddress Address of the newly deployed escrow
     */
    function deployEscrow() external returns (address escrowAddress) {
        // Deploy new isolated escrow instance
        MilestoneEscrow escrow = new MilestoneEscrow();
        escrowAddress = address(escrow);

        // Track globally and per creator
        deployedEscrows.push(escrowAddress);
        escrowsByCreator[msg.sender].push(escrowAddress);

        emit EscrowDeployed(escrowAddress, msg.sender, block.timestamp);
    }

    
    // Get all deployed escrow contract addresses
   
    function getDeployedEscrows() external view returns (address[] memory) {
        return deployedEscrows;
    }

   // Get all escrows deployed by a specific creator

    function getEscrowsByCreator(
        address creator
    ) external view returns (address[] memory) {
        return escrowsByCreator[creator];
    }

  // Total number of escrows deployed via this factory
  
    function totalEscrows() external view returns (uint256) {
        return deployedEscrows.length;
    }
}