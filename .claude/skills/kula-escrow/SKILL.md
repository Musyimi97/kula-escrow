```markdown
# kula-escrow Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development and testing patterns used in the `kula-escrow` TypeScript codebase. The repository focuses on smart contract development (primarily in Solidity) and associated TypeScript-based test suites. You'll learn the project's coding conventions, how to implement features with robust tests, and how to enhance the test suite for better coverage and reliability.

## Coding Conventions

- **File Naming**:  
  Use PascalCase for filenames.  
  _Example_:  
  ```
  MilestoneEscrow.sol
  MockERC20.sol
  SetupHelper.ts
  ```

- **Import Style**:  
  Use relative imports in TypeScript files.  
  _Example_:  
  ```typescript
  import { setupEscrow } from '../helpers/setup';
  ```

- **Export Style**:  
  Use named exports for modules.  
  _Example_:  
  ```typescript
  export function setupEscrow() { ... }
  ```

- **Commit Messages**:  
  Follow [Conventional Commits](https://www.conventionalcommits.org/).  
  Prefixes include: `fix`, `feat`, `test`, `docs`.  
  _Example_:  
  ```
  feat: add milestone release logic to escrow contract
  ```

## Workflows

### Feature Implementation with Tests
**Trigger:** When developing a new feature or fixing a bug in a smart contract, ensuring it is tested  
**Command:** `/feature-with-tests`

1. Edit or add the smart contract implementation in `contracts/*.sol`.
   - _Example_: Update `contracts/MilestoneEscrow.sol` to add a new function.
2. Edit or add test helpers in `test/helpers/*.ts` to support new contract logic.
   - _Example_: Add a helper in `test/helpers/setup.ts` to deploy the updated contract.
3. Edit or add test cases in `test/*.test.ts` to cover the new or changed functionality.
   - _Example_: Add tests in `test/escrow.test.ts` for the new feature.
4. Commit changes with a conventional message:
   ```
   feat: implement milestone withdrawal and add tests
   ```
5. Run the test suite to ensure all tests pass.

### Test Suite Enhancement
**Trigger:** When improving test coverage, adding new flows, or fixing issues in existing tests  
**Command:** `/improve-tests`

1. Edit or add test cases in `test/*.test.ts`.
   - _Example_: Add edge case tests to `test/escrow.test.ts`.
2. Refactor or update test helpers in `test/helpers/*.ts` if needed.
3. Commit with a conventional message:
   ```
   test: add edge case for zero-value escrow release
   ```
4. Run the test suite to confirm correctness.

## Testing Patterns

- **Test File Naming**:  
  Test files use the pattern `*.test.ts`.  
  _Example_:  
  ```
  escrow.test.ts
  ```

- **Test Structure**:  
  Tests are written in TypeScript, but the specific framework is not detected.  
  Typical structure:
  ```typescript
  import { setupEscrow } from './helpers/setup';

  describe('MilestoneEscrow', () => {
    it('should release funds on milestone completion', async () => {
      // Arrange
      const escrow = await setupEscrow();
      // Act
      await escrow.release();
      // Assert
      // ...assertions here
    });
  });
  ```

- **Helpers**:  
  Shared logic and setup routines are placed in `test/helpers/*.ts`.

## Commands

| Command              | Purpose                                               |
|----------------------|-------------------------------------------------------|
| /feature-with-tests  | Implement or update a contract and add corresponding tests |
| /improve-tests       | Add or enhance test cases for better coverage         |
```
