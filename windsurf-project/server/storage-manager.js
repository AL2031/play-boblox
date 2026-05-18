const fs = require('fs').promises;
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class StorageManager {
  constructor() {
    this.tempStorage = new Map(); // In-memory temporary storage
    this.tempFilePath = path.join(__dirname, 'temp-storage.json');
    this.permanentDbPath = path.join(__dirname, 'boblox.db');
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
      this.permanentDb = new sqlite3.Database(this.permanentDbPath);
      await this.initializePermanentDb();
      console.log('Permanent SSD storage initialized');
    } catch (err) {
      console.error('Permanent storage not available, using temp storage only:', err.message);
      this.permanentStorageAvailable = false;
    }

    // Start background migration
    this.startMigrationProcess();
  }

  async initializePermanentDb() {
    return new Promise((resolve, reject) => {
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
        `, (err) => {
          if (err) reject(err);
          else {
            // Seed starting game if it doesn't exist
            this.seedStartingGame().then(() => resolve()).catch(resolve);
          }
        });
      });
    });
  }

  async seedStartingGame() {
    return new Promise((resolve, reject) => {
      this.permanentDb.get("SELECT id FROM games WHERE title = 'Boblox Adventure'", (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (row) {
          // Game already exists
          resolve();
          return;
        }

        // Create a system user for the starting game
        const bcrypt = require('bcryptjs');
        const hashedPassword = bcrypt.hashSync('system_password', 10);
        
        this.permanentDb.run(
          "INSERT OR IGNORE INTO users (username, email, password, bobux) VALUES (?, ?, ?, ?)",
          ['BobloxSystem', 'system@boblox.com', hashedPassword, 999999],
          function(err) {
            if (err) {
              reject(err);
              return;
            }

            const systemUserId = this.lastID;

            // Create the starting game
            const startingGameCode = `// Boblox Adventure - Starting Game
// This is a sample game to help you get started!

// Game Engine API
const Game = {
  canvas: canvas,
  ctx: ctx,
  width: canvas.width,
  height: canvas.height,
  
  // Player object
  player: {
    x: 100,
    y: 100,
    width: 40,
    height: 40,
    color: '#667eea',
    speed: 5,
    score: 0,
    coins: 0
  },
  
  // Game state
  state: {
    isRunning: true,
    level: 1,
    time: 0
  },
  
  // Animation system
  animations: [],
  
  // Add animation
  addAnimation: function(obj, property, start, end, duration, easing) {
    this.animations.push({
      obj: obj,
      property: property,
      start: start,
      end: end,
      duration: duration,
      elapsed: 0,
      easing: easing || 'linear'
    });
  },
  
  // Update animations
  updateAnimations: function(deltaTime) {
    for (let i = this.animations.length - 1; i >= 0; i--) {
      const anim = this.animations[i];
      anim.elapsed += deltaTime;
      
      if (anim.elapsed >= anim.duration) {
        anim.obj[anim.property] = anim.end;
        this.animations.splice(i, 1);
      } else {
        const progress = anim.elapsed / anim.duration;
        const eased = this.ease(progress, anim.easing);
        anim.obj[anim.property] = anim.start + (anim.end - anim.start) * eased;
      }
    }
  },
  
  // Easing functions
  ease: function(t, type) {
    switch(type) {
      case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      case 'easeOut': return t * (2 - t);
      case 'bounce': return t < 1/2.75 ? 7.5625 * t * t : t < 2/2.75 ? 7.5625 * (t -= 1.5/2.75) * t + 0.75 : t < 2.5/2.75 ? 7.5625 * (t -= 2.25/2.75) * t + 0.9375 : 7.5625 * (t -= 2.625/2.75) * t + 0.984375;
      default: return t; // linear
    }
  },
  
  // Draw rectangle
  rect: function(x, y, w, h, color) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, w, h);
  },
  
  // Draw circle
  circle: function(x, y, r, color) {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  },
  
  // Draw text
  text: function(str, x, y, size, color) {
    this.ctx.fillStyle = color;
    this.ctx.font = size + 'px Arial';
    this.ctx.fillText(str, x, y);
  },
  
  // Clear canvas
  clear: function(color) {
    this.ctx.fillStyle = color || '#f0f0f0';
    this.ctx.fillRect(0, 0, this.width, this.height);
  },
  
  // Check collision
  collision: function(a, b) {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  },
  
  // Give item to player (calls parent window)
  giveItem: function(itemId) {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({ type: 'giveItem', itemId: itemId }, '*');
    }
  },
  
  // Start transaction (calls parent window)
  startTransaction: function(amount, description) {
    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({ type: 'transaction', amount: amount, description: description }, '*');
    }
  }
};

