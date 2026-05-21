const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const {
  DB_PATH,
  TEMP_STORAGE_PATH,
  MIGRATION_INTERVAL_MS,
  MIGRATION_RETRY_LIMIT,
  MIGRATION_DELAY_MS,
  TEMP_STORAGE_CLEANUP_DELAY_MS
} = require('./constants');

class StorageManager {
  constructor() {
    this.tempStorage = new Map(); // In-memory temporary storage
    this.tempFilePath = path.join(__dirname, TEMP_STORAGE_PATH);
    this.permanentDbPath = path.join(__dirname, DB_PATH);
    this.permanentDb = null;
    this.migrationQueue = [];
    this.isMigrating = false;
    this.permanentStorageAvailable = true;
  }

  async initialize() {
    // Load temp storage from file if exists
    try {
      const tempData = await fs.readFile(this.tempFilePath, 'utf8');
      const parsed = JSON.parse(tempData);
      for (const [key, value] of Object.entries(parsed)) {
        this.tempStorage.set(key, value);
      }
    } catch (err) {
      // File doesn't exist or is corrupted, start fresh
      console.log('No existing temp storage found, starting fresh');
    }

    // Initialize permanent database
    try {
      await this.openDatabase();
      await this.initializePermanentDb();
      console.log('Permanent SSD storage initialized');
    } catch (err) {
      console.error('Permanent storage not available, using temp storage only:', err.message);
      this.permanentStorageAvailable = false;
    }

    // Start background migration
    this.startMigrationProcess();
  }

