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

const TASKS = [
  { id: 1, title: "Kanalga obuna bo'lish", reward: 50 },
  { id: 2, title: "Do'stlar taklif qilish", reward: 3000 },
  { id: 3, title: "@onlykrykhi_bot", reward: 100 },
  { id: 4, title: "Tgrass Task", reward: 100 },
];

const BOOST_ROWS = [
  ["📸", "Instagram Prasmotr", "Sifatli ko'rilishlar"],
  ["📸", "Instagram Jo'natishlar", "Haqiqiy ulashishlar"],
  ["📸", "Instagram Obunachi", "Tez va sifatli obunachilar"],
  ["📸", "Instagram Like", "Tez va sifatli like"],
  ["✈️", "Telegram Prasmotr", "Tezkor ko'rilishlar"],
  ["✈️", "Telegram Reaksiya", "Jonli reaksiyalar"],
];

const WHEEL_VALUES = [10, 20, 30, 40, 50, 100, 200, 300, 500, 1000, 9999];
const WHEEL_COST = 5000; // coins
const ENERGY_REGEN_MS = 3000; // +1 energy per 3s
const REFILL_DIAMOND_COST = 20;

module.exports = { CHARACTERS, TASKS, BOOST_ROWS, WHEEL_VALUES, WHEEL_COST, ENERGY_REGEN_MS, REFILL_DIAMOND_COST };
