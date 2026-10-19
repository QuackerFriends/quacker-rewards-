/* ===== STATE ===== */
let cart=[],PRODUCTS={},currentCategory=null,cachedEthRate=null,lastRateFetch=0,blurCount=0;
let userQuacksBalance=0,userDisplayName="";
let auctionTimers={};

function addBlur(){blurCount++;document.body.classList.add("blur-bg")}
function removeBlur(){blurCount=Math.max(0,blurCount-1);if(!blurCount)document.body.classList.remove("blur-bg")}

function showToast(msg,type="info",duration=3200){
  const c=document.getElementById("toast-container");if(!c)return;
  const el=document.createElement("div");
  el.className="toast "+(type==="success"?"success":type==="error"?"error":"info");
  el.innerHTML=`<span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(()=>el.remove(),duration);
}

async function getEthRate(){
  if(cachedEthRate&&Date.now()-lastRateFetch<60000)return cachedEthRate;
  try{const r=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");const d=await r.json();cachedEthRate=d?.ethereum?.usd||3000;}catch{cachedEthRate=3000;}
  lastRateFetch=Date.now();return cachedEthRate;
}
function formatPrice(usd,rate){if(!rate||!usd)return usd>0?`$${usd}`:"";return `$${usd} <span style="color:var(--muted);font-weight:400;font-size:12px">≈${(usd/rate).toFixed(4)} ETH</span>`;}
function getProductUsd(p){if(p.priceUSD)return p.priceUSD;if(Array.isArray(p.variants)&&typeof p.variants[0]==="object"&&p.variants[0].priceUSD)return p.variants[0].priceUSD;return 0;}

const SHIPPING_RULES={USA:{fee:5,freeOver:70},Canada:{fee:10,freeOver:70}};
function calcSubtotalUSD(){return cart.reduce((s,ci)=>s+(Number(ci.priceUSD||0)*ci.q),0)}
function getShippingCharge(country,sub){const r=SHIPPING_RULES[country]||SHIPPING_RULES.USA;return sub>=r.freeOver?0:r.fee}
function updateCheckoutDisplay(){
  const country=document.getElementById("shippingCountry")?.value||"USA";
  const sub=calcSubtotalUSD(),ship=getShippingCharge(country,sub),total=sub+ship;
  const s=document.getElementById("subtotalDisplay"),sh=document.getElementById("shippingDisplay"),t=document.getElementById("totalDisplay");
  if(s)s.innerText=`$${sub.toFixed(2)}`;if(sh)sh.innerText=`$${ship.toFixed(2)}`;if(t)t.innerText=`$${total.toFixed(2)}`;
}
function initCheckoutUI(){
  const cs=document.getElementById("shippingCountry"),ps=document.getElementById("paymentSelector");
  if(cs)cs.addEventListener("change",updateCheckoutDisplay);if(ps)ps.addEventListener("change",updateCheckoutDisplay);
  updateCheckoutDisplay();
}

async function fetchQuacksBalance(){
  if(!userAddress)return 0;
  try{
    const r=await fetch(`${CLAIM_SHEET_API}?wallet=${userAddress.toLowerCase()}`);
    const d=await r.json();
    userQuacksBalance=Number(d.quacks_collected||0);
    const hv=document.getElementById("quacksHeaderValue");if(hv)hv.textContent=userQuacksBalance;
    const qd=document.getElementById("quacksDisplay");if(qd)qd.style.display="inline-flex";
    const qc=document.getElementById("quacksCount");if(qc)qc.innerText=`🦆 Quacks Balance: ${userQuacksBalance}`;
    const td=document.getElementById("tierDisplay");if(td&&d.tier)td.innerText=`Tier: ${d.tier} · Daily rate: ${d.daily_rate||0}/day`;
    if(d.display_name){userDisplayName=d.display_name;const inp=document.getElementById("displayNameInput");if(inp)inp.value=d.display_name;}

    // ===== QUACKS EARNED NOTIFICATION =====
    if(d.auto_added>0){
      if(d.new_user){
        showToast(`👋 Welcome! You just earned your first ${d.auto_added} 🦆 Quacks as a ${d.tier}!`,"success",5000);
      } else if(d.tier==="partner"){
        showToast(`🤝 Welcome back! You collected ${d.auto_added} 🦆 Quacks as a partner holder.`,"success",5000);
      } else {
        let msg=`🦆 You collected ${d.auto_added} Quacks! Your daily rate is ${d.daily_rate}/day.`;
        if(d.streak_bonus>0) msg+=` 🔥 Streak bonus: +${d.streak_bonus} Quacks!`;
        showToast(msg,"success",5000);
      }
    } else if(d.new_user){
      showToast(`👋 Welcome! You earned your first ${d.daily_rate} 🦆 Quacks as a ${d.tier}!`,"success",5000);
    }
    // ======================================

    return userQuacksBalance;
  }catch{return 0;}
}

async function saveDisplayName(){
  if(!userAddress){showToast("Connect wallet first","error");return;}
  const inp=document.getElementById("displayNameInput");
  const name=(inp?.value||"").trim();
  if(!name){showToast("Please enter a name","error");return;}
  if(name.length>24){showToast("Max 24 characters","error");return;}
  try{
    const r=await fetch(`${CLAIM_SHEET_API}?wallet=${userAddress.toLowerCase()}&setName=${encodeURIComponent(name)}`);
    const d=await r.json();
    if(d.error){showToast(d.error,"error");return;}
    userDisplayName=name;
    showToast(`Name set to "${name}" 🎉`,"success");
  }catch{showToast("Failed to save name","error");}
}

async function loadProducts(){
  try{
    const res=await fetch(`${PURCHASE_API}?action=getItems`);const data=await res.json();
    if(data.success&&Array.isArray(data.items)){
      PRODUCTS=data.items.reduce((acc,item)=>{
        const cat=(item.Category||"Other").trim()||"Other";if(!acc[cat])acc[cat]=[];
        const product={id:String(item.ID||"").trim(),title:item.Title||"",description:item.Description||"",priceUSD:item.PriceUSD?Number(item.PriceUSD):0,quacksCost:item.QuacksCost||0,pointsCost:item.PointsCost?Number(item.PointsCost):null,variants:item.VariantOptions?item.VariantOptions.toString().split(",").map(v=>v.trim()).filter(Boolean):[],colors:item.ColorOptions?item.ColorOptions.toString().split(",").map(c=>c.trim()).filter(Boolean):[],sizes:item.SizeOptions?item.SizeOptions.toString().split(",").map(s=>s.trim()).filter(Boolean):[],sizeGuide:item.SizeGuide||"",image:item.ImageURL?String(item.ImageURL).trim():"",active:item.Active===true||String(item.Active).toUpperCase()==="TRUE",CustomInput:item.CustomInput||"",VariantPrices:item.VariantPrices||""};
        product.images=product.image?(product.image.includes(",")||product.image.includes("|")?product.image.split(/[,|]/).map(u=>u.trim()).filter(Boolean):[product.image]):["https://quackerfriends.github.io/quackheads-assets/images/placeholder.png"];
        if(product.VariantPrices){const map={};product.VariantPrices.split(",").forEach(vp=>{const[n,p]=vp.split(":");if(n&&p)map[n.trim()]=Number(p.trim())});product.variantPricesMap=map;}
        acc[cat].push(product);return acc;
      },{});
      const sm=document.getElementById("shopMenu");
      if(sm)sm.innerHTML=Object.keys(PRODUCTS).map(cat=>`<button class="dropdown-item" onclick="showCategory('${cat}',true)">${cat}</button>`).join("");
      const ct=document.getElementById("categoryTiles");
      if(ct){const icons=["🧸","👕","✨","🎃","🦆","🎁"];ct.innerHTML=Object.keys(PRODUCTS).map((cat,i)=>`<button class="category-tile" onclick="showCategory('${cat}');setTimeout(()=>document.getElementById('mainContent').scrollIntoView({behavior:'smooth',block:'start'}),120)"><span class="emoji">${icons[i%icons.length]}</span><strong>${cat}</strong><small>${(PRODUCTS[cat]||[]).filter(p=>p.active!==false).length} items · Explore →</small></button>`).join("");}
      if(!currentCategory)document.getElementById("items").innerHTML="";else await showCategory(currentCategory);
    }
  }catch(err){console.error("Error fetching items:",err)}
}

function goToShop(){
  const categories=Object.keys(PRODUCTS||{});
  const target=currentCategory&&PRODUCTS[currentCategory]?currentCategory:categories[0];
  if(target){
    showCategory(target,true);
  }else{
    document.getElementById("mainContent")?.scrollIntoView({behavior:"smooth",block:"start"});
  }
}

async function showCategory(cat,shouldScroll=false){
  const shopMenu=document.getElementById("shopMenu");if(shopMenu)shopMenu.classList.remove("open");
  if(currentCategory===cat){ if(shouldScroll)setTimeout(()=>document.getElementById("items")?.scrollIntoView({behavior:"smooth",block:"start"}),80); return; }
  const key=(cat in PRODUCTS)?cat:Object.keys(PRODUCTS).find(k=>k.toLowerCase()===cat.toLowerCase());
  currentCategory=key||cat;
  const container=document.getElementById("items");container.innerHTML="";
  const items=PRODUCTS[currentCategory]||[];
  if(!items.length){container.innerHTML=`<div style="text-align:center;padding:60px 20px;color:var(--muted)">No items found.</div>`;return;}
  const ethRate=await getEthRate();
  requestAnimationFrame(()=>{
    items.forEach((p,idx)=>{
      const el=document.createElement("div");el.className="item";el.style.animationDelay=`${idx*.06}s`;
      const productId=p.ID||p.id,usd=p.PriceUSD||p.priceUSD||0,quacks=p.QuacksCost||p.quacksCost||0,points=p.PointsCost||p.pointsCost||0;
      const images=p.images||[];
      let imageHTML="";
      if(images.length>1){
        imageHTML=`<div class="image-slider" id="slider_${p.id}">${images.map((url,i)=>`<img src="${url}" alt="${p.title}" class="slide ${i===0?"active":""}" loading="lazy" onclick="openItemModal('<img src=\\'${url}\\'/><h3 style=\\'margin-top:14px;text-align:center;font-family:Space Grotesk,sans-serif\\'>${p.title}</h3>')"/>`).join("")}<button class="slider-btn prev" onclick="prevSlide('${p.id}')">‹</button><button class="slider-btn next" onclick="nextSlide('${p.id}')">›</button><div class="slide-dots">${images.map((_,i)=>`<div class="slide-dot ${i===0?"active":""}" onclick="goToSlide('${p.id}',${i})"></div>`).join("")}</div></div>`;
      }else{
        const src=images[0]||"https://quackerfriends.github.io/quackheads-assets/images/placeholder.png";
        imageHTML=`<div class="item-image-wrap"><img src="${src}" alt="${p.title}" loading="lazy" onclick="openItemModal('<img src=\\'${src}\\'/><h3 style=\\'margin-top:14px;text-align:center;font-family:Space Grotesk,sans-serif\\'>${p.title}</h3>')"/><div class="zoom-hint">🔍 Zoom</div></div>`;
      }
      const variantHTML=(p.variants&&p.variants.length)?`<div><label class="styled-label">Variant</label><select class="styled-select" id="variant_${p.id}">${p.variants.map(v=>`<option value="${v}">${v}</option>`).join("")}</select></div>`:"";
      const colorHTML=(p.colors&&p.colors.length)?`<div><label class="styled-label">Color</label><select class="styled-select" id="color_${p.id}">${p.colors.map(c=>`<option value="${c}">${c}</option>`).join("")}</select></div>`:"";
      const sizeHTML=(p.sizes&&p.sizes.length)?`<div><label class="styled-label">Size</label><select class="styled-select" id="size_${p.id}">${p.sizes.map(s=>`<option value="${s}">${s}</option>`).join("")}</select></div>`:"";
      const customHTML=(p.CustomInput&&p.CustomInput.trim())?`<div><label class="styled-label">${p.CustomInput}</label><input class="styled-input" id="custom_${p.id}" type="text" placeholder="${p.CustomInput}"/></div>`:"";
      const buyBtn=usd>0?`<button class="btn-add-cart" onclick="addToCart('${productId}')">Add to Cart</button>`:"";
      const quacksBtn=quacks>0?`<button class="btn-quacks" onclick="addToCartWithQuacks('${productId}',${quacks})">🪙 ${quacks} Quacks</button>`:"";
      const redeemBtn=points>0?`<button class="btn-redeem" onclick="redeemWithPoints('${productId}',${points})">⭐ ${points} Points</button>`:"";
      const isTeeProduct=/tee|t-shirt|t shirt/i.test(`${currentCategory||""} ${p.title||""}`);
      const sizeGuideBtn=isTeeProduct?`<button class="btn-size-guide" onclick="openStoreTeeSizeGuide()">📏 Size Guide</button>`:(p.sizeGuide?`<button class="btn-size-guide" onclick="openSizeGuide('${p.sizeGuide}')">📏 Size Guide</button>`:"");
      el.innerHTML=`${imageHTML}<div class="item-body"><div class="item-title">${p.title}</div>${p.description?`<div class="item-desc">${p.description}</div>`:""}<div class="item-price" id="price_${productId}">${formatPrice(usd,ethRate)}</div><div class="item-selects">${variantHTML}${colorHTML}${sizeHTML}${customHTML}</div>${sizeGuideBtn}<div class="item-actions">${buyBtn}${quacksBtn}${redeemBtn}</div></div>`;
      container.appendChild(el);

      // Add reviews section below each product card
      el.appendChild(buildReviewSection(p.id));

      const vs=el.querySelector(`#variant_${p.id}`);
      if(vs){vs.addEventListener("change",async(e)=>{const sel=e.target.value,rate=await getEthRate();let newUsd=getProductUsd(p);if(Array.isArray(p.variants)&&typeof p.variants[0]==="object"){const m=p.variants.find(v=>v.name===sel);if(m?.priceUSD)newUsd=m.priceUSD;}else if(p.variantPricesMap?.[sel]!=null){newUsd=p.variantPricesMap[sel];}const pe=el.querySelector(`#price_${productId}`);if(pe)pe.innerHTML=formatPrice(newUsd,rate);});}
    });
    if(shouldScroll){setTimeout(()=>document.getElementById("mainContent")?.scrollIntoView({behavior:"smooth",block:"start"}),80);}
    initProductHoverSlides();
    populateCommunityProducts(); loadAllReviews();
    if(shouldScroll)setTimeout(()=>document.getElementById("items")?.scrollIntoView({behavior:"smooth",block:"start"}),100);
  });
}

