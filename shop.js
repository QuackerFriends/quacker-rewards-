let nftCount = 0;

async function checkEligibility(address) {
  if (!contract) return;

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
  } catch (err) {
    console.error("Eligibility check failed", err);
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

// Hook buttons after DOM loads
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("claim-button").addEventListener("click", claimKeychain);
  document.getElementById("buy-tee-button").addEventListener("click", buyTee);
});
