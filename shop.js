let discounted = false;

async function checkEligibility(wallet) {
  const nftBalance = await contract.balanceOf(wallet);
  const count = parseInt(nftBalance.toString());

  if (count >= 10) {
    document.getElementById("discount-button").style.display = "inline";
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

  const priceInEth = discounted ? "0" : "0"; // placeholder
  const ethAmount = ethers.utils.parseEther(priceInEth);

  try {
    const tx = await signer.sendTransaction({
      to: "0x38aF7644b120B56e2FEce98b8A9A3DE14F8Fbf1D", // your wallet address
      value: ethAmount
    });

    await tx.wait();

    // Get user wallet address
    const userAddress = await signer.getAddress();

    // Prepare URL with query parameters
    const baseUrl = "https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec";
    const params = new URLSearchParams({
      item: "Tapestry",
      wallet: userAddress,
      price: discounted ? "0 (50% Off)" : "0",
      address: shippingAddress
    });

    // Send GET request to Google Sheets Web App
    const res = await fetch(`${baseUrl}?${params.toString()}`);
    const text = await res.text();
    console.log("Google Sheet response:", text);

    alert("✅ Purchase successful and logged!");
    document.getElementById("shipping-form").style.display = "none";
    document.getElementById("shipping-address").value = "";

  } catch (err) {
    console.error(err);
    alert("❌ Transaction failed or cancelled.");
  }
}
document.getElementById("profile-button").addEventListener("click", async () => {
  const response = await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec");
  const data = await response.json();
  const lowerWallet = userAddress.toLowerCase();
  const orders = data.filter(row => row.wallet.toLowerCase() === lowerWallet);

  const keychainClaimed = orders.some(o => o.item.toLowerCase().includes("keychain"));

  const nftBalance = await contract.balanceOf(userAddress);
  const nftCount = parseInt(nftBalance.toString());

  const section = document.getElementById("profile-section");
  section.innerHTML = `
    <h2>User Profile</h2>
    <p><strong>Wallet:</strong> ${userAddress}</p>
    <p><strong>Quacker Friends NFTs Held:</strong> ${nftCount}</p>
    <p><strong>Keychain Claimed:</strong> ${keychainClaimed ? "✅ Yes" : "❌ No"}</p>
    <h3>Order History:</h3>
    <ul>
      ${orders.map(o => `<li>${o.item} - ${o.price} - ${o.address}</li>`).join("") || "<li>No orders yet.</li>"}
    </ul>
  `;
  section.style.display = section.style.display === "none" ? "block" : "none";
});
