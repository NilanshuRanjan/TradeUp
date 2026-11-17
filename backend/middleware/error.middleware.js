const errorHandler = (error, req, res, next) => {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Default error response
  let statusCode = 500;
  let errorResponse = {
    success: false,
    error: 'Internal server error',
    details: null
  };

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    statusCode = 400;
    const validationErrors = {};
    Object.keys(error.errors).forEach(key => {
      validationErrors[key] = error.errors[key].message;
    });
    
    errorResponse = {
      success: false,
      error: 'Validation failed',
      details: validationErrors
    };
  }

  // Mongoose duplicate key error (11000)
  else if (error.code === 11000) {
    statusCode = 409;
    const field = Object.keys(error.keyValue || error.keyPattern || {})[0] || 'field';
    errorResponse = {
      success: false,
      error: `Duplicate ${field}`,
      details: { [field]: `This ${field} already exists` }
    };
  }

  // Mongoose cast error (invalid ObjectId)
  else if (error.name === 'CastError') {
    statusCode = 400;
    errorResponse = {
      success: false,
      error: 'Invalid ID format',
      details: { [error.path]: 'Invalid ID provided' }
    };
  }

  // JWT errors
  else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorResponse = {
      success: false,
      error: 'Invalid token',
      details: null
    };
  }

  else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    errorResponse = {
      success: false,
      error: 'Token has expired',
      details: null
    };
  }

  // Custom application errors (if we add statusCode to thrown errors)
  else if (error.statusCode) {
    statusCode = error.statusCode;
    errorResponse = {
      success: false,
      error: error.message || 'Application error',
      details: error.details || null
    };
  }

  // Syntax errors (malformed JSON, etc.)
  else if (error.type === 'entity.parse.failed') {
    statusCode = 400;
    errorResponse = {
      success: false,
      error: 'Invalid JSON format',
      details: null
    };
  }

  // Request entity too large
  else if (error.type === 'entity.too.large') {
    statusCode = 413;
    errorResponse = {
      success: false,
      error: 'Request entity too large',
      details: null
    };
  }

  // In production, don't expose internal error details
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    errorResponse.error = 'Internal server error';
    errorResponse.details = null;
  }

  res.status(statusCode).json(errorResponse);
};

// Async error wrapper to catch async errors in route handlers
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Custom error class for application-specific errors
class AppError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  AppError
};