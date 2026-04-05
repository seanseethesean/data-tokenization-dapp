import { ethers } from "ethers";
import {
  APP_CONFIG,
  DATA_TOKEN_ABI,
  DATA_REWARDS_ABI,
  VOUCHER_TOKEN_ABI,
  VOUCHER_REDEMPTION_ABI
} from "../config/contracts";

function normalizeVoucher(raw, fallbackId) {
  return {
    id: Number(raw.id ?? raw[0] ?? fallbackId),
    name: raw.name ?? raw[1] ?? "",
    tokenCost: BigInt(raw.tokenCost ?? raw[2] ?? 0),
    remaining: BigInt(raw.remaining ?? raw[3] ?? 0),
    maxPerUser: BigInt(raw.maxPerUser ?? raw[4] ?? 0),
    active: Boolean(raw.active ?? raw[5])
  };
}

export function getContracts(signerOrProvider) {
  const { dataToken, dataRewards, voucherToken, voucherRedemption } = APP_CONFIG.contracts;

  return {
    dataToken: new ethers.Contract(dataToken, DATA_TOKEN_ABI, signerOrProvider),
    dataRewards: new ethers.Contract(dataRewards, DATA_REWARDS_ABI, signerOrProvider),
    voucherToken: new ethers.Contract(voucherToken, VOUCHER_TOKEN_ABI, signerOrProvider),
    voucherRedemption: new ethers.Contract(voucherRedemption, VOUCHER_REDEMPTION_ABI, signerOrProvider)
  };
}

export function parseError(error) {
  if (error?.shortMessage) return error.shortMessage;
  if (error?.reason) return error.reason;
  if (error?.info?.error?.message) return error.info.error.message;
  if (error?.message) return error.message;
  return "Transaction failed.";
}

export async function readVoucherCatalog(voucherRedemption) {
  const nextVoucherId = Number(await voucherRedemption.nextVoucherId());
  const ids = Array.from({ length: nextVoucherId }, (_, i) => i);

  const vouchers = await Promise.all(
    ids.map(async (id) => {
      const raw = await voucherRedemption.getVoucher(id);
      return normalizeVoucher(raw, id);
    })
  );

  return vouchers;
}

export async function readOwnedVoucherBalances(voucherToken, account, vouchers) {
  if (!account) return {};

  const balances = await Promise.all(
    vouchers.map(async (voucher) => {
      const bal = await voucherToken.balanceOf(account, voucher.id);
      return [voucher.id, BigInt(bal)];
    })
  );

  return Object.fromEntries(balances);
}

export async function readCustomerSnapshot(contracts, account) {
  const [symbol, decimals, rawBalance] = await Promise.all([
    contracts.dataToken.symbol(),
    contracts.dataToken.decimals(),
    contracts.dataToken.balanceOf(account)
  ]);

  const vouchers = await readVoucherCatalog(contracts.voucherRedemption);
  const ownedBalances = await readOwnedVoucherBalances(contracts.voucherToken, account, vouchers);

  return {
    symbol,
    decimals: Number(decimals),
    rawBalance: BigInt(rawBalance),
    formattedBalance: ethers.formatUnits(rawBalance, decimals),
    vouchers,
    ownedBalances
  };
}

export async function readAdminStats(contracts) {
  const [mbPerToken, nextConversionId, nextVoucherId] = await Promise.all([
    contracts.dataRewards.mbPerToken(),
    contracts.dataRewards.nextConversionId(),
    contracts.voucherRedemption.nextVoucherId()
  ]);

  return {
    mbPerToken: BigInt(mbPerToken),
    nextConversionId: BigInt(nextConversionId),
    nextVoucherId: BigInt(nextVoucherId)
  };
}

// Fetch role constant from VoucherRedemption contract for role management UI.
export async function getRedeemerRole(contracts) {
  return contracts.voucherRedemption.REDEEMER_ROLE();
}

export async function grantRedeemerRole(contracts, targetAddress) {
  const role = await getRedeemerRole(contracts);
  return contracts.voucherRedemption.grantRole(role, targetAddress);
}

export async function hasRedeemerRole(contracts, targetAddress) {
  const role = await getRedeemerRole(contracts);
  return contracts.voucherRedemption.hasRole(role, targetAddress);
}

// Optional operator helpers for DataRewards role assignment from same Admin screen.
export async function getOperatorRole(contracts) {
  return contracts.dataRewards.OPERATOR_ROLE();
}

export async function grantOperatorRole(contracts, targetAddress) {
  const role = await getOperatorRole(contracts);
  return contracts.dataRewards.grantRole(role, targetAddress);
}

export async function hasOperatorRole(contracts, targetAddress) {
  const role = await getOperatorRole(contracts);
  return contracts.dataRewards.hasRole(role, targetAddress);
}
