let provider;
let signer;
let userAddress = null;

const contractAddress = "0xA2c82Bda5585c1D729E2b4f85dCC9a11ded7DB4c";
const contractABI = [
  "function balanceOf(address owner) view returns (uint256)"
];

async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    document.getElementById("wallet-address").innerText = `Wallet: ${userAddress}`;
    document.getElementById("connect-button").style.display = "none";
    document.getElementById("disconnect-button").style.display = "inline";
    document.getElementById("switch-button").style.display = "inline";

    checkEligibility(userAddress);
  } else {
    alert("Please install MetaMask!");
  }
}

function disconnectWallet() {
  userAddress = null;
  signer = null;
  provider = null;

  document.getElementById("wallet-address").innerText = "";
  document.getElementById("connect-button").style.display = "inline";
  document.getElementById("disconnect-button").style.display = "none";
  document.getElementById("switch-button").style.display = "none";
  document.getElementById("shop").style.display = "none";
}

async function switchWallet() {
  await ethereum.request({
    method: 'wallet_requestPermissions',
    params: [{ eth_accounts: {} }]
  });
  connectWallet();
}

const contract = new ethers.Contract(contractAddress, contractABI, new ethers.providers.Web3Provider(window.ethereum));
