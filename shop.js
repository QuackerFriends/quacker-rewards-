let discounted = false;
let userAddress;
let signer;

async function checkEligibility(wallet) {
  const nftBalance = await contract.balanceOf(wallet);
  const count = parseInt(nftBalance.toString());

  if (count >= 10) {
    document.getElementById("discount-button").style.display = "inline";
  }

  showUserProfile(wallet, count);
}

function claimDiscount() {
  discounted = true;
  document.getElementById("tapestry-price").innerText = "Price: 0 ETH (50% OFF)";
  document.getElementById("discount-button").style.display = "none";
}

function buyTee() {
  alert("You bought a Quacker Friends Tee! (Logging not implemented for this item yet)");
}

function claimKeychain() {
  fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec", {
    method: "POST",
    body: JSON.stringify({
      item: "Keychain",
      wallet: userAddress,
      price: "FREE",
      address: "Claimed"
    }),
    headers: { "Content-Type": "application/json" }
  }).then(() => {
    alert("Keychain claimed!");
    checkEligibility(userAddress); // Refresh profile
  });
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

  const priceInEth = discounted ? "0" : "0"; // Update if needed
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

async function showUserProfile(wallet, nftCount) {
  const response = await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec");
  const data = await response.json();
  const userOrders = data.filter(row => row.wallet.toLowerCase() === wallet.toLowerCase());
  const keychainClaimed = userOrders.some(order => order.item.toLowerCase().includes("keychain"));

  const profileDiv = document.getElementById("user-profile");
  profileDiv.innerHTML = `
    <h2>Your Profile</h2>
    <p><strong>Wallet:</strong> ${wallet}</p>
    <p><strong>Quacker Friends Held:</strong> ${nftCount}</p>
    <p><strong>Keychain Claimed:</strong> ${keychainClaimed ? "✅ Yes" : "❌ No"}</p>
    ${!keychainClaimed ? '<button onclick="claimKeychain()">Claim Your Free Keychain</button>' : ""}
    <h3>Your Orders:</h3>
    <ul>
      ${userOrders.map(o => `<li>${o.item} — ${o.price} — ${o.address}</li>`).join("") || "<li>No orders yet</li>"}
    </ul>
  `;
}

// Toggle profile section
document.getElementById("profile-toggle").addEventListener("click", () => {
  const profile = document.getElementById("user-profile");
  profile.style.display = profile.style.display === "none" ? "block" : "none";
});

// Connect wallet logic
async function connectWallet() {
  if (window.ethereum) {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();
    document.getElementById("wallet-address").innerText = `Wallet: ${userAddress}`;
    document.getElementById("shop").style.display = "block";
    checkEligibility(userAddress);
  } else {
    alert("Please install MetaMask!");
  }
}

window.onload = connectWallet;
