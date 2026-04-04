# Data Token App

A student blockchain project that demonstrates a simple reward economy for data contributions.

Users submit data references (for example, dataset links or IPFS URIs). Reviewers approve valid submissions, and contributors receive ERC20 reward tokens. Those tokens can then be redeemed for vouchers.

## Project Overview

This project combines:

- Solidity smart contracts (Hardhat)
- Role-based access control (OpenZeppelin AccessControl)
- ERC20 reward token (OpenZeppelin ERC20)
- A minimal frontend (Vanilla HTML/CSS/JS + ethers.js + MetaMask)

Main idea: create a transparent and auditable contribution-reward-redemption flow.

## Business Case

Many projects depend on community data collection and curation, but contributors are often unpaid or rewarded inconsistently.

This system proposes a lightweight model:

1. Contributors submit data.
2. Reviewers approve quality submissions.
3. Approved work earns on-chain tokens.
4. Tokens are redeemable for real or virtual incentives (vouchers).

Possible contexts:

- Campus research participation
- Citizen science challenges
- Open data labeling/annotation initiatives
- Student hackathon contribution tracking

## Why Decentralization Here?

Decentralization is useful in this project because it provides:

- Transparency: approvals, minting, and redemptions are on-chain.
- Auditability: anyone can verify who was rewarded and when.
- Role-based governance: reviewer/manager permissions are explicit and traceable.
- Reduced trust assumptions: users do not need to trust hidden backend accounting.

This is still a practical demo, not a fully trustless production protocol. Review actions remain human-governed through roles.

## Smart Contracts

### 1) DataToken

File: [contracts/DataToken.sol](contracts/DataToken.sol)

Purpose:

- ERC20 reward token (`DTT`)
- Supports controlled minting via `MINTER_ROLE`

Key points:

- Admin receives initial supply on deployment.
- `mint(to, amount)` can only be called by accounts/contracts with `MINTER_ROLE`.

### 2) DataRewards

File: [contracts/DataRewards.sol](contracts/DataRewards.sol)

Purpose:

- Accepts data submissions
- Lets reviewers approve submissions and trigger token rewards

Key points:

- Users call `submitData(dataURI, rewardAmount)`.
- Reviewers call `approveSubmission(submissionId)`.
- On approval, contract mints reward tokens to submitter.
- Requires `DataRewards` contract to have `MINTER_ROLE` on `DataToken`.

### 3) VoucherRedemption

File: [contracts/VoucherRedemption.sol](contracts/VoucherRedemption.sol)

Purpose:

- Defines redeemable vouchers with token costs
- Transfers user tokens to treasury during redemption

Key points:

- Managers create/update vouchers.
- Users call `redeemVoucher(voucherId)`.
- User must first approve token allowance for `VoucherRedemption`.

## Contract Relationships

- `DataRewards` depends on `DataToken` for minting rewards.
- `VoucherRedemption` depends on `DataToken` for `transferFrom` during redemption.
- `DataToken` is the central token used by both contracts.

## Local Setup Instructions

### Prerequisites

- Node.js 18+ (recommended)
- npm
- MetaMask browser extension

### Install dependencies

```bash
npm install
```

### Compile contracts

```bash
npx hardhat compile
```

### Optional: run tests

```bash
npx hardhat test
```

## Deployment Steps

The project includes deployment script:

- [scripts/deploy.js](scripts/deploy.js)

### 1) Deploy locally (Hardhat in-memory network)

```bash
npx hardhat run scripts/deploy.js
```

This deploys:

1. `DataToken`
2. `DataRewards`
3. `VoucherRedemption`

And then grants `MINTER_ROLE` on `DataToken` to `DataRewards`.

### 2) Deploy to localhost node (persistent local chain)

Terminal A:

```bash
npx hardhat node
```

Terminal B:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 3) Configure frontend addresses

Copy deployment addresses into:

- [frontend/contractConfig.js](frontend/contractConfig.js)

Update:

- `dataTokenAddress`
- `dataRewardsAddress`
- `voucherRedemptionAddress`

### 4) Serve frontend

Any static server works. Example:

```bash
npx serve frontend
```

Then open the printed URL in browser and connect MetaMask.

## Demo Flow (Suggested Presentation Sequence)

1. Connect MetaMask in UI.
2. Show wallet and current `DTT` balance.
3. Submit a data entry with reward amount.
4. Approve the submission as reviewer account.
5. Show updated token balance after reward minting.
6. Create a voucher as manager account.
7. Approve token spending for VoucherRedemption.
8. Redeem voucher and confirm token transfer to treasury.

If using separate accounts for roles, switch MetaMask account between reviewer/manager/user based on permissions.

## Known Limitations

- No off-chain verification pipeline for submitted data quality.
- Duplicate protection uses URI hash only (basic, not semantic duplicate detection).
- No pagination/indexing strategy for large submission volumes.
- Voucher fulfillment is represented on-chain only; no external delivery integration.
- Frontend is intentionally minimal and not production-hardened.
- No advanced security features like pausable circuit-breaker or timelocked admin controls.

## Future Extensions

- Add backend or oracle-assisted review workflow.
- Add richer submission metadata and category tagging.
- Introduce staking/slashing for reviewer accountability.
- Add voucher inventory limits and redemption windows.
- Add analytics dashboard for total rewards and redemption stats.
- Add unit/integration tests for full end-to-end scenario.
- Add deployment pipeline for testnet/mainnet with verification scripts.

## Notes for Instructors and Evaluators

This project is designed as a clear educational example of:

- ERC20 token utility in a micro-economy
- AccessControl-based governance
- Multi-contract interaction patterns
- Basic Web3 frontend integration with MetaMask and ethers.js

It prioritizes clarity and demoability over production complexity.
