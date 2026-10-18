/* Quacker Friends shop configuration */
const PURCHASE_API="https://script.google.com/macros/s/AKfycbwZMlGQ2REZxTP1lIoWBYzc8n7l-h7C79F9u9MjDY4XIR6jKNO7ky1VXtCm3oP5RM_9qA/exec";
const CLAIM_SHEET_API="https://script.google.com/macros/s/AKfycbzu2RjvJf8-SyRIekMh53JODYZxoPXQpjJ2aGTqIHd93HgEZpnXcVC_zxoJbJt51zqSuQ/exec";
const QUACKAGE_API="https://script.google.com/macros/s/AKfycby7UTPn0lVBnyzHE47LdX4v0K9q4xuO8hafLAy0eLpTIPS-XCCIUqz1dgRAroWiGwmUSA/exec";
const CONTRACT_ADDRESS="0xa2c82bda5585c1d729e2b4f85dcc9a11ded7db4c";
const CONTRACT_ABI=[{"constant":true,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}];
const SHOP_WALLET="0x38aF7644b120B56e2FEce98b8A9A3DE14F8Fbf1D";
const ERC20_ABI=[{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}];
const TOKEN_MAP={"0x1":{USDC:"0xA0b86991c6218b36c1d19d19D4a2e9Eb0cE3606EB48",USDT:"0xdAC17F958D2ee523a2206206994597C13D831ec7"},"0x89":{USDC:"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",USDT:"0xc2132D05D31c914a87C6611C10748AaCbC5328"},"0x2105":{USDC:"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",USDT:"0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"}};

// Reown AppKit / WalletConnect v2
// Project IDs are public client identifiers; the Reown domain allowlist protects usage.
const REOWN_PROJECT_ID = "b6902a65225c260ffee1f335380b9ade";
const REOWN_METADATA = {
  name: "Quacker Friends Shop",
  description: "Quacker Friends shop, rewards and Quackage",
  url: "https://shop.quackerfriends.xyz",
  icons: ["https://quackerfriends.github.io/quackheads-assets/images/brandimages/Inside.png"]
};
