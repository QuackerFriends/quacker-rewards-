let discounted = false;
let userAddressGlobal = null;
let userNftCount = 0;

async function checkEligibility(wallet) {
  const nftBalance = await contract.balanceOf(wallet);
  const count = parseInt(nftBalance.toString());
  userNftCount = count;

  document.getElementById("tee-price"); // no changes

  if (count >= 10) {
    document.getElementById("discount-button").style.display = "inline";
  }
  document.getElementById("keychain-status").innerText =
    count >= 1 ? "Eligible ✅" : "Not eligible ❌";
  document.getElementById("claim-button").disabled = count < 1;
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
  if (!addr) { alert("Please enter shipping address."); return; }

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

    alert("✅ Purchase successful and logged!");
    document.getElementById("shipping-form").style.display = "none";
    document.getElementById("shipping-address").value = "";
  } catch (err) {
    console.error(err);
    alert("Transaction failed or cancelled.");
  }
}

async function claimKeychain() {
  if (userNftCount < 1) {
    alert("You must own a Quacker Friend to claim.");
    return;
  }
  const already = await hasClaimedKeychain();
  if (already) {
    alert("You already claimed your Keychain.");
    return;
  }

  const params = new URLSearchParams({
    item: "Keychain",
    wallet: userAddressGlobal,
    price: "0 (Free)",
    address: "N/A"
  });
  await fetch(`https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec?${params}`);
  alert("🎉 Keychain claimed!");

  document.getElementById("keychain-status").innerText = "Already Claimed";
  document.getElementById("claim-button").disabled = true;
}

async function hasClaimedKeychain() {
  const res = await fetch("https://script.google.com/macros/s/AKfycbxbPGky4ai49yYSjmGiBgKzOuj0Y04ssGWyppzgheZV7vIVtY9BnHH5IW6l9ZpgFbZ0/exec");
  const data = await res.json();
  return data.some(r =>
    r.wallet.toLowerCase() === userAddressGlobal.toLowerCase() &&
    r.item.toLowerCase().includes("keychain")
  );
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
    ${claimed ? '' : '<button onclick="claimKeychain()">Claim Free Keychain</button>'}
  `;
  modal.style.display = "block";
}

// Called by wallet.js on connection:
function setupProfileButton() {
  document.getElementById("profile-button").style.display = "inline";
}

// Called by wallet.js on disconnect:
function teardownProfileButton() {
  document.getElementById("profile-button").style.display = "none";
  document.getElementById("profile-modal").style.display = "none";
}
