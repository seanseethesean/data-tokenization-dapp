import { useCallback, useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import {
  grantOperatorRole,
  hasOperatorRole,
  parseError,
  readAdminStats
} from "../lib/contracts";

const initialConversionForm = {
  user: "",
  unusedMb: "",
  billingMonth: "",
  dataURI: ""
};

const initialCreateVoucherForm = {
  name: "",
  tokenCost: "",
  remaining: "",
  maxPerUser: "",
  merchant: ""
};

const initialUpdateVoucherForm = {
  voucherId: "",
  name: "",
  tokenCost: "",
  remaining: "",
  maxPerUser: "",
  active: true
};

export default function AdminPage({ contracts, pushAlert, refreshNonce, triggerRefresh }) {
  const [stats, setStats] = useState({ mbPerToken: 0n, nextConversionId: 0n, nextVoucherId: 0n });
  const [loadingStats, setLoadingStats] = useState(false);
  const [busy, setBusy] = useState("");
  const [conversionForm, setConversionForm] = useState(initialConversionForm);
  const [createVoucherForm, setCreateVoucherForm] = useState(initialCreateVoucherForm);
  const [updateVoucherForm, setUpdateVoucherForm] = useState(initialUpdateVoucherForm);
  const [roleTargetAddress, setRoleTargetAddress] = useState("");
  const [operatorRoleStatus, setOperatorRoleStatus] = useState(null);

  const loadStats = useCallback(async () => {
    if (!contracts) return;

    try {
      setLoadingStats(true);
      const snapshot = await readAdminStats(contracts);
      setStats(snapshot);
    } catch (error) {
      pushAlert("error", "Stats Load Failed", parseError(error));
    } finally {
      setLoadingStats(false);
    }
  }, [contracts, pushAlert]);

  useEffect(() => {
    loadStats();
  }, [loadStats, refreshNonce]);

  async function runConversion(e) {
    e.preventDefault();
    if (!contracts) return;

    try {
      setBusy("convert");
      const tx = await contracts.dataRewards.convertUnusedData(
        conversionForm.user,
        BigInt(conversionForm.unusedMb),
        conversionForm.billingMonth,
        conversionForm.dataURI
      );
      pushAlert("info", "Conversion Submitted", tx.hash);
      await tx.wait();
      pushAlert("success", "Conversion Confirmed", "Unused data converted into DTT.");
      setConversionForm(initialConversionForm);
      triggerRefresh();
    } catch (error) {
      pushAlert("error", "Conversion Failed", parseError(error));
    } finally {
      setBusy("");
    }
  }

  async function createVoucher(e) {
    e.preventDefault();
    if (!contracts) return;

    try {
      setBusy("create");
      const tx = await contracts.voucherRedemption.createVoucher(
        createVoucherForm.name,
        BigInt(createVoucherForm.tokenCost),
        BigInt(createVoucherForm.remaining),
        BigInt(createVoucherForm.maxPerUser),
        createVoucherForm.merchant
      );
      pushAlert("info", "Create Voucher Submitted", tx.hash);
      await tx.wait();
      pushAlert("success", "Voucher Created", "Voucher campaign created successfully.");
      setCreateVoucherForm(initialCreateVoucherForm);
      triggerRefresh();
    } catch (error) {
      pushAlert("error", "Create Voucher Failed", parseError(error));
    } finally {
      setBusy("");
    }
  }

  async function updateVoucher(e) {
    e.preventDefault();
    if (!contracts) return;

    try {
      setBusy("update");
      const tx = await contracts.voucherRedemption.updateVoucher(
        BigInt(updateVoucherForm.voucherId),
        updateVoucherForm.name,
        BigInt(updateVoucherForm.tokenCost),
        BigInt(updateVoucherForm.remaining),
        BigInt(updateVoucherForm.maxPerUser),
        Boolean(updateVoucherForm.active)
      );
      pushAlert("info", "Update Voucher Submitted", tx.hash);
      await tx.wait();
      pushAlert("success", "Voucher Updated", `Voucher #${updateVoucherForm.voucherId} updated.`);
      triggerRefresh();
    } catch (error) {
      pushAlert("error", "Update Voucher Failed", parseError(error));
    } finally {
      setBusy("");
    }
  }

  async function callPause(contractName, action) {
    if (!contracts) return;

    try {
      setBusy(`${contractName}-${action}`);
      const target = contractName === "rewards" ? contracts.dataRewards : contracts.voucherRedemption;
      const tx = await (action === "pause" ? target.pause() : target.unpause());
      pushAlert("info", `${contractName} ${action} submitted`, tx.hash);
      await tx.wait();
      pushAlert("success", `${contractName} ${action} confirmed`, "State updated on-chain.");
    } catch (error) {
      pushAlert("error", `${contractName} ${action} failed`, parseError(error));
    } finally {
      setBusy("");
    }
  }

  async function onGrantOperatorRole() {
    if (!contracts || !roleTargetAddress) return;

    try {
      setBusy("grant-operator");
      const tx = await grantOperatorRole(contracts, roleTargetAddress);
      pushAlert("info", "Grant OPERATOR_ROLE Submitted", tx.hash);
      await tx.wait();
      pushAlert("success", "OPERATOR_ROLE Granted", `Granted to ${roleTargetAddress}`);
      setOperatorRoleStatus(true);
    } catch (error) {
      pushAlert("error", "Grant OPERATOR_ROLE Failed", parseError(error));
    } finally {
      setBusy("");
    }
  }

  async function onCheckOperatorRole() {
    if (!contracts || !roleTargetAddress) return;

    try {
      setBusy("check-operator");
      const hasRole = await hasOperatorRole(contracts, roleTargetAddress);
      setOperatorRoleStatus(Boolean(hasRole));
      pushAlert("success", "OPERATOR_ROLE Checked", `${roleTargetAddress}: ${Boolean(hasRole)}`);
    } catch (error) {
      pushAlert("error", "Check OPERATOR_ROLE Failed", parseError(error));
    } finally {
      setBusy("");
    }
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="MB Per Token" value={stats.mbPerToken.toString()} hint="Conversion rule" />
        <StatCard label="Next Conversion ID" value={stats.nextConversionId.toString()} hint="DataRewards" />
        <StatCard label="Next Voucher ID" value={stats.nextVoucherId.toString()} hint="VoucherRedemption" />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <form onSubmit={runConversion} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Run Monthly Conversion</h2>
          <p className="mt-1 text-sm text-slate-500">Convert verified unused customer data into DTT rewards.</p>
          <div className="mt-4 grid gap-3">
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Customer wallet address"
              value={conversionForm.user}
              onChange={(e) => setConversionForm((s) => ({ ...s, user: e.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Unused MB (e.g. 1490)"
              value={conversionForm.unusedMb}
              onChange={(e) => setConversionForm((s) => ({ ...s, unusedMb: e.target.value }))}
              type="number"
              min="1"
              required
            />
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Billing month (YYYY-MM)"
              value={conversionForm.billingMonth}
              onChange={(e) => setConversionForm((s) => ({ ...s, billingMonth: e.target.value }))}
              required
            />
            <input
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Data URI (proof reference)"
              value={conversionForm.dataURI}
              onChange={(e) => setConversionForm((s) => ({ ...s, dataURI: e.target.value }))}
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy === "convert"}
            className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {busy === "convert" ? "Submitting..." : "Run Conversion"}
          </button>
        </form>

        <div className="space-y-6">
          <form onSubmit={createVoucher} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Create Voucher Campaign</h2>
            <div className="mt-4 grid gap-3">
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Voucher name" value={createVoucherForm.name} onChange={(e) => setCreateVoucherForm((s) => ({ ...s, name: e.target.value }))} required />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Merchant address (0x...)" value={createVoucherForm.merchant} onChange={(e) => setCreateVoucherForm((s) => ({ ...s, merchant: e.target.value }))} required />
              <div className="grid grid-cols-3 gap-2">
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Token cost" type="number" min="1" value={createVoucherForm.tokenCost} onChange={(e) => setCreateVoucherForm((s) => ({ ...s, tokenCost: e.target.value }))} required />
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Remaining" type="number" min="1" value={createVoucherForm.remaining} onChange={(e) => setCreateVoucherForm((s) => ({ ...s, remaining: e.target.value }))} required />
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Max/user" type="number" min="1" value={createVoucherForm.maxPerUser} onChange={(e) => setCreateVoucherForm((s) => ({ ...s, maxPerUser: e.target.value }))} required />
              </div>
            </div>
            <button type="submit" disabled={busy === "create"} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
              {busy === "create" ? "Creating..." : "Create Voucher"}
            </button>
          </form>

          <form onSubmit={updateVoucher} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Update Voucher Campaign</h2>
            <div className="mt-4 grid gap-3">
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Voucher ID" type="number" min="0" value={updateVoucherForm.voucherId} onChange={(e) => setUpdateVoucherForm((s) => ({ ...s, voucherId: e.target.value }))} required />
              <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Voucher name" value={updateVoucherForm.name} onChange={(e) => setUpdateVoucherForm((s) => ({ ...s, name: e.target.value }))} required />
              <div className="grid grid-cols-3 gap-2">
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Token cost" type="number" min="1" value={updateVoucherForm.tokenCost} onChange={(e) => setUpdateVoucherForm((s) => ({ ...s, tokenCost: e.target.value }))} required />
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Remaining" type="number" min="0" value={updateVoucherForm.remaining} onChange={(e) => setUpdateVoucherForm((s) => ({ ...s, remaining: e.target.value }))} required />
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="Max/user" type="number" min="1" value={updateVoucherForm.maxPerUser} onChange={(e) => setUpdateVoucherForm((s) => ({ ...s, maxPerUser: e.target.value }))} required />
              </div>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={updateVoucherForm.active}
                  onChange={(e) => setUpdateVoucherForm((s) => ({ ...s, active: e.target.checked }))}
                />
                Active
              </label>
            </div>
            <button type="submit" disabled={busy === "update"} className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-60">
              {busy === "update" ? "Updating..." : "Update Voucher"}
            </button>
          </form>
        </div>
      </div>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Emergency Controls</h2>
        <p className="mt-1 text-sm text-slate-500">Pause/unpause contract actions during incidents.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="font-medium text-slate-800">DataRewards</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => callPause("rewards", "pause")} className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600" type="button">Pause</button>
              <button onClick={() => callPause("rewards", "unpause")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700" type="button">Unpause</button>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="font-medium text-slate-800">VoucherRedemption</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => callPause("voucher", "pause")} className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600" type="button">Pause</button>
              <button onClick={() => callPause("voucher", "unpause")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700" type="button">Unpause</button>
            </div>
          </div>
        </div>
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Role Management</h2>
        <p className="mt-1 text-sm text-slate-500">Merchant access is now per-voucher via merchant address. Use this section for OPERATOR_ROLE only.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <input
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="Target wallet address (0x...)"
            value={roleTargetAddress}
            onChange={(e) => setRoleTargetAddress(e.target.value)}
          />
          <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
            Connected Admin only
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">DataRewards OPERATOR_ROLE (Optional)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === "grant-operator" || !roleTargetAddress}
              onClick={onGrantOperatorRole}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {busy === "grant-operator" ? "Granting..." : "Grant OPERATOR_ROLE"}
            </button>
            <button
              type="button"
              disabled={busy === "check-operator" || !roleTargetAddress}
              onClick={onCheckOperatorRole}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {busy === "check-operator" ? "Checking..." : "Check OPERATOR_ROLE"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-600">
            hasRole result: <span className="font-semibold text-slate-900">{operatorRoleStatus === null ? "-" : String(operatorRoleStatus)}</span>
          </p>
        </div>
      </article>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={loadStats}
          disabled={loadingStats}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {loadingStats ? "Refreshing stats..." : "Refresh Stats"}
        </button>
      </div>
    </section>
  );
}
