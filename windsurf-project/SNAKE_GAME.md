# Snake Game

A classic snake game where you control a snake to eat food and grow longer.

## Game Code

```javascript
// Snake Game - Classic arcade game
const Game = {
  canvas: canvas,
  ctx: ctx,
  width: canvas.width,
  height: canvas.height
};

// Game settings
const gridSize = 20;
const tileCountX = Math.floor(Game.width / gridSize);
const tileCountY = Math.floor(Game.height / gridSize);

// Snake
let snake = [
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };

// Food
let food = { x: 15, y: 15 };

// Score
let score = 0;
let highScore = 0;

// Game state
let gameOver = false;
let gameSpeed = 100;
let lastUpdate = 0;

// Input handling
canvas.addEventListener('keydown', (e) => {
  switch(e.key) {
    case 'ArrowUp':
    case 'w':
      if (direction.y !== 1) nextDirection = { x: 0, y: -1 };
      break;
    case 'ArrowDown':
    case 's':
      if (direction.y !== -1) nextDirection = { x: 0, y: 1 };
      break;
    case 'ArrowLeft':
    case 'a':
      if (direction.x !== 1) nextDirection = { x: -1, y: 0 };
      break;
    case 'ArrowRight':
    case 'd':
      if (direction.x !== -1) nextDirection = { x: 1, y: 0 };
      break;
    case ' ':
      if (gameOver) resetGame();
      break;
  }
});

// Place food randomly
function placeFood() {
  let validPosition = false;
  while (!validPosition) {
    food = {
      x: Math.floor(Math.random() * tileCountX),
      y: Math.floor(Math.random() * tileCountY)
    };
    // Make sure food doesn't spawn on snake
    validPosition = !snake.some(segment => segment.x === food.x && segment.y === food.y);
  }
}

// Reset game
function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  score = 0;
  gameOver = false;
  gameSpeed = 100;
  placeFood();
}

// Update game state
function update(timestamp) {
  if (gameOver) return;

  // Control game speed
  if (timestamp - lastUpdate < gameSpeed) return;
  lastUpdate = timestamp;

  // Update direction
  direction = nextDirection;

  // Calculate new head position
  const head = { 
    x: snake[0].x + direction.x, 
    y: snake[0].y + direction.y 
  };

  // Check wall collision
  if (head.x < 0 || head.x >= tileCountX || head.y < 0 || head.y >= tileCountY) {
    gameOver = true;
    if (score > highScore) highScore = score;
    return;
  }

  // Check self collision
  if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
    gameOver = true;
    if (score > highScore) highScore = score;
    return;
  }

  // Add new head
  snake.unshift(head);

  // Check food collision
  if (head.x === food.x && head.y === food.y) {
    score += 10;
    placeFood();
    // Increase speed slightly
    if (gameSpeed > 50) gameSpeed -= 2;
  } else {
    // Remove tail
    snake.pop();
  }
}

// Draw game
function draw() {
  // Clear canvas
  Game.ctx.fillStyle = '#1a1a2e';
  Game.ctx.fillRect(0, 0, Game.width, Game.height);

  // Draw grid
  Game.ctx.strokeStyle = '#16213e';
  Game.ctx.lineWidth = 1;
  for (let x = 0; x <= tileCountX; x++) {
    Game.ctx.beginPath();
    Game.ctx.moveTo(x * gridSize, 0);
    Game.ctx.lineTo(x * gridSize, Game.height);
    Game.ctx.stroke();
  }
  for (let y = 0; y <= tileCountY; y++) {
    Game.ctx.beginPath();
    Game.ctx.moveTo(0, y * gridSize);
    Game.ctx.lineTo(Game.width, y * gridSize);
    Game.ctx.stroke();
  }

  // Draw snake
  snake.forEach((segment, index) => {
    Game.ctx.fillStyle = index === 0 ? '#00ff88' : '#00cc6a';
    Game.ctx.fillRect(
      segment.x * gridSize + 1,
      segment.y * gridSize + 1,
      gridSize - 2,
      gridSize - 2
    );
  });

  // Draw food
  Game.ctx.fillStyle = '#ff6b6b';
  Game.ctx.beginPath();
  Game.ctx.arc(
    food.x * gridSize + gridSize / 2,
    food.y * gridSize + gridSize / 2,
    gridSize / 2 - 2,
    0,
    Math.PI * 2
  );
  Game.ctx.fill();

  // Draw score
  Game.ctx.fillStyle = '#ffffff';
  Game.ctx.font = 'bold 24px Arial';
  Game.ctx.fillText(`Score: ${score}`, 20, 40);
  Game.ctx.fillText(`High Score: ${highScore}`, 20, 70);

  // Draw game over screen
  if (gameOver) {
    Game.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    Game.ctx.fillRect(0, 0, Game.width, Game.height);
    
    Game.ctx.fillStyle = '#ffffff';
    Game.ctx.font = 'bold 48px Arial';
    Game.ctx.textAlign = 'center';
    Game.ctx.fillText('GAME OVER', Game.width / 2, Game.height / 2 - 20);
    
    Game.ctx.font = '24px Arial';
    Game.ctx.fillText(`Final Score: ${score}`, Game.width / 2, Game.height / 2 + 30);
    Game.ctx.fillText('Press SPACE to restart', Game.width / 2, Game.height / 2 + 70);
    Game.ctx.textAlign = 'left';
  }

  // Draw instructions
  if (!gameOver) {
    Game.ctx.fillStyle = '#888888';
    Game.ctx.font = '14px Arial';
    Game.ctx.fillText('Use Arrow Keys or WASD to move', 20, Game.height - 20);
  }
}

// Game loop
function gameLoop(timestamp) {
  update(timestamp);
  draw();
  requestAnimationFrame(gameLoop);
}

// Start game
placeFood();
gameLoop(0);
```

## How to Play

- Use **Arrow Keys** or **WASD** to control the snake
- Eat the red food to grow and score points
- Avoid hitting the walls or yourself
- Press **SPACE** to restart when game over

## Game Features

- Classic snake gameplay
- Score tracking with high score
- Progressive difficulty (speed increases as you score)
- Smooth controls
- Visual grid background
- Game over screen with restart option

## Items for Sale

You can add these items to enhance the game:

### Speed Boost (50 Bobux)
Temporarily slows down the snake for easier control

### Extra Life (75 Bobux)
Allows you to continue after hitting a wall or yourself once

### Score Multiplier (100 Bobux)
Doubles your score for 30 seconds
