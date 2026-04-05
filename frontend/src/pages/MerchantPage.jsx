import { useState } from "react";
import { parseError } from "../lib/contracts";

export default function MerchantPage({ contracts, pushAlert }) {
  const [userAddress, setUserAddress] = useState("");
  const [voucherId, setVoucherId] = useState("");
  const [busy, setBusy] = useState(false);
  const [postUseBalance, setPostUseBalance] = useState(null);

  async function handleUseVoucher(e) {
    e.preventDefault();
    if (!contracts) return;

    try {
      setBusy(true);
      const parsedVoucherId = BigInt(voucherId);
      const tx = await contracts.voucherRedemption.useVoucher(userAddress, parsedVoucherId);
      pushAlert("info", "Voucher Use Submitted", tx.hash);
      await tx.wait();

      const balance = await contracts.voucherToken.balanceOf(userAddress, parsedVoucherId);
      setPostUseBalance(balance.toString());
      pushAlert("success", "Voucher Consumed", `Updated ownership balance: ${balance.toString()}`);
    } catch (error) {
      pushAlert("error", "Use Voucher Failed", parseError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={handleUseVoucher} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Merchant Voucher Validation</h2>
        <p className="mt-1 text-sm text-slate-500">Use this after customer presents a voucher at checkout.</p>

        <div className="mt-4 grid gap-3">
          <input
            type="text"
            placeholder="Customer wallet address"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
          />
          <input
            type="number"
            min="0"
            placeholder="Voucher ID"
            value={voucherId}
            onChange={(e) => setVoucherId(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            required
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Processing..." : "Use Voucher"}
        </button>
      </form>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Post-Usage Check</h2>
        <p className="mt-1 text-sm text-slate-500">Confirms if customer still owns voucher units after useVoucher.</p>

        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-widest text-slate-500">Remaining Voucher Balance</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{postUseBalance ?? "-"}</p>
        </div>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-500">
          <li>Value 0 means voucher was fully consumed.</li>
          <li>Value greater than 0 means customer still has unused voucher units.</li>
        </ul>
      </article>
    </section>
  );
}
