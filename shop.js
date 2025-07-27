let discounted = false;

async function checkEligibility(wallet) {
  const nftBalance = await contract.balanceOf(wallet);
  const count = parseInt(nftBalance.toString());

  if (count >= 10) {
    document.getElementById("discount-button").style.display = "inline";
  }

  // Save for profile use
  window.nftCount = count;
  window.currentWallet = wallet;

  // Update keychain status
  const claimed = await hasClaimedKeychain(wallet);
  document.getElementById("keychain-status").innerText = claimed ? "Already Claimed" : "Eligible";
  document.getElementById("claim-button").disabled = claimed;
}

async function hasClaimedKeychain(wallet) {
  const response = await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec");
  const data = await response.json();
  return data.some(entry =>
    entry.wallet.toLowerCase() === wallet.toLowerCase() &&
    entry.item.toLowerCase().includes("keychain")
  );
}

async function claimKeychain() {
  const wallet = await signer.getAddress();
  const alreadyClaimed = await hasClaimedKeychain(wallet);

  if (alreadyClaimed) {
    alert("You've already claimed your free keychain.");
    return;
  }

  const res = await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec?item=Keychain&wallet=" + wallet + "&price=0&address=Claim");
  const text = await res.text();
  alert("🎉 Keychain claimed!");
  document.getElementById("keychain-status").innerText = "Already Claimed";
  document.getElementById("claim-button").disabled = true;
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

    const userAddress = await signer.getAddress();

    const url = "https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec";
    const params = new URLSearchParams({
      item: "Tapestry",
      wallet: userAddress,
      price: discounted ? "0 (50% Off)" : "0",
      address: shippingAddress
    });

    await fetch(`${url}?${params.toString()}`);
    alert("✅ Purchase successful and logged!");
    document.getElementById("shipping-form").style.display = "none";
    document.getElementById("shipping-address").value = "";

  } catch (err) {
    console.error(err);
    alert("❌ Transaction failed or cancelled.");
  }
}

async function toggleProfile() {
  const profileDiv = document.getElementById("user-profile-section");

  if (profileDiv.style.display === "block") {
    profileDiv.style.display = "none";
    return;
  }

  const wallet = window.currentWallet;
  const nftCount = window.nftCount;
  const response = await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec");
  const data = await response.json();

  const userOrders = data.filter(row => row.wallet.toLowerCase() === wallet.toLowerCase());
  const claimed = userOrders.some(o => o.item.toLowerCase().includes("keychain"));

  profileDiv.innerHTML = `
    <h2>👤 Your Profile</h2>
    <p><strong>Wallet:</strong> ${wallet}</p>
    <p><strong>Quacker Friends NFTs Owned:</strong> ${nftCount}</p>
    <p><strong>Keychain Claimed:</strong> ${claimed ? "✅ Yes" : "❌ No"}</p>
    <h3>Your Orders:</h3>
    <ul>
      ${userOrders.map(o => `<li>${o.item} — ${o.price} — ${o.address}</li>`).join("") || "<li>No orders yet</li>"}
    </ul>
  `;
  profileDiv.style.display = "block";
}
