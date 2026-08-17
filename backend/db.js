const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "data.sqlite"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  diamonds INTEGER DEFAULT 0,
  coins INTEGER DEFAULT 0,
  uzs INTEGER DEFAULT 0,
  energy INTEGER DEFAULT 500,
  energy_ts INTEGER DEFAULT (strftime('%s','now')*1000),
  active_char TEXT DEFAULT 'classic',
  owned_chars TEXT DEFAULT 'classic',
  claimed_tasks TEXT DEFAULT '',
  daily_bonus_used INTEGER DEFAULT 0,
  banned INTEGER DEFAULT 0,
  last_active INTEGER DEFAULT (strftime('%s','now')*1000),
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS admins (
  username TEXT PRIMARY KEY,
  telegram_id INTEGER,
  added_by TEXT,
  added_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS bonus_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT,
  reward INTEGER DEFAULT 5,
  active INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);

CREATE TABLE IF NOT EXISTS auction_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  image_url TEXT,
  price INTEGER DEFAULT 0,
  bid_step INTEGER DEFAULT 100,
  bid_count INTEGER DEFAULT 0,
  last_bidder_id INTEGER,
  last_bidder_username TEXT,
  end_time INTEGER,
  status TEXT DEFAULT 'active',
  winner_username TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now')*1000)
);
`);

module.exports = db;
