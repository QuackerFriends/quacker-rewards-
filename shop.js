let discounted = false;
let userAddress;
let signer;

const contractAddress = "0xYOUR_CONTRACT_HERE"; // Replace with your NFT contract
const abi = [ /* your ABI here */ ];
const provider = new ethers.providers.Web3Provider(window.ethereum);
const contract = new ethers.Contract(contractAddress, abi, provider);

async function connectWallet() {
  if (window.ethereum) {
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    document.getElementById("wallet-address").innerText = "Connected: " + userAddress;
    document.getElementById("shop").style.display = "block";
    checkEligibility(userAddress);
  } else {
    alert("Please install MetaMask!");
  }
}

async function checkEligibility(wallet) {
  const nftBalance = await contract.balanceOf(wallet);
  const count = parseInt(nftBalance.toString());

  if (count >= 10) {
    document.getElementById("discount-button").style.display = "inline";
  }

  // Refresh user profile
  if (document.getElementById("user-profile").style.display !== "none") {
    showUserProfile(wallet, count);
  }
}

function claimDiscount() {
  discounted = true;
  document.getElementById("tapestry-price").innerText = "Price: 0 ETH (50% OFF)";
  document.getElementById("discount-button").style.display = "none";
}

function buyTapestry() {
  document.getElementById("shipping-form").style.display = "block";
}

async function submitPurchase() {
  const shippingAddress = document.getElementById("shipping-address").value.trim();
  if (!shippingAddress) {
    alert("Please enter a shipping address.");
    return;
  }

  const priceInEth = discounted ? "0" : "0";
  const ethAmount = ethers.utils.parseEther(priceInEth);

  try {
    const tx = await signer.sendTransaction({
      to: "0x38aF7644b120B56e2FEce98b8A9A3DE14F8Fbf1D",
      value: ethAmount
    });

    await tx.wait();

    await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec", {
      method: "POST",
      body: JSON.stringify({
        item: "Tapestry",
        wallet: userAddress,
        price: discounted ? "0 (50% Off)" : "0",
        address: shippingAddress
      }),
      headers: { "Content-Type": "application/json" }
    });

    alert("Purchase successful and logged!");
    document.getElementById("shipping-form").style.display = "none";
    document.getElementById("shipping-address").value = "";
    checkEligibility(userAddress);
  } catch (err) {
    console.error(err);
    alert("Transaction failed or cancelled.");
  }
}

async function claimKeychain() {
  try {
    const tx = await signer.sendTransaction({
      to: "0x38aF7644b120B56e2FEce98b8A9A3DE14F8Fbf1D",
      value: ethers.utils.parseEther("0")
    });

    await tx.wait();

    await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec?item=Keychain&wallet=" + encodeURIComponent(userAddress) + "&price=0&address=Claimed from Profile");

    alert("🎉 Keychain claimed!");
    checkEligibility(userAddress);
  } catch (err) {
    console.error("Keychain claim failed", err);
    alert("Transaction failed or cancelled.");
  }
}

async function showUserProfile(wallet, nftCount = null) {
  const response = await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec");
  const data = await response.json();
  const orders = data.filter(o => o.wallet.toLowerCase() === wallet.toLowerCase());
  const keychainClaimed = orders.some(o => o.item.toLowerCase().includes("keychain"));

  if (nftCount === null) {
    const nftBalance = await contract.balanceOf(wallet);
    nftCount = parseInt(nftBalance.toString());
  }

  const profileDiv = document.getElementById("user-profile");
  profileDiv.innerHTML = `
    <h2>🧑‍💼 Your Profile</h2>
    <p><strong>Wallet:</strong> ${wallet}</p>
    <p><strong>Quacker Friends Held:</strong> ${nftCount}</p>
    <p><strong>Keychain Claimed:</strong> ${keychainClaimed ? "✅ Yes" : "❌ No"}</p>
    ${!keychainClaimed ? '<button onclick="claimKeychain()">🎁 Claim Free Keychain</button>' : ""}
    <h3>Your Orders:</h3>
    <ul>
      ${orders.map(o => `<li>${o.item} — ${o.price} — ${o.address}</li>`).join("") || "<li>No orders yet.</li>"}
    </ul>
  `;
}

document.getElementById("profile-toggle").addEventListener("click", async () => {
  const div = document.getElementById("user-profile");
  if (div.style.display === "none") {
    await showUserProfile(userAddress);
    div.style.display = "block";
  } else {
    div.style.display = "none";
  }
});

window.onload = connectWallet;
