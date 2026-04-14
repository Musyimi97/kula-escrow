---
name: test-suite-enhancement
description: Workflow command scaffold for test-suite-enhancement in kula-escrow.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /test-suite-enhancement

Use this workflow when working on **test-suite-enhancement** in `kula-escrow`.

## Goal

Adds or updates test cases to cover new flows, edge cases, or fixes issues in existing tests.

## Common Files

- `test/escrow.test.ts`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit or add test cases in test/*.test.ts

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.