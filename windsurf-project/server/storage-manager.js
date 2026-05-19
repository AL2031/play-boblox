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
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            // Database is ready, resolve immediately without seeding
            resolve();
          }
        });
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
          else resolve(rows || []);
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
        'all': 'SELECT g.*, u.username as creator_name, (SELECT COUNT(*) FROM game_items WHERE game_id = g.id) as item_count FROM games g JOIN users u ON g.creator_id = u.id WHERE g.published = 1',
        'byId': 'SELECT g.*, u.username as creator_name FROM games g JOIN users u ON g.creator_id = u.id WHERE g.id = ?',
        'items': 'SELECT * FROM game_items WHERE game_id = ?',
        'itemById': 'SELECT * FROM game_items WHERE id = ?',
        'userGames': 'SELECT * FROM games WHERE creator_id = ? ORDER BY created_at DESC'
      },
      'purchase': {
        'inventory': 'SELECT ui.*, gi.name, gi.description, gi.type, g.title as game_title FROM user_inventory ui JOIN game_items gi ON ui.game_item_id = gi.id JOIN games g ON gi.game_id = g.id WHERE ui.user_id = ?',
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
