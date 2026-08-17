require("dotenv").config();
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const TelegramBot = require("node-telegram-bot-api");
const db = require("./db");
const { CHARACTERS, TASKS, WHEEL_VALUES, WHEEL_COST, ENERGY_REGEN_MS, REFILL_DIAMOND_COST } = require("./constants");

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL;
const OWNER_USERNAME = (process.env.OWNER_USERNAME || "").replace(/^@/, "").toLowerCase();
const PORT = process.env.PORT || 3000;

if (!TOKEN) { console.error("XATO: BOT_TOKEN yo'q"); process.exit(1); }
if (!OWNER_USERNAME) { console.error("XATO: OWNER_USERNAME yo'q (.env ga @siz username yozing)"); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
app.use(cors());
app.use(express.json());

// ================= HELPERS =================

function charById(id) { return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]; }

function getOrCreateUser(tg) {
  let u = db.prepare("SELECT * FROM users WHERE id = ?").get(tg.id);
  if (!u) {
    db.prepare(`INSERT INTO users (id, username, first_name) VALUES (?, ?, ?)`).run(
      tg.id, tg.username || "", tg.first_name || ""
    );
    u = db.prepare("SELECT * FROM users WHERE id = ?").get(tg.id);
  } else if (tg.username && tg.username !== u.username) {
    db.prepare("UPDATE users SET username = ? WHERE id = ?").run(tg.username, tg.id);
    u.username = tg.username;
  }
  return u;
}

function applyEnergyRegen(u) {
  const cap = charById(u.active_char).cap;
  const now = Date.now();
  const elapsed = now - u.energy_ts;
  if (u.energy < cap && elapsed > 0) {
    const gained = Math.floor(elapsed / ENERGY_REGEN_MS);
    if (gained > 0) {
      const newEnergy = Math.min(cap, u.energy + gained);
      const newTs = u.energy_ts + gained * ENERGY_REGEN_MS;
      db.prepare("UPDATE users SET energy = ?, energy_ts = ? WHERE id = ?").run(newEnergy, newTs, u.id);
      u.energy = newEnergy;
      u.energy_ts = newTs;
    }
  }
  return u;
}

function touch(id) {
  db.prepare("UPDATE users SET last_active = ? WHERE id = ?").run(Date.now(), id);
}

function serializeUser(u) {
  const c = charById(u.active_char);
  return {
    diamonds: u.diamonds,
    coins: u.coins,
    uzs: u.uzs,
    energy: u.energy,
    energyCap: c.cap,
    click: c.click,
    activeChar: u.active_char,
    owned: u.owned_chars.split(",").filter(Boolean),
    claimedTasks: u.claimed_tasks.split(",").filter(Boolean).map(Number),
    dailyBonusUsed: !!u.daily_bonus_used,
    banned: !!u.banned,
  };
}

function isOwner(username) {
  return (username || "").toLowerCase() === OWNER_USERNAME;
}
function isAdmin(username) {
  const uname = (username || "").toLowerCase();
  if (uname === OWNER_USERNAME) return true;
  const row = db.prepare("SELECT 1 FROM admins WHERE lower(username) = ?").get(uname);
  return !!row;
}

