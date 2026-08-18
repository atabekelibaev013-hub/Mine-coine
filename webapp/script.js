const API_BASE = "https://mine-coine-1.onrender.com";

const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) { tg.ready(); tg.expand(); }

function getGuestId() {
  let id = localStorage.getItem("mc_guest_id");
  if (!id) {
    id = String(900000000 + Math.floor(Math.random() * 99999999));
    localStorage.setItem("mc_guest_id", id);
  }
  return id;
}

async function api(path, method = "GET", body) {
  const headers = { "Content-Type": "application/json" };
  if (tg && tg.initData) headers["X-Telegram-Init-Data"] = tg.initData;
  else headers["X-Guest-Id"] = getGuestId();
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Xatolik yuz berdi");
  return data;
}

const CHARACTERS = [
  { id: "classic", name: "CLASSIC GOLD", cost: 0, click: 1, cap: 500, emoji: "🥇" },
  { id: "nezuko", name: "NEZUKO", cost: 199, click: 2, cap: 500, emoji: "🌸" },
  { id: "naruto", name: "NARUTO", cost: 199, click: 2, cap: 500, emoji: "🍥" },
  { id: "hinata", name: "HINATA", cost: 899, click: 3, cap: 800, emoji: "❄️" },
  { id: "itachi", name: "ITACHI", cost: 899, click: 3, cap: 800, emoji: "🌙" },
  { id: "levi", name: "LEVI", cost: 1999, click: 5, cap: 1000, emoji: "🗡️" },
  { id: "mitsuri", name: "MITSURI", cost: 1999, click: 5, cap: 1000, emoji: "💗" },
  { id: "mikasa", name: "MIKASA", cost: 9999, click: 10, cap: 5000, emoji: "🧣" },
  { id: "gojo", name: "GOJO", cost: 9999, click: 10, cap: 5000, emoji: "🕶️" },
];

const BOOST_ROWS = [
  ["📸", "Instagram Prasmotr", "Sifatli ko'rilishlar"],
  ["📸", "Instagram Jo'natishlar", "Haqiqiy ulashishlar"],
  ["📸", "Instagram Obunachi", "Tez va sifatli obunachilar"],
  ["📸", "Instagram Like", "Tez va sifatli like"],
  ["✈️", "Telegram Prasmotr", "Tezkor ko'rilishlar"],
  ["✈️", "Telegram Reaksiya", "Jonli reaksiyalar"],
];

function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K" : String(n); }
function money(n) { return Math.floor(n).toLocaleString("ru-RU"); }
function charById(id) { return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]; }

let state = null;
let tasks = [];

function applyState(s) {
  state = s;
  renderTop(); renderTap(); renderTasksProgress(); renderProfile();
}

function renderTop() {
  document.getElementById("diamondVal").textContent = money(state.diamonds);
  document.getElementById("coinValTop").textContent = fmt(state.coins);
}

function renderTap() {
  const c = charById(state.activeChar);
  document.getElementById("coinVal").textContent = money(state.coins);
  document.getElementById("clickPower").textContent = state.click;
  document.getElementById("charName").textContent = c.name;
  document.querySelector(".coin-emoji").textContent = c.emoji;
  document.getElementById("energyVal").textContent = `${state.energy} / ${state.energyCap}`;
  document.getElementById("energyFill").style.width = `${(state.energy / state.energyCap) * 100}%`;
}

function renderBoost() {
  const list = document.getElementById("boostList");
  list.innerHTML = BOOST_ROWS.map(([icon, title, sub]) => `
    <div class="list-item">
      <div class="left"><div class="icon-circle">${icon}</div>
        <div><div class="item-title">${title}</div><div class="item-sub">${sub}</div></div>
      </div><span class="arrow">›</span>
    </div>`).join("");
}

