import { ethers } from "ethers";
import { APP_CONFIG } from "../config/contracts";

export function hasMetaMask() {
  return typeof window !== "undefined" && typeof window.ethereum !== "undefined";
}

export function shortAddress(address) {
  if (!address) return "Not connected";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function connectWallet() {
  return readWalletSession({ requestAccounts: true });
}

export async function syncWalletSession() {
  return readWalletSession({ requestAccounts: false });
}

async function readWalletSession({ requestAccounts }) {
  if (!hasMetaMask()) {
    throw new Error("MetaMask is not installed.");
  }

  const provider = new ethers.BrowserProvider(window.ethereum);

  if (requestAccounts) {
    await provider.send("eth_requestAccounts", []);
  } else {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) {
      return null;
    }
  }

  const signer = await provider.getSigner();
  const account = await signer.getAddress();
  const network = await provider.getNetwork();

  if (Number(network.chainId) !== Number(APP_CONFIG.expectedChainId)) {
    throw new Error(
      `Wrong network. Switch MetaMask to ${APP_CONFIG.expectedChainName} (chainId ${APP_CONFIG.expectedChainId}).`
    );
  }

  return { provider, signer, account, network };
}

export function detectRoleLabel(account) {
  if (!account) return "Guest";

  const lower = account.toLowerCase();
  const roleAccounts = APP_CONFIG.roleAccounts;

  if (roleAccounts.admin && lower === roleAccounts.admin.toLowerCase()) return "Admin";
  if (roleAccounts.customer && lower === roleAccounts.customer.toLowerCase()) return "Customer";
  if (roleAccounts.merchant && lower === roleAccounts.merchant.toLowerCase()) return "Merchant / Operator";
  return "Unmapped Wallet";
}

export function registerWalletListeners({
  onAccountsChanged,
  onChainChanged,
  reloadOnChainChange = false
}) {
  if (!hasMetaMask()) return () => {};

  const handleAccountsChanged = (accounts) => {
    if (typeof onAccountsChanged === "function") {
      onAccountsChanged(accounts || []);
    }
  };

  const handleChainChanged = (chainId) => {
    if (reloadOnChainChange) {
      window.location.reload();
      return;
    }

    if (typeof onChainChanged === "function") {
      onChainChanged(chainId);
    }
  };

  window.ethereum.on("accountsChanged", handleAccountsChanged);
  window.ethereum.on("chainChanged", handleChainChanged);

  return () => {
    window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    window.ethereum.removeListener("chainChanged", handleChainChanged);
  };
}