// ---- Telegram WebApp initData validation ----
function validateInitData(initData) {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const pairs = [];
    for (const [k, v] of [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      pairs.push(`${k}=${v}`);
    }
    const dataCheckString = pairs.join("\n");
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(TOKEN).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
    if (computedHash !== hash) return null;
    const userJson = params.get("user");
    if (!userJson) return null;
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

// Auth middleware — accepts real Telegram initData, or a guest fallback for browser testing
function auth(req, res, next) {
  const initData = req.header("x-telegram-init-data");
  let tgUser = initData ? validateInitData(initData) : null;
  if (!tgUser) {
    const guestId = req.header("x-guest-id");
    if (guestId) tgUser = { id: Number(guestId), username: "", first_name: "Mehmon" };
  }
  if (!tgUser || !tgUser.id) return res.status(401).json({ error: "Avtorizatsiya xatosi" });
  const u = getOrCreateUser(tgUser);
  if (u.banned) return res.status(403).json({ error: "Siz bloklangansiz" });
  applyEnergyRegen(u);
  touch(u.id);
  req.user = u;
  next();
}

// ================= API ROUTES =================

app.get("/api/state", auth, (req, res) => {
  res.json(serializeUser(req.user));
});

app.post("/api/tap", auth, (req, res) => {
  const u = req.user;
  const c = charById(u.active_char);
  if (u.energy < c.click) return res.status(400).json({ error: "Energy yetarli emas" });
  const coins = u.coins + c.click;
  const energy = u.energy - c.click;
  db.prepare("UPDATE users SET coins = ?, energy = ?, energy_ts = ? WHERE id = ?").run(coins, energy, Date.now(), u.id);
  u.coins = coins; u.energy = energy;
  res.json(serializeUser(u));
});

app.post("/api/refill", auth, (req, res) => {
  const u = req.user;
  if (u.diamonds < REFILL_DIAMOND_COST) return res.status(400).json({ error: "Olmos yetarli emas" });
  const c = charById(u.active_char);
  const diamonds = u.diamonds - REFILL_DIAMOND_COST;
  db.prepare("UPDATE users SET diamonds = ?, energy = ?, energy_ts = ? WHERE id = ?").run(diamonds, c.cap, Date.now(), u.id);
  u.diamonds = diamonds; u.energy = c.cap;
  res.json(serializeUser(u));
});

app.get("/api/shop", auth, (req, res) => {
  res.json(CHARACTERS);
});

app.post("/api/shop/buy", auth, (req, res) => {
  const u = req.user;
  const { charId } = req.body;
  const c = charById(charId);
  if (!c) return res.status(400).json({ error: "Personaj topilmadi" });
  const owned = u.owned_chars.split(",").filter(Boolean);
  if (owned.includes(charId)) {
    db.prepare("UPDATE users SET active_char = ?, energy = MIN(energy, ?) WHERE id = ?").run(charId, c.cap, u.id);
  } else {
    if (u.diamonds < c.cost) return res.status(400).json({ error: "Olmos yetarli emas" });
    const diamonds = u.diamonds - c.cost;
    owned.push(charId);
    db.prepare("UPDATE users SET diamonds = ?, owned_chars = ?, active_char = ? WHERE id = ?")
      .run(diamonds, owned.join(","), charId, u.id);
  }
  const nu = db.prepare("SELECT * FROM users WHERE id = ?").get(u.id);
  res.json(serializeUser(nu));
});

app.get("/api/tasks", auth, (req, res) => {
  res.json(TASKS);
});

app.post("/api/tasks/claim", auth, (req, res) => {
  const u = req.user;
  const { taskId } = req.body;
  const t = TASKS.find((x) => x.id === Number(taskId));
  if (!t) return res.status(400).json({ error: "Vazifa topilmadi" });
  const claimed = u.claimed_tasks.split(",").filter(Boolean);
  if (claimed.includes(String(taskId))) return res.status(400).json({ error: "Allaqachon olingan" });
  claimed.push(String(taskId));
  const coins = u.coins + t.reward;
  db.prepare("UPDATE users SET coins = ?, claimed_tasks = ? WHERE id = ?").run(coins, claimed.join(","), u.id);
  u.coins = coins; u.claimed_tasks = claimed.join(",");
  res.json(serializeUser(u));
});

app.post("/api/bonus/claim", auth, (req, res) => {
  const u = req.user;
  if (u.daily_bonus_used) return res.status(400).json({ error: "Siz allaqachon oldingiz" });
  const { code } = req.body;
  const row = db.prepare("SELECT * FROM bonus_codes WHERE active = 1 AND code = ?").get((code || "").trim());
  if (!row) return res.status(400).json({ error: "Kod noto'g'ri" });
  const diamonds = u.diamonds + row.reward;
  db.prepare("UPDATE users SET diamonds = ?, daily_bonus_used = 1 WHERE id = ?").run(diamonds, u.id);
  u.diamonds = diamonds; u.daily_bonus_used = 1;
  res.json(serializeUser(u));
});

app.get("/api/auction", auth, (req, res) => {
  const items = db.prepare("SELECT * FROM auction_items WHERE status = 'active' ORDER BY end_time ASC").all();
  res.json(items.map((it) => ({
    id: it.id, title: it.title, image: it.image_url, price: it.price,
    bidCount: it.bid_count, endTime: it.end_time,
  })));
});

app.post("/api/auction/bid", auth, (req, res) => {
  const u = req.user;
  const { itemId } = req.body;
  const item = db.prepare("SELECT * FROM auction_items WHERE id = ? AND status = 'active'").get(itemId);
  if (!item) return res.status(400).json({ error: "Lot topilmadi" });
  if (Date.now() > item.end_time) return res.status(400).json({ error: "Auksion tugagan" });
  if (u.coins < item.bid_step) return res.status(400).json({ error: "Tanga yetarli emas" });
  const coins = u.coins - item.bid_step;
  db.prepare("UPDATE users SET coins = ? WHERE id = ?").run(coins, u.id);
  db.prepare(`UPDATE auction_items SET price = price + bid_step, bid_count = bid_count + 1,
    last_bidder_id = ?, last_bidder_username = ? WHERE id = ?`)
    .run(u.id, u.username || String(u.id), itemId);
  u.coins = coins;
  res.json(serializeUser(u));
});

app.post("/api/wheel/spin", auth, (req, res) => {
  const u = req.user;
  if (u.coins < WHEEL_COST) return res.status(400).json({ error: "Tanga yetarli emas" });
  const idx = Math.floor(Math.random() * WHEEL_VALUES.length);
  const win = WHEEL_VALUES[idx];
  const coins = u.coins - WHEEL_COST;
  const diamonds = u.diamonds + win;
  db.prepare("UPDATE users SET coins = ?, diamonds = ? WHERE id = ?").run(coins, diamonds, u.id);
  u.coins = coins; u.diamonds = diamonds;
  res.json({ index: idx, win, state: serializeUser(u) });
});

app.post("/api/deposit", auth, (req, res) => {
  // DEMO: haqiqiy to'lov integratsiyasi yo'q, faqat balansga qo'shadi.
  const u = req.user;
  const amount = Math.max(0, Math.floor(Number(req.body.amount) || 0));
  if (!amount) return res.status(400).json({ error: "Noto'g'ri summa" });
  const uzs = u.uzs + amount;
  db.prepare("UPDATE users SET uzs = ? WHERE id = ?").run(uzs, u.id);
  u.uzs = uzs;
  res.json(serializeUser(u));
});

app.post("/api/diamond/buy", auth, (req, res) => {
  const u = req.user;
  const count = Math.max(0, Math.floor(Number(req.body.count) || 0));
  const cost = count * 11;
  if (!count || u.uzs < cost) return res.status(400).json({ error: "UZS yetarli emas" });
  const uzs = u.uzs - cost;
  const diamonds = u.diamonds + count;
  db.prepare("UPDATE users SET uzs = ?, diamonds = ? WHERE id = ?").run(uzs, diamonds, u.id);
  u.uzs = uzs; u.diamonds = diamonds;
  res.json(serializeUser(u));
});

app.listen(PORT, () => console.log(`API server ${PORT} portda ishga tushdi ✅`));

// ================= TELEGRAM BOT =================

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId,
    "👋 Xush kelibsiz, *Mine Coin*'ga!\n\nTanga va olmos yig'ish uchun quyidagi tugmani bosing 👇",
    { parse_mode: "Markdown", reply_markup: { inline_keyboard: [[{ text: "🎮 O'yinni ochish", web_app: { url: WEBAPP_URL } }]] } }
  );
});

