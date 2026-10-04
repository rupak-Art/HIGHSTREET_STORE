// Store configuration. For live catalogue updates, connect the Google Apps Script endpoint described in SETUP.md.
const CONFIG={whatsapp:"919390662074",instagram:"https://www.instagram.com/urs_highstreet?utm_source=ig_web_button_share_sheet&stkn=ZDNlZDc0MzIxNw==",apiUrl:"https://script.google.com/macros/s/AKfycbwFMw6o-izB7jn_DezTDRwfdaUYgcHH5fvEFcfgm_w3apoNOdBKEVQPVWudSr_i-Dgl8Q/exec"};
const FITS=["Regular Fit","Oversized Fit","Sweatshirt","Hoodie"],SIZES=["XS","S","M","L","XL","XXL"];
const starter=[
{id:"HS001",name:"HIGHSTREET ORIGINALS",art:"HIGH<br>STREET",category:"Graphic",price:699,types:["Regular Fit","Oversized Fit"],sizes:SIZES,season:"Core",active:true,image:"",badge:"FIRST DROP"},
{id:"HS002",name:"STAY WEIRD",art:"STAY<br>WEIRD",category:"Graphic",price:749,types:["Oversized Fit","Hoodie"],sizes:SIZES,season:"Seasonal",active:true,image:"",badge:"NEW"},
{id:"HS003",name:"LESS TALK",art:"LESS<br>TALK",category:"Minimal",price:649,types:["Regular Fit","Sweatshirt"],sizes:SIZES,season:"Core",active:true,image:"",badge:"ESSENTIAL"},
{id:"HS004",name:"Mee Innocent friend kosam..",art:"YOUR ART",category:"Graphic",price:399,types:["Regular Fit","Oversized Fit"],sizes:SIZES,season:"Core",active:true,image:"images/Innocent%20X%20Graphic%20Tee%20Front%20and%20Back.png",badge:"NEW"}
];
let products=load("hs_products",starter),events=load("hs_events",[{id:"EV1",title:"THE FIRST DROP",details:"Explore the opening HIGHSTREET collection.",badge:"NOW LIVE",active:true},{id:"EV2",title:"CUSTOM DESIGN WEEK",details:"Bring your idea. Let's make it wearable.",badge:"CUSTOM",active:true}]),cart=[],activeFit="All",activeCat="All",activeCollection="All",admin=false;
function load(k,f){try{return JSON.parse(localStorage.getItem(k))||f}catch{return f}}
function save(){localStorage.setItem("hs_products",JSON.stringify(products));localStorage.setItem("hs_events",JSON.stringify(events))}
function productImages(p){return String(p?.image||"").split("|").map(x=>x.trim()).filter(Boolean)}
function wa(msg){if(!/^\d{10,15}$/.test(CONFIG.whatsapp)){alert("Set your WhatsApp number in app.js or Admin → Settings first.");return null}return "https://wa.me/"+CONFIG.whatsapp+"?text="+encodeURIComponent(msg)}
function renderEvents(){document.getElementById("events").innerHTML=events.filter(e=>e.active).map(e=>`<article class="event">${e.image?`<img src="${esc(e.image)}" alt="${esc(e.title)}">`:""}<small>${esc(e.badge||"HIGHSTREET")}</small><b>${esc(e.title)}</b><span>${esc(e.details)}</span>${e.startDate||e.endDate?`<small class="event-dates">${esc(e.startDate)}${e.endDate?" – "+esc(e.endDate):""}</small>`:""}${e.buttonText&&e.buttonLink&&/^https?:\/\//i.test(e.buttonLink)?`<a class="event-button" href="${esc(e.buttonLink)}" target="_blank" rel="noopener noreferrer">${esc(e.buttonText)}</a>`:""}</article>`).join("")||"<p>No events right now. Check back soon.</p>"}
function renderFilters(){
  document.getElementById("categoryFilters").innerHTML=["All","Graphic","Minimal"].map(x=>`<button data-cat="${x}" class="${activeCat===x?'active':''}">${x.toUpperCase()}</button>`).join("");
  document.getElementById("fitFilters").innerHTML=["All",...FITS].map(x=>`<button data-fit="${x}" class="${activeFit===x?'active':''}">${x.toUpperCase()}</button>`).join("");
  document.querySelectorAll("[data-cat]").forEach(b=>b.onclick=()=>{activeCat=b.dataset.cat;render()});
  document.querySelectorAll("[data-fit]").forEach(b=>b.onclick=()=>{activeFit=b.dataset.fit;render()});
  document.querySelectorAll("[data-collection]").forEach(b=>b.onclick=()=>{
    activeCollection=b.dataset.collection;
    activeCat="All";
    activeFit="All";
    render();
    document.getElementById("shop").scrollIntoView({behavior:"smooth"});
  });
}
function render(){renderFilters();let shown=products.filter(p=>p.active&&(activeCollection==="All"||(p.collection||"Unisex")===activeCollection)&&(activeCat==="All"||p.category===activeCat)&&(activeFit==="All"||p.types.includes(activeFit)));document.getElementById("products").innerHTML=shown.map(p=>{const imgs=productImages(p);return `<article><div class="product-img product-gallery" data-gallery="${esc(p.id)}">${imgs.length?`<img class="gallery-main" src="${esc(imgs[0])}" alt="${esc(p.name)}">`:`<div class="shirt-fallback">${p.art||esc(p.name)}</div>`}${imgs.length>1?`<button class="gallery-arrow gallery-prev" type="button" data-gallery-prev="${esc(p.id)}" aria-label="Previous image">‹</button><button class="gallery-arrow gallery-next" type="button" data-gallery-next="${esc(p.id)}" aria-label="Next image">›</button><div class="gallery-thumbs">${imgs.map((src,i)=>`<button type="button" class="gallery-thumb ${i===0?'active':''}" data-gallery-thumb="${esc(p.id)}" data-index="${i}" aria-label="Show image ${i+1}"><img src="${esc(src)}" alt=""></button>`).join("")}</div>`:""}<span class="pill">${esc(p.badge||p.season)}</span></div><div class="pinfo"><div><h3>${esc(p.name)}</h3><p>${p.types.map(esc).join(" · ")}</p>${p.description ? `<p class="product-description">${esc(p.description)}</p>` : ""}</div><span class="price">₹${p.price}</span></div><div class="orderline"><select id="size-${p.id}">${p.sizes.map(s=>`<option>${esc(s)}</option>`).join("")}</select><button data-add="${p.id}">ADD TO BAG +</button></div></article>`}).join("")||"<p>No products in this filter yet.</p>";
  document.querySelectorAll("[data-gallery-prev],[data-gallery-next],[data-gallery-thumb]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.galleryPrev||b.dataset.galleryNext||b.dataset.galleryThumb;
    const p=products.find(x=>x.id===id); if(!p)return;
    const imgs=productImages(p); if(imgs.length<2)return;
    const gallery=document.querySelector(`[data-gallery="${CSS.escape(id)}"]`);
    const current=Number(gallery.dataset.index||0);
    const next=b.hasAttribute("data-gallery-prev")?(current-1+imgs.length)%imgs.length:b.hasAttribute("data-gallery-next")?(current+1)%imgs.length:Number(b.dataset.index);
    gallery.dataset.index=next;
    gallery.querySelector(".gallery-main").src=imgs[next];
    gallery.querySelectorAll(".gallery-thumb").forEach((t,i)=>t.classList.toggle("active",i===next));
  });
  document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{let p=products.find(x=>x.id===b.dataset.add),size=document.getElementById("size-"+p.id).value;cart.push({id:p.id,name:p.name,size,price:Number(p.price)});renderCart()})}
