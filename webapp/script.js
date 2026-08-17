// ===== Telegram WebApp init =====
const tg = window.Telegram ? window.Telegram.WebApp : null;
if (tg) { tg.ready(); tg.expand(); }

// ===== Data =====
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

const TASKS = [
  { id: 1, title: "Kanalga obuna bo'lish", reward: 50 },
  { id: 2, title: "Task 2", reward: 50, sub: "5/5" },
  { id: 3, title: "Do'stlar taklif qilish", reward: 3000 },
  { id: 4, title: "@onlykrykhi_bot", reward: 100 },
  { id: 5, title: "Tgrass Task", reward: 100 },
];

const AUCTIONS = [
  { title: "Telegram premium", sub: "1 Mounth", price: 9200, bids: 83, time: "08:06:56", img: "⭐" },
  { title: "Free Fire – 110 Diamond", sub: "Diamond", price: 6700, bids: 65, time: "08:14:07", img: "🔫" },
  { title: "Telegram gift – 💝", sub: "Sovg'a", price: 3600, bids: 34, time: "08:20:24", img: "🎁" },
  { title: "PUBG – 60 UC", sub: "Pubg mobile", price: 8400, bids: 1, time: "09:12:04", img: "🎮" },
  { title: "Gift", sub: "Ayiqcha", price: 2200, bids: 5, time: "10:04:51", img: "🧸" },
];

const PROFILE_ROWS = [
  ["🎁", "Kunlik Bonus"], ["🛍️", "Buyurtmalarim"], ["💎", "Olmos Yuborish"],
  ["🏆", "Reyting"], ["✨", "Maxsus Xizmatlar"], ["⚙️", "Sozlanmalar"],
];

const WHEEL_VALUES = [10, 20, 30, 40, 50, 100, 200, 300, 500, 1000, 9999];

