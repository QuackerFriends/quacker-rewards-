let nftCount = 0;

async function checkEligibility(address) {
  try {
    nftCount = await contract.balanceOf(address);
    document.getElementById("shop").style.display = "block";

    // Tee discount
    const teePrice = document.getElementById("tee-price");
    if (nftCount >= 3) {
      teePrice.innerText = "Price: $12.50 (50% off)";
    } else if (nftCount >= 1) {
      teePrice.innerText = "Price: $22.50 (10% off)";
    } else {
      teePrice.innerText = "Price: $25.00";
    }

    // Keychain
    const keychainStatus = document.getElementById("keychain-status");
    const claimBtn = document.getElementById("claim-button");
    const claimed = localStorage.getItem(address + "-keychain") === "claimed";

    if (claimed) {
      keychainStatus.innerText = "✅ Already Claimed";
      claimBtn.disabled = true;
    } else if (nftCount >= 1) {
      keychainStatus.innerText = "🎉 Eligible!";
      claimBtn.disabled = false;
    } else {
      keychainStatus.innerText = "❌ Not eligible";
      claimBtn.disabled = true;
    }
  } catch (error) {
    console.error("Error checking eligibility:", error);
  }
}

function claimKeychain() {
  if (!userAddress) return;
  localStorage.setItem(userAddress + "-keychain", "claimed");
  alert("🎁 Keychain claimed!");
  checkEligibility(userAddress);
}

function buyTee() {
  alert("🧢 This is just a demo. Checkout integration coming later!");
}
