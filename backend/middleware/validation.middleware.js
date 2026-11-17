const { body, param, validationResult } = require('express-validator');
const { AppError } = require('./error.middleware');

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = {};
    errors.array().forEach(error => {
      validationErrors[error.path] = error.msg;
    });
    
    throw new AppError('Validation failed', 400, validationErrors);
  }
  next();
};

// Sanitization helper
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  // Remove HTML tags and trim whitespace
  return str.replace(/<[^>]*>/g, '').trim();
};

// Custom sanitizer middleware
const sanitizeInputs = (req, res, next) => {
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) {
    sanitizeObject(req.body);
  }
  
  next();
};

// User registration validation
const validateUserRegistration = [
  sanitizeInputs,
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores')
    .escape(),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email address is too long'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  sanitizeInputs,
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required')
    .escape(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password is too long'),
  handleValidationErrors
];

// Listing creation validation
const validateListingCreation = [
  sanitizeInputs,
  body('title')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Title must be between 1 and 100 characters')
    .escape(),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters')
    .escape(),
  body('price')
    .isFloat({ min: 0, max: 999999.99 })
    .withMessage('Price must be a valid number between 0 and 999,999.99'),
  body('category')
    .isIn(['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other'])
    .withMessage('Category must be one of: Textbooks, Furniture, Electronics, Clothing, Other'),
  handleValidationErrors
];

// Message creation validation
const validateMessageCreation = [
  sanitizeInputs,
  body('listingId')
    .isMongoId()
    .withMessage('Invalid listing ID format'),
  body('receiverId')
    .isMongoId()
    .withMessage('Invalid receiver ID format'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message content must be between 1 and 1000 characters')
    .escape(),
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  handleValidationErrors
];

// Conversation ID validation
const validateConversationId = [
  param('conversationId')
    .matches(/^[a-f\d]{24}_[a-f\d]{24}_[a-f\d]{24}$/)
    .withMessage('Invalid conversation ID format'),
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateListingCreation,
  validateMessageCreation,
  validateObjectId,
  validateConversationId,
  sanitizeInputs,
  handleValidationErrors
};