require("dotenv").config();
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const admin = process.env.ADMIN_ADDRESS || deployer.address;
  const treasury = process.env.TREASURY_ADDRESS || admin;
  const initialSupplyWhole = process.env.INITIAL_SUPPLY || "1000";
  const initialSupply = hre.ethers.parseUnits(initialSupplyWhole, 18);

  console.log("Deploying with account:", deployer.address);
  console.log("Admin address:", admin);
  console.log("Treasury address:", treasury);
  console.log("Initial supply (whole tokens):", initialSupplyWhole);

  const DataToken = await hre.ethers.getContractFactory("DataToken");
  const dataToken = await DataToken.deploy(initialSupply, admin);
  await dataToken.waitForDeployment();
  const dataTokenAddress = await dataToken.getAddress();

  const DataRewards = await hre.ethers.getContractFactory("DataRewards");
  const dataRewards = await DataRewards.deploy(dataTokenAddress, admin);
  await dataRewards.waitForDeployment();
  const dataRewardsAddress = await dataRewards.getAddress();

  const VoucherRedemption = await hre.ethers.getContractFactory("VoucherRedemption");
  const voucherRedemption = await VoucherRedemption.deploy(
    dataTokenAddress,
    treasury,
    admin
  );
  await voucherRedemption.waitForDeployment();
  const voucherRedemptionAddress = await voucherRedemption.getAddress();

  const minterRole = await dataToken.MINTER_ROLE();
  const grantTx = await dataToken.grantRole(minterRole, dataRewardsAddress);
  await grantTx.wait();

  console.log("\nDeployment complete");
  console.log("DataToken:", dataTokenAddress);
  console.log("DataRewards:", dataRewardsAddress);
  console.log("VoucherRedemption:", voucherRedemptionAddress);
  console.log("Granted MINTER_ROLE to DataRewards:", dataRewardsAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});