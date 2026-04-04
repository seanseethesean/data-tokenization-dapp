// This file contains the contract addresses and ABIs for the demo frontend, is the bridge between frontend and smart contracts
// Copy paste the contract addresses from npx hardhat run scripts/deploy.js --network localhost
window.CONTRACT_CONFIG = {
  expectedChainId: 31337,
  dataTokenAddress: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
  dataRewardsAddress: "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318",
  voucherRedemptionAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",

  // Application Binary Interfaces (ABIs) for the contracts, tells frontend what functions exist in the contracts
  dataTokenAbi: [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address owner) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function transfer(address to, uint256 amount) returns (bool)",
  ],

  dataRewardsAbi: [
    "function submitData(string dataURI)",
    "function approveSubmission(uint256 submissionId, uint256 rewardAmount)",
  ],

  voucherRedemptionAbi: [
    "function createVoucher(string name, uint256 tokenCost)",
    "function redeemVoucher(uint256 voucherId)",
  ],
};
