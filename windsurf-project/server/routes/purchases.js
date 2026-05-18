const express = require('express');
const router = express.Router();
const storage = require('../database');
const { authenticateToken } = require('./auth');

// Purchase game item
router.post('/', authenticateToken, async (req, res) => {
  const { gameItemId } = req.body;
  const userId = req.user.userId;

  if (!gameItemId) {
    return res.status(400).json({ error: 'Game item ID is required' });
  }

  try {
    // Get item details using the new itemById query
    const item = await storage.readData('game', 'itemById', [gameItemId]);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check user's bobux balance
    const user = await storage.readData('user', 'profile', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.bobux < item.price) {
      return res.status(400).json({ error: 'Insufficient bobux' });
    }

    // Process purchase - write to temp first
    const tempKey1 = `user:bobux:${userId}`;
    await storage.writeToTemp(tempKey1, {
      type: 'user',
      operation: 'update',
      params: [-item.price, userId]
    });

    const tempKey2 = `purchase:create:${Date.now()}`;
    await storage.writeToTemp(tempKey2, {
      type: 'purchase',
      operation: 'create',
      params: [userId, gameItemId, item.price]
    });

    const tempKey3 = `purchase:inventory:${Date.now()}`;
    await storage.writeToTemp(tempKey3, {
      type: 'purchase',
      operation: 'addToInventory',
      params: [userId, gameItemId]
    });

    await new Promise(resolve => setTimeout(resolve, 200));

    const updatedUser = await storage.readData('user', 'profile', [userId]);
    res.json({
      success: true,
      item: item,
      newBobuxBalance: updatedUser.bobux
    });
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ error: 'Purchase failed' });
  }
});

// Get purchase history
router.get('/user/:userId', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (userId !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const purchases = await storage.readData('purchase', 'history', [userId]);
    res.json(purchases);
  } catch (err) {
    console.error('Error fetching purchase history:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
