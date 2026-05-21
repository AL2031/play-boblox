const express = require('express');
const router = express.Router();
const storage = require('../database');
const { authenticateToken } = require('./auth');
const { authorizeUser } = require('../middleware');
const { DEFAULT_GAME_TYPE, MIGRATION_DELAY_MS } = require('../constants');

// Get all published games
router.get('/', async (req, res, next) => {
  try {
    const games = await storage.readData('game', 'all', []);
    res.json({ success: true, games });
  } catch (err) {
    console.error('Error fetching games:', err);
    next(err);
  }
});

// Get game by ID
router.get('/:id', async (req, res, next) => {
  try {
    const game = await storage.readData('game', 'byId', [req.params.id]);
    if (!game) {
      return res.status(404).json({ 
        success: false,
        error: 'Game not found' 
      });
    }
    res.json({ success: true, game });
  } catch (err) {
    console.error('Error fetching game:', err);
    next(err);
  }
});

// Get game items
router.get('/:id/items', async (req, res, next) => {
  try {
    const items = await storage.readData('game', 'items', [req.params.id]);
    res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching game items:', err);
    next(err);
  }
});

// Create new game
router.post('/', authenticateToken, async (req, res, next) => {
  const { title, description, code, published } = req.body;
  const creatorId = req.user.userId;

  if (!title || !code) {
    return res.status(400).json({ 
      success: false,
      error: 'Title and code are required' 
    });
  }

  try {
    const tempKey = `game:create:${Date.now()}`;
    await storage.writeToTemp(tempKey, {
      type: 'game',
      operation: 'create',
      params: [title, description, creatorId, code, published || false]
    });

    await new Promise(resolve => setTimeout(resolve, MIGRATION_DELAY_MS));

    const games = await storage.readData('game', 'userGames', [creatorId]);
    const newGame = games[0]; // Most recent game

    res.json({ 
      success: true,
      id: newGame.id, 
      title, 
      description, 
      creatorId, 
      code, 
      published: published || false 
    });
  } catch (err) {
    console.error('Error creating game:', err);
    next(err);
  }
});

// Update game
router.put('/:id', authenticateToken, async (req, res, next) => {
  const { title, description, code, published } = req.body;

  try {
    const game = await storage.readData('game', 'byId', [req.params.id]);
    if (!game) {
      return res.status(404).json({ 
        success: false,
        error: 'Game not found' 
      });
    }

    if (game.creator_id !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized' 
      });
    }

    const tempKey = `game:update:${req.params.id}`;
    await storage.writeToTemp(tempKey, {
      type: 'game',
      operation: 'update',
      params: [title, description, code, published, req.params.id]
    });

    res.json({ 
      success: true,
      id: req.params.id, 
      title, 
      description, 
      code, 
      published 
    });
  } catch (err) {
    console.error('Error updating game:', err);
    next(err);
  }
});

// Add game item
router.post('/:id/items', authenticateToken, async (req, res, next) => {
  const { name, description, price, type } = req.body;

  if (!name || !price) {
    return res.status(400).json({ 
      success: false,
      error: 'Name and price are required' 
    });
  }

  try {
    const game = await storage.readData('game', 'byId', [req.params.id]);
    if (!game) {
      return res.status(404).json({ 
        success: false,
        error: 'Game not found' 
      });
    }

    if (game.creator_id !== req.user.userId) {
      return res.status(403).json({ 
        success: false,
        error: 'Not authorized' 
      });
    }

    const tempKey = `game:item:${Date.now()}`;
    await storage.writeToTemp(tempKey, {
      type: 'game',
      operation: 'createItem',
      params: [req.params.id, name, description, price, type || DEFAULT_GAME_TYPE]
    });

    await new Promise(resolve => setTimeout(resolve, MIGRATION_DELAY_MS));

    const items = await storage.readData('game', 'items', [req.params.id]);
    const newItem = items[items.length - 1];

    res.json({ 
      success: true,
      id: newItem.id, 
      gameId: req.params.id, 
      name, 
      description, 
      price, 
      type 
    });
  } catch (err) {
    console.error('Error creating game item:', err);
    next(err);
  }
});

// Get user's games
router.get('/user/:userId', authenticateToken, authorizeUser, async (req, res, next) => {
  try {
    const games = await storage.readData('game', 'userGames', [req.user.userId]);
    res.json({ success: true, games });
  } catch (err) {
    console.error('Error fetching user games:', err);
    next(err);
  }
});

module.exports = router;
