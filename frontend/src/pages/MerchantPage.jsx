import { useCallback, useEffect, useMemo, useState } from "react";
import { parseError, parseTxError, readMerchantCampaigns } from "../lib/contracts";

export default function MerchantPage({ contracts, pushAlert, account, refreshNonce }) {
  const [busyId, setBusyId] = useState(null);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [merchantCampaigns, setMerchantCampaigns] = useState([]);
  const [customerInputs, setCustomerInputs] = useState({});
  const [postUseBalanceByVoucher, setPostUseBalanceByVoucher] = useState({});

  const sortedCampaigns = useMemo(
    () => [...merchantCampaigns].sort((a, b) => a.id - b.id),
    [merchantCampaigns]
  );

  const loadCampaigns = useCallback(async () => {
    if (!contracts || !account) return;

    try {
      setLoadingCampaigns(true);
      const campaigns = await readMerchantCampaigns(contracts, account);
      setMerchantCampaigns(campaigns);
    } catch (error) {
      pushAlert("error", "Load Campaigns Failed", parseError(error));
    } finally {
      setLoadingCampaigns(false);
    }
  }, [contracts, account, pushAlert]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns, refreshNonce]);

  async function handleUseVoucher(voucherId) {
    if (!contracts) return;

    const userAddress = (customerInputs[voucherId] || "").trim();
    if (!userAddress) {
      pushAlert("error", "Missing Customer Address", "Enter a customer wallet address first.");
      return;
    }

    try {
      setBusyId(voucherId);
      const tx = await contracts.voucherRedemption.useVoucher(userAddress, BigInt(voucherId));
      pushAlert("info", "Voucher Use Submitted", tx.hash);
      await tx.wait();

      const balance = await contracts.voucherToken.balanceOf(userAddress, BigInt(voucherId));
      setPostUseBalanceByVoucher((prev) => ({ ...prev, [voucherId]: balance.toString() }));
      pushAlert("success", "Voucher Consumed", `Updated ownership balance: ${balance.toString()}`);
      await loadCampaigns();
    } catch (error) {
      pushAlert(
        "error",
        "Use Voucher Failed",
        parseTxError("Validate / use voucher", error, [
          "customer does not hold this voucher token",
          "connected wallet is not the assigned campaign merchant",
          "voucher campaign was not found",
          "VoucherRedemption is paused"
        ])
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Use Voucher Campaigns</h2>
          <p className="mt-1 text-sm text-slate-500">Shows only campaigns with outstanding redeemed vouchers that still need merchant validation.</p>
        </div>
        <button
          type="button"
          onClick={loadCampaigns}
          disabled={loadingCampaigns}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {loadingCampaigns ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {sortedCampaigns.length === 0 ? (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          No vouchers pending merchant use for this wallet.
        </article>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedCampaigns.map((voucher) => (
            <article key={voucher.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-slate-500">Voucher #{voucher.id}</p>
                  <h3 className="mt-1 text-lg font-semibold text-slate-900">{voucher.name}</h3>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${voucher.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
                  {voucher.active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <p className="text-slate-600">Token Cost: <span className="font-medium text-slate-900">{voucher.tokenCost.toString()}</span></p>
                <p className="text-slate-600">Current Supply: <span className="font-medium text-slate-900">{voucher.currentSupply.toString()}</span></p>
                <p className="text-slate-600">Outstanding Uses: <span className="font-medium text-slate-900">{(voucher.outstanding ?? 0n).toString()}</span></p>
              </div>

              <div className="mt-4 grid gap-2">
                <input
                  type="text"
                  placeholder="Customer wallet address"
                  value={customerInputs[voucher.id] || ""}
                  onChange={(e) => setCustomerInputs((prev) => ({ ...prev, [voucher.id]: e.target.value }))}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={busyId === voucher.id}
                  onClick={() => handleUseVoucher(voucher.id)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busyId === voucher.id ? "Processing..." : "Use Voucher"}
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Customer balance after use: {postUseBalanceByVoucher[voucher.id] ?? "-"}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