  // Open database connection
  async openDatabase() {
    return new Promise((resolve, reject) => {
      this.permanentDb = new sqlite3.Database(this.permanentDbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  async initializePermanentDb() {
    return new Promise((resolve, reject) => {
      if (!this.permanentDb) {
        reject(new Error('Database connection not established'));
        return;
      }

      this.permanentDb.serialize(() => {
        // Users table
        this.permanentDb.run(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            bobux INTEGER DEFAULT 100,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Games table
        this.permanentDb.run(`
          CREATE TABLE IF NOT EXISTS games (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            creator_id INTEGER NOT NULL,
            code TEXT NOT NULL,
            published BOOLEAN DEFAULT FALSE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES users(id)
          )
        `);

        // Game items
        this.permanentDb.run(`
          CREATE TABLE IF NOT EXISTS game_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            game_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price INTEGER NOT NULL,
            type TEXT DEFAULT 'item',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (game_id) REFERENCES games(id)
          )
        `);

        // Purchases
        this.permanentDb.run(`
          CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_item_id INTEGER NOT NULL,
            bobux_spent INTEGER NOT NULL,
            purchased_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (game_item_id) REFERENCES game_items(id)
          )
        `);

        // User inventory
        this.permanentDb.run(`
          CREATE TABLE IF NOT EXISTS user_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_item_id INTEGER NOT NULL,
            acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (game_item_id) REFERENCES game_items(id)
          )
        `);

        // Daily rewards
        this.permanentDb.run(`
          CREATE TABLE IF NOT EXISTS daily_rewards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reward_amount INTEGER DEFAULT 10,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Database is ready, seed starting game
            this.seedStartingGame().then(() => resolve()).catch((seedErr) => {
              console.error('Failed to seed starting game:', seedErr);
              resolve(); // Resolve anyway, seeding is not critical
            });
          }
        });
      });
    });
  }

  /**
   * Seed a starting game for new users to play
   * Creates a system user and a default game if they don't exist
   */
  async seedStartingGame() {
    return new Promise((resolve, reject) => {
      // Check if system user exists
      this.permanentDb.get(
        'SELECT * FROM users WHERE username = ?',
        ['BobloxSystem'],
        function(err, user) {
          if (err) {
            reject(err);
            return;
          }

          let systemUserId;
          
          if (!user) {
            // Create system user
            this.permanentDb.run(
              'INSERT INTO users (username, email, password, bobux) VALUES (?, ?, ?, ?)',
              ['BobloxSystem', 'system@boblox.com', 'system_password_hash', 999999],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                systemUserId = this.lastID;
                this.createStartingGameInternal(systemUserId, resolve, reject);
              }.bind(this)
            );
          } else {
            systemUserId = user.id;
            this.createStartingGameInternal(systemUserId, resolve, reject);
          }
        }.bind(this)
      );
    });
  }

  /**
   * Internal helper to create the starting game
   * @param {number} userId - System user ID
   * @param {function} resolve - Promise resolve
   * @param {function} reject - Promise reject
   */
  createStartingGameInternal(userId, resolve, reject) {
    // Check if starting game exists
    this.permanentDb.get(
      'SELECT * FROM games WHERE title = ?',
      ['Boblox Adventure'],
      (err, game) => {
        if (err) {
          reject(err);
          return;
        }

        if (game) {
          resolve(); // Game already exists
          return;
        }

        // Create starting game
        const gameCode = `
// Boblox Adventure - A simple platformer game
const Game = {
  canvas: canvas,
  ctx: ctx,
  width: canvas.width,
  height: canvas.height
};

// Player
let player = {
  x: 50,
  y: 300,
  width: 40,
  height: 40,
  color: '#667eea',
  velocityX: 0,
  velocityY: 0,
  speed: 5,
  jumpPower: -15,
  grounded: false
};

// Platforms
let platforms = [
  { x: 0, y: 400, width: 800, height: 20, color: '#4a5568' },
  { x: 200, y: 300, width: 150, height: 20, color: '#4a5568' },
  { x: 450, y: 250, width: 150, height: 20, color: '#4a5568' },
  { x: 100, y: 200, width: 100, height: 20, color: '#4a5568' },
  { x: 600, y: 350, width: 150, height: 20, color: '#4a5568' }
];

// Collectibles
let collectibles = [
  { x: 250, y: 260, width: 20, height: 20, color: '#f6ad55', collected: false },
  { x: 500, y: 210, width: 20, height: 20, color: '#f6ad55', collected: false },
  { x: 130, y: 160, width: 20, height: 20, color: '#f6ad55', collected: false },
  { x: 650, y: 310, width: 20, height: 20, color: '#f6ad55', collected: false }
];

let score = 0;
let keys = {};

// Input handling
canvas.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'ArrowUp') {
    if (player.grounded) {
      player.velocityY = player.jumpPower;
      player.grounded = false;
    }
  }
});

canvas.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Physics
function update() {
  // Horizontal movement
  if (keys['ArrowLeft'] || keys['a']) {
    player.velocityX = -player.speed;
  } else if (keys['ArrowRight'] || keys['d']) {
    player.velocityX = player.speed;
  } else {
    player.velocityX = 0;
  }

  // Apply gravity
  player.velocityY += 0.8;

  // Update position
  player.x += player.velocityX;
  player.y += player.velocityY;

  // Ground collision
  player.grounded = false;
  for (let platform of platforms) {
    if (player.x < platform.x + platform.width &&
        player.x + player.width > platform.x &&
        player.y + player.height > platform.y &&
        player.y + player.height < platform.y + platform.height + 20 &&
        player.velocityY > 0) {
      player.y = platform.y - player.height;
      player.velocityY = 0;
      player.grounded = true;
    }
  }

  // Collectibles collision
  for (let collectible of collectibles) {
    if (!collectible.collected &&
        player.x < collectible.x + collectible.width &&
        player.x + player.width > collectible.x &&
        player.y < collectible.y + collectible.height &&
        player.y + player.height > collectible.y) {
      collectible.collected = true;
      score += 10;
    }
  }

  // Boundary checks
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > Game.width) player.x = Game.width - player.width;
  if (player.y > Game.height) {
    player.y = 300;
    player.x = 50;
    player.velocityY = 0;
  }
}

// Render
function draw() {
  // Clear canvas
  Game.ctx.fillStyle = '#f0f0f0';
  Game.ctx.fillRect(0, 0, Game.width, Game.height);

  // Draw platforms
  for (let platform of platforms) {
    Game.ctx.fillStyle = platform.color;
    Game.ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
  }

  // Draw collectibles
  for (let collectible of collectibles) {
    if (!collectible.collected) {
      Game.ctx.fillStyle = collectible.color;
      Game.ctx.beginPath();
      Game.ctx.arc(collectible.x + 10, collectible.y + 10, 10, 0, Math.PI * 2);
      Game.ctx.fill();
    }
  }

  // Draw player
  Game.ctx.fillStyle = player.color;
  Game.ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw score
  Game.ctx.fillStyle = '#333';
  Game.ctx.font = '24px Arial';
  Game.ctx.fillText('Score: ' + score, 20, 40);

  // Draw instructions
  Game.ctx.fillStyle = '#666';
  Game.ctx.font = '16px Arial';
  Game.ctx.fillText('Use Arrow Keys or WASD to move, Space to jump', 20, Game.height - 20);
}

// Game loop
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
`;

        this.permanentDb.run(
          'INSERT INTO games (title, description, creator_id, code, published) VALUES (?, ?, ?, ?, ?)',
          ['Boblox Adventure', 'A fun platformer game to get you started!', userId, gameCode, true],
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            
            const gameId = this.lastID;
            
            // Add starter items
            const items = [
              { name: 'Speed Boost', description: 'Move faster', price: 50, type: 'powerup' },
              { name: 'Extra Jump', description: 'Jump higher', price: 75, type: 'powerup' },
              { name: 'Coin Magnet', description: 'Attract coins', price: 100, type: 'powerup' }
            ];
            
            let itemsAdded = 0;
            items.forEach((item, index) => {
              this.permanentDb.run(
                'INSERT INTO game_items (game_id, name, description, price, type) VALUES (?, ?, ?, ?, ?)',
                [gameId, item.name, item.description, item.price, item.type],
                (err) => {
                  if (err) {
                    console.error('Failed to add item:', err);
                  }
                  itemsAdded++;
                  if (itemsAdded === items.length) {
                    resolve();
                  }
                }
              );
            });
          }.bind(this)
        );
      }
    );
  }

  /**
   * Write data to temporary storage first for fast writes
   * @param {string} key - Unique identifier for the data
   * @param {object} data - Data to store (type, operation, params)
   */
  async writeToTemp(key, data) {
    this.tempStorage.set(key, {
      data,
      timestamp: Date.now(),
      migrated: false
    });
    
    // Persist to temp file for crash recovery
    await this.saveTempToFile();
    
    // Queue for migration to permanent storage
    this.migrationQueue.push(key);
    
    // Trigger migration if not already running
    if (!this.isMigrating) {
      this.migrateToPermanent();
    }
  }

  /**
   * Save temporary storage to file for crash recovery
   */
  async saveTempToFile() {
    const obj = {};
    for (const [key, value] of this.tempStorage.entries()) {
      obj[key] = value;
    }
    await fs.writeFile(this.tempFilePath, JSON.stringify(obj, null, 2));
  }

  // Migrate data from temp to permanent storage
  async migrateToPermanent() {
    if (!this.permanentStorageAvailable || this.isMigrating) {
      return;
    }

    this.isMigrating = true;
    let retryCount = 0;
    const maxRetries = MIGRATION_RETRY_LIMIT;

    while (this.migrationQueue.length > 0 && retryCount < maxRetries) {
      const key = this.migrationQueue.shift();
      const tempData = this.tempStorage.get(key);

      if (tempData && !tempData.migrated) {
        try {
          await this.writeToPermanent(key, tempData.data);
          
          // Mark as migrated
          tempData.migrated = true;
          this.tempStorage.set(key, tempData);
          
          // Remove from temp after successful migration
          setTimeout(() => {
            this.tempStorage.delete(key);
            this.saveTempToFile();
          }, TEMP_STORAGE_CLEANUP_DELAY_MS);
          
        } catch (err) {
          console.error(`Migration failed for ${key}:`, err.message);
          // Re-queue for retry with limit
          retryCount++;
          if (retryCount < maxRetries) {
            this.migrationQueue.push(key);
          } else {
            console.error(`Max retries exceeded for ${key}, skipping migration`);
          }
        }
      }
    }

    this.isMigrating = false;
  }

  async startMigrationProcess() {
    // Migrate existing temp data on startup
    for (const [key, value] of this.tempStorage.entries()) {
      if (!value.migrated) {
        this.migrationQueue.push(key);
      }
    }
    this.migrateToPermanent();

    // Periodic migration check
    setInterval(() => {
      this.migrateToPermanent();
    }, MIGRATION_INTERVAL_MS);
  }

  /**
   * Save temporary storage to file for crash recovery
   */
  async saveTempToFile() {
    const obj = {};
    for (const [key, value] of this.tempStorage.entries()) {
      obj[key] = value;
    }
    await fs.writeFile(this.tempFilePath, JSON.stringify(obj, null, 2));
  }

  /**
   * Migrate data from temp to permanent storage
   * Processes the migration queue with retry logic
   */
  async migrateToPermanent() {
    if (!this.permanentStorageAvailable || this.isMigrating) {
      return;
    }

    this.isMigrating = true;
    let retryCount = 0;
    const maxRetries = MIGRATION_RETRY_LIMIT;

    while (this.migrationQueue.length > 0 && retryCount < maxRetries) {
      const key = this.migrationQueue.shift();
      const tempData = this.tempStorage.get(key);

      if (tempData && !tempData.migrated) {
        try {
          await this.writeToPermanent(key, tempData.data);
          
          // Mark as migrated
          tempData.migrated = true;
          this.tempStorage.set(key, tempData);
          
          // Remove from temp after successful migration
          setTimeout(() => {
            this.tempStorage.delete(key);
            this.saveTempToFile();
          }, TEMP_STORAGE_CLEANUP_DELAY_MS);
          
        } catch (err) {
          console.error(`Migration failed for ${key}:`, err.message);
          // Re-queue for retry with limit
          retryCount++;
          if (retryCount < maxRetries) {
            this.migrationQueue.push(key);
          } else {
            console.error(`Max retries exceeded for ${key}, skipping migration`);
          }
        }
      }
    }

    this.isMigrating = false;
  }

  /**
   * Start the background migration process
   * Migrates existing data and sets up periodic checks
   */
  async startMigrationProcess() {
    // Migrate existing temp data on startup
    for (const [key, value] of this.tempStorage.entries()) {
      if (!value.migrated) {
        this.migrationQueue.push(key);
      }
    }
    this.migrateToPermanent();

    // Periodic migration check
    setInterval(() => {
      this.migrateToPermanent();
    }, MIGRATION_INTERVAL_MS);
  }

  /**
   * Write data to permanent SSD storage
   * @param {string} key - Unique identifier for the data
   * @param {object} data - Data to store (type, operation, params)
   * @returns {Promise} Resolves with success status and ID
   */
  async writeToPermanent(key, data) {
    if (!this.permanentStorageAvailable) {
      throw new Error('Permanent storage not available');
    }

    return new Promise((resolve, reject) => {
      const { type, operation, params } = data;

      switch (type) {
        case 'user':
          this.handleUserOperation(operation, params, resolve, reject);
          break;
        case 'game':
          this.handleGameOperation(operation, params, resolve, reject);
          break;
        case 'purchase':
          this.handlePurchaseOperation(operation, params, resolve, reject);
          break;
        default:
          reject(new Error('Unknown data type'));
      }
    });
  }

  /**
   * Handle user-related database operations
   * @param {string} operation - Type of operation (create, update)
   * @param {array} params - Parameters for the SQL query
   * @param {function} resolve - Promise resolve function
   * @param {function} reject - Promise reject function
   */
  handleUserOperation(operation, params, resolve, reject) {
    const sql = this.getUserSql(operation);
    this.permanentDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  }

  /**
   * Handle game-related database operations
   * @param {string} operation - Type of operation (create, update, createItem)
   * @param {array} params - Parameters for the SQL query
   * @param {function} resolve - Promise resolve function
   * @param {function} reject - Promise reject function
   */
  handleGameOperation(operation, params, resolve, reject) {
    const sql = this.getGameSql(operation);
    this.permanentDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  }

  /**
   * Handle purchase-related database operations
   * @param {string} operation - Type of operation (create, addToInventory)
   * @param {array} params - Parameters for the SQL query
   * @param {function} resolve - Promise resolve function
   * @param {function} reject - Promise reject function
   */
  handlePurchaseOperation(operation, params, resolve, reject) {
    const sql = this.getPurchaseSql(operation);
    this.permanentDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  }

  /**
   * Get SQL query for user operations
   * @param {string} operation - Type of operation
   * @returns {string} SQL query
   */
  getUserSql(operation) {
    const sqlMap = {
      'create': 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      'update': 'UPDATE users SET bobux = bobux + ? WHERE id = ?'
    };
    return sqlMap[operation];
  }

  /**
   * Get SQL query for game operations
   * @param {string} operation - Type of operation
   * @returns {string} SQL query
   */
  getGameSql(operation) {
    const sqlMap = {
      'create': 'INSERT INTO games (title, description, creator_id, code, published) VALUES (?, ?, ?, ?, ?)',
      'update': 'UPDATE games SET title = ?, description = ?, code = ?, published = ? WHERE id = ?',
      'createItem': 'INSERT INTO game_items (game_id, name, description, price, type) VALUES (?, ?, ?, ?, ?)'
    };
    return sqlMap[operation];
  }

  /**
   * Get SQL query for purchase operations
   * @param {string} operation - Type of operation
   * @returns {string} SQL query
   */
  getPurchaseSql(operation) {
    const sqlMap = {
      'create': 'INSERT INTO purchases (user_id, game_item_id, bobux_spent) VALUES (?, ?, ?)',
      'addToInventory': 'INSERT INTO user_inventory (user_id, game_item_id) VALUES (?, ?)'
    };
    return sqlMap[operation];
  }

  /**
   * Check if user can claim daily reward
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} True if user can claim reward
   */
  async canClaimDailyReward(userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT claimed_at FROM daily_rewards 
        WHERE user_id = ? 
        ORDER BY claimed_at DESC 
        LIMIT 1
      `;
      this.permanentDb.get(sql, [userId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!row) {
          resolve(true); // Never claimed
          return;
        }
        
        const lastClaim = new Date(row.claimed_at);
        const now = new Date();
        const hoursSinceClaim = (now - lastClaim) / (1000 * 60 * 60);
        
        resolve(hoursSinceClaim >= DAILY_REWARD_COOLDOWN_HOURS); // Can claim if 24+ hours have passed
      });
    });
  }

  /**
   * Claim daily reward for user
   * @param {number} userId - User ID
   * @param {number} amount - Reward amount in Bobux
   * @returns {Promise} Resolves with success status and ID
   */
  async claimDailyReward(userId, amount) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO daily_rewards (user_id, reward_amount) 
        VALUES (?, ?)
      `;
      this.permanentDb.run(sql, [userId, amount], function(err) {
        if (err) reject(err);
        else resolve({ success: true, id: this.lastID });
      });
    });
  }

  // Read data - checks temp first, then permanent
  async readData(type, operation, params) {
    // Check temp storage first using consistent key pattern
    // For reads, we don't have the exact write key, so we skip temp check for most operations
    // Temp storage is primarily for writes, reads go to permanent storage
    
    // Fall back to permanent storage
    if (this.permanentStorageAvailable) {
      return this.readFromPermanent(type, operation, params);
    }

    return null;
  }

  async readFromPermanent(type, operation, params) {
    return new Promise((resolve, reject) => {
      const sql = this.getReadSql(type, operation);
      
      // Use all() for queries that return multiple rows
      if (operation === 'all' || operation === 'items' || operation === 'userGames' || operation === 'inventory' || operation === 'history') {
        this.permanentDb.all(sql, params, (err, rows) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(rows || []);
        });
      } else {
        // Use get() for single row queries
        this.permanentDb.get(sql, params, (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        });
      }
    });
  }

  /**
   * Get SQL query for read operations
   * @param {string} type - Data type (user, game, purchase)
   * @param {string} operation - Operation type
   * @returns {string} SQL query
   */
  getReadSql(type, operation) {
    const sqlMap = {
      'user': {
        'login': 'SELECT * FROM users WHERE username = ?',
        'profile': 'SELECT * FROM users WHERE id = ?'
      },
      'game': {
        'all': 'SELECT g.*, u.username as creator_name, COUNT(DISTINCT gi.id) as item_count FROM games g LEFT JOIN users u ON g.creator_id = u.id LEFT JOIN game_items gi ON g.id = gi.game_id WHERE g.published = TRUE GROUP BY g.id',
        'byId': 'SELECT * FROM games WHERE id = ?',
        'items': 'SELECT * FROM game_items WHERE game_id = ?',
        'itemById': 'SELECT * FROM game_items WHERE id = ?',
        'userGames': 'SELECT * FROM games WHERE creator_id = ? ORDER BY created_at DESC'
      },
      'purchase': {
        'inventory': 'SELECT gi.*, g.title as game_title FROM user_inventory ui JOIN game_items gi ON ui.game_item_id = gi.id JOIN games g ON gi.game_id = g.id WHERE ui.user_id = ?',
        'history': 'SELECT p.*, gi.name as item_name, g.title as game_title FROM purchases p JOIN game_items gi ON p.game_item_id = gi.id JOIN games g ON gi.game_id = g.id WHERE p.user_id = ? ORDER BY p.purchased_at DESC'
      }
    };
    
    if (!sqlMap[type] || !sqlMap[type][operation]) {
      throw new Error(`Unknown read operation: ${type}.${operation}`);
    }
    
    return sqlMap[type][operation];
  }

  /**
   * Get storage system status
   * @returns {object} Current storage status
   */
  getStorageStatus() {
    return {
      tempStorageSize: this.tempStorage.size,
      migrationQueueSize: this.migrationQueue.length,
      isMigrating: this.isMigrating,
      permanentStorageAvailable: this.permanentStorageAvailable
    };
  }

  /**
   * Close database connections and save temp storage
   */
  async close() {
    if (this.permanentDb) {
      await new Promise((resolve) => this.permanentDb.close(resolve));
    }
    await this.saveTempToFile();
  }
}

module.exports = new StorageManager();