function renderCart(){document.getElementById("cartCount").textContent=cart.length;document.getElementById("cartItems").innerHTML=cart.map((x,i)=>`<div class="cart-row"><span><b>${esc(x.name)}</b><br>${esc(x.size)} · ₹${x.price}</span><button data-remove="${i}">REMOVE</button></div>`).join("")||"<p>Your bag is empty.</p>";document.getElementById("cartTotal").textContent="₹"+cart.reduce((a,x)=>a+x.price,0);document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{cart.splice(+b.dataset.remove,1);renderCart()})}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function openDrawer(){document.getElementById("cartDrawer").classList.add("open");document.getElementById("scrim").classList.add("show")}function closeAll(){document.getElementById("cartDrawer").classList.remove("open");document.getElementById("scrim").classList.remove("show")}
document.getElementById("cartOpen").onclick=openDrawer;document.getElementById("scrim").onclick=closeAll;document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>{document.getElementById(b.dataset.close).classList.remove("show");closeAll()});
document.getElementById("checkout").onclick=()=>{if(!cart.length)return alert("Your bag is empty.");let lines=cart.map(x=>`${x.name} / ${x.size} / ₹${x.price}`).join("\n");let total=cart.reduce((a,x)=>a+x.price,0),url=wa(`Hi HIGHSTREET! I'd like to place this order:\n${lines}\nTotal: ₹${total}\nPlease confirm availability, delivery charges and payment details.`);if(url)window.open(url,"_blank")};
document.getElementById("customForm").onsubmit=e=>{e.preventDefault();let d=new FormData(e.target),u=wa(`Hi HIGHSTREET! Custom order request\nName: ${d.get("name")}\nIdea: ${d.get("idea")}\nFit: ${d.get("fit")}`);if(u)window.open(u,"_blank")};
document.getElementById("igLink").href=CONFIG.instagram;document.getElementById("year").textContent=new Date().getFullYear();
const modal=document.getElementById("adminModal");document.getElementById("adminOpen").onclick=()=>modal.classList.add("show");
// Supabase admin authentication. The publishable key is public by design; never put service-role keys here.
const SUPABASE_CONFIG = {
  url: "https://ydxitwostiygauymvuox.supabase.co",
  publishableKey: "sb_publishable_8K-Kj6cwZO47l60uIc6pZQ_k7l9XBSC"
};
let supabaseClient = null;
let adminSession = null;

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_CONFIG.publishableKey || SUPABASE_CONFIG.publishableKey.includes("PASTE_YOUR")) {
    throw new Error("Add your Supabase publishable key in app.js first.");
  }
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  supabaseClient = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.publishableKey);
  // Handle Supabase password-recovery links on this page.
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" && session) showPasswordResetForm();
  });
  return supabaseClient;
}

