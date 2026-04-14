---
name: feature-implementation-with-tests
description: Workflow command scaffold for feature-implementation-with-tests in kula-escrow.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /feature-implementation-with-tests

Use this workflow when working on **feature-implementation-with-tests** in `kula-escrow`.

## Goal

Implements or updates a smart contract and adds or updates corresponding test helpers and test cases.

## Common Files

- `contracts/MilestoneEscrow.sol`
- `contracts/mocks/MockERC20.sol`
- `test/helpers/setup.ts`
- `test/escrow.test.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit or add smart contract implementation in contracts/*.sol
- Edit or add test helpers in test/helpers/*.ts
- Edit or add test cases in test/*.test.ts

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.