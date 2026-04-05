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
4. Assigned campaign merchant consumes the voucher by burning the ERC1155 token.

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

Authorization model for `useVoucher`:

- Each voucher campaign stores a dedicated `merchant` address.
- Only that merchant (or contract admin) can call `useVoucher` for that campaign.

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

3. Merchant wallet must be set per voucher campaign in createVoucher(..., merchant)
Reason: `useVoucher` authorizes per campaign merchant address.

4. Governance/admin wallet must keep DEFAULT_ADMIN_ROLE on each contract
Reason: Needed for pause/unpause and role grants.

## Failure Symptoms When Roles Are Missing

- convertUnusedData reverts from token mint call: DataRewards lacks DataToken MINTER_ROLE.
- redeemVoucher reverts on VoucherToken mint: VoucherRedemption lacks VoucherToken MINTER_ROLE.
- useVoucher reverts on VoucherToken burn: VoucherRedemption lacks VoucherToken BURNER_ROLE.
- Backend cannot convert data: missing OPERATOR_ROLE.
- Merchant cannot consume voucher: connected wallet is not the campaign's assigned merchant.

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

## End-to-End Demo Setup (Step by Step)

### Step 1: Open project

Open terminal at:

```bash
cd /Users/seansee/Documents/GitHub/data-token-app
```

Install backend dependencies once:

```bash
npm install
```

### Step 2: Start local blockchain

In Terminal A:

```bash
npx hardhat node
```

Keep this terminal running for the whole demo.

### Step 3: Compile contracts

In Terminal B:

```bash
npx hardhat compile
```

### Step 4: Deploy contracts to localhost

In Terminal B:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy these addresses from output:

- DataToken
- DataRewards
- VoucherToken
- VoucherRedemption

### Step 5: Configure frontend contract addresses

Open:

- [frontend/src/config/contracts.js](frontend/src/config/contracts.js)

Paste addresses into:

- `contracts.dataToken`
- `contracts.dataRewards`
- `contracts.voucherToken`
- `contracts.voucherRedemption`

In the same file set demo identities:

- `roleAccounts.admin`
- `roleAccounts.customer`
- `roleAccounts.merchant`

### Step 6: Configure MetaMask network

Add network:

- Network name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

Switch MetaMask to this network.

### Step 7: Import demo wallets in MetaMask

Import these test accounts (from Hardhat default node output):

Admin

- Address: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

Customer

- Address: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Private key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

Merchant

- Address: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- Private key: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`

### Step 8: Start React frontend

In Terminal C:

```bash
cd /Users/seansee/Documents/GitHub/data-token-app/frontend
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173` or `http://localhost:5174`).

### Step 9: Connect wallet in app

1. Click `Connect MetaMask`.
2. Connect at least one imported account.
3. Switch MetaMask accounts during demo; UI updates automatically.
4. Check role label matches your configured `roleAccounts` values.

### Step 10: Run demo flow

Admin account:

1. Open `Admin` tab.
2. Run monthly conversion for customer (`unusedMb`, `billingMonth`, `dataURI`).
3. Create voucher campaign and set merchant address.

Customer account:

1. Switch to customer wallet in MetaMask.
2. Open `Customer` tab.
3. Approve DTT spend.
4. Redeem voucher.

Merchant account:

1. Switch to merchant wallet in MetaMask.
2. Open `Merchant` tab.
3. Select campaign from `My Campaigns`.
4. Enter customer address and click `Validate / Use Voucher`.
5. Confirm post-use voucher balance.

### Step 11: If something fails, check these first

1. Wrong network:
MetaMask must be on chainId `31337`.

2. Old addresses:
Re-deploy and repaste addresses in [frontend/src/config/contracts.js](frontend/src/config/contracts.js).

3. Missing roles:
Deploy script grants cross-contract roles automatically, but if you use non-admin operator wallet, ensure OPERATOR_ROLE is granted.

4. Hardhat node restarted:
All addresses change. Re-deploy and update frontend config.

## Quick Start Commands (From Zero)

```bash
cd /Users/seansee/Documents/GitHub/data-token-app
npm install
npx hardhat node
# new terminal
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
# update frontend/src/config/contracts.js with new addresses
cd frontend
npm install
npm run dev
```
## Post-Deployment Role Verification Checklist

Use Hardhat console:

```bash
npx hardhat console --network localhost
```

Then verify each grant with hasRole.

```javascript
const dataToken = await ethers.getContractAt("DataToken", "0x5FbDB2315678afecb367f032d93F642f64180aa3"); // put token address
const dataRewards = await ethers.getContractAt("DataRewards", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"); // put data rewards address
const voucherToken = await ethers.getContractAt("VoucherToken", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"); // put vouchertoken address
const voucherRedemption = await ethers.getContractAt("VoucherRedemption", "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"); // put voucherredemption address

await dataToken.hasRole(await dataToken.MINTER_ROLE(), await dataRewards.getAddress());
await voucherToken.hasRole(await voucherToken.MINTER_ROLE(), await voucherRedemption.getAddress());
await voucherToken.hasRole(await voucherToken.BURNER_ROLE(), await voucherRedemption.getAddress());
await dataRewards.hasRole(await dataRewards.OPERATOR_ROLE(), "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"); // put admin address

// Merchant check is per voucher campaign now:
const v = await voucherRedemption.getVoucher(0);
v.merchant.toLowerCase() === "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".toLowerCase(); // put merchant address
```

All checks should return true.

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