// Collectibles
const collectibles = [];
for (let i = 0; i < 5; i++) {
  collectibles.push({
    x: Math.random() * (Game.width - 30) + 15,
    y: Math.random() * (Game.height - 30) + 15,
    width: 20,
    height: 20,
    color: '#f39c12',
    collected: false
  });
}

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

// Game loop
let lastTime = 0;
function gameLoop(timestamp) {
  if (!Game.state.isRunning) return;
  
  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;
  Game.state.time += deltaTime;
  
  // Clear canvas
  Game.clear('#1a1a2e');
  
  // Update player
  if (keys['ArrowLeft'] || keys['a']) Game.player.x -= Game.player.speed;
  if (keys['ArrowRight'] || keys['d']) Game.player.x += Game.player.speed;
  if (keys['ArrowUp'] || keys['w']) Game.player.y -= Game.player.speed;
  if (keys['ArrowDown'] || keys['s']) Game.player.y += Game.player.speed;
  
  // Keep player in bounds
  Game.player.x = Math.max(0, Math.min(Game.width - Game.player.width, Game.player.x));
  Game.player.y = Math.max(0, Math.min(Game.height - Game.player.height, Game.player.y));
  
  // Update animations
  Game.updateAnimations(deltaTime);
  
  // Check collectibles
  collectibles.forEach((c, i) => {
    if (!c.collected && Game.collision(Game.player, c)) {
      c.collected = true;
      Game.player.score += 10;
      Game.player.coins += 1;
      
      // Animate coin collection
      Game.addAnimation(Game.player, 'width', 40, 50, 200, 'bounce');
      setTimeout(() => {
        Game.addAnimation(Game.player, 'width', 50, 40, 200, 'easeOut');
      }, 200);
    }
  });
  
  // Draw collectibles
  collectibles.forEach(c => {
    if (!c.collected) {
      Game.circle(c.x + 10, c.y + 10, 10, c.color);
    }
  });
  
  // Draw player with animation
  Game.rect(Game.player.x, Game.player.y, Game.player.width, Game.player.height, Game.player.color);
  
  // Draw UI
  Game.text('Score: ' + Game.player.score, 10, 30, 20, '#fff');
  Game.text('Coins: ' + Game.player.coins, 10, 60, 20, '#f39c12');
  Game.text('Use Arrow Keys or WASD to move', 10, Game.height - 20, 14, '#888');
  
  // Win condition
  if (Game.player.coins >= 5) {
    Game.text('YOU WIN! 🎉', Game.width / 2 - 60, Game.height / 2, 30, '#27ae60');
    Game.state.isRunning = false;
  }
  
  requestAnimationFrame(gameLoop);
}