// ---- Admin conversation state ----
const adminState = new Map(); // chatId -> { step, data }

function adminMenu(username) {
  const rows = [
    [{ text: "👥 Foydalanuvchilar", callback_data: "adm_users" }],
    [{ text: "📊 Statistika", callback_data: "adm_stats" }],
    [{ text: "🏆 Auksion mahsulotlari", callback_data: "adm_auction" }],
    [{ text: "🎁 Kunlik bonus kodi", callback_data: "adm_bonus" }],
  ];
  if (isOwner(username)) rows.push([{ text: "🛡 Adminlar", callback_data: "adm_admins" }]);
  return { inline_keyboard: rows };
}

bot.onText(/\/admin/, (msg) => {
  const username = msg.from.username;
  if (!isAdmin(username)) return;
  adminState.delete(msg.chat.id);
  bot.sendMessage(msg.chat.id, "🛠 *Admin panel*", { parse_mode: "Markdown", reply_markup: adminMenu(username) });
});

function backBtn() {
  return { inline_keyboard: [[{ text: "‹ Orqaga", callback_data: "adm_back" }]] };
}

async function notifyAdmins(text) {
  const rows = db.prepare("SELECT telegram_id FROM admins WHERE telegram_id IS NOT NULL").all();
  const ids = new Set(rows.map((r) => r.telegram_id));
  for (const id of ids) {
    bot.sendMessage(id, text, { parse_mode: "Markdown" }).catch(() => {});
  }
}

