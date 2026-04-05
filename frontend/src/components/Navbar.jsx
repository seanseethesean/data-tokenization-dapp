import { shortAddress } from "../lib/wallet";

const tabs = ["Customer", "Admin", "Merchant"];

export default function Navbar({ activeTab, onTabChange, walletAddress, roleLabel, onConnect, connecting }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Telecom Loyalty dApp</p>
          <h1 className="text-xl font-semibold text-slate-900">Telco Rewards Console</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => onTabChange(tab)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-right text-xs">
            <p className="text-slate-500">Wallet</p>
            <p className="font-medium text-slate-900">{shortAddress(walletAddress)}</p>
            <p className="text-[11px] text-sky-700">{roleLabel}</p>
          </div>
          <button
            type="button"
            onClick={onConnect}
            disabled={connecting}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connecting ? "Connecting..." : "Connect MetaMask"}
          </button>
        </div>
      </div>
    </header>
  );
}
