let provider;
let signer;
let userAddress = null;

const contractAddress = "0xA2c82Bda5585c1D729E2b4f85dCC9a11ded7DB4c";
const contractABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

let contract;

async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    contract = new ethers.Contract(contractAddress, contractABI, provider);

    document.getElementById("wallet-address").innerText = `Wallet: ${userAddress}`;
    document.getElementById("connect-button").style.display = "none";
    document.getElementById("disconnect-button").style.display = "inline";
    document.getElementById("switch-button").style.display = "inline";
    document.getElementById("shop").style.display = "block";
    document.getElementById("profile-button").style.display = "inline";


    checkEligibility(userAddress); // Optional function you may implement
  } else {
    alert("Please install MetaMask!");
  }
}

function disconnectWallet() {
  userAddress = null;
  signer = null;
  provider = null;
  contract = null;

  document.getElementById("profile-button").style.display = "none";
document.getElementById("profile-section").style.display = "none";

  document.getElementById("wallet-address").innerText = "";
  document.getElementById("connect-button").style.display = "inline";
  document.getElementById("disconnect-button").style.display = "none";
  document.getElementById("switch-button").style.display = "none";
  document.getElementById("shop").style.display = "none";
}

async function switchWallet() {
  try {
    await ethereum.request({
      method: 'wallet_requestPermissions',
      params: [{ eth_accounts: {} }]
    });
    connectWallet();
  } catch (err) {
    console.error("Switch failed", err);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("connect-button").addEventListener("click", connectWallet);
  document.getElementById("disconnect-button").addEventListener("click", disconnectWallet);
  document.getElementById("switch-button").addEventListener("click", switchWallet);

  // Hide the shop until wallet is connected manually
  document.getElementById("shop").style.display = "none";
});
