import { APP_CONFIG } from "../config/contracts";

const roleItems = [
  { key: "admin", label: "Admin", desc: "Creates vouchers, runs monthly conversions, and pause controls." },
  { key: "customer", label: "Customer", desc: "Approves DTT spend and redeems vouchers." },
  { key: "merchant", label: "Merchant / Operator", desc: "Consumes redeemed vouchers with useVoucher." }
];

export default function RoleGuide() {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {roleItems.map((role) => (
        <article key={role.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">{role.label}</h3>
          <p className="mt-1 text-xs text-slate-500">{role.desc}</p>
          <p className="mt-3 rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700 break-all">
            {APP_CONFIG.roleAccounts[role.key] || "Set role address in config"}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">Switch account in MetaMask to this address during the live demo.</p>
        </article>
      ))}
    </section>
  );
}
