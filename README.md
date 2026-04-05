# Data Token App

A telco-style student blockchain project where verified unused mobile data is converted into reward tokens, and users redeem vouchers using those tokens.

## Project Overview

This project includes:

- Solidity contracts with Hardhat
- OpenZeppelin AccessControl-based permissions
- ERC20 utility token for rewards and payments
- ERC1155 voucher token for redeemed voucher units
- A plain HTML/CSS/JS frontend with ethers.js and MetaMask

Core flow:

1. Backend operator converts unused data into DataToken rewards.
2. User redeems voucher campaigns using DataToken.
3. Redemption mints an ERC1155 voucher token.
4. Merchant/redeemer role consumes the voucher by burning the ERC1155 token.

## Smart Contracts

### DataToken

File: [contracts/DataToken.sol](contracts/DataToken.sol)

Purpose:

- ERC20 reward and utility token (DTT)
- Minting controlled by MINTER_ROLE
- Supports burnFrom for spend flows

### DataRewards

File: [contracts/DataRewards.sol](contracts/DataRewards.sol)

Purpose:

- Converts verified unused MB into reward tokens
- Uses integer division conversion rule based on mbPerToken
- Prevents duplicate month processing per user

Security/design highlights:

- AccessControl (DEFAULT_ADMIN_ROLE, OPERATOR_ROLE)
- Pausable emergency stop
- ReentrancyGuard
- Two-step delayed admin updates for reward token and conversion rate

### VoucherToken

File: [contracts/VoucherToken.sol](contracts/VoucherToken.sol)

Purpose:

- ERC1155 representation of redeemed voucher units
- Uses voucherId as ERC1155 token id

Roles:

- MINTER_ROLE for issuing voucher units on redemption
- BURNER_ROLE for consuming voucher units on usage

### VoucherRedemption

File: [contracts/VoucherRedemption.sol](contracts/VoucherRedemption.sol)

Purpose:

- Manages voucher campaigns (struct-based, not NFT ownership model)
- Burns DataToken on redemption
- Mints one VoucherToken unit per redemption
- Enforces campaign stock and per-user redemption limits

Roles:

- MANAGER_ROLE for campaign management
- REDEEMER_ROLE for useVoucher operations

## Critical Role Assignments (Required)

This is the most important setup section. If these roles are missing, the app will deploy but key actions will revert.

### Required contract-to-contract grants

1. DataRewards must have DataToken MINTER_ROLE
Reason: DataRewards mints reward tokens during conversion.

2. VoucherRedemption must have VoucherToken MINTER_ROLE
Reason: VoucherRedemption mints ERC1155 voucher units on redeemVoucher.

3. VoucherRedemption must have VoucherToken BURNER_ROLE
Reason: VoucherRedemption burns ERC1155 voucher units in useVoucher.

### Required operational wallet roles

1. Backend conversion wallet must have DataRewards OPERATOR_ROLE
Reason: Only OPERATOR_ROLE can call convertUnusedData.

2. Voucher campaign admin wallet must have VoucherRedemption MANAGER_ROLE
Reason: Only MANAGER_ROLE can create/update vouchers.

3. Merchant or redemption-processing wallet must have VoucherRedemption REDEEMER_ROLE
Reason: Only REDEEMER_ROLE can call useVoucher.

4. Governance/admin wallet must keep DEFAULT_ADMIN_ROLE on each contract
Reason: Needed for pause/unpause and role grants.

## Failure Symptoms When Roles Are Missing

- convertUnusedData reverts from token mint call: DataRewards lacks DataToken MINTER_ROLE.
- redeemVoucher reverts on VoucherToken mint: VoucherRedemption lacks VoucherToken MINTER_ROLE.
- useVoucher reverts on VoucherToken burn: VoucherRedemption lacks VoucherToken BURNER_ROLE.
- Backend cannot convert data: missing OPERATOR_ROLE.
- Merchant cannot consume voucher: missing REDEEMER_ROLE.

## Local Setup

### Prerequisites

- Node.js 18+
- npm
- MetaMask

### Install and compile

```bash
npm install
npx hardhat compile
```

## Deployment

Deployment script:

- [scripts/deploy.js](scripts/deploy.js)

### In-memory local deploy

```bash
npx hardhat run scripts/deploy.js
```

### Persistent localhost deploy

Terminal A:

```bash
npx hardhat node
```

Terminal B:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

The script deploys DataToken, DataRewards, VoucherToken, VoucherRedemption and grants key cross-contract roles.

## Post-Deployment Role Verification Checklist

Use Hardhat console:

```bash
npx hardhat console --network localhost
```

Then verify each grant with hasRole.

Example checks:

```javascript
const dataToken = await ethers.getContractAt("DataToken", "<DataTokenAddress>");
const dataRewards = await ethers.getContractAt("DataRewards", "<DataRewardsAddress>");
const voucherToken = await ethers.getContractAt("VoucherToken", "<VoucherTokenAddress>");
const voucherRedemption = await ethers.getContractAt("VoucherRedemption", "<VoucherRedemptionAddress>");

await dataToken.hasRole(await dataToken.MINTER_ROLE(), await dataRewards.getAddress());
await voucherToken.hasRole(await voucherToken.MINTER_ROLE(), await voucherRedemption.getAddress());
await voucherToken.hasRole(await voucherToken.BURNER_ROLE(), await voucherRedemption.getAddress());
await dataRewards.hasRole(await dataRewards.OPERATOR_ROLE(), "<backendWallet>");
await voucherRedemption.hasRole(await voucherRedemption.REDEEMER_ROLE(), "<merchantWallet>");
```

All checks should return true.

## Frontend Setup

Update deployed addresses in:

- [frontend/contractConfig.js](frontend/contractConfig.js)

Then serve frontend:

```bash
npx serve frontend
```

## Demo Flow

1. Connect MetaMask and show DTT balance.
2. As backend operator, run monthly conversion for a user.
3. As manager, create a voucher campaign with supply and per-user cap.
4. As customer, approve DataToken spend and redeem voucher.
5. As merchant/redeemer, call useVoucher to consume the ERC1155 unit.

## Known Limitations

- Billing month duplicate key uses strict string format (YYYY-MM), still not a full calendar oracle.
- No full governance timelock contract; rewards config uses minimal delayed queue/apply.
- Frontend is demo-focused and not production-hardened.

## Notes

This project intentionally prioritizes clarity and practical security patterns for a school demo:

- RBAC
- CEI ordering
- ReentrancyGuard
- Pausable emergency stop
- Minimal delayed admin-change pattern
