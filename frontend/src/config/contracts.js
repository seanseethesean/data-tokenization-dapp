// Paste your deployed contract addresses below before running the demo.
// Use the output from: npx hardhat run scripts/deploy.js --network localhost

export const APP_CONFIG = {
  appName: "Telco Rewards Demo",
  expectedChainId: 31337,
  expectedChainName: "Hardhat Local",
  roleAccounts: {
    // Optional helper labels for your live demo. Put the wallet addresses you imported in MetaMask.
    admin: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // account[0] in hardhat
    customer: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // account[1] in hardhat
    merchant: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" // account[2] in hardhat
  },
  contracts: {
    // TODO: paste deployed addresses here.
    dataToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    dataRewards: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    voucherToken: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    voucherRedemption: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
  }
};

// Minimal ABIs for this UI. You can replace these with full ABIs from artifacts if you prefer.
export const DATA_TOKEN_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)"
];

export const DATA_REWARDS_ABI = [
  "function convertUnusedData(address user, uint256 unusedMb, string billingMonth, string dataURI)",
  "function OPERATOR_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function grantRole(bytes32 role, address account)",
  "function pause()",
  "function unpause()",
  "function getConversion(uint256 conversionId) view returns ((uint256 id, address user, uint256 unusedMb, uint256 rewardAmount, string billingMonth, string dataURI, uint256 timestamp))",
  "function mbPerToken() view returns (uint256)",
  "function nextConversionId() view returns (uint256)"
];

export const VOUCHER_TOKEN_ABI = [
  "function balanceOf(address account, uint256 id) view returns (uint256)"
];

export const VOUCHER_REDEMPTION_ABI = [
  "function createVoucher(string name, uint256 tokenCost, uint256 remaining, uint256 maxPerUser, address merchant)",
  "function updateVoucher(uint256 voucherId, string name, uint256 tokenCost, uint256 remaining, uint256 maxPerUser, bool active)",
  "function redeemVoucher(uint256 voucherId)",
  "function useVoucher(address user, uint256 voucherId)",
  "function totalRedeemed(uint256 voucherId) view returns (uint256)",
  "function totalUsed(uint256 voucherId) view returns (uint256)",
  "function pause()",
  "function unpause()",
  "function getVoucher(uint256 voucherId) view returns ((uint256 id, string name, uint256 tokenCost, uint256 remaining, uint256 maxPerUser, bool active, address merchant))",
  "function nextVoucherId() view returns (uint256)"
];