/* ===== AUCTIONS ===== */
async function loadAuctions(){
  const grid=document.getElementById("auctionGrid");if(!grid)return;
  try{
    const r=await fetch(`${PURCHASE_API}?action=getAuctions`);
    const d=await r.json();
    if(!d.success||!d.auctions||!d.auctions.length){grid.innerHTML=`<div class="auction-empty">🦆 No live auctions right now. Check back soon!</div>`;return;}
    Object.values(auctionTimers).forEach(t=>clearInterval(t));auctionTimers={};grid.innerHTML="";
    d.auctions.forEach((a,idx)=>{const card=buildAuctionCard(a,idx);grid.appendChild(card);startCountdown(a.AuctionID,a.EndTime,a.Status);});
  }catch(err){console.error("Auction load error:",err);grid.innerHTML=`<div class="auction-empty">Could not load auctions. Try again soon.</div>`;}
}

function buildAuctionCard(a,idx){
  const el=document.createElement("div");
  const isEnded=a.Status==="ended"||a.Status==="Ended";
  el.className=`auction-card${isEnded?" ended":""}`;el.style.animationDelay=`${idx*.08}s`;
  const currentBid=Number(a.CurrentBid)||Number(a.StartingBid)||0;
  const hasLeader=a.CurrentLeader&&a.CurrentLeader.trim();
  const leaderDisplay=a.CurrentLeaderName||shortenAddr(a.CurrentLeader||"");
  const isMyLead=userAddress&&a.CurrentLeader&&a.CurrentLeader.toLowerCase()===userAddress.toLowerCase();

  // Support multiple images via ImageURLs (comma-separated) or fall back to ImageURL
  const rawImgs = a.ImageURLs || a.ImageURL || "";
  const imgList = rawImgs.split(",").map(u=>u.trim()).filter(Boolean);
  if(!imgList.length) imgList.push("https://quackerfriends.github.io/quackheads-assets/images/placeholder.png");

  const auctionId = a.AuctionID;
  let imgHTML = "";
  if(imgList.length > 1){
    imgHTML = `<div class="image-slider" id="aslider_${auctionId}">
      ${imgList.map((url,i)=>`<img src="${url}" alt="${a.Title}" class="slide ${i===0?"active":""}" loading="lazy" onclick="openItemModal('<img src=\\'${url}\\'/><h3 style=\\'margin-top:14px;text-align:center;font-family:Space Grotesk,sans-serif\\'>${a.Title}</h3>')"/>`).join("")}
      <button class="slider-btn prev" onclick="prevSlide('aslider_${auctionId}',true)">‹</button>
      <button class="slider-btn next" onclick="nextSlide('aslider_${auctionId}',true)">›</button>
      <div class="slide-dots">${imgList.map((_,i)=>`<div class="slide-dot ${i===0?"active":""}" onclick="goToSlide('aslider_${auctionId}',${i},true)"></div>`).join("")}</div>
      ${isEnded?`<div class="auction-ended-badge">Ended</div>`:`<div class="auction-exclusive">Exclusive</div>`}
    </div>`;
  } else {
    imgHTML = `<div class="auction-img-wrap">
      <img src="${imgList[0]}" alt="${a.Title}" loading="lazy" onclick="openItemModal('<img src=\\'${imgList[0]}\\'/><h3 style=\\'margin-top:14px;text-align:center;font-family:Space Grotesk,sans-serif\\'>${a.Title}</h3>')"/>
      ${isEnded?`<div class="auction-ended-badge">Ended</div>`:`<div class="auction-exclusive">Exclusive</div>`}
    </div>`;
  }

  let actionHTML="";
  if(isEnded){
    if(hasLeader){const winnerName=a.WinnerName||shortenAddr(a.Winner||a.CurrentLeader||"");const isMyWin=userAddress&&(a.Winner||a.CurrentLeader||"").toLowerCase()===userAddress.toLowerCase();actionHTML=`<div class="auction-winner-banner${isMyWin?" your-win":""}">${isMyWin?"🏆 You won this auction!":"🏆 Won by "+winnerName}</div>`;}
    else{actionHTML=`<div class="auction-winner-banner">No bids — auction ended.</div>`;}
  }else{
    const minBid=currentBid+1;
    actionHTML=`<div class="bid-row"><input class="bid-input" id="bidInput_${auctionId}" type="number" min="${minBid}" placeholder="Min: ${minBid} 🦆"/><button class="bid-btn" onclick="placeBid('${auctionId}',${currentBid})" ${isMyLead?"disabled":""}>${isMyLead?"Leading!":"Place Bid"}</button></div>`;
  }

  el.innerHTML=`${imgHTML}<div class="auction-body"><div class="auction-title">${a.Title}</div>${a.Description?`<div class="auction-desc">${a.Description}</div>`:""}<div class="auction-stats"><div class="auction-stat"><div class="auction-stat-label">Current Bid</div><div class="auction-stat-value quacks">${currentBid} 🦆</div></div><div class="auction-stat"><div class="auction-stat-label">Time Left</div><div class="countdown" id="countdown_${auctionId}">${isEnded?"Ended":"Loading…"}</div></div></div><div class="auction-leader ${hasLeader?"":"nobody"}">${hasLeader?`🥇 Leading: <span class="auction-leader-name">${leaderDisplay}</span>${isMyLead?" (You!)":""}`:isEnded?"No bids placed":"🦆 No bids yet — be first!"}</div>${actionHTML}</div>`;
  return el;
}

