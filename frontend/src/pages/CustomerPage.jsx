import { ethers } from "ethers";
import { useCallback, useEffect, useMemo, useState } from "react";
import VoucherCard from "../components/VoucherCard";
import { parseError, parseTxError, readCustomerSnapshot } from "../lib/contracts";

const emptySnapshot = {
  symbol: "DTT",
  decimals: 0,
  formattedBalance: "0",
  vouchers: [],
  ownedBalances: {}
};

export default function CustomerPage({ account, roleLabel, contracts, pushAlert, refreshNonce, triggerRefresh }) {
  const [loading, setLoading] = useState(false);
  const [approveBusy, setApproveBusy] = useState(false);
  const [redeemBusyId, setRedeemBusyId] = useState(null);
  const [approveAmount, setApproveAmount] = useState("100");
  const [snapshot, setSnapshot] = useState(emptySnapshot);

  useEffect(() => {
    // Avoid showing previous wallet data during account/chain transitions.
    setSnapshot(emptySnapshot);
  }, [account]);

  const loadCustomerData = useCallback(async () => {
    if (!account || !contracts) return;

    setLoading(true);
    try {
      const result = await readCustomerSnapshot(contracts, account);
      setSnapshot(result);
    } catch (error) {
      pushAlert("error", "Customer Load Failed", parseError(error));
    } finally {
      setLoading(false);
    }
  }, [account, contracts, pushAlert]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData, refreshNonce]);

  const sortedVouchers = useMemo(() => {
    return [...snapshot.vouchers].sort((a, b) => Number(a.id) - Number(b.id));
  }, [snapshot.vouchers]);

  const ownedVouchers = useMemo(() => {
    return sortedVouchers.filter((voucher) => (snapshot.ownedBalances[voucher.id] || 0n) > 0n);
  }, [sortedVouchers, snapshot.ownedBalances]);

  const redeemableVouchers = useMemo(() => {
    return sortedVouchers.filter((voucher) => voucher.active && voucher.currentSupply > 0n);
  }, [sortedVouchers]);

  async function approveSpending() {
    if (!contracts) return;

    try {
      setApproveBusy(true);
      const parsedAmount = ethers.parseUnits(approveAmount || "0", snapshot.decimals);
      const tx = await contracts.dataToken.approve(await contracts.voucherRedemption.getAddress(), parsedAmount);
      pushAlert("info", "Approval Sent", tx.hash);
      await tx.wait();
      pushAlert("success", "Approval Confirmed", `Approved ${approveAmount} ${snapshot.symbol}.`);
    } catch (error) {
      pushAlert(
        "error",
        "Approval Failed",
        parseTxError("Approve DTT spending", error, [
          "wallet rejected signature",
          "entered amount is invalid for token decimals",
          "wrong network selected in MetaMask"
        ])
      );
    } finally {
      setApproveBusy(false);
    }
  }

  async function redeemVoucher(voucherId) {
    if (!contracts) return;

    try {
      setRedeemBusyId(voucherId);
      const tx = await contracts.voucherRedemption.redeemVoucher(voucherId);
      pushAlert("info", "Redeem Submitted", tx.hash);
      await tx.wait();
      pushAlert("success", "Voucher Redeemed", `Voucher #${voucherId} redeemed successfully.`);
      triggerRefresh();
    } catch (error) {
      pushAlert(
        "error",
        "Redeem Failed",
        parseTxError("Redeem voucher", error, [
          "insufficient DTT balance or allowance",
          "voucher is inactive or sold out",
          "max-per-user limit reached",
          "VoucherRedemption is paused"
        ])
      );
    } finally {
      setRedeemBusyId(null);
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{roleLabel || "Connected"} Wallet</p>
          <p className="mt-2 break-all text-sm font-medium text-slate-900">{account || "Not connected"}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{roleLabel || "Connected Wallet"} DTT Balance</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{snapshot.formattedBalance}</p>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Approve Spend</p>
          <div className="mt-2 flex gap-2">
            <input
              value={approveAmount}
              onChange={(e) => setApproveAmount(e.target.value)}
              type="number"
              min="1"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Amount"
            />
            <button
              type="button"
              onClick={approveSpending}
              disabled={!account || approveBusy}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {approveBusy ? "Approving..." : "Approve"}
            </button>
          </div>
        </article>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">My Vouchers</h2>
          <button
            type="button"
            onClick={loadCustomerData}
            disabled={loading}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {ownedVouchers.length === 0 ? (
          <p className="text-sm text-slate-500">This wallet does not own any vouchers yet.</p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto pr-1">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {ownedVouchers.map((voucher) => (
                <article
                  key={`owned-${voucher.id}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <p className="text-xs font-medium uppercase tracking-widest text-slate-500">
                    Voucher #{voucher.id}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">{voucher.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    You have: <span className="font-semibold text-slate-900">{(snapshot.ownedBalances[voucher.id] || 0n).toString()}</span>
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Voucher Catalog</h2>
          <p className="text-xs text-slate-500">Only active campaigns with supply &gt; 0 are shown</p>
        </div>

        {redeemableVouchers.length === 0 ? (
          <p className="text-sm text-slate-500">No redeemable vouchers right now.</p>
        ) : (
          <div className="max-h-[480px] overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {redeemableVouchers.map((voucher) => (
                <VoucherCard
                  key={voucher.id}
                  voucher={voucher}
                  ownedBalance={snapshot.ownedBalances[voucher.id] || 0n}
                  redeemBusy={redeemBusyId === voucher.id}
                  onRedeem={redeemVoucher}
                />
              ))}
            </div>
          </div>
        )}
      </article>
    </section>
  );
}
