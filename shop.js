let nftCount = 0;

async function checkEligibility(address) {
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
}

function claimKeychain() {
  const address = userAddress;
  localStorage.setItem(address + "-keychain", "claimed");
  alert("🎁 Keychain claimed!");
  checkEligibility(address);
}

async function buyTee() {
  alert("🧢 This is just a demo. Checkout integration coming later!");
}

async function buyTapestry() {
  if (!userAddress || !signer) {
    alert("Please connect your wallet first.");
    return;
  }

  try {
    // Switch to Base Mainnet
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x2105" }], // Base Mainnet Chain ID = 8453 = 0x2105
    });
  } catch (switchError) {
    alert("Please switch to Base network manually in MetaMask.");
    return;
  }

  const tx = await signer.sendTransaction({
    to: "0x38aF7644b120B56e2FEce98b8A9A3DE14F8Fbf1D",
    value: ethers.utils.parseEther("0"),
  });

  alert("⏳ Transaction sent! Waiting for confirmation...");
  await tx.wait();
  alert("✅ Tapestry purchased!");
}
