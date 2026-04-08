# Data Token App

A telco-style blockchain demo where unused mobile data is converted into DTT rewards, users redeem vouchers with DTT, and merchants consume redeemed vouchers.

## Project Overview

This project contains:

- Solidity smart contracts
- Hardhat deployment/testing workflow
- React frontend for Admin, Customer, and Merchant flows

Core contracts:

- `DataToken` (ERC20): reward/spend token
- `DataRewards`: converts unused MB into DTT
- `VoucherToken` (ERC1155): minted when vouchers are redeemed
- `VoucherRedemption`: voucher campaigns, redeem, and merchant use

## Test through either Remix or HardHat
- No Environment Variables Required

## 1) Test First on Remix (Step-by-Step)

Use this for quick contract testing before local Hardhat demo.

### Step 1: Open Remix

Go to `https://remix.ethereum.org`.

### Step 2: Add contract files

Create and paste these files under `contracts/`:

- `DataToken.sol`
- `DataRewards.sol`
- `VoucherToken.sol`
- `VoucherRedemption.sol`

### Step 3: Add OpenZeppelin imports

In Remix File Explorer, install imports automatically when prompted, or use a workspace where OZ imports resolve.

### Step 4: Compile

In Solidity Compiler:

- Compiler version: `0.8.20`
- EVM version: `cancun`
- Compile all contracts

### Step 5: Deploy in order (Remix VM)

In Deploy & Run Transactions (Remix VM):

1. Deploy `DataToken` with constructor arg:
	- `admin`: your Remix account address
2. Deploy `DataRewards` with:
	- `tokenAddress`: DataToken address
	- `admin`: same admin address
	- `_mbPerToken`: `500` (or your test value)
3. Deploy `VoucherToken` with:
	- `baseURI`: `https://example.com/vouchers/{id}.json`
	- `admin`: same admin address
4. Deploy `VoucherRedemption` with:
	- `dataTokenAddress`: DataToken address
	- `voucherTokenAddress`: VoucherToken address
	- `admin`: same admin address

### Step 6: Grant required roles

From deployed contract UIs:

1. On `DataToken`:
	- get `MINTER_ROLE`
	- call `grantRole(MINTER_ROLE, DataRewardsAddress)`
2. On `VoucherToken`:
	- get `MINTER_ROLE`, `BURNER_ROLE`
	- call `grantRole(MINTER_ROLE, VoucherRedemptionAddress)`
	- call `grantRole(BURNER_ROLE, VoucherRedemptionAddress)`

### Step 7: Run a minimal flow

1. In `DataRewards`, call `convertUnusedData(user, unusedMb, billingMonth, dataURI)`
2. Confirm user DTT balance increased in `DataToken.balanceOf(user)`
3. In `VoucherRedemption`, create campaign with merchant address
4. User approves DTT and calls `redeemVoucher(voucherId)`
5. Merchant calls `useVoucher(user, voucherId)`

If all above works, your contracts are ready for Hardhat local demo.

## 2) Hardhat End-to-End Demo (Current Setup)

### Prerequisites

- Node.js 18+
- npm
- MetaMask

### Step 1: Open project and install

```bash
cd /Users/seansee/Documents/GitHub/data-token-app
npm install
```

### Step 2: Start local blockchain

Terminal A:

```bash
npx hardhat node
```

Keep it running.

### Step 3: Compile contracts

Terminal B:

```bash
npx hardhat compile
```

### Step 4: Deploy contracts to localhost

Terminal B:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Copy these addresses from output:

- `DataToken`
- `DataRewards`
- `VoucherToken`
- `VoucherRedemption`

### Step 5: Configure frontend addresses

Update `frontend/src/config/contracts.js`:

- `contracts.dataToken`
- `contracts.dataRewards`
- `contracts.voucherToken`
- `contracts.voucherRedemption`

Also set demo role addresses:

- `roleAccounts.admin`
- `roleAccounts.customer`
- `roleAccounts.merchant`

### Step 6: Configure MetaMask network

Add network:

- Network name: `Hardhat Local`
- RPC URL: `http://127.0.0.1:8545`
- Chain ID: `31337`
- Currency symbol: `ETH`

### Step 7: Import demo wallets

Import private keys shown by `npx hardhat node` (at least Admin, Customer, Merchant).

### Step 8: Start frontend

Terminal C:

```bash
cd /Users/seansee/Documents/GitHub/data-token-app/frontend
npm install
npm run dev
```

Open the local Vite URL.

### Step 9: Run demo flow (Detailed, click-by-click)

Follow this exact sequence in the browser and MetaMask.

