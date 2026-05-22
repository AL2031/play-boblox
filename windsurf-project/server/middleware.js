// Express middleware

/**
 * Error handling middleware
 * Catches all errors and returns consistent error responses
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or expired token'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Request logging middleware
 * Logs incoming requests for debugging
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  
  next();
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Authorization middleware
 * Checks if the user ID in params matches the authenticated user
 * Supports both 'id' and 'userId' parameter names
 */
const authorizeUser = (req, res, next) => {
  const userId = parseInt(req.params.id || req.params.userId);
  
  if (userId !== req.user.userId) {
    return res.status(403).json({ 
      success: false,
      error: 'Not authorized' 
    });
  }
  
  next();
};

module.exports = {
  errorHandler,
  requestLogger,
  asyncHandler,
  authorizeUser
};