function showPasswordResetForm() {
  const login = document.getElementById("adminLogin");
  login.hidden = false;
  document.getElementById("adminPanel").hidden = true;
  login.innerHTML = `
    <p class="notice">Set a new password for your HIGHSTREET admin account.</p>
    <label>New password<input id="newAdminPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="At least 8 characters"></label>
    <label>Confirm new password<input id="confirmAdminPassword" type="password" autocomplete="new-password" minlength="8" required placeholder="Enter it again"></label>
    <button id="saveNewAdminPassword" class="cta" type="button">UPDATE PASSWORD</button>
    <p id="passwordResetMessage" class="notice" role="status"></p>`;
  document.getElementById("saveNewAdminPassword").onclick = async () => {
    const msg = document.getElementById("passwordResetMessage");
    const password = document.getElementById("newAdminPassword").value;
    const confirm = document.getElementById("confirmAdminPassword").value;
    if (password.length < 8) { msg.textContent = "Use at least 8 characters."; return; }
    if (password !== confirm) { msg.textContent = "Passwords do not match."; return; }
    msg.textContent = "Updating password…";
    try {
      const client = await getSupabaseClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      await client.auth.signOut();
      history.replaceState(null, "", location.pathname + location.search);
      login.innerHTML = `
        <p class="notice">Password updated. Sign in with your new password.</p>
        <label>Admin email<input id="adminEmail" type="email" autocomplete="username" required placeholder="Your email"></label>
        <label>Password<input id="adminPassword" type="password" autocomplete="current-password" required placeholder="Your password"></label>
        <button id="adminSignIn" class="cta" type="button">SIGN IN</button>
        <p id="adminAuthMessage" class="notice" role="status"></p>`;
      // Reconnect the normal sign-in handler after rebuilding the form.
      attachAdminSignIn();
    } catch (err) { msg.textContent = err?.message || "Could not update password."; }
  };
}