function startCountdown(id,endTimeStr,status){
  if(status==="ended"||status==="Ended")return;
  const endTime=new Date(endTimeStr).getTime();
  function update(){
    const el=document.getElementById(`countdown_${id}`);if(!el)return;
    const now=Date.now(),diff=endTime-now;
    if(diff<=0){el.textContent="Ended";el.className="countdown ended";clearInterval(auctionTimers[id]);loadAuctions();return;}
    const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    el.textContent=h>0?`${h}h ${m}m ${s}s`:`${m}m ${s}s`;
    el.className=diff<300000?"countdown urgent":"countdown";
  }
  update();auctionTimers[id]=setInterval(update,1000);
}

async function placeBid(auctionId,currentBid){
  if(!userAddress){showToast("Connect your wallet first","error");return;}
  const inp=document.getElementById(`bidInput_${auctionId}`);
  const bid=parseInt(inp?.value||"0",10);
  if(!bid||bid<=currentBid){showToast(`Bid must be higher than ${currentBid} Quacks`,"error");return;}
  await fetchQuacksBalance();
  if(userQuacksBalance<bid){showToast(`Not enough Quacks! You have ${userQuacksBalance} 🦆`,"error");return;}
  const displayName=userDisplayName||shortenAddr(userAddress);
  try{
    showToast("Placing bid…","info",2000);
    const r=await fetch(`${PURCHASE_API}?action=placeBid&auctionId=${auctionId}&wallet=${userAddress.toLowerCase()}&bid=${bid}&displayName=${encodeURIComponent(displayName)}`);
    const d=await r.json();
    if(!d.success){showToast(d.error||"Bid failed","error");return;}
    showToast(`🔥 Bid of ${bid} Quacks placed! You're leading!`,"success");
    loadAuctions();
  }catch(err){showToast("Failed to place bid","error");console.error(err);}
}

function shortenAddr(addr){if(!addr||addr.length<10)return addr;return addr.slice(0,6)+"…"+addr.slice(-4);}

/* ===== SLIDER ===== */
function nextSlide(id, isRaw){
  const prefix = isRaw ? "" : "slider_";
  const sl=document.querySelectorAll(`#${prefix}${id} .slide`),dt=document.querySelectorAll(`#${prefix}${id} .slide-dot`);
  if(!sl.length)return;let cur=Array.from(sl).findIndex(s=>s.classList.contains("active"));
  sl[cur].classList.remove("active");if(dt[cur])dt[cur].classList.remove("active");
  const next=(cur+1)%sl.length;sl[next].classList.add("active");if(dt[next])dt[next].classList.add("active");
}
function prevSlide(id, isRaw){
  const prefix = isRaw ? "" : "slider_";
  const sl=document.querySelectorAll(`#${prefix}${id} .slide`),dt=document.querySelectorAll(`#${prefix}${id} .slide-dot`);
  if(!sl.length)return;let cur=Array.from(sl).findIndex(s=>s.classList.contains("active"));
  sl[cur].classList.remove("active");if(dt[cur])dt[cur].classList.remove("active");
  const prev=(cur-1+sl.length)%sl.length;sl[prev].classList.add("active");if(dt[prev])dt[prev].classList.add("active");
}
function goToSlide(id,idx,isRaw){
  const prefix = isRaw ? "" : "slider_";
  document.querySelectorAll(`#${prefix}${id} .slide`).forEach((s,i)=>s.classList.toggle("active",i===idx));
  document.querySelectorAll(`#${prefix}${id} .slide-dot`).forEach((d,i)=>d.classList.toggle("active",i===idx));
}
/* ===== MODALS ===== */
function openSizeGuide(url){const m=document.getElementById("sizeGuideModal");document.getElementById("sizeGuideImage").src=url;m.classList.add("open");addBlur();}
function closeSizeGuide(){const m=document.getElementById("sizeGuideModal");m.classList.remove("open");removeBlur();}
function openItemModal(html){const m=document.getElementById("itemModal");document.getElementById("itemModalContent").innerHTML=html;m.classList.add("open");addBlur();}
function closeItemModal(){const m=document.getElementById("itemModal");m.classList.remove("open");removeBlur();}
function openStoreTeeSizeGuide(){
  openItemModal(`<div style="width:min(720px,100%);padding:4px 2px 10px"><h3 style="font-family:Space Grotesk,sans-serif;font-size:26px;margin:0 0 6px;text-align:center">Tee Size Guide</h3><p style="color:#9aa3b5;text-align:center;margin:0 0 20px;font-size:13px">Current vendor measurements • inches</p><h4 style="font-family:Space Grotesk,sans-serif;margin:0 0 8px">Regular T-Shirt</h4><div style="overflow-x:auto"><table class="size-table" style="min-width:420px"><thead><tr><th>Size</th><th>Chest</th><th>Length</th></tr></thead><tbody><tr><td>S</td><td>19</td><td>26</td></tr><tr><td>M</td><td>20</td><td>27</td></tr><tr><td>L</td><td>21</td><td>28</td></tr><tr><td>XL</td><td>22</td><td>29</td></tr><tr><td>XXL</td><td>23</td><td>30</td></tr></tbody></table></div><h4 style="font-family:Space Grotesk,sans-serif;margin:22px 0 8px">Drop Shoulder</h4><div style="overflow-x:auto"><table class="size-table" style="min-width:420px"><thead><tr><th>Size</th><th>Chest</th><th>Length</th></tr></thead><tbody><tr><td>S</td><td>21</td><td>27</td></tr><tr><td>M</td><td>22</td><td>28</td></tr><tr><td>L</td><td>23</td><td>29</td></tr><tr><td>XL</td><td>24</td><td>30</td></tr></tbody></table></div><p class="size-table-note" style="text-align:center!important;margin-top:14px!important">Please compare these measurements with a tee you already own for the best fit.</p></div>`);
}

/* ===== CART ===== */
async function addToCart(productId){
  const allP=Object.values(PRODUCTS).flat();const product=allP.find(p=>(p.ID&&p.ID===productId)||(p.id&&p.id===productId));
  if(!product){showToast("Product not found","error");return;}
  const vs=document.getElementById(`variant_${productId}`),cs=document.getElementById(`color_${productId}`),ss=document.getElementById(`size_${productId}`),ce=document.getElementById(`custom_${productId}`),pe=document.getElementById(`price_${productId}`);
  const customInput=ce?ce.value.trim():"";
  if((product.CustomInput||product.custominput)&&!customInput){showToast(`Please fill in: ${product.CustomInput||"custom field"}`,"error");if(ce)ce.focus();return;}
  let priceUSD=product.priceUSD||0;if(pe){const m=pe.innerText.match(/\$([\d.]+)/);if(m)priceUSD=parseFloat(m[1]);}
  const rate=await getEthRate();
  cart.push({id:product.id,title:product.title,variant:vs?.value||"",color:cs?.value||"",size:ss?.value||"",q:1,priceUSD,price:priceUSD/rate,redeem:false,cost:0,customInput,thumb:product.images?.[0]||product.image||"placeholder.png"});
  updateCartUI();showToast(`🛒 "${product.title}" added`,"success");
}