async function renderTasks() {
  if (!tasks.length) tasks = await api("/api/tasks");
  document.getElementById("taskCount").textContent = tasks.length - state.claimedTasks.length;
  document.getElementById("taskList").innerHTML = tasks.map((t) => {
    const done = state.claimedTasks.includes(t.id);
    return `<div class="task-row">
      <div><div class="task-title">${t.title}</div><div class="task-reward">+${t.reward} 🏅</div></div>
      <button class="task-btn ${done ? "done" : ""}" data-task="${t.id}" ${done ? "disabled" : ""}>${done ? "✓" : "O'TISH"}</button>
    </div>`;
  }).join("");
}
function renderTasksProgress() {
  if (tasks.length) document.getElementById("taskCount").textContent = tasks.length - state.claimedTasks.length;
  document.getElementById("bonusInput").disabled = state.dailyBonusUsed;
  document.getElementById("bonusBtn").disabled = state.dailyBonusUsed;
  document.getElementById("bonusHint").textContent = state.dailyBonusUsed ? "Siz bonusni allaqachon oldingiz." : "";
}

async function renderAuction() {
  const items = await api("/api/auction");
  const list = document.getElementById("auctionList");
  if (!items.length) { list.innerHTML = `<div style="text-align:center;color:#8a8072;padding:40px 0;font-size:13px;">Hozircha faol lot yo'q.</div>`; return; }
  list.innerHTML = items.map((a) => {
    const left = Math.max(0, a.endTime - Date.now());
    const h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000), s = Math.floor((left % 60000) / 1000);
    return `<div class="list-item">
      <div class="left"><div class="icon-circle">${a.image ? `<img src="${a.image}" />` : "🎁"}</div>
        <div>
          <div class="item-title">${a.title}</div>
          <div class="auction-price">🏅 ${money(a.price)} <span style="color:#8a8072;">• ${a.bidCount} taklif</span></div>
          <div class="auction-time">${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}</div>
        </div>
      </div>
      <button class="bid-btn" data-bid="${a.id}">TAKLIF</button>
    </div>`;
  }).join("");
}

function renderProfile() {
  document.getElementById("uzsVal").textContent = money(state.uzs);
}

function renderShop() {
  document.getElementById("shopGrid").innerHTML = CHARACTERS.map((c) => {
    const owned = state.owned.includes(c.id);
    const active = state.activeChar === c.id;
    const label = active ? "TANLANGAN" : owned ? "FOYDALANISH" : "SOTIB OLISH";
    return `<div class="shop-card">
      <div class="shop-img">${c.emoji}<span class="shop-cost">${c.cost} 💎</span></div>
      <div class="shop-name">${c.name}</div>
      <div class="shop-stat">x${c.click} click • ${c.cap} cap/day</div>
      <button class="shop-btn ${active || owned ? "owned" : ""}" data-buy="${c.id}" ${!owned && state.diamonds < c.cost ? "disabled" : ""}>${label}</button>
    </div>`;
  }).join("");
}

// ===== Tabs =====
function setTab(tab) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(`screen-${tab}`).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  if (tab === "boost") renderBoost();
  if (tab === "tasks") renderTasks();
  if (tab === "auction") renderAuction();
}
document.addEventListener("click", (e) => {
  const tabBtn = e.target.closest("[data-tab]");
  if (tabBtn) setTab(tabBtn.dataset.tab);
});

// ===== Profile action rows =====
document.addEventListener("click", (e) => {
  const row = e.target.closest("[data-profile-action]");
  if (!row) return;
  const action = row.dataset.profileAction;
  if (action === "tasks") setTab("tasks");
  if (action === "diamond") openModal("diamondModal");
});

// ===== Modals =====
function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("close-modal")) e.target.closest(".modal-overlay").classList.add("hidden");
  if (e.target.classList.contains("modal-overlay")) e.target.classList.add("hidden");
});

function showErr(msg) {
  if (tg && tg.showAlert) tg.showAlert(msg); else alert(msg);
}

// ===== Tap =====
document.getElementById("coinCircle").addEventListener("click", async (e) => {
  const c = charById(state.activeChar);
  if (state.energy < c.click) return;
  try {
    const s = await api("/api/tap", "POST");
    applyState(s);
    const fx = document.createElement("span");
    fx.textContent = `+${c.click}`;
    fx.style.cssText = "position:absolute;color:#f0b23f;font-weight:700;font-size:14px;pointer-events:none;animation:floatUp .7s ease-out forwards;";
    const rect = e.currentTarget.getBoundingClientRect();
    fx.style.left = (e.clientX - rect.left) + "px";
    fx.style.top = (e.clientY - rect.top) + "px";
    e.currentTarget.appendChild(fx);
    setTimeout(() => fx.remove(), 700);
  } catch (err) { }
});

