# 🎮 Boblox - 2D Game Platform

A 2D game platform like Roblox with Bobux currency, powered by Render and GitHub.

## Features

- **User Accounts**: Create an account and start with 100 Bobux
- **Game Creation**: Build your own 2D games using JavaScript and Canvas
- **Marketplace**: Publish games and let others play them
- **In-Game Purchases**: Sell items in your games for Bobux
- **Inventory System**: Track all your purchased items
- **Daily Bobux**: Claim 10 free Bobux daily

## Tech Stack

- **Frontend**: React (via CDN), HTML5 Canvas
- **Backend**: Node.js, Express
- **Storage**: Two-tier storage system (Temporary in-memory + SQLite permanent)
- **Database**: SQLite
- **Deployment**: Render, GitHub

## Local Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Quick Start (Single Server Setup!)

1. Clone the repository:
```bash
git clone <your-repo-url>
cd windsurf-project
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser:
Navigate to http://localhost:5000

**That's it!** The server serves both the API and the frontend from a single URL. All data (accounts, games, purchases) is stored server-side in the SQLite database and persists across sessions.

### Data Persistence

Boblox uses a two-tier storage system for efficient data management:

1. **Temporary Storage (First Tier)**
   - In-memory Map for fast writes
   - Backed up to `server/temp-storage.json` for crash recovery
   - All data is written here first for speed

2. **Permanent SSD Storage (Second Tier)**
   - SQLite database (`server/boblox.db`)
   - Data is migrated from temp storage automatically
   - Used for long-term persistence

3. **Automatic Migration**
   - Background process runs every 10 seconds
   - Moves data from temp to permanent storage
   - Retries failed migrations (max 3 attempts)

All data persists across server restarts and sessions:
- User accounts and authentication
- Games and game code
- In-game items and purchases
- User inventory
- Bobux balances

## Deployment to Render

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
```

### 2. Deploy to Render (Single Service)

Since the app now serves both the frontend and backend from a single server, deployment is simple:

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: boblox
   - **Root Directory**: (leave empty - use root)
   - **Build Command**: npm install
   - **Start Command**: node server/index.js
   - **Environment Variables**:
     - `JWT_SECRET`: (generate a random secret)
     - `PORT`: 5000
5. Click "Deploy Web Service"

That's it! The single Render service will serve both the API and the frontend. No need to deploy separately.

### 3. Access Your App

Once deployed, your app will be available at:
```
https://boblox.onrender.com
```

The frontend automatically detects the server URL, so no configuration needed!

## Environment Variables

Create a `.env` file in the root directory:

```
JWT_SECRET=your-secret-key-here
PORT=5000
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Games
- `GET /api/games` - Get all published games
- `GET /api/games/:id` - Get game by ID
- `GET /api/games/:id/items` - Get game items
- `POST /api/games` - Create new game (auth required)
- `PUT /api/games/:id` - Update game (auth required)
- `POST /api/games/:id/items` - Add game item (auth required)
- `GET /api/games/user/:userId` - Get user's games (auth required)

### Users
- `GET /api/users/:id` - Get user profile (auth required)
- `GET /api/users/:id/inventory` - Get user inventory (auth required)
- `POST /api/users/:id/bobux` - Add bobux to user (auth required)

### Purchases
- `POST /api/purchases` - Purchase game item (auth required)
- `GET /api/purchases/user/:userId` - Get purchase history (auth required)

### Storage
- `GET /api/storage/status` - Get storage system status (temp storage size, migration queue, permanent storage availability)
- `GET /api/health` - Health check endpoint

## Game Development

Games are built using JavaScript and HTML5 Canvas. Each game has access to:

- `canvas` - The canvas element
- `ctx` - The 2D rendering context
- `user` - The current user object
- `items` - Array of purchasable items

Example game code:
```javascript
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let player = { x: 50, y: 50, width: 30, height: 30, color: '#667eea' };
let score = 0;

function gameLoop() {
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);
  
  ctx.fillStyle = '#333';
  ctx.font = '20px Arial';
  ctx.fillText('Score: ' + score, 10, 30);
  
  requestAnimationFrame(gameLoop);
}

gameLoop();
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

There is no license💀