async function updateCartUI(){
  const countEl=document.getElementById("cartCount"),listEl=document.getElementById("cartList");
  const sub=document.getElementById("subtotalDisplay"),sh=document.getElementById("shippingDisplay"),tot=document.getElementById("totalDisplay");
  if(!listEl)return;
  const total=cart.reduce((s,i)=>s+i.q,0);
  if(countEl){countEl.style.display=total>0?"inline-flex":"none";countEl.innerText=total;}
  if(!cart.length){listEl.innerHTML="<p style='color:var(--muted);padding:20px 0'>Your cart is empty.</p>";if(sub)sub.innerText="$0.00";if(sh)sh.innerText="$0.00";if(tot)tot.innerText="$0.00";return;}
  listEl.innerHTML="";
  cart.forEach((ci,idx)=>{
    const row=document.createElement("div");row.className="cart-item";
    let thumb=ci.thumb||"";if(thumb&&thumb.includes("https%3A"))thumb=decodeURIComponent(thumb);if(!thumb.startsWith("http"))thumb="https://quackerfriends.github.io/quackheads-assets/images/"+thumb;
    const details=[];if(ci.variant&&ci.variant!=="N/A")details.push(ci.variant);if(ci.color&&ci.color!=="N/A")details.push(ci.color);if(ci.size&&ci.size!=="N/A")details.push(ci.size);if(ci.customInput)details.push(ci.customInput);
    row.innerHTML=`<img src="${thumb}" alt="${ci.title}" loading="lazy"/><div style="flex:1"><div class="cart-item-title">${ci.title}</div><div class="cart-item-details">${details.join(" · ")||"No options"}</div><button class="btn-remove" onclick="removeFromCart(${idx})">Remove</button></div><input class="qty-input" type="number" min="1" value="${ci.q}" onchange="changeQty(${idx},this.value)"/>`;
    listEl.appendChild(row);
  });
  const subtotalUSD=cart.reduce((s,i)=>s+(i.priceUSD*i.q),0);const country=document.getElementById("shippingCountry")?.value||"USA";const shippingUSD=subtotalUSD>=70?0:country==="USA"?5:10;
  if(sub)sub.innerText=`$${subtotalUSD.toFixed(2)}`;if(sh)sh.innerText=`$${shippingUSD.toFixed(2)}`;if(tot)tot.innerText=`$${(subtotalUSD+shippingUSD).toFixed(2)}`;
}

function changeQty(i,v){cart[i].q=Math.max(1,Number(v)||1);updateCartUI();}
function removeFromCart(i){cart.splice(i,1);updateCartUI();}
function openCart(){const m=document.getElementById("cartModal");if(m){m.classList.add("open");m.setAttribute("aria-hidden","false");initCheckoutUI();}}
function closeCart(){const m=document.getElementById("cartModal");if(m){m.classList.remove("open");m.setAttribute("aria-hidden","true");}}
document.getElementById("openCartBtn").addEventListener("click",openCart);

/* ===== PROFILE ===== */
async function getQuackerBalanceOnBase(wallet){
  if(!wallet) return 0;
  // IMPORTANT: ownership is always read from Base, independent of the network
  // currently selected in Coinbase/MetaMask/WalletConnect.
  const baseWeb3 = new Web3(new Web3.providers.HttpProvider(BASE_RPC_URL));
  const contract = new baseWeb3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
  const balance = await contract.methods.balanceOf(wallet).call();
  return Number(balance) || 0;
}

async function loadProfile(wallet){
  if(!wallet) return null;
  try{
    const onchainBalance = await getQuackerBalanceOnBase(wallet);
    return { wallet, quackerBalance: onchainBalance };
  }catch(err){
    console.warn("Base Quacker ownership read failed; falling back to profile API:", err);
    // Keep the existing backend as a fallback only. Rewards/Quacks continue to
    // use the backend exactly as before.
    try{
      const res = await fetch(`${CLAIM_SHEET_API}?wallet=${wallet.toLowerCase()}`);
      const data = await res.json();
      return { wallet, quackerBalance: Number(data.nft_count) || 0 };
    }catch(apiErr){
      console.warn("Profile API fallback failed:", apiErr);
      return { wallet, quackerBalance: 0 };
    }
  }
}
async function updatePointsDisplay(){
  const wallet=(userAddress||"").toLowerCase(),el=document.getElementById("pointsValue");if(!el||!wallet)return;
  try{const r=await(await fetch(`${PURCHASE_API}?wallet=${wallet}&checkPoints=true`)).json();el.textContent=r.success?r.points:"—";}catch{el.textContent="—";}
}

/* ===== CHECKOUT ===== */
document.getElementById("checkoutBtn")?.addEventListener("click",checkout);
async function checkout(){
  const shippingAddress=document.getElementById("userAddressInput")?.value||"";const referrer=document.getElementById("referrerInput")?.value?.trim()||"";
  if(!shippingAddress.trim()){showToast("Please enter your shipping address!","error");return;}
  if(!userAddress||!provider){showToast("Connect wallet first","error");return;}
  if(!cart.length){showToast("Cart is empty","info");return;}
  let country=(window.selectedCountry||document.getElementById("shippingCountry")?.value||"USA").toLowerCase();
  const subtotalUSD=cart.reduce((s,i)=>s+(i.priceUSD*(i.q||1)),0);
  const isRedeemOnly=cart.every(ci=>ci.redeem),isQuacksOnly=cart.every(ci=>ci.useQuacks),hasPaidItems=cart.some(ci=>!ci.redeem&&!ci.useQuacks);
  let shippingUSD=subtotalUSD>=70?0:country==="canada"?10:5;
  if((isRedeemOnly||isQuacksOnly)&&shippingUSD===0)shippingUSD=country==="canada"?10:5;
  const rate=await getEthRate(),grandTotalUSD=subtotalUSD+shippingUSD;
  const selectedToken=document.getElementById("paymentSelector")?.value||"ETH";const chainId=await provider.request({method:"eth_chainId"});let txHash="";
  try{
    if(hasPaidItems){
      if(selectedToken==="ETH"){const hex="0x"+BigInt(Math.floor((grandTotalUSD/rate)*1e18)).toString(16);showToast(`Confirm ${selectedToken} payment`,"info",8000);txHash=await provider.request({method:"eth_sendTransaction",params:[{from:userAddress,to:SHOP_WALLET,value:hex}]});}
      else{const tokenAddress=TOKEN_MAP[chainId]?.[selectedToken];if(!tokenAddress){showToast("Token not supported","error");return;}const w3=new Web3(provider),tc=new w3.eth.Contract(ERC20_ABI,tokenAddress);const dec=await tc.methods.decimals().call();const amount=BigInt(Math.floor(grandTotalUSD*(10**dec)));showToast(`Confirm ${selectedToken} payment`,"info",8000);const receipt=await tc.methods.transfer(SHOP_WALLET,amount.toString()).send({from:userAddress});txHash=receipt.transactionHash;}
      showToast("✅ Transaction sent!","success",4000);await new Promise(r=>setTimeout(r,1200));
    }else if((isRedeemOnly||isQuacksOnly)&&shippingUSD>0){
      const hex="0x"+BigInt(Math.floor((shippingUSD/rate)*1e18)).toString(16);showToast(`Confirm $${shippingUSD} shipping`,"info",8000);txHash=await provider.request({method:"eth_sendTransaction",params:[{from:userAddress,to:SHOP_WALLET,value:hex}]});showToast("✅ Shipping paid!","success",4000);await new Promise(r=>setTimeout(r,1200));
    }else{showToast("🎁 Free shipping!","info");}
  }catch{showToast("Transaction cancelled","error");return;}
  for(const ci of cart){
    let payload={wallet:userAddress,variant:ci.variant||"",color:ci.color||"",size:ci.size||"",quantity:ci.q||1,address:shippingAddress,txHash:ci.useQuacks?"":txHash,referrer,customInput:ci.customInput||""};
    if(ci.redeem){payload.redeem=ci.title;payload.cost=ci.cost;}
    else if(ci.useQuacks){payload.itemName=ci.title;payload.quacksCost=ci.quacksCost;try{const sd=await(await fetch(`${CLAIM_SHEET_API}?wallet=${userAddress}&spend=${ci.quacksCost}`)).json();if(sd.error){showToast("Quacks deduction failed","error");return;}showToast(`💸 ${ci.quacksCost} Quacks used`,"success",4000);}catch{showToast("Quacks deduction failed","error");return;}}
    else{payload.itemName=ci.title;payload.price=Number(ci.price||0);}
    try{await fetch(`${PURCHASE_API}?${new URLSearchParams({...payload,action:ci.useQuacks?"payWithQuacks":""})}`);}catch{}
  }
  showToast(isRedeemOnly?"✅ Redemption logged!":"✅ Purchase logged!","success",4000);
  cart=[];updateCartUI();
}

async function addToCartWithQuacks(productId,quacksCost){
  if(!userAddress){showToast("Connect wallet first","error");return;}
  const product=Object.values(PRODUCTS).flat().find(p=>(p.ID||p.id||"").toLowerCase()===productId.toLowerCase());
  if(!product){showToast("Product not found","error");return;}
  const ce=document.getElementById(`custom_${productId}`);const customInput=ce?ce.value.trim():"";
  if((product.CustomInput||product.customInput)&&!customInput){showToast(`Please fill in: ${product.CustomInput}`,"error");ce?.focus();return;}
  await fetchQuacksBalance();
  if(userQuacksBalance<quacksCost){showToast(`Need ${quacksCost} Quacks — you have ${userQuacksBalance}`,"error");return;}
  cart.push({id:productId,title:product.Title||product.title,price:0,priceUSD:0,q:1,redeem:false,useQuacks:true,quacksCost,variant:document.getElementById(`variant_${productId}`)?.value||"",color:document.getElementById(`color_${productId}`)?.value||"",size:document.getElementById(`size_${productId}`)?.value||"",thumb:product.images?.[0]||product.image||"placeholder.png",customInput});
  updateCartUI();showToast(`🪙 Added using ${quacksCost} Quacks`,"success");openCart();
}

