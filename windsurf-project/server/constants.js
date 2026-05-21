// Application constants

// Database
const DB_PATH = 'boblox.db';
const TEMP_STORAGE_PATH = 'temp-storage.json';

// Storage
const MIGRATION_INTERVAL_MS = 10000;
const MIGRATION_RETRY_LIMIT = 3;
const MIGRATION_DELAY_MS = 100;
const TEMP_STORAGE_CLEANUP_DELAY_MS = 5000;

// Authentication
const JWT_EXPIRES_IN = '7d';
const DEFAULT_JWT_SECRET = 'boblox-secret-key';
const BCRYPT_ROUNDS = 10;

// User
const DEFAULT_BOBUX = 100;
const DAILY_REWARD_AMOUNT = 10;
const DAILY_REWARD_COOLDOWN_HOURS = 24;

// Game
const DEFAULT_GAME_TYPE = 'item';

// API
const DEFAULT_PORT = 5000;

// Cache
const CACHE_CONTROL_HEADERS = {
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

module.exports = {
  DB_PATH,
  TEMP_STORAGE_PATH,
  MIGRATION_INTERVAL_MS,
  MIGRATION_RETRY_LIMIT,
  MIGRATION_DELAY_MS,
  TEMP_STORAGE_CLEANUP_DELAY_MS,
  JWT_EXPIRES_IN,
  DEFAULT_JWT_SECRET,
  BCRYPT_ROUNDS,
  DEFAULT_BOBUX,
  DAILY_REWARD_AMOUNT,
  DAILY_REWARD_COOLDOWN_HOURS,
  DEFAULT_GAME_TYPE,
  DEFAULT_PORT,
  CACHE_CONTROL_HEADERS
};
