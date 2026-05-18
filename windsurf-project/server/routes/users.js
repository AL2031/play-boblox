const express = require('express');
const router = express.Router();
const storage = require('../database');
const { authenticateToken } = require('./auth');

// Get user profile
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await storage.readData('user', 'profile', [req.params.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user profile:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user inventory
router.get('/:id/inventory', authenticateToken, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (userId !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  try {
    const items = await storage.readData('purchase', 'inventory', [userId]);
    res.json(items);
  } catch (err) {
    console.error('Error fetching inventory:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add bobux (admin function or daily bonus)
router.post('/:id/bobux', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const userId = parseInt(req.params.id);

  if (userId !== req.user.userId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  try {
    const tempKey = `user:bobux:${userId}`;
    await storage.writeToTemp(tempKey, {
      type: 'user',
      operation: 'update',
      params: [amount, userId]
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const user = await storage.readData('user', 'profile', [userId]);
    res.json({ bobux: user.bobux });
  } catch (err) {
    console.error('Error adding bobux:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;
