# Boblox Deployment Guide

This guide covers everything from downloading the project to setting it up locally and deploying to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Download and Setup](#download-and-setup)
3. [Local Development](#local-development)
4. [Understanding the Two-Tier Storage System](#understanding-the-two-tier-storage-system)
5. [Deployment to Render](#deployment-to-render)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have:

- **Node.js** (v14 or higher) installed locally
- **Git** installed locally
- A code editor (VS Code recommended)
- A GitHub account (for deployment)
- A Render account (free tier works for testing)

## Download and Setup

### Option 1: Clone from GitHub

If you have the project in a GitHub repository:

```bash
git clone https://github.com/YOUR_USERNAME/boblox.git
cd boblox
```

### Option 2: Download ZIP

1. Download the project as a ZIP file from GitHub
2. Extract the ZIP file to your desired location
3. Navigate to the project directory:
```bash
cd boblox
```

### Verify Project Structure

Your project should have this structure:
```
boblox/
├── client/
│   └── public/
│       └── index.html
├── server/
│   ├── index.js
│   ├── database.js
│   ├── storage-manager.js
│   └── routes/
│       ├── auth.js
│       ├── games.js
│       ├── users.js
│       └── purchases.js
├── package.json
├── .env.example
├── .gitignore
├── render.yaml
├── README.md
└── DEPLOYMENT.md
```

## Local Development

### Step 1: Install Dependencies

Install the required Node.js packages:

```bash
npm install
```

This will install:
- express - Web server framework
- cors - Cross-origin resource sharing
- sqlite3 - SQLite database driver
- bcryptjs - Password hashing
- jsonwebtoken - JWT authentication
- body-parser - Request body parsing

### Step 2: Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit the `.env` file with your settings:

```env
JWT_SECRET=your-secret-key-here-change-this-in-production
PORT=5000
```

**Important:** Change `JWT_SECRET` to a random, secure string for production.

### Step 3: Start the Server

Start the development server:

```bash
npm start
```

You should see:
```
Boblox server running on port 5000
Open http://localhost:5000 in your browser
Permanent SSD storage initialized
```

### Step 4: Access the Application

Open your browser and navigate to:
```
http://localhost:5000
```

You should see the Boblox homepage with:
- Hero section
- Feature highlights
- Login/Register buttons

### Step 5: Test the Application

1. **Register an Account**
   - Click "Register"
   - Enter username, email, and password
   - Click "Sign Up"

2. **Create a Game**
   - Navigate to Dashboard
   - Click "Create Game"
   - Enter game details and code
   - Click "Publish Game"

3. **Play a Game**
   - Go to Marketplace
   - Click "Play" on a game
   - The game canvas will load

4. **Purchase Items**
   - While playing a game, click items in the shop
   - Items will be added to your inventory

5. **Check Storage Status**
   - Visit `http://localhost:5000/api/storage/status`
   - View temp storage size, migration queue, and permanent storage status

## Understanding the Two-Tier Storage System

Boblox uses a two-tier storage system for efficient data management:

### How It Works

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
   - Removes migrated data from temp after 5 seconds

### Benefits

- **Fast Writes**: Data is written to in-memory storage first
- **Reliability**: Permanent storage ensures data persists
- **Crash Recovery**: Temp storage is backed up to file
- **Automatic**: No manual migration needed

### Storage Files

- `server/temp-storage.json` - Temporary storage backup
- `server/boblox.db` - Permanent SQLite database

### Monitoring Storage Status

Check the storage status via API:
```bash
curl http://localhost:5000/api/storage/status
```

Response:
```json
{
  "tempStorageSize": 5,
  "migrationQueueSize": 2,
  "isMigrating": true,
  "permanentStorageAvailable": true
}
```

## Deployment to Render

### Step 1: Initialize Git (if not already done)

```bash
git init
```

### Step 2: Review .gitignore

The `.gitignore` file excludes:
- `node_modules/` - Dependencies
- `*.db` - Database files (will be created on server)
- `.env` - Environment variables (set in Render)
- `*.log` - Log files

### Step 3: Create GitHub Repository

1. Go to [github.com](https://github.com) and create a new repository
2. Name it "boblox" or your preferred name
3. Make it Public or Private (your choice)
4. Don't initialize with README (we have one)

### Step 4: Push to GitHub

```bash
git add .
git commit -m "Initial commit - Boblox game platform with two-tier storage"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 5: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Verify your email

### Step 6: Deploy Service

#### Option A: Manual Deployment

1. Click "New +" in the top right
2. Select "Web Service"
3. Click "Connect GitHub" and authorize
4. Select your boblox repository
5. Configure the service:

**Basic Settings:**
- Name: `boblox`
- Region: Closest to your users
- Branch: `main`

**Runtime:**
- Environment: `Node`
- Build Command: `npm install`
- Start Command: `node server/index.js`

**Environment Variables:**
- `JWT_SECRET`: Click "Generate" to create a random secret
- `PORT`: `5000`

6. Click "Deploy Web Service"
7. Wait for deployment (2-3 minutes)

#### Option B: Blueprint Deployment (Automatic)

Use the included `render.yaml` file:

1. Push your code to GitHub
2. In Render, click "New +" → "Blueprint"
3. Select your repository
4. Render will detect `render.yaml` and set up the service automatically

### Step 7: Verify Deployment

Once deployed, open your Render URL (e.g., `https://boblox.onrender.com`)

You should see the Boblox homepage. The frontend automatically detects the server URL.

### Step 8: Test Production Deployment

1. Open your Render URL
2. Register a new account
3. Create a game
4. Play the game
5. Buy an item from the shop
6. Refresh the page - your account and data should persist
7. Check storage status: `https://your-app.onrender.com/api/storage/status`

## Monitoring and Maintenance

### Checking Storage Status

Monitor the two-tier storage system:

```bash
curl https://your-app.onrender.com/api/storage/status
```

### Health Check

Check if the server is running:

```bash
curl https://your-app.onrender.com/api/health
```

Response:
```json
{
  "status": "ok",
  "message": "Boblox server is running"
}
```

### Viewing Logs

In Render:
1. Go to your service dashboard
2. Click "Logs"
3. View real-time logs for:
   - Storage initialization
   - Migration status
   - API requests
   - Errors

### Database Backup

For production, consider:
- Regular database backups
- Using PostgreSQL instead of SQLite
- Implementing backup scripts

## Troubleshooting

### Local Development Issues

**Server Won't Start**
```bash
# Check if port 5000 is already in use
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Mac/Linux

# Kill the process or change PORT in .env
PORT=3000 npm start
```

**Database Errors**
- Delete `server/boblox.db` and restart the server
- Check SQLite3 is installed correctly
- Verify file permissions

**Migration Issues**
- Check `server/temp-storage.json` exists
- Verify `server/boblox.db` is writable
- Check logs for migration errors

### Deployment Issues

**Service Won't Start**
- Check Render logs for errors
- Ensure all dependencies are in `package.json`
- Verify the start command is `node server/index.js`
- Check environment variables are set correctly

**Build Failures**
- Check that all dependencies are listed in package.json
- Ensure Node.js version is compatible (v14+)
- Review build logs in Render dashboard

**Database Issues on Render**
- SQLite database is created automatically on first run
- Database file is stored in `server/boblox.db`
- On Render, the database persists in the service's storage
- If database is lost, all data will be lost (consider PostgreSQL for production)

**Storage Migration Issues**
- Check storage status endpoint
- Verify permanent storage is available
- Review migration queue size
- Check logs for migration errors

### Free Tier Limitations

- Free services spin down after 15 minutes of inactivity
- Cold starts can take 30-60 seconds
- Limited to 512MB RAM
- SQLite database size limited by disk space

### Performance Optimization

For production use, consider:
- Paid Render tier ($7/month) to keep services running
- Add a PostgreSQL database for better performance
- Use a CDN for static assets
- Implement caching strategies
- Add rate limiting

## Custom Domain

To use a custom domain:

1. Purchase a domain (e.g., boblox.com)
2. In Render, go to your service settings
3. Click "Domains" → "Add Domain"
4. Follow the DNS instructions
5. Enable SSL (automatic on Render)

## Security Best Practices

1. **Change JWT_SECRET**: Never use the default secret in production
2. **Use HTTPS**: Render provides automatic SSL
3. **Environment Variables**: Never commit `.env` to Git
4. **Rate Limiting**: Implement rate limiting for API endpoints
5. **Input Validation**: Validate all user inputs
6. **Password Security**: Use strong password requirements

## Support

If you encounter issues:
- Check Render status page: status.render.com
- Review Render documentation: render.com/docs
- Check the logs in your Render dashboard
- Verify storage status via API endpoint

## Next Steps

After successful deployment:
1. Monitor storage migration status regularly
2. Set up database backups
3. Implement logging and monitoring
4. Add error tracking (e.g., Sentry)
5. Consider upgrading to paid tier for production
6. Implement CI/CD pipeline for automated deployments
