const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const userRoutes = require('./routes/users');
const purchaseRoutes = require('./routes/purchases');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ===== API ROUTES FIRST (BEFORE STATIC FILES) =====
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/purchases', purchaseRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Boblox server is running' });
});

// Storage status endpoint
app.get('/api/storage/status', (req, res) => {
  const status = db.getStorageStatus();
  res.json(status);
});

// ===== SERVE STATIC FILES AFTER API ROUTES =====
// Try build first (production), fallback to public (development)
const buildPath = path.join(__dirname, '../client/build');
const publicPath = path.join(__dirname, '../client/public');

app.use(express.static(buildPath));
app.use(express.static(publicPath));

// ===== FALLBACK TO INDEX.HTML FOR REACT ROUTER =====
app.get('*', (req, res) => {
  // Try build first, then public
  const buildIndex = path.join(buildPath, 'index.html');
  const publicIndex = path.join(publicPath, 'index.html');
  
  res.sendFile(buildIndex, (err) => {
    if (err) {
      res.sendFile(publicIndex, (err) => {
        if (err) {
          res.status(404).json({ error: 'index.html not found' });
        }
      });
    }
  });
});

// Initialize database and start server
async function startServer() {
  try {
    console.log('Initializing database...');
    await db.initialize();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Boblox server running on port ${PORT}`);
      console.log(`Open http://localhost:${PORT} in your browser`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

startServer();