// Start game
gameLoop(0);`;

            this.permanentDb.run(
              "INSERT INTO games (title, description, creator_id, code, published) VALUES (?, ?, ?, ?, ?)",
              ['Boblox Adventure', 'Welcome to Boblox! This is the starting game to help you learn how to create your own games. Use arrow keys or WASD to move and collect all coins!', systemUserId, startingGameCode, true],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }

                const gameId = this.lastID;

                // Add some starter items
                const items = [
                  { name: 'Speed Boost', description: 'Move faster in this game', price: 10, type: 'powerup' },
                  { name: 'Extra Life', description: 'Get an extra life', price: 25, type: 'powerup' },
                  { name: 'Golden Coin', description: 'A shiny golden coin', price: 5, type: 'cosmetic' }
                ];

                items.forEach(item => {
                  this.permanentDb.run(
                    "INSERT INTO game_items (game_id, name, description, price, type) VALUES (?, ?, ?, ?, ?)",
                    [gameId, item.name, item.description, item.price, item.type]
                  );
                });

                resolve();
              }
            );
          }
        );
      });
    });
  }

  // Write to temporary storage first
  async writeToTemp(key, data) {
    this.tempStorage.set(key, {
      data,
      timestamp: Date.now(),
      migrated: false
    });
    
    // Persist to temp file
    await this.saveTempToFile();
    
    // Queue for migration
    this.migrationQueue.push(key);
    
    // Trigger migration if not already running
    if (!this.isMigrating) {
      this.migrateToPermanent();
    }
  }

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
    const maxRetries = 3;

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
          }, 5000); // Keep in temp for 5 seconds after migration
          
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
    }, 10000); // Check every 10 seconds
  }

  // Write to permanent SSD storage
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

  handleUserOperation(operation, params, resolve, reject) {
    const sql = this.getUserSql(operation);
    this.permanentDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  }

  handleGameOperation(operation, params, resolve, reject) {
    const sql = this.getGameSql(operation);
    this.permanentDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  }

  handlePurchaseOperation(operation, params, resolve, reject) {
    const sql = this.getPurchaseSql(operation);
    this.permanentDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ success: true, id: this.lastID });
    });
  }

  getUserSql(operation) {
    const sqlMap = {
      'create': 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      'update': 'UPDATE users SET bobux = bobux + ? WHERE id = ?'
    };
    return sqlMap[operation];
  }

  getGameSql(operation) {
    const sqlMap = {
      'create': 'INSERT INTO games (title, description, creator_id, code, published) VALUES (?, ?, ?, ?, ?)',
      'update': 'UPDATE games SET title = ?, description = ?, code = ?, published = ? WHERE id = ?',
      'createItem': 'INSERT INTO game_items (game_id, name, description, price, type) VALUES (?, ?, ?, ?, ?)'
    };
    return sqlMap[operation];
  }

  getPurchaseSql(operation) {
    const sqlMap = {
      'create': 'INSERT INTO purchases (user_id, game_item_id, bobux_spent) VALUES (?, ?, ?)',
      'addToInventory': 'INSERT INTO user_inventory (user_id, game_item_id) VALUES (?, ?)'
    };
    return sqlMap[operation];
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
      
      if (operation === 'all' || operation === 'userGames' || operation === 'inventory') {
        this.permanentDb.all(sql, params, (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      } else {
        this.permanentDb.get(sql, params, (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      }
    });
  }

  getReadSql(type, operation) {
    const sqlMap = {
      'user': {
        'login': 'SELECT * FROM users WHERE username = ?',
        'profile': 'SELECT id, username, email, bobux, created_at FROM users WHERE id = ?'
      },
      'game': {
        'all': 'SELECT g.*, u.username as creator_name, (SELECT COUNT(*) FROM game_items WHERE game_id = g.id) as item_count FROM games g JOIN users u ON g.creator_id = u.id WHERE g.published = TRUE ORDER BY g.created_at DESC',
        'byId': 'SELECT g.*, u.username as creator_name FROM games g JOIN users u ON g.creator_id = u.id WHERE g.id = ?',
        'items': 'SELECT * FROM game_items WHERE game_id = ?',
        'itemById': 'SELECT * FROM game_items WHERE id = ?',
        'userGames': 'SELECT * FROM games WHERE creator_id = ? ORDER BY created_at DESC'
      },
      'purchase': {
        'inventory': 'SELECT ui.*, gi.name, gi.description, gi.type, g.title as game_title FROM user_inventory ui JOIN game_items gi ON ui.game_item_id = gi.id JOIN games g ON gi.game_id = g.id WHERE ui.user_id = ? ORDER BY ui.acquired_at DESC',
        'history': 'SELECT p.*, gi.name as item_name, g.title as game_title FROM purchases p JOIN game_items gi ON p.game_item_id = gi.id JOIN games g ON gi.game_id = g.id WHERE p.user_id = ? ORDER BY p.purchased_at DESC'
      }
    };
    return sqlMap[type]?.[operation];
  }

  // Get storage status
  getStorageStatus() {
    return {
      tempStorageSize: this.tempStorage.size,
      migrationQueueSize: this.migrationQueue.length,
      isMigrating: this.isMigrating,
      permanentStorageAvailable: this.permanentStorageAvailable
    };
  }

  // Close connections
  async close() {
    if (this.permanentDb) {
      await new Promise((resolve) => this.permanentDb.close(resolve));
    }
    await this.saveTempToFile();
  }
}

module.exports = new StorageManager();
