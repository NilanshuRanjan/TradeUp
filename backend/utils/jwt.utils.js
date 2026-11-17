const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT configuration
const JWT_CONFIG = {
  accessTokenExpiry: '2h',  // 2-hour access tokens — long enough for uninterrupted sessions
  refreshTokenExpiry: '30d', // 30-day refresh tokens — user stays logged in for a month
  issuer: 'campus-connect',
  audience: 'campus-connect-users'
};

// Generate a secure random secret if not provided
const getJWTSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return process.env.JWT_SECRET;
};

// Generate refresh token secret (separate from access token secret)
const getRefreshSecret = () => {
  if (!process.env.JWT_REFRESH_SECRET) {
    // Fallback to JWT_SECRET with suffix for backward compatibility
    return process.env.JWT_SECRET + '_refresh';
  }
  return process.env.JWT_REFRESH_SECRET;
};

// Generate access token
const generateAccessToken = (payload) => {
  const secret = getJWTSecret();
  
  const tokenPayload = {
    ...payload,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID() // Unique token ID for revocation
  };

  return jwt.sign(tokenPayload, secret, {
    expiresIn: JWT_CONFIG.accessTokenExpiry,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    algorithm: 'HS256'
  });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  const secret = getRefreshSecret();
  
  const tokenPayload = {
    ...payload,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    jti: crypto.randomUUID()
  };

  return jwt.sign(tokenPayload, secret, {
    expiresIn: JWT_CONFIG.refreshTokenExpiry,
    issuer: JWT_CONFIG.issuer,
    audience: JWT_CONFIG.audience,
    algorithm: 'HS256'
  });
};

// Verify access token
const verifyAccessToken = (token) => {
  const secret = getJWTSecret();
  
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithms: ['HS256']
    });

    // Verify token type
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  const secret = getRefreshSecret();
  
  try {
    const decoded = jwt.verify(token, secret, {
      issuer: JWT_CONFIG.issuer,
      audience: JWT_CONFIG.audience,
      algorithms: ['HS256']
    });

    // Verify token type
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Refresh token verification failed: ${error.message}`);
  }
};

// Generate token pair (access + refresh)
const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: JWT_CONFIG.accessTokenExpiry
  };
};

// Extract token from Authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header format');
  }
  
  const token = authHeader.substring(7).trim();
  if (!token) {
    throw new Error('No token provided');
  }
  
  return token;
};

// Decode token without verification (for debugging/logging)
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    throw new Error(`Token decode failed: ${error.message}`);
  }
};

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Get token expiration time
const getTokenExpiration = (token) => {
  try {
    const decoded = jwt.decode(token);
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  extractTokenFromHeader,
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  JWT_CONFIG
};