// ===== State (persisted in localStorage; demo only) =====
const STORAGE_KEY = "mine_coin_state_v1";
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {
  diamonds: 11200,
  coins: 15218,
  uzs: 4000,
  energy: 0,
  activeChar: "levi",
  owned: ["classic", "levi"],
  claimed: [],
  dailyClaimed: false,
};

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function fmt(n) { return n >= 1000 ? (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + "K" : String(n); }
function money(n) { return n.toLocaleString("ru-RU"); }
function curChar() { return CHARACTERS.find((c) => c.id === state.activeChar); }

// ===== Render =====
function renderTop() {
  document.getElementById("diamondVal").textContent = money(state.diamonds);
  document.getElementById("coinValTop").textContent = fmt(state.coins);
}

function renderTap() {
  const c = curChar();
  document.getElementById("coinVal").textContent = money(state.coins);
  document.getElementById("clickPower").textContent = c.click;
  document.getElementById("charName").textContent = c.name;
  document.querySelector(".coin-emoji").textContent = c.emoji;
  document.getElementById("energyVal").textContent = `${state.energy} / ${c.cap}`;
  document.getElementById("energyFill").style.width = `${(state.energy / c.cap) * 100}%`;
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

function renderTasks() {
  document.getElementById("dailyBtn").textContent = state.dailyClaimed ? "OLINDI" : "▷ Ishlatish";
  document.getElementById("dailyBtn").disabled = state.dailyClaimed;
  document.getElementById("taskCount").textContent = TASKS.length - state.claimed.length;
  document.getElementById("taskList").innerHTML = TASKS.map((t) => {
    const done = state.claimed.includes(t.id);
    return `<div class="task-row">
      <div><div class="task-title">${t.title}</div><div class="task-reward">+${t.reward} 🏅 ${t.sub ? "· " + t.sub : ""}</div></div>
      <button class="task-btn ${done ? "done" : ""}" data-task="${t.id}" ${done ? "disabled" : ""}>${done ? "✓" : "O'TISH"}</button>
    </div>`;
  }).join("");
}

function renderAuction(sub = "active") {
  const list = document.getElementById("auctionList");
  if (sub === "done") { list.innerHTML = `<div style="text-align:center;color:#8a8072;padding:40px 0;font-size:13px;">Tugagan auksionlar yo'q.</div>`; return; }
  list.innerHTML = AUCTIONS.map((a) => `
    <div class="list-item">
      <div class="left"><div class="icon-circle" style="font-size:20px;">${a.img}</div>
        <div>
          <div class="item-title">${a.title}</div><div class="item-sub">${a.sub}</div>
          <div class="auction-price">🏅 ${money(a.price)} <span style="color:#8a8072;">• ${a.bids} taklif</span></div>
          <div class="auction-time">${a.time}<span class="auto-tag">♻ AUTO</span></div>
        </div>
      </div><span class="arrow">›</span>
    </div>`).join("");
}

function renderProfile() {
  document.getElementById("uzsVal").textContent = money(state.uzs);
  document.getElementById("profileList").innerHTML = PROFILE_ROWS.map(([icon, label]) => `
    <div class="list-item" data-profile="${label}">
      <div class="left"><div class="icon-circle">${icon}</div><div class="item-title">${label}</div></div>
      <span class="arrow">›</span>
    </div>`).join("") + `
    <div class="list-item" style="opacity:0.5;">
      <div class="left"><div class="icon-circle">🔄</div>
        <div><div class="item-title">P2P bozori</div><div class="item-sub">COMING SOON</div></div>
      </div><span>🔒</span>
    </div>`;
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

function renderAll() {
  renderTop(); renderTap(); renderBoost(); renderTasks(); renderAuction(); renderProfile();
  save();
}

// ===== Tab switching =====
function setTab(tab) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  document.getElementById(`screen-${tab}`).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
}
document.querySelectorAll("[data-tab]").forEach((btn) => btn.addEventListener("click", () => setTab(btn.dataset.tab)));

// ===== Modals =====
function openModal(id) { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
document.querySelectorAll(".close-modal").forEach((b) => b.addEventListener("click", (e) => {
  e.target.closest(".modal-overlay").classList.add("hidden");
}));
document.querySelectorAll(".modal-overlay").forEach((ov) => ov.addEventListener("click", (e) => {
  if (e.target === ov) ov.classList.add("hidden");
}));

// ===== Tap / mine =====
document.getElementById("coinCircle").addEventListener("click", (e) => {
  const c = curChar();
  if (state.energy < c.click) return;
  state.coins += c.click;
  state.energy = Math.max(0, state.energy - c.click);
  renderTop(); renderTap(); save();

  const fx = document.createElement("span");
  fx.textContent = `+${c.click}`;
  fx.style.cssText = "position:absolute;color:#f0b23f;font-weight:700;font-size:14px;pointer-events:none;animation:floatUp .7s ease-out forwards;";
  const rect = e.currentTarget.getBoundingClientRect();
  fx.style.left = (e.clientX - rect.left) + "px";
  fx.style.top = (e.clientY - rect.top) + "px";
  e.currentTarget.appendChild(fx);
  setTimeout(() => fx.remove(), 700);
});
const styleTag = document.createElement("style");
styleTag.textContent = `@keyframes floatUp { from{opacity:1;transform:translateY(0);} to{opacity:0;transform:translateY(-40px);} }`;
document.head.appendChild(styleTag);

document.getElementById("refillBtn").addEventListener("click", () => {
  if (state.diamonds < 20) return;
  state.diamonds -= 20;
  state.energy = curChar().cap;
  renderAll();
});

// ===== Shop =====
document.getElementById("openShopBtn").addEventListener("click", () => { renderShop(); openModal("shopModal"); });
document.getElementById("shopGrid").addEventListener("click", (e) => {
  const id = e.target.dataset.buy;
  if (!id) return;
  const c = CHARACTERS.find((x) => x.id === id);
  const owned = state.owned.includes(id);
  if (owned) {
    state.activeChar = id; state.energy = 0;
  } else {
    if (state.diamonds < c.cost) return;
    state.diamonds -= c.cost; state.owned.push(id); state.activeChar = id; state.energy = 0;
  }
  renderAll(); renderShop();
});

// ===== Tasks =====
document.getElementById("taskList").addEventListener("click", (e) => {
  const id = Number(e.target.dataset.task);
  if (!id || state.claimed.includes(id)) return;
  const t = TASKS.find((x) => x.id === id);
  state.coins += t.reward; state.claimed.push(id);
  renderAll();
});
document.getElementById("dailyBtn").addEventListener("click", () => {
  if (state.dailyClaimed) return;
  state.coins += 100; state.dailyClaimed = true;
  renderAll();
});

// ===== Auction sub-tabs =====
document.querySelectorAll(".switch-btn").forEach((b) => b.addEventListener("click", () => {
  document.querySelectorAll(".switch-btn").forEach((x) => x.classList.remove("active"));
  b.classList.add("active");
  renderAuction(b.dataset.sub);
}));

// ===== Profile / Deposit / Diamond purchase =====
document.getElementById("depositBtn").addEventListener("click", () => openModal("depositModal"));
document.getElementById("depositConfirm").addEventListener("click", () => {
  const val = Number(document.getElementById("depositInput").value);
  if (!val || val <= 0) return;
  state.uzs += val; renderAll();
  document.getElementById("depositInput").value = "";
  closeModal("depositModal");
});

document.getElementById("profileList") && document.getElementById("profileList").addEventListener("click", (e) => {
  const row = e.target.closest("[data-profile]");
  if (row && row.dataset.profile === "Olmos Yuborish") openModal("diamondModal");
});

let diamondCount = 455;
document.querySelectorAll(".chip").forEach((chip) => chip.addEventListener("click", () => {
  document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  diamondCount = Number(chip.dataset.val);
  document.getElementById("diamondCount").textContent = diamondCount;
  document.getElementById("diamondSum").textContent = money(diamondCount * 11) + " UZS";
}));
document.getElementById("diamondConfirm").addEventListener("click", () => {
  const cost = diamondCount * 11;
  if (state.uzs < cost) { alert("UZS balans yetarli emas"); return; }
  state.uzs -= cost; state.diamonds += diamondCount;
  renderAll(); closeModal("diamondModal");
});

// ===== Wheel =====
document.getElementById("wheelBannerBtn").addEventListener("click", () => openModal("wheelModal"));
let wheelRot = 0;
document.getElementById("spinBtn").addEventListener("click", () => {
  if (state.coins < 5000) return;
  state.coins -= 5000; save();
  const idx = Math.floor(Math.random() * WHEEL_VALUES.length);
  wheelRot += 360 * 5 + idx * (360 / WHEEL_VALUES.length);
  document.getElementById("wheel").style.transform = `rotate(${wheelRot}deg)`;
  document.getElementById("spinBtn").disabled = true;
  setTimeout(() => {
    state.diamonds += WHEEL_VALUES[idx];
    renderAll();
    document.getElementById("spinBtn").disabled = false;
  }, 2200);
});

// ===== Close button =====
document.getElementById("closeBtn").addEventListener("click", () => {
  if (tg) tg.close(); else alert("Mini App yopildi (demo).");
});

// ===== Init =====
renderAll();
