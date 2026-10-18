# Quacker Friends wallet modernization

## What changed
- Replaced Web3Modal 1 + WalletConnect v1 with Reown AppKit / WalletConnect v2.
- Added the Quacker Friends Reown Project ID in `config.js`.
- Wallet state now lives only in `wallet.js`.
- Checkout now sends transactions through the actually connected EIP-1193 provider, so WalletConnect/Coinbase sessions are not forced through `window.ethereum`.
- Existing Google Apps Script endpoints, Quacks logic, Quackage, auctions, products, reviews and order logging were not changed.

## Files
- `index.html` — markup only
- `styles.css` — storefront styles
- `config.js` — backend URLs, contracts, Reown config
- `wallet.js` — Reown/AppKit connection and wallet state
- `app.js` — storefront/business logic
- `theme.js` — light/dark theme

## Deploy/test checklist
1. Upload all files together (not only `index.html`).
2. Reown allowlist must include `https://shop.quackerfriends.xyz`.
3. Test Connect Wallet with Coinbase Wallet, MetaMask and WalletConnect QR/mobile.
4. Confirm profile/Quacks loads after connect.
5. Before taking a real order, make a tiny controlled payment test on each payment path you use (ETH and any ERC-20 option).
6. Keep the previous live deployment available for rollback until testing is complete.

The backend does not need to be redeployed for this frontend refactor.