function attachAdminSignIn() {
  const signInButton = document.getElementById("adminSignIn");
  if (!signInButton) return;
  signInButton.onclick = async () => {
  const message = document.getElementById("adminAuthMessage");
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;
  message.textContent = "Signing in…";
  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    adminSession = data.session;
    const { data: check, error: checkError } = await client.functions.invoke("admin-products", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminSession.access_token}` }
    });
    if (checkError) throw checkError;
    if (!check || check.success !== true) throw new Error("Admin access denied.");
    admin = true;
    document.getElementById("adminLogin").hidden = true;
    document.getElementById("adminPanel").hidden = false;
    renderAdmin();
    document.getElementById("adminLogout").onclick = async () => {
      try { await client.auth.signOut(); } finally {
        admin = false; adminSession = null;
        document.getElementById("adminLogin").hidden = false;
        document.getElementById("adminPanel").hidden = true;
        document.getElementById("adminAuthMessage").textContent = "Signed out.";
        modal.classList.remove("show");
      }
    };
    message.textContent = "";
  } catch (err) {
    message.textContent = err?.message || "Sign-in failed. Check your credentials and try again.";
    try { const client = await getSupabaseClient(); await client.auth.signOut(); } catch (_) {}
    admin = false; adminSession = null;
  } finally {
    document.getElementById("adminPassword").value = "";
  }
  };
}
attachAdminSignIn();
// Initialize auth early so recovery links can be detected after the page loads.
getSupabaseClient().catch(() => {});
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tabpane").forEach(x=>x.hidden=true);document.getElementById(b.dataset.tab).hidden=false;document.querySelectorAll("[data-tab]").forEach(x=>x.classList.toggle("selected",x===b))});
function renderAdmin(){
  document.getElementById("adminProductList").innerHTML =
    '<p class="notice">Product saves are sent securely to Google Sheets. Product deletion is not connected yet.</p>' +
    products.map(p=>`<div class="admin-item"><span>${esc(p.name)} · ${p.types.map(esc).join(", ")}</span><span><button data-edit="${esc(p.id)}">EDIT</button></span></div>`).join("");
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>fillProduct(products.find(x=>x.id===b.dataset.edit)));
  document.getElementById("adminEventList").innerHTML=events.map(e=>`<div class="admin-item"><span>${esc(e.title)}</span><button data-edel="${e.id}">DELETE</button></div>`).join("");
  document.querySelectorAll("[data-edel]").forEach(b=>b.onclick=()=>{events=events.filter(e=>e.id!==b.dataset.edel);save();renderEvents();renderAdmin()});
}
function fillProduct(p){let f=document.getElementById("productForm");for(let k of ["id","name","image","art","price","category","season"])f.elements[k].value=p[k]??"";f.querySelectorAll('[name="types"]').forEach(x=>x.checked=p.types.includes(x.value));f.querySelectorAll('[name="sizes"]').forEach(x=>x.checked=p.sizes.includes(x.value));f.elements.active.checked=p.active;document.getElementById("productsTab").scrollIntoView({behavior:"smooth"})}
document.getElementById("productForm").onsubmit = async e => {
  e.preventDefault();
  const f = e.target;
  const d = new FormData(f);
  const id = d.get("id") || "HS" + Date.now();
  const old = products.find(x => x.id === id);
  const p = {
    id, name: d.get("name"), image: d.get("image"), art: d.get("art") || "YOUR ART",
    price: Number(d.get("price")), category: d.get("category") || "Graphic", collection: d.get("collection") || "Unisex",
    types: [...f.querySelectorAll('[name="types"]:checked')].map(x => x.value),
    sizes: [...f.querySelectorAll('[name="sizes"]:checked')].map(x => x.value),
    season: d.get("season") || "Core", active: f.elements.active.checked,
    badge: old?.badge || "NEW"
  };
  if (!p.types.length || !p.sizes.length) {
    alert("Select at least one product type and size.");
    return;
  }
  const saveButton = f.querySelector('button[type="submit"]');
  const originalText = saveButton.textContent;
  saveButton.disabled = true;
  saveButton.textContent = "SAVING TO GOOGLE SHEETS…";
  try {
    const client = await getSupabaseClient();
    const { data, error } = await client.functions.invoke("admin-products", {
      method: "POST",
      headers: { Authorization: `Bearer ${adminSession.access_token}` },
      body: { action: "upsertProduct", product: p }
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Product was not saved.");
    if (old) products = products.map(x => x.id === id ? p : x);
    else products.unshift(p);
    render();
    renderAdmin();
    f.reset();
    f.elements.id.value = "";
    alert(`Product ${p.id} saved to Google Sheets (row ${data.row}).`);
  } catch (err) {
    alert(err?.message || "Could not save the product. Please try again.");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = originalText;
  }
};
document.getElementById("eventForm").onsubmit=e=>{e.preventDefault();let d=new FormData(e.target);events.unshift({id:"EV"+Date.now(),title:d.get("title"),details:d.get("details"),image:d.get("image"),badge:d.get("badge"),active:e.target.elements.active.checked});save();renderEvents();renderAdmin();e.target.reset()};
document.getElementById("settingsForm").onsubmit=e=>{e.preventDefault();let d=new FormData(e.target);CONFIG.whatsapp=d.get("whatsapp").replace(/\D/g,"");CONFIG.instagram=d.get("instagram");document.getElementById("igLink").href=CONFIG.instagram;alert("Saved for this page session. For permanent live settings, update CONFIG in app.js or connect the backend.");};

render();renderEvents();renderCart();

// Load the live catalogue from the Google Sheet via the Apps Script JSONP endpoint.
// The Apps Script endpoint supports a ?callback=... parameter, avoiding browser CORS issues.
function loadLiveCatalogue(){
  if(!CONFIG.apiUrl) return;
  const callbackName="hsCatalogueCallback_"+Date.now();
  const script=document.createElement("script");
  let finished=false;
  const cleanup=()=>{
    if(finished) return;
    finished=true;
    try{delete window[callbackName]}catch(_){window[callbackName]=undefined}
    script.remove();
  };
  window[callbackName]=data=>{
    try{
      if(data && Array.isArray(data.products)){
        products=data.products
          .filter(p=>p && p.active!==false)
          .map(p=>({
            ...p,
            id:String(p.id||""),
            name:String(p.name||""),
            price:Number(p.price)||0,
            category:p.category||"Graphic",
            types:Array.isArray(p.types)?p.types:[],
            sizes:Array.isArray(p.sizes)?p.sizes:SIZES,
            image:p.image||"",
            art:p.art||"YOUR ART",
            season:p.season||"Core",
            badge:p.badge||"NEW",
            active:p.active!==false
          }));
        render();
        if(admin) renderAdmin();
      }
    }finally{cleanup()}
  };
  script.onerror=()=>{
    cleanup();
    console.warn("Could not load the live HIGHSTREET catalogue. Showing the locally saved catalogue.");
  };
  script.src=CONFIG.apiUrl+(CONFIG.apiUrl.includes("?")?"&":"?")+"callback="+encodeURIComponent(callbackName);
  document.head.appendChild(script);
}
loadLiveCatalogue();
// Load Events from the Google Sheets Events tab
function loadLiveEvents() {
  if (!CONFIG.apiUrl) return;

  const callbackName = "hsEventsCallback_" + Date.now();
  const script = document.createElement("script");

  window[callbackName] = data => {
    try {
      if (data && Array.isArray(data.events)) {
        events = data.events.map(e => ({
          id: String(e.id || ""),
          title: String(e.name || ""),
          details: String(e.description || ""),
          image: String(e.image || ""),
          badge: "HIGHSTREET EVENT",
          active: e.active === true,
          startDate: String(e.startDate || ""),
          endDate: String(e.endDate || ""),
          buttonText: String(e.buttonText || ""),
          buttonLink: String(e.buttonLink || ""),
          themeName: String(e.themeName || ""),
          backgroundGradient: String(e.backgroundGradient || ""),
          textColor: String(e.textColor || ""),
          accentColor: String(e.accentColor || ""),
          buttonColor: String(e.buttonColor || ""),
          buttonTextColor: String(e.buttonTextColor || "")
        }));

        renderEvents();

        const now = new Date();

        const activeEvent = events
          .filter(e => {
            const start = parseEventDate(e.startDate);
            const end = parseEventDate(e.endDate, true);

            return e.active && start && end &&
              now >= start && now <= end;
          })
          .sort((a, b) =>
            parseEventDate(b.startDate) - parseEventDate(a.startDate)
          )[0];

        applyEventTheme(activeEvent);
      }
    } finally {
      delete window[callbackName];
      script.remove();
    }
  };

  script.onerror = () => {
    delete window[callbackName];
    script.remove();
    console.warn("Could not load HIGHSTREET Events.");
  };

  script.src = CONFIG.apiUrl
    + (CONFIG.apiUrl.includes("?") ? "&" : "?")
    + "type=events&callback="
    + encodeURIComponent(callbackName);

  document.head.appendChild(script);
}

function parseEventDate(value, endOfDay = false) {
  if (!value) return null;

  const s = String(value).trim();
  let date;

  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  } else {
    match = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (match) {
      // Interprets dates as DD/MM/YYYY, suitable for the India locale.
      date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    } else {
      date = new Date(s);
      if (isNaN(date.getTime())) return null;
    }
  }

  if (isNaN(date.getTime())) return null;

  if (endOfDay) date.setHours(23, 59, 59, 999);
  return date;
}

function applyEventTheme(event) {
  const root = document.documentElement;
  const body = document.body;

  const themeVariables = [
    "--hs-theme-background",
    "--hs-theme-text",
    "--hs-theme-accent",
    "--hs-theme-button",
    "--hs-theme-button-text"
  ];

  if (!event) {
    themeVariables.forEach(name => root.style.removeProperty(name));
    body.style.removeProperty("background");
    body.style.removeProperty("color");
    return;
  }

  const gradient = event.backgroundGradient.trim();

  if (gradient && CSS.supports("background", gradient)) {
    root.style.setProperty("--hs-theme-background", gradient);
    body.style.background = gradient;
  }

  if (event.textColor) {
    root.style.setProperty("--hs-theme-text", event.textColor);
    body.style.color = event.textColor;
  }

  if (event.accentColor) {
    root.style.setProperty("--hs-theme-accent", event.accentColor);
  }

  if (event.buttonColor) {
    root.style.setProperty("--hs-theme-button", event.buttonColor);
  }

  if (event.buttonTextColor) {
    root.style.setProperty("--hs-theme-button-text", event.buttonTextColor);
  }
}

loadLiveEvents();

// HIGHSTREET product image popup
document.addEventListener("click", e => {
  const productImage = e.target.closest(".product-img img");

  if (productImage) {
    let viewer = document.getElementById("hsImageViewer");

    if (!viewer) {
      viewer = document.createElement("div");
      viewer.id = "hsImageViewer";
      viewer.innerHTML = `
        <button class="hs-preview-close" aria-label="Close image preview">✕</button>
        <div class="hs-preview-frame">
          <img src="" alt="Product preview">
          <span>HIGHSTREET® · PRODUCT PREVIEW</span>
        </div>
      `;
      document.body.appendChild(viewer);

      viewer.addEventListener("click", event => {
        if (
          event.target === viewer ||
          event.target.closest(".hs-preview-close")
        ) {
          viewer.classList.remove("open");
          document.body.classList.remove("hs-preview-open");
        }
      });
    }

    const preview = viewer.querySelector("img");
    preview.src = productImage.currentSrc || productImage.src;
    preview.alt = productImage.alt || "HIGHSTREET product";

    viewer.classList.add("open");
    document.body.classList.add("hs-preview-open");
  }
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    document.getElementById("hsImageViewer")?.classList.remove("open");
    document.body.classList.remove("hs-preview-open");
  }
});

// HIGHSTREET: Scroll-reveal animations
document.addEventListener("DOMContentLoaded", () => {
  const revealItems = document.querySelectorAll(
    ".event, .product-card, .collection-card, section"
  );

  revealItems.forEach((item) => item.classList.add("scroll-reveal"));

  const observer = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );

  revealItems.forEach((item) => observer.observe(item));
});
