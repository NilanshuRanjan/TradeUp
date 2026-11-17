const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation.middleware');
const { generateTokenPair } = require('../utils/jwt.utils');
const router = express.Router();

// POST /api/auth/register - User registration
router.post('/register', validateUserRegistration, asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (existingUser) {
    const field = existingUser.username === username ? 'username' : 'email';
    throw new AppError(`User with this ${field} already exists`, 409, {
      [field]: `This ${field} is already taken`
    });
  }

  // Create new user (password will be hashed by pre-save middleware)
  const user = new User({ username, email, password });
  await user.save();

  // Generate JWT token pair
  const tokens = generateTokenPair({ userId: user._id });

  res.status(201).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    },
    message: 'User registered successfully'
  });
}));

// POST /api/auth/login - User authentication
router.post('/login', validateUserLogin, asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  // Find user by username or email
  const user = await User.findOne({
    $or: [{ username }, { email: username }]
  });

  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  // Generate JWT token pair
  const tokens = generateTokenPair({ userId: user._id });

  res.status(200).json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    },
    message: 'Login successful'
  });
}));

// POST /api/auth/refresh - Refresh access token
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  try {
    // Verify refresh token
    const { verifyRefreshToken, generateTokenPair } = require('../utils/jwt.utils');
    const decoded = verifyRefreshToken(refreshToken);

    // Verify user still exists
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new AppError('User no longer exists', 401);
    }

    // Generate new token pair
    const tokens = generateTokenPair({ userId: user._id });

    res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        }
      },
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
}));

module.exports = router;