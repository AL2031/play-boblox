const express = require('express');
const router = express.Router();
const storage = require('../database');
const { authenticateToken } = require('./auth');
const { authorizeUser } = require('../middleware');
const { DAILY_REWARD_AMOUNT, DAILY_REWARD_COOLDOWN_HOURS } = require('../constants');

// Get user profile
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const user = await storage.readData('user', 'profile', [req.params.id]);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error fetching user profile:', err);
    next(err);
  }
});

// Get user inventory
router.get('/:id/inventory', authenticateToken, authorizeUser, async (req, res, next) => {
  try {
    const items = await storage.readData('purchase', 'inventory', [req.user.userId]);
    res.json({ success: true, items });
  } catch (err) {
    console.error('Error fetching inventory:', err);
    next(err);
  }
});

// Add bobux (admin function or daily bonus)
router.post('/:id/bobux', authenticateToken, authorizeUser, async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ 
      success: false,
      error: 'Invalid amount' 
    });
  }

  try {
    const tempKey = `user:bobux:${req.user.userId}`;
    await storage.writeToTemp(tempKey, {
      type: 'user',
      operation: 'update',
      params: [amount, req.user.userId]
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const user = await storage.readData('user', 'profile', [req.user.userId]);
    res.json({ success: true, bobux: user.bobux });
  } catch (err) {
    console.error('Error adding bobux:', err);
    next(err);
  }
});

// Claim daily reward
router.post('/:id/daily-reward', authenticateToken, authorizeUser, async (req, res, next) => {
  try {
    // Check if user can claim
    const canClaim = await storage.canClaimDailyReward(req.user.userId);
    
    if (!canClaim) {
      // Get last claim time for error message
      const lastClaim = await new Promise((resolve, reject) => {
        storage.permanentDb.get(
          'SELECT claimed_at FROM daily_rewards WHERE user_id = ? ORDER BY claimed_at DESC LIMIT 1',
          [req.user.userId],
          (err, row) => err ? reject(err) : resolve(row)
        );
      });
      
      const lastClaimTime = lastClaim ? new Date(lastClaim.claimed_at) : null;
      const now = new Date();
      const hoursUntilNext = lastClaimTime ? DAILY_REWARD_COOLDOWN_HOURS - ((now - lastClaimTime) / (1000 * 60 * 60)) : 0;
      
      return res.status(400).json({ 
        success: false,
        error: 'Daily reward already claimed',
        canClaim: false,
        hoursUntilNext: Math.max(0, Math.ceil(hoursUntilNext))
      });
    }

    // Claim the reward
    await storage.claimDailyReward(req.user.userId, DAILY_REWARD_AMOUNT);

    // Add bobux to user
    const tempKey = `user:bobux:${req.user.userId}`;
    await storage.writeToTemp(tempKey, {
      type: 'user',
      operation: 'update',
      params: [DAILY_REWARD_AMOUNT, req.user.userId]
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    const user = await storage.readData('user', 'profile', [req.user.userId]);
    
    res.json({ 
      success: true, 
      bobux: user.bobux, 
      rewardAmount: DAILY_REWARD_AMOUNT,
      canClaim: false
    });
  } catch (err) {
    console.error('Error claiming daily reward:', err);
    next(err);
  }
});

// Check daily reward status
router.get('/:id/daily-reward-status', authenticateToken, authorizeUser, async (req, res, next) => {
  try {
    const canClaim = await storage.canClaimDailyReward(req.user.userId);
    
    // Get last claim time
    const lastClaim = await new Promise((resolve, reject) => {
      storage.permanentDb.get(
        'SELECT claimed_at FROM daily_rewards WHERE user_id = ? ORDER BY claimed_at DESC LIMIT 1',
        [req.user.userId],
        (err, row) => err ? reject(err) : resolve(row)
      );
    });
    
    const lastClaimTime = lastClaim ? new Date(lastClaim.claimed_at) : null;
    const now = new Date();
    
    let hoursUntilNext = 0;
    if (lastClaimTime && !canClaim) {
      const hoursSinceClaim = (now - lastClaimTime) / (1000 * 60 * 60);
      hoursUntilNext = DAILY_REWARD_COOLDOWN_HOURS - hoursSinceClaim;
    }
    
    res.json({ 
      success: true,
      canClaim, 
      lastClaimTime: lastClaimTime ? lastClaimTime.toISOString() : null,
      hoursUntilNext: Math.max(0, Math.ceil(hoursUntilNext))
    });
  } catch (err) {
    console.error('Error checking daily reward status:', err);
    next(err);
  }
});

module.exports = router;
