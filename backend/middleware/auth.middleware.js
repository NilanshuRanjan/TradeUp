const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { AppError } = require('./error.middleware');
const { verifyAccessToken, extractTokenFromHeader } = require('../utils/jwt.utils');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    // Extract token using utility function
    const token = extractTokenFromHeader(authHeader);

    // Verify token using utility function
    const decoded = verifyAccessToken(token);
    
    // Verify user still exists
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new AppError('Token is valid but user no longer exists.', 401);
    }

    req.user = user;
    req.userId = decoded.userId;
    req.tokenId = decoded.jti; // Store token ID for potential revocation
    next();
  } catch (error) {
    // Convert JWT utility errors to AppError
    if (error.message.includes('Token verification failed') || 
        error.message.includes('Invalid authorization header') ||
        error.message.includes('No token provided')) {
      next(new AppError('Access denied. ' + error.message, 401));
    } else {
      next(error);
    }
  }
};

module.exports = authMiddleware;