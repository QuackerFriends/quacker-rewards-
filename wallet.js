/* Quacker Friends wallet layer — Reown AppKit / WalletConnect v2
   Keeps the rest of the shop on Web3.js while AppKit owns connection state. */
let userAddress = null;
let web3 = null;
let provider = null;
let appKit = null;
let walletSyncBusy = false;
let walletInitPromise = null;

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
  if (typeof userQuacksBalance !== "undefined") userQuacksBalance = 0;
  if (typeof userDisplayName !== "undefined") userDisplayName = "";
  setWalletUI(false);
  const profile = document.getElementById("profileSection");
  const quacks = document.getElementById("quacksDisplay");
  if (profile) profile.style.display = "none";
  if (quacks) quacks.style.display = "none";
}

async function initWalletConnection() {
  if (appKit) return appKit;
  if (walletInitPromise) return walletInitPromise;

  walletInitPromise = (async () => {
    try {
      // Use Reown's official JS packages as browser ESM modules. EthersAdapter
      // supplies the EVM adapter; the shop itself can continue using Web3.js.
      const [{ createAppKit }, { EthersAdapter }, networks] = await Promise.all([
        import("https://esm.sh/@reown/appkit@1.8.21"),
        import("https://esm.sh/@reown/appkit-adapter-ethers@1.8.21"),
        import("https://esm.sh/@reown/appkit@1.8.21/networks")
      ]);

      const supportedNetworks = [networks.mainnet, networks.polygon, networks.base];

      appKit = createAppKit({
        adapters: [new EthersAdapter()],
        networks: supportedNetworks,
        projectId: REOWN_PROJECT_ID,
        metadata: REOWN_METADATA,
        themeMode: document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark",
        features: { analytics: true }
      });

      appKit.subscribeProviders((state) => {
        const nextProvider = state?.eip155;
        if (nextProvider) provider = nextProvider;
        const account = appKit.getAccount?.();
        if (nextProvider && account?.address) {
          syncConnectedWallet(account.address, nextProvider);
        }
      });

      appKit.subscribeAccount((account) => {
        if (account?.isConnected && account.address) {
          const providers = appKit.getProviders?.();
          const nextProvider = providers?.eip155 || provider;
          if (nextProvider) syncConnectedWallet(account.address, nextProvider);
        } else if (account?.isConnected === false) {
          clearWalletState();
        }
      });

      setWalletUI(Boolean(appKit.getIsConnectedState?.()));
      console.info("Quacker wallet: Reown AppKit ready");
      return appKit;
    } catch (err) {
      walletInitPromise = null;
      console.error("Reown AppKit failed to initialize:", err);
      if (typeof showToast === "function") {
        showToast("Wallet connector failed to load. Please refresh and try again.", "error");
      }
      throw err;
    }
  })();

  return walletInitPromise;
}

async function connectWallet() {
  try {
    const modal = await initWalletConnection();
    await modal.open();
  } catch (err) {
    console.error("Wallet connect error:", err);
    if (typeof showToast === "function") showToast(err.message || "Could not open wallet connection", "error");
  }
}

async function disconnectWallet() {
  try {
    const modal = await initWalletConnection();
    await modal.disconnect();
  } catch (err) {
    console.warn("Wallet disconnect warning:", err);
  } finally {
    clearWalletState();
  }
}

window.addEventListener("load", () => {
  document.getElementById("connectBtn")?.addEventListener("click", connectWallet);
  initWalletConnection().catch(() => {});
});