async function redeemWithPoints(productId,cost){
  if(!userAddress){showToast("Connect wallet first","error");return;}
  const product=Object.values(PRODUCTS).flat().find(p=>(p.ID||p.id||"").toLowerCase()===productId.toLowerCase());
  if(!product){showToast("Product not found","error");return;}
  const ce=document.getElementById(`custom_${productId}`);const customInput=ce?ce.value.trim():"";
  if((product.CustomInput||product.customInput)&&!customInput){showToast(`Please fill in: ${product.CustomInput}`,"error");ce?.focus();return;}
  const check=await(await fetch(`${PURCHASE_API}?wallet=${userAddress.toLowerCase()}&checkPoints=true`)).json();
  if((check.points||0)<cost){showToast(`Need ${cost} Referral Points`,"error");return;}
  if(cart.find(i=>(i.id||i.ID).toLowerCase()===productId.toLowerCase()&&i.redeem)){showToast("Already in cart","info");return;}
  cart.push({id:productId,title:product.Title||product.title,price:0,priceUSD:0,q:1,redeem:true,cost,variant:document.getElementById(`variant_${productId}`)?.value||"",color:document.getElementById(`color_${productId}`)?.value||"",size:document.getElementById(`size_${productId}`)?.value||"",thumb:product.images?.[0]||product.image||"placeholder.png",customInput});
  updateCartUI();showToast(`🎉 Added for ${cost} Points`,"success");openCart();
}

/* ===== REVIEWS ===== */
async function uploadImageToDrive(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "Quacker Reviews");
        formData.append("cloud_name", "dzi1poauh");

        const r = await fetch("https://api.cloudinary.com/v1_1/dzi1poauh/image/upload", {
          method: "POST",
          body: formData
        });
        const d = await r.json();
        if (d.secure_url) resolve(d.secure_url);
        else reject(d.error?.message || "Upload failed");
      } catch(err) { reject(err.message); }
    };
    reader.onerror = () => reject("File read failed");
    reader.readAsDataURL(file);
  });
}

async function loadReviews(productId,container){
  try{
    const r=await fetch(`${PURCHASE_API}?action=getReviews&itemId=${productId}`);
    const d=await r.json();if(!d.success)return;
    const reviews=d.reviews||[];
    const listEl=container.querySelector(".reviews-list");
    const avgEl=container.querySelector(".reviews-avg");
    const toggleEl=container.querySelector(".reviews-toggle");
    if(!reviews.length){
      listEl.innerHTML=`<div class="reviews-empty">No reviews yet. Be the first!</div>`;
      if(avgEl)avgEl.innerHTML=`<strong>—</strong> No ratings yet`;
      if(toggleEl)toggleEl.textContent="Show Reviews";
      return;
    }
    const avg=(reviews.reduce((s,rv)=>s+rv.rating,0)/reviews.length).toFixed(1);
    const stars="★".repeat(Math.round(avg))+"☆".repeat(5-Math.round(avg));
    if(avgEl)avgEl.innerHTML=`<strong>${avg}</strong> ${stars} <span>(${reviews.length})</span>`;
    if(toggleEl)toggleEl.textContent=`Reviews (${reviews.length})`;
    listEl.innerHTML=reviews.map(rv=>{
      const filled="★".repeat(rv.rating);const empty="☆".repeat(5-rv.rating);
      const date=rv.timestamp?new Date(rv.timestamp).toLocaleDateString():"";
      const imgs=(rv.images||[]).map(url=>`<img src="${url}" alt="Review image" loading="lazy" onclick="openItemModal('<img src=\\'${url}\\'/>')">`).join("");
      return `<div class="review-card"><div class="review-top"><span class="review-name">${rv.displayName}</span><span class="review-date">${date}</span></div><div class="review-stars">${filled}${empty}</div><div class="review-comment">${rv.comment}</div>${imgs?`<div class="review-images">${imgs}</div>`:""}</div>`;
    }).join("");
  }catch(err){console.error("Reviews load error:",err);}
}

async function submitReview(productId,container){
  const form=container.querySelector(".review-form");
  const rating=parseInt(form.dataset.rating||"0");
  const comment=container.querySelector(".review-textarea").value.trim();
  const displayName=container.querySelector(".review-name-input").value.trim()||"Anonymous";
  const fileInput=container.querySelector(".review-image-input");
  const files=Array.from(fileInput?.files||[]).slice(0,3);
  if(!rating){showToast("Please pick a star rating","error");return;}
  if(!comment){showToast("Please write a comment","error");return;}
  const btn=container.querySelector(".review-submit-btn");
  btn.textContent="Uploading…";btn.disabled=true;
  try{
    const imageUrls=[];
    for(const file of files){
      showToast(`Uploading image ${imageUrls.length+1} of ${files.length}…`,"info",2000);
      const url=await uploadImageToDrive(file);imageUrls.push(url);
    }
    btn.textContent="Submitting…";
    const params=new URLSearchParams({action:"submitReview",itemId:productId,rating,comment,displayName,wallet:userAddress||"",images:imageUrls.join(",")});
    const r=await fetch(`${PURCHASE_API}?${params}`);
    const d=await r.json();
    if(!d.success){showToast(d.error||"Failed to submit","error");btn.textContent="Post Review 🦆";btn.disabled=false;return;}
    showToast("✅ Review submitted!","success");
    container.querySelector(".review-textarea").value="";
    container.querySelector(".review-name-input").value="";
    form.dataset.rating="0";
    container.querySelectorAll(".star-picker span").forEach(s=>s.classList.remove("active"));
    container.querySelector(".review-image-previews").innerHTML="";
    if(fileInput)fileInput.value="";
    await loadReviews(productId,container);
  }catch(err){showToast("Failed to submit: "+err,"error");btn.textContent="Post Review 🦆";btn.disabled=false;}
}

function buildReviewSection(productId){
  const section=document.createElement("div");
  section.className="reviews-section";
  section.innerHTML=`
    <div class="reviews-header">
      <div class="reviews-avg"><strong>—</strong> No ratings yet</div>
      <button class="reviews-toggle" onclick="const body=this.closest('.reviews-section').querySelector('.reviews-body');body.classList.toggle('hidden');this.textContent=body.classList.contains('hidden')?(this.dataset.count||'Show Reviews'):'Hide Reviews';">Show Reviews</button>
    </div>
    <div class="reviews-body hidden">
      <div class="reviews-list"></div>
      <div class="review-form" data-rating="0">
        <div class="review-form-title">Leave a Review</div>
        <input class="review-name-input" type="text" placeholder="Your name (optional)" maxlength="24"/>
        <div class="star-picker">
          ${[1,2,3,4,5].map(n=>`<span data-star="${n}" onclick="this.closest('.review-form').dataset.rating='${n}';this.closest('.star-picker').querySelectorAll('span').forEach((s,i)=>s.classList.toggle('active',i<${n}));">☆</span>`).join("")}
        </div>
        <textarea class="review-textarea" placeholder="Share your thoughts about this item..." maxlength="300"></textarea>
        <div class="review-image-upload">
          <span class="review-image-label">📷 Photos (up to 3)</span>
          <label class="review-image-btn"><i class="fa-solid fa-image"></i> Choose Images<input class="review-image-input" type="file" accept="image/*" multiple/></label>
          <div class="review-image-previews"></div>
        </div>
        <button class="review-submit-btn" onclick="submitReview('${productId}',this.closest('.reviews-section'))">Post Review 🦆</button>
      </div>
    </div>`;

  if(userAddress&&userDisplayName){
    section.querySelector(".review-name-input").value=userDisplayName;
  }

  const fileInput=section.querySelector(".review-image-input");
  const previewEl=section.querySelector(".review-image-previews");
  fileInput.addEventListener("change",()=>{
    const files=Array.from(fileInput.files).slice(0,3);
    previewEl.innerHTML="";
    files.forEach(file=>{
      const url=URL.createObjectURL(file);
      const wrap=document.createElement("div");wrap.className="preview-wrap";
      wrap.innerHTML=`<img src="${url}" alt="Preview"/><button class="preview-remove" onclick="this.closest('.preview-wrap').remove()">✕</button>`;
      previewEl.appendChild(wrap);
    });
    if(files.length===3)showToast("Max 3 images allowed","info");
  });

  loadReviews(productId,section);
  return section;
}