bot.on("callback_query", async (q) => {
  const chatId = q.message.chat.id;
  const username = q.from.username;
  if (!isAdmin(username)) return bot.answerCallbackQuery(q.id);
  const data = q.data;

  if (data === "adm_back") {
    adminState.delete(chatId);
    await bot.editMessageText("🛠 *Admin panel*", {
      chat_id: chatId, message_id: q.message.message_id, parse_mode: "Markdown", reply_markup: adminMenu(username),
    });
  }

  else if (data === "adm_stats") {
    const total = db.prepare("SELECT COUNT(*) n FROM users").get().n;
    const online = db.prepare("SELECT COUNT(*) n FROM users WHERE last_active > ?").get(Date.now() - 5 * 60 * 1000).n;
    await bot.editMessageText(
      `📊 *Statistika*\n\nJami foydalanuvchilar: *${total}*\nHozir onlayn (5 daqiqa ichida faol): *${online}*`,
      { chat_id: chatId, message_id: q.message.message_id, parse_mode: "Markdown", reply_markup: backBtn() }
    );
  }

  else if (data === "adm_users") {
    adminState.set(chatId, { step: "await_user_query" });
    await bot.editMessageText("🔎 Foydalanuvchi *@username* yoki *ID* raqamini yuboring:", {
      chat_id: chatId, message_id: q.message.message_id, parse_mode: "Markdown", reply_markup: backBtn(),
    });
  }

  else if (data.startsWith("adm_ban_")) {
    const uid = Number(data.replace("adm_ban_", ""));
    const u = db.prepare("SELECT * FROM users WHERE id = ?").get(uid);
    if (u) db.prepare("UPDATE users SET banned = ? WHERE id = ?").run(u.banned ? 0 : 1, uid);
    await showUserCard(chatId, q.message.message_id, uid);
  }

  else if (data.startsWith("adm_edit_")) {
    const [, , field, uid] = data.split("_");
    adminState.set(chatId, { step: "await_balance_value", field, userId: Number(uid) });
    const labels = { diamonds: "olmos", coins: "tanga", uzs: "UZS pul" };
    await bot.editMessageText(`✏️ Yangi *${labels[field]}* miqdorini kiriting (raqam):`, {
      chat_id: chatId, message_id: q.message.message_id, parse_mode: "Markdown", reply_markup: backBtn(),
    });
  }

  else if (data === "adm_bonus") {
    const row = db.prepare("SELECT * FROM bonus_codes WHERE active = 1 ORDER BY id DESC LIMIT 1").get();
    const text = row
      ? `🎁 *Kunlik bonus kodi*\n\nHozirgi faol kod: \`${row.code}\`\nMukofot: ${row.reward} olmos (har user faqat 1 marta)`
      : `🎁 *Kunlik bonus kodi*\n\nHozircha faol kod yo'q.`;
    adminState.set(chatId, { step: "await_bonus_code" });
    await bot.editMessageText(text + "\n\nYangi kod o'rnatish uchun matn yuboring:", {
      chat_id: chatId, message_id: q.message.message_id, parse_mode: "Markdown", reply_markup: backBtn(),
    });
  }

  else if (data === "adm_auction") {
    const items = db.prepare("SELECT * FROM auction_items WHERE status = 'active' ORDER BY id DESC").all();
    let text = "🏆 *Auksion mahsulotlari*\n\n";
    text += items.length ? items.map((it) =>
      `• ${it.title} — 🏅${it.price} (${it.bid_count} taklif)\n  Tugaydi: ${new Date(it.end_time).toLocaleString("uz-UZ")}`
    ).join("\n\n") : "Hozircha faol lot yo'q.";
    adminState.set(chatId, { step: "await_auction_photo" });
    await bot.editMessageText(text + "\n\n➕ Yangi mahsulot qo'shish uchun *rasm* yuboring:", {
      chat_id: chatId, message_id: q.message.message_id, parse_mode: "Markdown", reply_markup: backBtn(),
    });
  }

  else if (data === "adm_admins") {
    if (!isOwner(username)) return bot.answerCallbackQuery(q.id);
    const admins = db.prepare("SELECT * FROM admins").all();
    let text = "🛡 *Adminlar*\n\n";
    text += admins.length ? admins.map((a) => `• @${a.username}`).join("\n") : "Hozircha qo'shimcha admin yo'q.";
    adminState.set(chatId, { step: "await_new_admin" });
    await bot.editMessageText(text + "\n\n➕ Yangi admin qo'shish uchun @username yuboring:", {
      chat_id: chatId, message_id: q.message.message_id, parse_mode: "Markdown", reply_markup: backBtn(),
    });
  }

  bot.answerCallbackQuery(q.id).catch(() => {});
});

