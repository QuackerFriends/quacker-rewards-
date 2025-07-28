let discounted = false;
let userAddressGlobal = null;
let userNftCount = 0;

async function checkEligibility(wallet) {
  const nftBalance = await contract.balanceOf(wallet);
  const count = parseInt(nftBalance.toString());
  userNftCount = count;

  if (count >= 10) {
    document.getElementById("discount-button").style.display = "inline";
  }

  // Show profile button only if eligible for anything
  if (count >= 1) {
    setupProfileButton();
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
  const addr = document.getElementById("shipping-address").value.trim();
  if (!addr) {
    alert("Please enter your shipping address.");
    return;
  }

  try {
    const tx = await signer.sendTransaction({
      to: "0x38aF7644b120B56e2FEce98b8A9A3DE14F8Fbf1D",
      value: ethers.utils.parseEther("0")
    });
    await tx.wait();

    const params = new URLSearchParams({
      item: "Tapestry",
      wallet: userAddressGlobal,
      price: discounted ? "0 (50% Off)" : "0",
      address: addr
    });

    await fetch(`https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec?${params}`);
    alert("✅ Purchase logged!");
    document.getElementById("shipping-form").style.display = "none";
    document.getElementById("shipping-address").value = "";
  } catch (err) {
    console.error(err);
    alert("Transaction failed or cancelled.");
  }
}

async function hasClaimedKeychain() {
  const res = await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec");
  const data = await res.json();
  return data.some(r =>
    r.wallet.toLowerCase() === userAddressGlobal.toLowerCase() &&
    r.item.toLowerCase().includes("keychain")
  );
}

async function claimKeychain() {
  if (userNftCount < 1) {
    alert("❌ Sorry, you must own at least 1 Quacker NFT to claim the keychain.");
    return;
  }

  const shippingAddress = document.getElementById("keychain-address").value.trim();
  if (!shippingAddress) {
    alert("Please enter your shipping address to claim the keychain.");
    return;
  }

  const params = new URLSearchParams({
    item: "Keychain",
    wallet: userAddressGlobal,
    price: "0 (Free)",
    address: shippingAddress
  });

  await fetch(`https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec?${params}`);
  alert("🎉 Keychain claimed!");

  await toggleProfile(); // refresh modal content
}


async function toggleProfile() {
  const modal = document.getElementById("profile-modal");

  if (modal.style.display === "block") {
    modal.style.display = "none";
    return;
  }

  const claimed = await hasClaimedKeychain();

  modal.innerHTML = `
    <h3>🧑‍💻 Your Profile</h3>
    <p><strong>Wallet:</strong> ${userAddressGlobal}</p>
    <p><strong>Quacker NFTs Owned:</strong> ${userNftCount}</p>
    <p><strong>Keychain Claimed:</strong> ${claimed ? "✅ Yes" : "❌ No"}</p>
    ${!claimed ? `
      <textarea id="keychain-address" placeholder="Enter shipping address..." rows="3" style="width: 100%; margin-top: 5px;"></textarea>
      <button onclick="claimKeychain()">Claim Free Keychain</button>
    ` : ''}
  `;
  modal.style.display = "block";
}

function setupProfileButton() {
  document.getElementById("profile-button").style.display = "inline";
}

function teardownProfileButton() {
  document.getElementById("profile-button").style.display = "none";
  document.getElementById("profile-modal").style.display = "none";
}
