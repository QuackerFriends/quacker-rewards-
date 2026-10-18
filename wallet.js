/* Quacker Friends wallet layer — Reown AppKit / WalletConnect v2
   This is the only file that should own wallet connection state. */
let userAddress = null;
let web3 = null;
let provider = null;
let appKit = null;
let walletSyncBusy = false;

function setWalletUI(connected) {
  const connectBtn = document.getElementById("connectBtn");
  const profileBtn = document.getElementById("profileBtn");
  if (connectBtn) connectBtn.style.display = connected ? "none" : "inline-flex";
  if (profileBtn) profileBtn.style.display = connected ? "inline-flex" : "none";
}

async function syncConnectedWallet(address, eip1193Provider) {
  if (!address || !eip1193Provider || walletSyncBusy) return;
  const normalized = address.toLowerCase();
  const changed = normalized !== userAddress || eip1193Provider !== provider;
  provider = eip1193Provider;
  web3 = new Web3(provider);
  userAddress = normalized;
  setWalletUI(true);
  if (!changed) return;
  walletSyncBusy = true;
  try {
    await fetchQuacksBalance();
    await updatePointsDisplay();
    if (typeof updateQuackageReturnUI === "function") updateQuackageReturnUI();
  } catch (err) {
    console.error("Wallet profile refresh failed:", err);
  } finally {
    walletSyncBusy = false;
  }
}

function clearWalletState() {
  userAddress = null;
  web3 = null;
  provider = null;
  userQuacksBalance = 0;
  userDisplayName = "";
  setWalletUI(false);
  const profile = document.getElementById("profileSection");
  const quacks = document.getElementById("quacksDisplay");
  if (profile) profile.style.display = "none";
  if (quacks) quacks.style.display = "none";
}

async function connectWallet() {
  try {
    if (!appKit) initWalletConnection();
    if (!appKit) throw new Error("Wallet connector is still loading. Please try again.");
    await appKit.open();
  } catch (err) {
    console.error("Wallet connect error:", err);
    if (typeof showToast === "function") showToast(err.message || "Could not open wallet connection", "error");
  }
}

async function disconnectWallet() {
  try {
    if (appKit) await appKit.disconnect();
  } catch (err) {
    console.warn("Wallet disconnect warning:", err);
  } finally {
    clearWalletState();
  }
}

function initWalletConnection() {
  if (appKit) return appKit;
  if (!window.AppKit || !window.AppKit.createAppKit) {
    console.error("Reown AppKit CDN did not load.");
    return null;
  }

  appKit = window.AppKit.createAppKit({
    projectId: REOWN_PROJECT_ID,
    metadata: REOWN_METADATA,
    networks: [window.AppKit.mainnet, window.AppKit.polygon, window.AppKit.base],
    themeMode: document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark",
    features: { analytics: true }
  });

  appKit.subscribeProviders((state) => {
    const nextProvider = state && state.eip155;
    if (nextProvider) provider = nextProvider;
    const account = appKit.getAccount && appKit.getAccount();
    if (nextProvider && account && account.address) syncConnectedWallet(account.address, nextProvider);
  });

  appKit.subscribeAccount((account) => {
    if (account && account.isConnected && account.address) {
      const providers = appKit.getProviders ? appKit.getProviders() : null;
      const nextProvider = (providers && providers.eip155) || provider;
      if (nextProvider) syncConnectedWallet(account.address, nextProvider);
    } else if (account && account.isConnected === false) {
      clearWalletState();
    }
  });

  setWalletUI(!!appKit.getIsConnectedState?.());
  document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
  return appKit;
}

window.addEventListener("load", () => setTimeout(initWalletConnection, 150));
