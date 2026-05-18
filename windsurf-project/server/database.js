const storageManager = require('./storage-manager');

// Initialize storage manager (async, but we'll let it run in background)
storageManager.initialize().catch(err => {
  console.error('Failed to initialize storage manager:', err);
});

// Export the storage manager for use in routes
module.exports = storageManager;

// Add a ready check
module.exports.isReady = () => {
  return storageManager.permanentStorageAvailable !== null;
};