1. Open app and connect wallet
	- Open the Vite URL from Step 8 (usually `http://localhost:5173`).
	- In the app header, click `Connect MetaMask`.
	- In MetaMask popup:
		- choose the account you want to connect,
		- click `Next`,
		- click `Connect`.
	- Confirm wallet status in app header:
		- wallet is no longer `Not connected`,
		- role label appears under wallet (Admin/Customer/Merchant depending on account address).

2. Verify correct chain before every action
	- In MetaMask, ensure network is `Hardhat Local` (chainId `31337`).
	- If MetaMask is on another chain, switch to `Hardhat Local` first.
	- If you get transaction errors, re-check this before retrying.

3. Admin flow: run monthly conversion
	- In MetaMask, switch to your Admin account.
	- In app top navigation, click `Admin` tab.
	- In `Run Monthly Conversion` card, fill:
		- `Customer wallet address`: paste Customer address.
		- `Unused MB`: example `1500`.
		- `Billing month`: example `2026-04` (format must be `YYYY-MM`).
		- `Data URI`: example `ipfs://proofs/2026-04/customer-001.json`.
	- Click `Run Conversion`.
	- MetaMask popup appears:
		- click `Confirm`.
	- Wait for success in app Console Log (left panel):
		- `Conversion Submitted`, then
		- `Conversion Confirmed` with minted reward details.

4. Admin flow: create voucher campaign
	- Stay on `Admin` tab.
	- In `Create Voucher Campaign` card, fill:
		- `Voucher name`: example `5GB Booster`.
		- `Merchant address (0x...)`: paste Merchant address.
		- `Token cost`: example `2`.
		- `Initial Supply`: example `100`.
		- `Max/user`: example `2`.
	- Click `Create Voucher`.
	- MetaMask popup:
		- click `Confirm`.
	- Wait for Console Log success:
		- `Create Voucher Submitted`, then
		- `Voucher Created`.
	- Note the created voucher ID (first one is usually ID `0`, then increments).

5. Customer flow: approve DTT spend
	- In MetaMask, switch to Customer account.
	- In app top navigation, click `Customer` tab.
	- In `Approve Spend` card:
		- enter approval amount (must be >= voucher token cost, example `100`),
		- click `Approve`.
	- MetaMask popup:
		- click `Confirm`.
	- Wait for Console Log success:
		- `Approval Sent`, then
		- `Approval Confirmed`.

6. Customer flow: redeem voucher
	- Still in `Customer` tab, scroll to `Voucher Catalog`.
	- Find the active voucher created in Admin step.
	- Click `Redeem Voucher` on that card.
	- MetaMask popup:
		- click `Confirm`.
	- Wait for Console Log success:
		- `Redeem Submitted`, then
		- `Voucher Redeemed`.
	- Verify ownership:
		- in `My Vouchers`, the redeemed voucher appears,
		- `You have:` should show at least `1`.

7. Merchant flow: consume redeemed voucher
	- In MetaMask, switch to Merchant account.
	- In app top navigation, click `Merchant` tab.
	- In `Use Voucher Campaigns`, locate the same voucher.
	- In `Customer wallet address`, paste Customer address used above.
	- Click `Use Voucher`.
	- MetaMask popup:
		- click `Confirm`.
	- Wait for Console Log success:
		- `Voucher Use Submitted`, then
		- `Voucher Consumed`.
	- Verify merchant-side result:
		- `Customer balance after use` updates (should decrease after each successful use).

8. Final verification checklist
	- Admin account successfully ran conversion and created campaign.
	- Customer account approved DTT and redeemed voucher.
	- Merchant account consumed voucher for that customer.
	- Console Log shows success events for each stage with transaction hashes.
	- No role/network errors in the final state.

## Deploy Script Notes

`scripts/deploy.js` does the following automatically:

- deploys all 4 contracts
- grants `DataToken.MINTER_ROLE` to `DataRewards`
- grants `VoucherToken.MINTER_ROLE` and `VoucherToken.BURNER_ROLE` to `VoucherRedemption`

No `.env` setup is required for this flow.

## Troubleshooting

1. Wrong network in MetaMask:
	- must be chainId `31337`
2. Stale contract addresses in frontend:
	- redeploy and paste fresh addresses in `frontend/src/config/contracts.js`
3. Hardhat node restarted:
	- redeploy and update frontend config again
4. Role errors:
	- ensure deploy script finished successfully and role grants were printed

## Quick From-Zero Commands

```bash
cd /Users/seansee/Documents/GitHub/data-token-app
npm install
npx hardhat node
# new terminal
npx hardhat compile
npx hardhat run scripts/deploy.js --network localhost
# update frontend/src/config/contracts.js with deployed addresses
cd frontend
npm install
npm run dev
```
