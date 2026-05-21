const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const storage = require('../database');
const { JWT_EXPIRES_IN, DEFAULT_JWT_SECRET, BCRYPT_ROUNDS, DEFAULT_BOBUX } = require('../constants');

const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;

// Register
router.post('/register', async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'All fields are required' 
    });
  }

  const hashedPassword = bcrypt.hashSync(password, BCRYPT_ROUNDS);

  try {
    // Write to temporary storage first, then migrate to permanent
    const tempKey = `user:register:${username}`;
    await storage.writeToTemp(tempKey, {
      type: 'user',
      operation: 'create',
      params: [username, email, hashedPassword]
    });

    // Wait a moment for migration
    await new Promise(resolve => setTimeout(resolve, 100));

    // Read back to get the user ID
    const user = await storage.readData('user', 'login', [username]);
    
    if (!user) {
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create user' 
      });
    }

    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ 
      success: true,
      token, 
      id: user.id, 
      username, 
      bobux: DEFAULT_BOBUX 
    });
  } catch (err) {
    console.error('Registration error:', err);
    next(err);
  }
});

// Login
router.post('/login', async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ 
      success: false,
      error: 'Username and password are required' 
    });
  }

  try {
    const user = await storage.readData('user', 'login', [username]);
    
    if (!user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid credentials' 
      });
    }

    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ 
      success: true,
      token, 
      id: user.id, 
      username: user.username, 
      bobux: user.bobux 
    });
  } catch (err) {
    console.error('Login error:', err);
    next(err);
  }
});

// Verify token middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: 'Access token required' 
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ 
        success: false,
        error: 'Invalid token' 
      });
    }
    req.user = user;
    next();
  });
};

module.exports = router;
module.exports.authenticateToken = authenticateToken;