document.getElementById("refillBtn").addEventListener("click", async () => {
  try { applyState(await api("/api/refill", "POST")); } catch (err) { showErr(err.message); }
});

// ===== Shop =====
document.getElementById("openShopBtn").addEventListener("click", () => { renderShop(); openModal("shopModal"); });
document.getElementById("shopGrid").addEventListener("click", async (e) => {
  const id = e.target.dataset.buy;
  if (!id) return;
  try { applyState(await api("/api/shop/buy", "POST", { charId: id })); renderShop(); }
  catch (err) { showErr(err.message); }
});

// ===== Tasks =====
document.getElementById("taskList").addEventListener("click", async (e) => {
  const id = e.target.dataset.task;
  if (!id) return;
  try { applyState(await api("/api/tasks/claim", "POST", { taskId: Number(id) })); renderTasks(); }
  catch (err) { showErr(err.message); }
});
document.getElementById("bonusBtn").addEventListener("click", async () => {
  const code = document.getElementById("bonusInput").value.trim();
  if (!code) return;
  try {
    applyState(await api("/api/bonus/claim", "POST", { code }));
    document.getElementById("bonusInput").value = "";
    showErr("✅ Bonus qabul qilindi!");
  } catch (err) { showErr(err.message); }
});

// ===== Auction =====
document.getElementById("auctionList").addEventListener("click", async (e) => {
  const id = e.target.dataset.bid;
  if (!id) return;
  try { applyState(await api("/api/auction/bid", "POST", { itemId: Number(id) })); renderAuction(); }
  catch (err) { showErr(err.message); }
});

// ===== Profile / Deposit / Diamond =====
document.getElementById("depositBtn").addEventListener("click", () => openModal("depositModal"));
document.getElementById("depositConfirm").addEventListener("click", async () => {
  const val = Number(document.getElementById("depositInput").value);
  if (!val || val <= 0) return;
  try {
    applyState(await api("/api/deposit", "POST", { amount: val }));
    document.getElementById("depositInput").value = "";
    closeModal("depositModal");
  } catch (err) { showErr(err.message); }
});

document.getElementById("diamondShopBtn").addEventListener("click", () => openModal("diamondModal"));
let diamondCount = 455;
document.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  diamondCount = Number(chip.dataset.val);
  document.getElementById("diamondCount").textContent = diamondCount;
  document.getElementById("diamondSum").textContent = money(diamondCount * 11) + " UZS";
}));
document.getElementById("diamondConfirm").addEventListener("click", async () => {
  try { applyState(await api("/api/diamond/buy", "POST", { count: diamondCount })); closeModal("diamondModal"); }
  catch (err) { showErr(err.message); }
});

// ===== Wheel =====
document.getElementById("wheelBannerBtn").addEventListener("click", () => openModal("wheelModal"));
let wheelRot = 0;
document.getElementById("spinBtn").addEventListener("click", async () => {
  try {
    const btn = document.getElementById("spinBtn");
    btn.disabled = true;
    const res = await api("/api/wheel/spin", "POST");
    const idx = res.index;
    wheelRot += 360 * 5 + idx * (360 / 11);
    document.getElementById("wheel").style.transform = `rotate(${wheelRot}deg)`;
    setTimeout(() => { applyState(res.state); btn.disabled = false; }, 2200);
  } catch (err) { showErr(err.message); document.getElementById("spinBtn").disabled = false; }
});

// ===== Passive energy tick =====
setInterval(() => {
  if (!state) return;
  if (state.energy < state.energyCap) {
    state.energy = Math.min(state.energyCap, state.energy + 1);
    renderTap();
  }
}, 3000);

// ===== Init =====
async function init() {
  try {
    const s = await api("/api/state");
    applyState(s);
    document.getElementById("loadingBox").classList.add("hidden");
    document.getElementById("mainContent").classList.remove("hidden");
  } catch (err) {
    document.getElementById("loadingBox").classList.add("hidden");
    const box = document.getElementById("errorBox");
    box.classList.remove("hidden");
    box.textContent = "Ulanishda xatolik: " + err.message;
  }
}
init();
