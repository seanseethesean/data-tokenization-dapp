// frontend bridge to the smart contracts, using ethers.js to create contract instances and helper functions for common tasks like error parsing and data fetching
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
    currentSupply: BigInt(raw.currentSupply ?? raw[3] ?? 0),
    maxPerUser: BigInt(raw.maxPerUser ?? raw[4] ?? 0),
    active: Boolean(raw.active ?? raw[5]),
    merchant: raw.merchant ?? raw[6] ?? "0x0000000000000000000000000000000000000000"
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
  const candidates = [
    error?.shortMessage,
    error?.reason,
    error?.info?.error?.message,
    error?.error?.message,
    error?.data?.message,
    error?.message
  ].filter(Boolean);

  for (const message of candidates) {
    const text = String(message).trim();
    if (!text) continue;
    return text.replace(/^execution reverted:\s*/i, "");
  }

  return "Transaction failed.";
}

export function parseTxError(actionLabel, error, likelyCauses = []) {
  const reason = parseError(error);
  const causes = likelyCauses.filter(Boolean);

  if (causes.length === 0) {
    return `${actionLabel} failed: ${reason}`;
  }

  return `${actionLabel} failed: ${reason}. Possible cause(s): ${causes.join("; ")}.`;
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

export async function readMerchantCampaigns(contracts, merchantAddress) {
  const vouchers = await readVoucherCatalog(contracts.voucherRedemption);
  const merchantLower = merchantAddress.toLowerCase();

  const campaigns = await Promise.all(
    vouchers
      .filter((voucher) => voucher.merchant.toLowerCase() === merchantLower)
      .map(async (voucher) => {
        const [totalRedeemed, totalUsed] = await Promise.all([
          contracts.voucherRedemption.totalRedeemed(voucher.id),
          contracts.voucherRedemption.totalUsed(voucher.id)
        ]);

        const redeemed = BigInt(totalRedeemed);
        const used = BigInt(totalUsed);
        const outstanding = redeemed > used ? redeemed - used : 0n;

        return {
          ...voucher,
          totalRedeemed: redeemed,
          totalUsed: used,
          outstanding
        };
      })
  );

  return campaigns.filter((voucher) => voucher.outstanding > 0n);
}
