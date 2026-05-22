const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { DEFAULT_PORT, CACHE_CONTROL_HEADERS } = require('./constants');
const { errorHandler, requestLogger } = require('./middleware');
const db = require('./database');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const userRoutes = require('./routes/users');
const purchaseRoutes = require('./routes/purchases');

const app = express();
const PORT = process.env.PORT || DEFAULT_PORT;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(requestLogger);

// Serve static files from client/public with no cache
app.use(express.static(path.join(__dirname, '../client/public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      Object.entries(CACHE_CONTROL_HEADERS).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
    }
  }
}));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/purchases', purchaseRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'ok', 
    message: 'Boblox server is running',
    timestamp: new Date().toISOString()
  });
});

// Storage status endpoint
app.get('/api/storage/status', (req, res) => {
  const status = db.getStorageStatus();
  res.json({ 
    success: true,
    ...status,
    timestamp: new Date().toISOString()
  });
});

// Serve the main HTML file for all non-API routes with no cache
app.get('*', (req, res) => {
  Object.entries(CACHE_CONTROL_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Boblox server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
