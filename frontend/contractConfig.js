// Replace these placeholders with deployed addresses from scripts/deploy.js output.
window.CONTRACT_CONFIG = {
	dataTokenAddress: "0xYourDataTokenAddress",
	dataRewardsAddress: "0xYourDataRewardsAddress",
	voucherRedemptionAddress: "0xYourVoucherRedemptionAddress",

	// Minimal ABIs for demo frontend interactions.
	dataTokenAbi: [
		"function decimals() view returns (uint8)",
		"function balanceOf(address owner) view returns (uint256)",
		"function approve(address spender, uint256 amount) returns (bool)"
	],

	dataRewardsAbi: [
		"function submitData(string dataURI, uint256 rewardAmount)",
		"function approveSubmission(uint256 submissionId)"
	],

	voucherRedemptionAbi: [
		"function createVoucher(string name, uint256 tokenCost)",
		"function redeemVoucher(uint256 voucherId)"
	]
};