/* ===== COMMUNITY REVIEWS + MESSAGE BAKA ===== */
function allProducts(){return Object.values(PRODUCTS||{}).flat().filter(Boolean);}
function populateCommunityProducts(){
  const sel=document.getElementById("communityReviewProduct");if(!sel)return;
  const seen=new Set();
  sel.innerHTML='<option value="">Choose the item you bought</option>'+allProducts().filter(p=>{const id=p.id||p.ID;if(!id||seen.has(id))return false;seen.add(id);return true;}).map(p=>`<option value="${p.id||p.ID}">${p.title||p.Title||p.id||p.ID}</option>`).join("");
}
async function loadAllReviews(){
  const out=document.getElementById("allReviewsList");if(!out)return;
  const products=allProducts(); if(!products.length){out.innerHTML='<div class="community-empty">No products loaded yet.</div>';return;}
  const rows=[];
  await Promise.all(products.map(async p=>{try{const id=p.id||p.ID;const d=await(await fetch(`${PURCHASE_API}?action=getReviews&itemId=${encodeURIComponent(id)}`)).json();(d.reviews||[]).forEach(rv=>rows.push({...rv,_product:p.title||p.Title||id}));}catch(e){}}));
  rows.sort((a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0));
  if(!rows.length){out.innerHTML='<div class="community-empty">Nothing here yet hehe — wanna be the first? 🦆</div>';return;}
  out.innerHTML=rows.map(rv=>{const rating=Number(rv.rating)||0;const date=rv.timestamp?new Date(rv.timestamp).toLocaleDateString():"";const imgs=(rv.images||[]).map(url=>`<img src="${url}" alt="Review image" loading="lazy" onclick="openItemModal('<img src=\\'${url}\\'/>')">`).join("");return `<div class="all-review-card"><div class="all-review-product">${rv._product}</div><div class="review-top"><span class="review-name">${rv.displayName||"Anonymous"}</span><span class="review-date">${date}</span></div><div class="review-stars">${"★".repeat(rating)}${"☆".repeat(5-rating)}</div><div class="review-comment">${rv.comment||""}</div>${imgs?`<div class="review-images">${imgs}</div>`:""}</div>`;}).join("");
}
function setCommunityRating(n){const box=document.getElementById("communityStars");box.dataset.rating=String(n);box.querySelectorAll("span").forEach((s,i)=>s.classList.toggle("active",i<n));}
async function submitCommunityReview(){
  const productId=document.getElementById("communityReviewProduct")?.value||"";const rating=parseInt(document.getElementById("communityStars")?.dataset.rating||"0");const comment=document.getElementById("communityReviewText")?.value.trim()||"";const displayName=document.getElementById("communityReviewName")?.value.trim()||"Anonymous";const input=document.getElementById("communityReviewImages");const files=Array.from(input?.files||[]).slice(0,3);const btn=document.getElementById("communityReviewSubmit");
  if(!productId){showToast("Choose the item you're reviewing","error");return;}if(!rating){showToast("Please pick a star rating","error");return;}if(!comment){showToast("Please write a comment","error");return;}
  btn.disabled=true;btn.textContent="Uploading…";
  try{const urls=[];for(const f of files)urls.push(await uploadImageToDrive(f));btn.textContent="Submitting…";const params=new URLSearchParams({action:"submitReview",itemId:productId,rating,comment,displayName,wallet:userAddress||"",images:urls.join(",")});const d=await(await fetch(`${PURCHASE_API}?${params}`)).json();if(!d.success)throw new Error(d.error||"Failed to submit");showToast("✅ Review submitted!","success");document.getElementById("communityReviewText").value="";document.getElementById("communityStars").dataset.rating="0";document.querySelectorAll("#communityStars span").forEach(s=>s.classList.remove("active"));if(input)input.value="";document.getElementById("communityReviewPreviews").innerHTML="";await loadAllReviews();}catch(e){showToast("Failed to submit: "+e.message,"error");}finally{btn.disabled=false;btn.textContent="Post Review 🦆";}
}
async function submitBakaMessage(){
  const name=document.getElementById("bakaMessageName")?.value.trim()||"Anonymous";const message=document.getElementById("bakaMessageText")?.value.trim()||"";if(!message){showToast("Write Baka a little message first 🦆","error");return;}
  try{const params=new URLSearchParams({action:"submitMessage",name,message,wallet:userAddress||""});const d=await(await fetch(`${PURCHASE_API}?${params}`)).json();if(!d.success)throw new Error(d.error||"Message endpoint not enabled yet");showToast("💌 Message sent to Baka!","success");document.getElementById("bakaMessageText").value="";}catch(e){showToast("Message box needs the shop Apps Script endpoint enabled first.","info",5000);}
}
function initCommunityUploads(){const input=document.getElementById("communityReviewImages"),out=document.getElementById("communityReviewPreviews");if(!input||!out)return;input.addEventListener("change",()=>{const files=Array.from(input.files).slice(0,3);out.innerHTML="";files.forEach(f=>{const u=URL.createObjectURL(f);const w=document.createElement("div");w.className="preview-wrap";w.innerHTML=`<img src="${u}" alt="Preview"/>`;out.appendChild(w);});});}

/* ===== LEADERBOARD ===== */
async function loadLeaderboard(){
  try{
    const data=await(await fetch(`${CLAIM_SHEET_API}?leaderboard=true`)).json();
    const c=document.getElementById("leaderboard");if(!c)return;c.innerHTML="";
    data.forEach((user,i)=>{
      const row=document.createElement("div");row.className="leaderboard-row";
      const name=user.display_name||shortenAddr(user.address);
      row.innerHTML=`<span class="lb-rank">#${i+1}</span><span class="lb-addr">${name}</span><span class="lb-score">${user.quacks} 🦆</span>`;
      c.appendChild(row);
    });
  }catch(err){console.error("Leaderboard error:",err);}
}

/* ===== ORDER HISTORY ===== */
async function loadOrderHistory(){
  const wallet=(userAddress||"").toLowerCase(),orderList=document.getElementById("orderList"),btn=document.getElementById("loadOrdersBtn");
  if(!wallet){showToast("Connect wallet first","error");orderList.innerHTML="<p>Connect wallet to view orders.</p>";return;}
  if(orderList.dataset.visible==="true"){orderList.style.maxHeight="0";orderList.style.opacity="0";orderList.dataset.visible="false";btn.textContent="View My Orders";return;}
  btn.textContent="Loading…";orderList.innerHTML="<p>Loading…</p>";
  try{
    const data=await(await fetch(`${PURCHASE_API}?action=getOrders&wallet=${wallet}`)).json();
    if(!data.success){orderList.innerHTML=`<p style="color:#ff6b6b">Error: ${data.error||"Unknown"}</p>`;btn.textContent="View My Orders";return;}
    const orders=data.orders||[];
    if(!orders.length){orderList.innerHTML="<p>No orders found.</p>";orderList.dataset.visible="true";orderList.style.maxHeight="400px";orderList.style.opacity="1";btn.textContent="Hide Orders";return;}
    const grouped={};orders.forEach(o=>{if(!grouped[o.Timestamp])grouped[o.Timestamp]=[];grouped[o.Timestamp].push(o);});
    const groupedOrders=Object.entries(grouped).reverse().map(([ts,items])=>({ts,items,points:items.reduce((s,x)=>s+(Number(x.PointsCost)||0),0),quacks:items.reduce((s,x)=>s+(Number(x.QuacksCost)||0),0),progress:items[0].Progress||"Not Shipped",type:items[0].Price==="WON (Auction)"||items[0]["Item Name"]?.includes("WON")?"auction":items[0].PointsCost>0?"points":items[0].QuacksCost>0?"quacks":"eth"}));
    orderList.innerHTML=groupedOrders.map(o=>{
      const typeIcon=o.type==="auction"?"🏆":o.type==="points"?"⭐":o.type==="quacks"?"🦆":"💎";
      const spent=o.type==="auction"?"Auction Win":o.points>0?`${o.points} pts`:o.quacks>0?`${o.quacks} 🦆`:"ETH";
      return `<div style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:6px"><span>${new Date(o.ts).toLocaleDateString()}</span><span style="color:var(--green)">${o.progress}</span></div><div style="display:flex;justify-content:space-between;align-items:center"><span style="font-weight:600;font-size:14px">${typeIcon} ${o.items.length} item${o.items.length>1?"s":""}</span><span style="color:var(--orange-light);font-weight:700">${spent}</span></div><button onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'" style="margin-top:8px;background:transparent;border:1px solid var(--border);color:var(--muted);padding:4px 10px;border-radius:6px;font-size:12px;cursor:pointer">Details</button><div style="display:none;margin-top:8px">${o.items.map(it=>`<div style="font-size:12px;color:var(--muted);padding:4px 0;border-top:1px solid var(--border)">${it["Item Name"]||it.Item||"Unknown"} — ${it.Progress}</div>`).join("")}</div></div>`;
    }).join("");
    orderList.dataset.visible="true";orderList.style.maxHeight="500px";orderList.style.opacity="1";btn.textContent="Hide Orders";
  }catch{orderList.innerHTML=`<p style="color:#ff6b6b">Error loading orders.</p>`;btn.textContent="View My Orders";}
}

/* ===== SHIPPING NOTICE ROTATOR ===== */
const msgs=["🚚 Free Shipping on orders above $70!","💳 Pay with ETH, USDC, or USDT","🦆 Earn Quacks daily just by holding — spend on items or bid in auctions!","⚠️ Shipping available in US and Canada only"];
let msgIdx=0;const noticeEl=document.getElementById("shippingNotice");
if(noticeEl){noticeEl.style.transition="opacity .5s";setInterval(()=>{noticeEl.style.opacity="0";setTimeout(()=>{noticeEl.textContent=msgs[msgIdx=(msgIdx+1)%msgs.length];noticeEl.style.opacity="1";},500);},5000);}

