const express = require('express');
const router = express.Router();
const storage = require('../database');
const { authenticateToken } = require('./auth');

// Get all published games
router.get('/', async (req, res) => {
  try {
    const games = await storage.readData('game', 'all', []);
    res.json(games);
  } catch (err) {
    console.error('Error fetching games:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get game by ID
router.get('/:id', async (req, res) => {
  try {
    const game = await storage.readData('game', 'byId', [req.params.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json(game);
  } catch (err) {
    console.error('Error fetching game:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get game items
router.get('/:id/items', async (req, res) => {
  try {
    const items = await storage.readData('game', 'items', [req.params.id]);
    res.json(items);
  } catch (err) {
    console.error('Error fetching game items:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create new game
router.post('/', authenticateToken, async (req, res) => {
  const { title, description, code, published } = req.body;
  const creatorId = req.user.userId;

  if (!title || !code) {
    return res.status(400).json({ error: 'Title and code are required' });
  }

  try {
    const tempKey = `game:create:${Date.now()}`;
    await storage.writeToTemp(tempKey, {
      type: 'game',
      operation: 'create',
      params: [title, description, creatorId, code, published || false]
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const games = await storage.readData('game', 'userGames', [creatorId]);
    const newGame = games[0]; // Most recent game

    res.json({ id: newGame.id, title, description, creatorId, code, published: published || false });
  } catch (err) {
    console.error('Error creating game:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update game
router.put('/:id', authenticateToken, async (req, res) => {
  const { title, description, code, published } = req.body;

  try {
    const game = await storage.readData('game', 'byId', [req.params.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.creator_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const tempKey = `game:update:${req.params.id}`;
    await storage.writeToTemp(tempKey, {
      type: 'game',
      operation: 'update',
      params: [title, description, code, published, req.params.id]
    });

    res.json({ id: req.params.id, title, description, code, published });
  } catch (err) {
    console.error('Error updating game:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add game item
router.post('/:id/items', authenticateToken, async (req, res) => {
  const { name, description, price, type } = req.body;

  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' });
  }

  try {
    const game = await storage.readData('game', 'byId', [req.params.id]);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.creator_id !== req.user.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const tempKey = `game:item:${Date.now()}`;
    await storage.writeToTemp(tempKey, {
      type: 'game',
      operation: 'createItem',
      params: [req.params.id, name, description, price, type || 'item']
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const items = await storage.readData('game', 'items', [req.params.id]);
    const newItem = items[items.length - 1];

    res.json({ id: newItem.id, gameId: req.params.id, name, description, price, type });
  } catch (err) {
    console.error('Error creating game item:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user's games
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.userId);
  
  if (userId !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const games = await storage.readData('game', 'userGames', [userId]);
    res.json(games);
  } catch (err) {
    console.error('Error fetching user games:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
