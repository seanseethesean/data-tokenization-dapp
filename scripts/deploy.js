require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS || deployer.address;
  const initialSupplyWhole = process.env.INITIAL_SUPPLY || "1000";
  const mbPerToken = BigInt(process.env.MB_PER_TOKEN || "500");
  const voucherBaseUri = process.env.VOUCHER_BASE_URI || "https://example.com/vouchers/{id}.json";
  if (mbPerToken <= 0n) {
    throw new Error("MB_PER_TOKEN must be greater than 0");
  }
  const initialSupply = hre.ethers.parseUnits(initialSupplyWhole, 18);

  console.log("Deploying with account:", deployer.address);
  console.log("Admin address:", admin);
  console.log("Initial supply (whole tokens):", initialSupplyWhole);
  console.log("Conversion rate (MB per token):", mbPerToken.toString());
  console.log("Voucher base URI:", voucherBaseUri);

  const DataToken = await hre.ethers.getContractFactory("DataToken");
  const dataToken = await DataToken.deploy(initialSupply, admin);
  await dataToken.waitForDeployment();
  const dataTokenAddress = await dataToken.getAddress();

  const DataRewards = await hre.ethers.getContractFactory("DataRewards");
  const dataRewards = await DataRewards.deploy(dataTokenAddress, admin, mbPerToken);
  await dataRewards.waitForDeployment();
  const dataRewardsAddress = await dataRewards.getAddress();

  const VoucherToken = await hre.ethers.getContractFactory("VoucherToken");
  const voucherToken = await VoucherToken.deploy(voucherBaseUri, admin);
  await voucherToken.waitForDeployment();
  const voucherTokenAddress = await voucherToken.getAddress();

  const VoucherRedemption = await hre.ethers.getContractFactory("VoucherRedemption");
  const voucherRedemption = await VoucherRedemption.deploy(
    dataTokenAddress,
    voucherTokenAddress,
    admin
  );
  await voucherRedemption.waitForDeployment();
  const voucherRedemptionAddress = await voucherRedemption.getAddress();

  const minterRole = await dataToken.MINTER_ROLE();
  const grantTx = await dataToken.grantRole(minterRole, dataRewardsAddress);
  await grantTx.wait();

  const voucherMinterRole = await voucherToken.MINTER_ROLE();
  const voucherBurnerRole = await voucherToken.BURNER_ROLE();
  await (await voucherToken.grantRole(voucherMinterRole, voucherRedemptionAddress)).wait();
  await (await voucherToken.grantRole(voucherBurnerRole, voucherRedemptionAddress)).wait();

  console.log("\nDeployment complete");
  console.log("DataToken:", dataTokenAddress);
  console.log("DataRewards:", dataRewardsAddress);
  console.log("VoucherToken:", voucherTokenAddress);
  console.log("VoucherRedemption:", voucherRedemptionAddress);
  console.log("Granted MINTER_ROLE to DataRewards:", dataRewardsAddress);
  console.log("Granted VoucherToken MINTER_ROLE to VoucherRedemption:", voucherRedemptionAddress);
  console.log("Granted VoucherToken BURNER_ROLE to VoucherRedemption:", voucherRedemptionAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});