/* ===== TOP QUACKERS: SEASON 01 — SHEET POWERED ===== */
let quackageProfile=null;
function setRewardVisibility(profile){
  const rewards=profile?.rewards||{};
  document.querySelectorAll('.reward-card').forEach(card=>{const key=card.dataset.reward;card.style.display=rewards[key]?'':'none';});
  const shipping=document.querySelector('.shipping-box');
  if(shipping)shipping.style.display=(rewards.merch||rewards.mysteryplushie)?'':'none';
}
async function fetchQuackageStatus(){
  if(!userAddress)return null;
  const r=await fetch(`${QUACKAGE_API}?action=status&wallet=${encodeURIComponent(userAddress.toLowerCase())}`);
  if(!r.ok)throw new Error(`Quackage API returned ${r.status}`);
  const d=await r.json(); if(!d.success)throw new Error(d.error||'Could not check Quackage'); return d;
}
function quackageOpenedKey(){return userAddress?`quackage-opened-s01-${userAddress.toLowerCase()}`:'quackage-opened-s01';}
function updateQuackageReturnUI(){
  const opened=!!userAddress&&localStorage.getItem(quackageOpenedKey())==='1';
  const check=document.getElementById('quackageCheckBtn'),view=document.getElementById('quackageViewBtn');
  if(check)check.textContent=opened?'🎁 Open Quackage Again':'🎁 Check for Quackage';
  if(view)view.style.display=opened?'inline-flex':'none';
}
function openQuackageLocker(){
  if(!userAddress){checkQuackage();return;}
  if(quackageProfile?.eligible){document.getElementById('quackageModal')?.classList.add('open');loadQuackageState(quackageProfile);return;}
  fetchQuackageStatus().then(d=>{if(!d?.eligible){checkQuackage();return;}quackageProfile=d;setRewardVisibility(d);document.getElementById('quackageModal')?.classList.add('open');loadQuackageState(d);}).catch(()=>checkQuackage());
}
async function checkQuackage(){
  const status=document.getElementById('quackageStatus');
  if(!userAddress){status.innerHTML='🔒 Connect your wallet first so we can check your Season 01 invite.';status.style.color='#ffb46f';showToast('Connect your wallet first 🦆','info');return;}
  status.innerHTML='🦆 Checking the Season 01 list...';
  try{
    const d=await fetchQuackageStatus();
    if(!d.eligible){status.innerHTML=d.message||"You're not a Top 10 holder yet — go mint more ducks :) 🦆";status.style.color='#8fe0dd';return;}
    quackageProfile=d;setRewardVisibility(d);
    status.innerHTML=`🎉 QUACK! ${d.name||'Top Quacker'}, you're #${d.rank} in Season 01.`;status.style.color='var(--green)';
    const reveal=document.getElementById('quackageReveal'),congrats=document.getElementById('revealCongrats');
    if(congrats){congrats.classList.remove('show');congrats.querySelector('strong').textContent=`QUACK! #${d.rank} TOP QUACKER 🎉`;congrats.querySelector('span').textContent=`${d.name||'Top Quacker'}, your Season 01 Quackage is unlocked.`;}
    reveal.classList.add('open');reveal.setAttribute('aria-hidden','false');
    setTimeout(()=>congrats?.classList.add('show'),1250);
  }catch(err){status.innerHTML='Could not check your Quackage right now. Try again in a moment.';status.style.color='#ff8d8d';showToast(err.message||'Quackage check failed','error',5000);}
}
function continueFromQuackageReveal(){
  if(!quackageProfile?.eligible)return;
  const reveal=document.getElementById('quackageReveal');
  reveal?.classList.remove('open');
  reveal?.setAttribute('aria-hidden','true');
  document.getElementById('quackageModal')?.classList.add('open');
  loadQuackageState(quackageProfile);
  localStorage.setItem(quackageOpenedKey(),'1');
  updateQuackageReturnUI();
}
function closeQuackage(){document.getElementById('quackageModal')?.classList.remove('open')}
function toggleReward(name){const card=document.querySelector(`.reward-card[data-reward="${name}"]`);if(!card||card.classList.contains('claimed'))return;document.querySelectorAll('.reward-card').forEach(c=>{if(c!==card)c.classList.remove('expanded')});card.classList.toggle('expanded')}
function shippingDetails(){return {name:document.getElementById('qName')?.value.trim()||'',country:document.getElementById('qCountry')?.value.trim()||'',region:document.getElementById('qRegion')?.value.trim()||'',postal:document.getElementById('qPostal')?.value.trim()||'',contact:document.getElementById('qContact')?.value.trim()||'',address:document.getElementById('qAddress')?.value.trim()||''};}
function detailsForReward(name){
  if(name==='custom1of1')return {token:document.getElementById('qToken').value.trim(),notes:document.getElementById('qOneNotes').value.trim()};
  if(name==='merch')return {merch:document.getElementById('qMerch').value,size:document.getElementById('qSize').value,shipping:shippingDetails()};
  if(name==='mysteryplushie')return {shipping:shippingDetails()};
  if(name==='wallpaper')return {quacker1:document.getElementById('qWallpaperOne')?.value.trim()||'',quacker2:document.getElementById('qWallpaperTwo')?.value.trim()||'',status:'REQUESTED'}; return {};
}
function validateShipping(){const x=shippingDetails();if(!x.name||!x.country||!x.region||!x.postal||!x.address){showToast('Fill in your name, country, state/province, postal code and full shipping address first 📦','error',5500);return false;}return true;}
async function claimReward(name){
  if(!userAddress){closeQuackage();checkQuackage();return;}
  if(!quackageProfile?.eligible||!quackageProfile?.rewards?.[name]){showToast('This reward is not available for this wallet.','error');return;}
  const details=detailsForReward(name);if(name==='custom1of1'&&!details.token){showToast('Add the Quacker token # first 🎨','error');return;}if(name==='wallpaper'&&(!details.quacker1||!details.quacker2)){showToast('Choose both Quacker numbers first 🖼️','error');return;}if((name==='merch'||name==='mysteryplushie')&&!validateShipping())return;
  const card=document.querySelector(`.reward-card[data-reward="${name}"]`);const btn=card?.querySelector('.reward-claim');const old=btn?.textContent;if(btn){btn.disabled=true;btn.textContent='Claiming...';}
  try{const r=await fetch(QUACKAGE_API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'claim',wallet:userAddress.toLowerCase(),reward:name,details})});const d=await r.json();if(!d.success)throw new Error(d.error||'Claim failed');quackageProfile=await fetchQuackageStatus();loadQuackageState(quackageProfile);showToast('QUACK! Reward claimed 🎁','success');}catch(err){showToast(err.message||'Could not claim reward','error',6000);if(btn){btn.disabled=false;btn.textContent=old;}}
}
function applyClaimedState(profile){const claimed=profile?.claimed||{};document.querySelectorAll('.reward-card').forEach(card=>{const name=card.dataset.reward;if(name==='wallpaper'){const requested=!!claimed.wallpaper;card.classList.remove('claimed');card.classList.toggle('wallpaper-requested-card',requested);const st=card.querySelector('.reward-state');if(st)st.textContent=requested?'🍳 REQUESTED':'OPEN →';return;}const done=!!claimed[name];card.classList.toggle('claimed',done);if(done)card.classList.remove('expanded');const state=card.querySelector('.reward-state');if(state)state.textContent=done?'✓ CLAIMED':'OPEN →';});}
function parseClaimDetails(v){try{return typeof v==='string'?JSON.parse(v||'{}'):(v||{});}catch{return {};}}
function fillShipping(x){if(!x)return;const map={qName:x.name,qCountry:x.country,qRegion:x.region,qPostal:x.postal,qContact:x.contact,qAddress:x.address};Object.entries(map).forEach(([id,val])=>{const el=document.getElementById(id);if(el&&val&&!el.value)el.value=val;});}
function loadQuackageState(profile){setRewardVisibility(profile);const claimed=profile?.claimed||{};const one=parseClaimDetails(claimed.custom1of1?.details);if(one.token)document.getElementById('qToken').value=one.token;if(one.notes)document.getElementById('qOneNotes').value=one.notes;const merch=parseClaimDetails(claimed.merch?.details);if(merch.merch)document.getElementById('qMerch').value=merch.merch;updateQuackageSizes();if(merch.size)document.getElementById('qSize').value=merch.size;fillShipping(merch.shipping);const plush=parseClaimDetails(claimed.mysteryplushie?.details);fillShipping(plush.shipping);const wp=parseClaimDetails(claimed.wallpaper?.details);const w1=document.getElementById('qWallpaperOne'),w2=document.getElementById('qWallpaperTwo'),form=document.getElementById('wallpaperRequestForm'),status=document.getElementById('wallpaperStatus');if(wp.quacker1&&w1)w1.value=wp.quacker1;if(wp.quacker2&&w2)w2.value=wp.quacker2;if(claimed.wallpaper){if(form)form.style.display='none';if(status){const sheetStatus=String(claimed.wallpaper.status||wp.status||'REQUESTED').toUpperCase();const mobileURL=claimed.wallpaper.mobileURL||'';const desktopURL=claimed.wallpaper.desktopURL||'';status.className='wallpaper-requested';if(sheetStatus==='READY'&&(mobileURL||desktopURL)){const mobileBtn=mobileURL?`<a class="reward-claim" style="display:inline-block;margin:10px 8px 0 0;text-decoration:none" href="${mobileURL}" target="_blank" rel="noopener">📱 Download Mobile</a>`:'';const desktopBtn=desktopURL?`<a class="reward-claim" style="display:inline-block;margin:10px 8px 0 0;text-decoration:none" href="${desktopURL}" target="_blank" rel="noopener">🖥️ Download Desktop</a>`:'';status.innerHTML=`🎉 <strong>Your wallpapers are ready!</strong><br>Your Quackers: #${wp.quacker1||'?'} + #${wp.quacker2||'?'}<br>${mobileBtn}${desktopBtn}<br><small style="display:block;margin-top:8px">Both downloads stay available whenever you reconnect this wallet.</small>`;}else{status.innerHTML=`🍳 <strong>Wallpaper requested!</strong><br>Your Quackers: #${wp.quacker1||'?'} + #${wp.quacker2||'?'}<br><small>Status: ${sheetStatus} · Your request stays saved here.</small>`;}}}else{if(form)form.style.display='block';if(status){status.className='quackage-note';status.textContent='';}}applyClaimedState(profile);}

