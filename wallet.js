const contractAddress = "0xA2c82Bda5585c1D729E2b4f85dCC9a11ded7DB4c";
const contractABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

let provider;
let signer;
let contract;
let currentAddress;

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("Please install MetaMask to use this site.");
    return;
  }

  provider = new ethers.providers.Web3Provider(window.ethereum);
  await provider.send("eth_requestAccounts", []);
  signer = provider.getSigner();
  currentAddress = await signer.getAddress();

  contract = new ethers.Contract(contractAddress, contractABI, provider);

  document.getElementById("wallet-address").innerText = "Wallet: " + currentAddress;
  document.getElementById("connect-button").style.display = "none";
  document.getElementById("switch-button").style.display = "inline";
  document.getElementById("disconnect-button").style.display = "inline";

  checkEligibility(currentAddress);
}

function switchWallet() {
  connectWallet(); // Just reconnect to trigger MetaMask popup
}

function disconnectWallet() {
  provider = null;
  signer = null;
  contract = null;
  currentAddress = null;

  document.getElementById("wallet-address").innerText = "";
  document.getElementById("connect-button").style.display = "inline";
  document.getElementById("switch-button").style.display = "none";
  document.getElementById("disconnect-button").style.display = "none";

  document.getElementById("shop").style.display = "none";
}

