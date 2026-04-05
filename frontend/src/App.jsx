import { useCallback, useEffect, useMemo, useState } from "react";
import AlertStack from "./components/AlertStack";
import Navbar from "./components/Navbar";
import RoleGuide from "./components/RoleGuide";
import { getContracts } from "./lib/contracts";
import { connectWallet, detectRoleLabel, registerWalletListeners, syncWalletSession } from "./lib/wallet";
import AdminPage from "./pages/AdminPage";
import CustomerPage from "./pages/CustomerPage";
import MerchantPage from "./pages/MerchantPage";

function App() {
  const [activeTab, setActiveTab] = useState("Admin");
  const [wallet, setWallet] = useState({ account: "", network: null });
  const [contracts, setContracts] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const roleLabel = useMemo(() => detectRoleLabel(wallet.account), [wallet.account]);

  const pushAlert = useCallback((type, title, message) => {
    setAlerts((prev) => [{ id: crypto.randomUUID(), type, title, message }, ...prev].slice(0, 5));
  }, []);

  const dismissAlert = useCallback((id) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      setConnecting(true);
      const session = await connectWallet();
      const resolvedContracts = getContracts(session.signer);

      setWallet({ account: session.account, network: session.network });
      setContracts(resolvedContracts);
      pushAlert("success", "Wallet Connected", `${session.account}`);
      triggerRefresh();
    } catch (error) {
      pushAlert("error", "Connection Failed", error.message || "Could not connect MetaMask");
    } finally {
      setConnecting(false);
    }
  }, [pushAlert, triggerRefresh]);

  const handleWalletSync = useCallback(async () => {
    try {
      const session = await syncWalletSession();

      if (!session) {
        setWallet({ account: "", network: null });
        setContracts(null);
        triggerRefresh();
        return;
      }

      const resolvedContracts = getContracts(session.signer);
      setWallet({ account: session.account, network: session.network });
      setContracts(resolvedContracts);
      triggerRefresh();
    } catch (error) {
      pushAlert("error", "Wallet Sync Failed", error.message || "Could not refresh MetaMask session");
    }
  }, [pushAlert, triggerRefresh]);

  useEffect(() => {
    const unsubscribe = registerWalletListeners({
      onAccountsChanged: async (accounts) => {
        if (!accounts || accounts.length === 0) {
          setWallet({ account: "", network: null });
          setContracts(null);
          pushAlert("info", "Wallet Disconnected", "No MetaMask account is currently connected.");
          triggerRefresh();
          return;
        }

        await handleWalletSync();
        pushAlert("success", "Account Switched", `Now connected as ${accounts[0]}`);
      },
      onChainChanged: async () => {
        await handleWalletSync();
      },
      reloadOnChainChange: false
    });

    return unsubscribe;
  }, [handleWalletSync, pushAlert, triggerRefresh]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900">
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        walletAddress={wallet.account}
        roleLabel={roleLabel}
        onConnect={handleConnect}
        connecting={connecting}
      />

      <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-8">
        <RoleGuide />

        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-24 xl:self-start">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-700">Console Log</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  {alerts.length} messages
                </span>
              </div>
              <AlertStack alerts={alerts} onDismiss={dismissAlert} />
              {alerts.length === 0 ? (
                <p className="text-xs text-slate-500">No logs yet. Actions from Admin, Customer, and Merchant will appear here.</p>
              ) : null}
            </section>
          </aside>

          <section className="space-y-6">
            {!wallet.account ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <h2 className="text-2xl font-semibold text-slate-900">Connect MetaMask to Start Demo</h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">
                  Use Hardhat Local chain and switch accounts in MetaMask for Admin, Customer, and Merchant roles.
                </p>
              </section>
            ) : null}

            {wallet.account && activeTab === "Customer" ? (
              <CustomerPage
                account={wallet.account}
                contracts={contracts}
                pushAlert={pushAlert}
                refreshNonce={refreshNonce}
                triggerRefresh={triggerRefresh}
              />
            ) : null}

            {wallet.account && activeTab === "Admin" ? (
              <AdminPage
                contracts={contracts}
                pushAlert={pushAlert}
                refreshNonce={refreshNonce}
                triggerRefresh={triggerRefresh}
              />
            ) : null}

            {wallet.account && activeTab === "Merchant" ? (
              <MerchantPage
                contracts={contracts}
                pushAlert={pushAlert}
                 account={wallet.account}
                 refreshNonce={refreshNonce}
              />
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