async function showUserCard(chatId, messageId, userId) {
  const u = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!u) return;
  const text = `👤 *Foydalanuvchi*\n\nID: \`${u.id}\`\nUsername: @${u.username || "—"}\n💎 Olmos: ${u.diamonds}\n🏅 Tanga: ${u.coins}\n💵 UZS: ${u.uzs}\nHolat: ${u.banned ? "🚫 Bloklangan" : "✅ Faol"}`;
  const kb = {
    inline_keyboard: [
      [{ text: u.banned ? "✅ Blokdan chiqarish" : "🚫 Bloklash", callback_data: `adm_ban_${u.id}` }],
      [
        { text: "💎 Olmos", callback_data: `adm_edit_diamonds_${u.id}` },
        { text: "🏅 Tanga", callback_data: `adm_edit_coins_${u.id}` },
        { text: "💵 Pul", callback_data: `adm_edit_uzs_${u.id}` },
      ],
      [{ text: "‹ Orqaga", callback_data: "adm_back" }],
    ],
  };
  if (messageId) {
    await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, parse_mode: "Markdown", reply_markup: kb }).catch(() => {
      bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: kb });
    });
  } else {
    bot.sendMessage(chatId, text, { parse_mode: "Markdown", reply_markup: kb });
  }
}

// ---- Handle plain text / photo replies for admin conversations ----
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username;
  if (msg.text && msg.text.startsWith("/")) return; // commands handled separately
  const state = adminState.get(chatId);
  if (!state || !isAdmin(username)) return;

  if (state.step === "await_user_query" && msg.text) {
    const q = msg.text.trim().replace(/^@/, "");
    let u;
    if (/^\d+$/.test(q)) u = db.prepare("SELECT * FROM users WHERE id = ?").get(Number(q));
    else u = db.prepare("SELECT * FROM users WHERE lower(username) = ?").get(q.toLowerCase());
    adminState.delete(chatId);
    if (!u) return bot.sendMessage(chatId, "❌ Foydalanuvchi topilmadi.", { reply_markup: backBtn() });
    showUserCard(chatId, null, u.id);
  }

  else if (state.step === "await_balance_value" && msg.text) {
    const val = Number(msg.text.trim());
    if (!Number.isFinite(val) || val < 0) return bot.sendMessage(chatId, "❌ Raqam kiriting.");
    db.prepare(`UPDATE users SET ${state.field} = ? WHERE id = ?`).run(Math.floor(val), state.userId);
    adminState.delete(chatId);
    bot.sendMessage(chatId, "✅ Yangilandi.");
    showUserCard(chatId, null, state.userId);
  }

  else if (state.step === "await_bonus_code" && msg.text) {
    const code = msg.text.trim();
    db.prepare("UPDATE bonus_codes SET active = 0 WHERE active = 1").run();
    db.prepare("INSERT INTO bonus_codes (code, reward, active) VALUES (?, 5, 1)").run(code);
    adminState.delete(chatId);
    bot.sendMessage(chatId, `✅ Yangi bonus kod o'rnatildi: \`${code}\` (5 olmos, har user 1 marta)`, { parse_mode: "Markdown" });
  }

  else if (state.step === "await_auction_photo" && msg.photo) {
    const fileId = msg.photo[msg.photo.length - 1].file_id;
    const file = await bot.getFile(fileId);
    const imageUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    adminState.set(chatId, { step: "await_auction_title", imageUrl });
    bot.sendMessage(chatId, "✅ Rasm qabul qilindi.\n\nEndi mahsulot *nomini* yuboring:", { parse_mode: "Markdown" });
  }

  else if (state.step === "await_auction_title" && msg.text) {
    adminState.set(chatId, { step: "await_auction_price", imageUrl: state.imageUrl, title: msg.text.trim() });
    bot.sendMessage(chatId, "💰 Boshlang'ich narxni kiriting (tanga, raqam):");
  }

  else if (state.step === "await_auction_price" && msg.text) {
    const price = Math.max(0, Math.floor(Number(msg.text.trim()) || 0));
    adminState.set(chatId, { ...state, step: "await_auction_hours", price });
    bot.sendMessage(chatId, "⏳ Necha soatdan keyin auksion tugaydi? (masalan: 24)");
  }

  else if (state.step === "await_auction_hours" && msg.text) {
    const hours = Math.max(0.1, Number(msg.text.trim()) || 24);
    const endTime = Date.now() + hours * 3600 * 1000;
    db.prepare(`INSERT INTO
