# Boblox Game Development Guide

Welcome to Boblox Game Development! This guide will teach you how to create amazing 2D games using the Boblox Game Engine.

## Table of Contents

1. [Getting Started](#getting-started)
2. [The Game Engine API](#the-game-engine-api)
3. [Basic Game Structure](#basic-game-structure)
4. [Drawing and Graphics](#drawing-and-graphics)
5. [Animation System](#animation-system)
6. [Input Handling](#input-handling)
7. [Collision Detection](#collision-detection)
8. [Transactions and Items](#transactions-and-items)
9. [Advanced Features](#advanced-features)
10. [Exporting and Importing Games](#exporting-and-importing-games)
11. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

- Basic understanding of JavaScript
- Familiarity with HTML5 Canvas (helpful but not required)
- A Boblox account with at least 100 Bobux

### Your First Game

1. Log in to Boblox
2. Navigate to Dashboard
3. Click "Create Game"
4. Fill in the game details
5. Write your game code in the code editor
6. Add in-game items (optional)
7. Click "Create Game"

### The Starting Game

Boblox comes with a pre-installed game called "Boblox Adventure" that demonstrates all the game engine features. Play it to learn the basics!

## The Game Engine API

The Boblox Game Engine provides a comprehensive API through the `Game` object:

```javascript
const Game = {
  canvas: canvas,           // The canvas element
  ctx: ctx,                 // The 2D rendering context
  width: canvas.width,      // Canvas width
  height: canvas.height,    // Canvas height
  
  player: {                 // Player object
    x: 100,
    y: 100,
    width: 40,
    height: 40,
    color: '#667eea',
    speed: 5,
    score: 0,
    coins: 0
  },
  
  state: {                  // Game state
    isRunning: true,
    level: 1,
    time: 0
  },
  
  // ... more methods
};
```

## Basic Game Structure

Every Boblox game follows this structure:

```javascript
// 1. Setup the Game object
const Game = {
  canvas: canvas,
  ctx: ctx,
  width: canvas.width,
  height: canvas.height,
  player: { x: 100, y: 100, width: 40, height: 40, color: '#667eea' },
  state: { isRunning: true }
};

// 2. Create game objects
const enemies = [];
const collectibles = [];

// 3. Handle input
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

// 4. Game loop
function gameLoop(timestamp) {
  if (!Game.state.isRunning) return;
  
  // Update game logic
  update();
  
  // Draw everything
  draw();
  
  // Request next frame
  requestAnimationFrame(gameLoop);
}

// 5. Start the game
gameLoop(0);
```

## Drawing and Graphics

### Drawing Shapes

```javascript
// Draw rectangle
Game.rect(x, y, width, height, color);

// Draw circle
Game.circle(x, y, radius, color);

// Draw text
Game.text('Hello World', x, y, size, color);

// Clear canvas
Game.clear(color); // or Game.clear() for default color
```

### Example: Drawing a Player

```javascript
function drawPlayer() {
  Game.rect(Game.player.x, Game.player.y, Game.player.width, Game.player.height, Game.player.color);
  
  // Draw eyes
  Game.circle(Game.player.x + 10, Game.player.y + 10, 5, '#fff');
  Game.circle(Game.player.x + 30, Game.player.y + 10, 5, '#fff');
  
  // Draw pupils
  Game.circle(Game.player.x + 12, Game.player.y + 10, 2, '#000');
  Game.circle(Game.player.x + 32, Game.player.y + 10, 2, '#000');
}
```

## Animation System

The Boblox Game Engine includes a powerful animation system with easing functions.

### Adding Animations

```javascript
// Animate player size with bounce effect
Game.addAnimation(Game.player, 'width', 40, 60, 500, 'bounce');

// Animate position with smooth easing
Game.addAnimation(Game.player, 'x', 100, 200, 1000, 'easeInOut');
```

### Easing Functions

- `linear` - Constant speed
- `easeInOut` - Slow start and end, fast in middle
- `easeOut` - Fast start, slow end
- `bounce` - Bounces at the end

### Updating Animations

```javascript
function update(deltaTime) {
  Game.updateAnimations(deltaTime);
}
```

### Example: Coin Collection Animation

```javascript
function collectCoin(coin) {
  Game.player.coins += 1;
  
  // Bounce animation
  Game.addAnimation(Game.player, 'width', 40, 50, 200, 'bounce');
  setTimeout(() => {
    Game.addAnimation(Game.player, 'width', 50, 40, 200, 'easeOut');
  }, 200);
}
```

## Input Handling

### Keyboard Input

```javascript
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

// In your update function
function update() {
  if (keys['ArrowLeft'] || keys['a']) Game.player.x -= Game.player.speed;
  if (keys['ArrowRight'] || keys['d']) Game.player.x += Game.player.speed;
  if (keys['ArrowUp'] || keys['w']) Game.player.y -= Game.player.speed;
  if (keys['ArrowDown'] || keys['s']) Game.player.y += Game.player.speed;
}
```

### Mouse Input

```javascript
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Handle click at (x, y)
});
```

## Collision Detection

### Rectangle Collision

```javascript
if (Game.collision(player, enemy)) {
  // Handle collision
}
```

### Circle Collision

```javascript
function circleCollision(c1, c2) {
  const dx = c1.x - c2.x;
  const dy = c1.y - c2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < c1.radius + c2.radius;
}
```

### Example: Collecting Items

```javascript
collectibles.forEach((coin, index) => {
  if (!coin.collected && Game.collision(Game.player, coin)) {
    coin.collected = true;
    Game.player.score += 10;
    collectCoinAnimation();
  }
});
```

## Transactions and Items

### Giving Items to Players

```javascript
// Give an item to the player
Game.giveItem(itemId);
```

This will add the item to the player's inventory and deduct Bobux from their balance.

### Starting Transactions

```javascript
// Start a Bobux transaction
Game.startTransaction(amount, description);
```

This will prompt the player to confirm the transaction before deducting Bobux.

### Example: Power-up Purchase

```javascript
function buyPowerup() {
  Game.startTransaction(50, 'Speed Boost Power-up');
  
  // Listen for transaction result
  window.addEventListener('message', (e) => {
    if (e.data.type === 'transactionSuccess') {
      Game.player.speed += 2;
    }
  });
}
```

## Advanced Features

### Particle System

```javascript
const particles = [];

function createParticle(x, y, color) {
  particles.push({
    x: x,
    y: y,
    vx: (Math.random() - 0.5) * 10,
    vy: (Math.random() - 0.5) * 10,
    life: 1.0,
    color: color
  });
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.02;
    
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach(p => {
    Game.circle(p.x, p.y, 5 * p.life, p.color);
  });
}
```

### Sound Effects

```javascript
const audio = new Audio('sound.mp3');
audio.play();
```

### Level System

```javascript
const levels = [
  { enemies: 5, coins: 10 },
  { enemies: 10, coins: 15 },
  { enemies: 15, coins: 20 }
];

function loadLevel(levelIndex) {
  const level = levels[levelIndex];
  // Spawn enemies and coins based on level
}
```

### Save/Load System

```javascript
function saveGame() {
  const saveData = {
    player: Game.player,
    score: Game.player.score,
    level: Game.state.level
  };
  localStorage.setItem('boblox_save', JSON.stringify(saveData));
}

function loadGame() {
  const saveData = JSON.parse(localStorage.getItem('boblox_save'));
  if (saveData) {
    Game.player = saveData.player;
    Game.player.score = saveData.score;
    Game.state.level = saveData.level;
  }
}
```

## Exporting and Importing Games

### Export Your Game

1. Go to your game in the Game Creator
2. Click "Download Game (.txt)"
3. Save the file to your computer

### Import a Game

1. Go to Create Game
2. Click "Import Game (.txt)"
3. Select the game file
4. The game code and items will be loaded automatically

### Game File Format

Game files are JSON format:

```json
{
  "title": "My Game",
  "description": "A fun game",
  "code": "// Game code here",
  "items": [
    {
      "name": "Power-up",
      "description": "Makes you faster",
      "price": 10,
      "type": "powerup"
    }
  ]
}
```

## Best Practices

### Performance

- Use `requestAnimationFrame` for smooth animations
- Limit the number of particles and objects
- Use object pooling for frequently created/destroyed objects
- Avoid expensive operations in the game loop

### Code Organization

- Separate update logic from draw logic
- Use functions for reusable code
- Comment your code
- Use meaningful variable names

### Game Design

- Start simple and add complexity gradually
- Test frequently
- Get feedback from other players
- Balance difficulty
- Add visual feedback for player actions

### Security

- Never trust client-side data for critical operations
- Validate all inputs
- Use the built-in transaction system for Bobux operations

## Complete Example: Simple Platformer

```javascript
const Game = {
  canvas: canvas,
  ctx: ctx,
  width: canvas.width,
  height: canvas.height,
  player: {
    x: 50,
    y: 300,
    width: 40,
    height: 40,
    color: '#667eea',
    vx: 0,
    vy: 0,
    speed: 5,
    jumpForce: 15,
    grounded: false
  },
  gravity: 0.8,
  platforms: [
    { x: 0, y: 350, width: 800, height: 50 },
    { x: 200, y: 250, width: 150, height: 20 },
    { x: 450, y: 180, width: 150, height: 20 }
  ],
  coins: [],
  state: { isRunning: true, score: 0 }
};

// Create coins
for (let i = 0; i < 5; i++) {
  Game.coins.push({
    x: Math.random() * 700 + 50,
    y: Math.random() * 200 + 100,
    radius: 10,
    color: '#f39c12',
    collected: false
  });
}

const keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === ' ' && Game.player.grounded) {
    Game.player.vy = -Game.player.jumpForce;
    Game.player.grounded = false;
  }
});
document.addEventListener('keyup', (e) => keys[e.key] = false);

function update() {
  // Horizontal movement
  if (keys['ArrowLeft'] || keys['a']) Game.player.vx = -Game.player.speed;
  else if (keys['ArrowRight'] || keys['d']) Game.player.vx = Game.player.speed;
  else Game.player.vx = 0;

  // Apply gravity
  Game.player.vy += Game.gravity;

  // Update position
  Game.player.x += Game.player.vx;
  Game.player.y += Game.player.vy;

  // Platform collision
  Game.player.grounded = false;
  Game.platforms.forEach(platform => {
    if (Game.collision(Game.player, platform)) {
      if (Game.player.vy > 0 && Game.player.y + Game.player.height - Game.player.vy <= platform.y) {
        Game.player.y = platform.y - Game.player.height;
        Game.player.vy = 0;
        Game.player.grounded = true;
      }
    }
  });

  // Keep in bounds
  Game.player.x = Math.max(0, Math.min(Game.width - Game.player.width, Game.player.x));
  if (Game.player.y > Game.height) {
    Game.player.y = 300;
    Game.player.vy = 0;
  }

  // Coin collection
  Game.coins.forEach(coin => {
    if (!coin.collected) {
      const dx = (Game.player.x + Game.player.width/2) - coin.x;
      const dy = (Game.player.y + Game.player.height/2) - coin.y;
      const distance = Math.sqrt(dx*dx + dy*dy);
      
      if (distance < coin.radius + 20) {
        coin.collected = true;
        Game.state.score += 10;
        Game.addAnimation(Game.player, 'width', 40, 50, 200, 'bounce');
        setTimeout(() => {
          Game.addAnimation(Game.player, 'width', 50, 40, 200, 'easeOut');
        }, 200);
      }
    }
  });
}

function draw() {
  Game.clear('#1a1a2e');

  // Draw platforms
  Game.platforms.forEach(platform => {
    Game.rect(platform.x, platform.y, platform.width, platform.height, '#4a4a6a');
  });

  // Draw coins
  Game.coins.forEach(coin => {
    if (!coin.collected) {
      Game.circle(coin.x, coin.y, coin.radius, coin.color);
    }
  });

  // Draw player
  Game.rect(Game.player.x, Game.player.y, Game.player.width, Game.player.height, Game.player.color);

  // Draw UI
  Game.text('Score: ' + Game.state.score, 10, 30, 20, '#fff');
  Game.text('Arrow Keys to move, Space to jump', 10, Game.height - 20, 14, '#888');
}

function gameLoop(timestamp) {
  if (!Game.state.isRunning) return;
  
  update();
  draw();
  
  requestAnimationFrame(gameLoop);
}

gameLoop(0);
```

## Need Help?

- Check the "Boblox Adventure" game for examples
- Join the Boblox community forums
- Read the API documentation
- Experiment and have fun!

Happy game development! 🎮