function initQuackageDrafts(){
  const ids=['qToken','qOneNotes','qWallpaperOne','qWallpaperTwo','qMerch','qSize'];
  const key=()=>userAddress?`quackage-draft-s01-${userAddress.toLowerCase()}`:'quackage-draft-s01';
  let saved={};try{saved=JSON.parse(localStorage.getItem(key())||'{}')}catch{}
  ids.forEach(id=>{const el=document.getElementById(id);if(!el)return;if(saved[id]&&!el.value)el.value=saved[id];el.addEventListener('input',()=>{let d={};try{d=JSON.parse(localStorage.getItem(key())||'{}')}catch{}d[id]=el.value;localStorage.setItem(key(),JSON.stringify(d));});el.addEventListener('change',()=>el.dispatchEvent(new Event('input')));});
}
function updateQuackageSizes(){const merch=document.getElementById('qMerch'),size=document.getElementById('qSize'),guide=document.getElementById('qInlineSizeGuide');if(!merch||!size)return;const hoodie=merch.value.includes('Hoodie');const values=hoodie?['XS','S','M','L','XL','3XL']:['S','M','L','XL'];const current=size.value;size.innerHTML=values.map(v=>`<option${v===current?' selected':''}>${v}</option>`).join('');if(!values.includes(size.value))size.value=values.includes('M')?'M':values[0];if(guide&&guide.classList.contains('open'))renderQuackageSizeGuide();}
function renderQuackageSizeGuide(){const merch=document.getElementById('qMerch'),guide=document.getElementById('qInlineSizeGuide');if(!merch||!guide)return;const hoodie=merch.value.includes('Hoodie');guide.innerHTML=hoodie?`<h5>Hoodie Size Guide</h5><p>Vendor measurements in inches</p><table class="size-table"><thead><tr><th>Size</th><th>Chest</th><th>Body length</th><th>Sleeve</th></tr></thead><tbody><tr><td>XS</td><td>32–34</td><td>25</td><td>24</td></tr><tr><td>S</td><td>35–38</td><td>26</td><td>24.5</td></tr><tr><td>M</td><td>39–42</td><td>27</td><td>25</td></tr><tr><td>L</td><td>43–46</td><td>28</td><td>25.5</td></tr><tr><td>XL</td><td>47–50</td><td>29</td><td>26</td></tr><tr><td>3XL</td><td>57–60</td><td>32</td><td>27.5</td></tr></tbody></table>`:`<h5>Drop Shoulder Tee</h5><p>Current vendor guide • measurements in inches</p><table class="size-table"><thead><tr><th>Size</th><th>Chest</th><th>Length</th></tr></thead><tbody><tr><td>S</td><td>21</td><td>27</td></tr><tr><td>M</td><td>22</td><td>28</td></tr><tr><td>L</td><td>23</td><td>29</td></tr><tr><td>XL</td><td>24</td><td>30</td></tr></tbody></table>`;}
function openQuackageSizeGuide(){const guide=document.getElementById('qInlineSizeGuide');if(!guide)return;guide.classList.toggle('open');if(guide.classList.contains('open'))renderQuackageSizeGuide();const btn=guide.previousElementSibling;if(btn&&btn.classList.contains('reward-link'))btn.textContent=guide.classList.contains('open')?'📏 Hide size guide':'📏 View size guide';}
function initProductHoverSlides(){document.querySelectorAll(".item .image-slider").forEach(slider=>{if(slider.dataset.hoverReady)return;slider.dataset.hoverReady="1";let timer=null;const id=slider.id.replace("slider_","");slider.addEventListener("mouseenter",()=>{const slides=slider.querySelectorAll("img.slide");if(slides.length<2)return;timer=setInterval(()=>nextSlide(id),950)});slider.addEventListener("mouseleave",()=>{clearInterval(timer);timer=null});});}
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeQuackage();document.getElementById("quackageReveal")?.classList.remove("open")}});
document.addEventListener("DOMContentLoaded",()=>{initQuackageDrafts();updateQuackageReturnUI();});

/* ===== WEB3 ===== */
/* ===== INTRO ===== */
document.body.classList.add("loading");
document.getElementById("enterBtn").addEventListener("click",()=>{
  const intro=document.getElementById("introScreen");intro.style.opacity="0";intro.style.visibility="hidden";
  document.body.classList.remove("loading");setTimeout(()=>intro.remove(),900);
});

/* ===== SHOP MENU ===== */
document.addEventListener("DOMContentLoaded",()=>{
  const _sm=document.getElementById("shopMenu");if(_sm)document.body.appendChild(_sm);
  const menuBtn=document.getElementById("menuBtn"),shopMenu=document.getElementById("shopMenu");
  if(menuBtn&&shopMenu){
    menuBtn.addEventListener("click",(e)=>{
      e.stopPropagation();
      if(shopMenu.classList.contains("open")){shopMenu.classList.remove("open");return;}
      const r=menuBtn.getBoundingClientRect();
      shopMenu.style.setProperty("top",(r.bottom+6)+"px","important");
      shopMenu.style.setProperty("left",r.left+"px","important");
      shopMenu.classList.add("open");
    });
    document.addEventListener("click",(e)=>{if(!shopMenu.contains(e.target)&&e.target!==menuBtn)shopMenu.classList.remove("open");});
    shopMenu.addEventListener("click",(e)=>{if(e.target.classList.contains("dropdown-item"))shopMenu.classList.remove("open");});
  }

  const pb=document.getElementById("profileBtn"),ps=document.getElementById("profileSection");
  if(pb&&ps){
    pb.addEventListener("click",async(e)=>{
      e.stopPropagation();
      if(ps.style.display==="block"){ps.style.display="none";return;}
      if(ps.parentElement!==document.body)document.body.appendChild(ps);
      ps.style.position="fixed";ps.style.zIndex="110000";ps.style.display="block";
      const r=pb.getBoundingClientRect();ps.style.top=`${r.bottom+6}px`;ps.style.left=`${Math.max(4,r.right-(ps.offsetWidth||270))}px`;
      if(userAddress){
  try{
    const d = await loadProfile(userAddress);

    const nc = document.getElementById("nftCount");
    if(nc) {
      nc.innerText = "Quacker Friends Held: " + d.quackerBalance;
    }
  }catch(err){
    console.warn("Profile load error:", err);
  }

  // ===== LOAD QUACKS + STREAK =====
  try{
    const qRes = await fetch(
      `${CLAIM_SHEET_API}?wallet=${userAddress.toLowerCase()}`
    );

    const qData = await qRes.json();

    console.log("🦆 Profile Quacks data:", qData);

    const streakEl = document.getElementById("streakCount");

    if(streakEl){
      const streak = Number(qData.streak) || 0;

      streakEl.innerText =
        `🔥 Login Streak: ${streak} day${streak === 1 ? "" : "s"}`;
    }

  }catch(err){
    console.warn("Could not load Quacks streak:", err);

    const streakEl = document.getElementById("streakCount");
    if(streakEl){
      streakEl.innerText = "🔥 Login Streak: —";
    }
  }

  await fetchQuacksBalance();
  await updatePointsDisplay();

  const inp = document.getElementById("displayNameInput");
  if(inp && userDisplayName) {
    inp.value = userDisplayName;
  }
}
    });
    document.addEventListener("click",(e)=>{if(!ps.contains(e.target)&&e.target!==pb)ps.style.display="none";});
  }

  document.querySelectorAll(".info-container").forEach(c=>{
    const icon=c.querySelector(".info-icon"),tip=c.querySelector(".tooltip-text");if(!icon||!tip)return;
    icon.addEventListener("mouseenter",()=>{document.body.appendChild(tip);const r=icon.getBoundingClientRect();tip.style.cssText=`position:fixed;top:${r.bottom+8}px;left:${r.left+r.width/2}px;transform:translateX(-50%);visibility:visible;opacity:1;pointer-events:auto;z-index:200000`;});
    icon.addEventListener("mouseleave",()=>{tip.style.opacity="0";tip.style.visibility="hidden";tip.style.pointerEvents="none";c.appendChild(tip);});
  });

  loadLeaderboard();
  const toggle=document.getElementById("leaderboardToggle"),panel=document.getElementById("leaderboardPanel"),close=document.getElementById("closeLeaderboard");
  toggle?.addEventListener("click",()=>{panel.classList.add("open");toggle.style.display="none";});
  close?.addEventListener("click",()=>{panel.classList.remove("open");toggle.style.display="block";});
});

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded",async()=>{
  await loadProducts();
  await loadAuctions();
  const cs=document.getElementById("shippingCountry");if(cs){window.selectedCountry=cs.value;cs.addEventListener("change",e=>window.selectedCountry=e.target.value);}
});

window.addEventListener("load",()=>{
  setTimeout(()=>{
    initWalletConnection();
  },500);
});
