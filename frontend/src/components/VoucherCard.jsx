function Badge({ active }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export default function VoucherCard({ voucher, ownedBalance, redeemBusy, onRedeem }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-500">Voucher #{voucher.id}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{voucher.name}</h3>
        </div>
        <Badge active={voucher.active} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-slate-500">Token Cost</dt>
          <dd className="font-medium text-slate-900">{voucher.tokenCost.toString()} DTT</dd>
        </div>
        <div>
          <dt className="text-slate-500">Current Supply</dt>
          <dd className="font-medium text-slate-900">{voucher.currentSupply.toString()}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Max / User</dt>
          <dd className="font-medium text-slate-900">{voucher.maxPerUser.toString()}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Owned</dt>
          <dd className="font-medium text-slate-900">{ownedBalance?.toString() || "0"}</dd>
        </div>
      </dl>

      <button
        type="button"
        disabled={redeemBusy || !voucher.active || voucher.currentSupply === 0n}
        onClick={() => onRedeem(voucher.id)}
        className="mt-4 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {redeemBusy ? "Redeeming..." : "Redeem Voucher"}
      </button>
    </article>
  );
}
