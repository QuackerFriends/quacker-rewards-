# Base holder-count fix

- `Quacker Friends Held` now reads `balanceOf(wallet)` directly from the Quacker Friends contract on Base using a dedicated read-only Base RPC.
- The result no longer depends on which network the connected wallet currently has selected.
- The existing Apps Script `nft_count` remains only as a fallback if the Base RPC read fails.
- Quacks/rewards backend behavior is unchanged.
- Ethereum + Polygon + Base remain in the wallet/payment configuration because the current checkout token map supports all three. They are not used for the Quacker NFT ownership read.
