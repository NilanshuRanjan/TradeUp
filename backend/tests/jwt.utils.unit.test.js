const fc = require('fast-check');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyAccessToken, 
  verifyRefreshToken,
  isTokenExpired,
  getTokenExpiration,
  extractTokenFromHeader
} = require('../utils/jwt.utils');

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-for-jwt-testing';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-jwt-testing';

describe('JWT Utilities Unit Tests', () => {
  describe('Property 30: JWT Token Verification', () => {
    test('**Feature: campus-connect-marketplace, Property 30: JWT Token Verification** - JWT utilities should properly generate, verify, and validate tokens', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.string({ minLength: 24, maxLength: 24 }).filter(s => /^[a-f0-9]{24}$/.test(s)),
            testType: fc.constantFrom('access_token', 'refresh_token', 'invalid_token', 'expired_check')
          }),
          async ({ userId, testType }) => {
            switch (testType) {
              case 'access_token':
                // Test access token generation and verification
                const accessToken = generateAccessToken({ userId });
                expect(typeof accessToken).toBe('string');
                expect(accessToken.split('.')).toHaveLength(3); // JWT has 3 parts
                
                // Verify the token
                const decodedAccess = verifyAccessToken(accessToken);
                expect(decodedAccess.userId).toBe(userId);
                expect(decodedAccess.type).toBe('access');
                expect(decodedAccess.jti).toBeDefined();
                
                // Check expiration
                expect(isTokenExpired(accessToken)).toBe(false);
                const expirationDate = getTokenExpiration(accessToken);
                expect(expirationDate).toBeInstanceOf(Date);
                expect(expirationDate.getTime()).toBeGreaterThan(Date.now());
                break;

              case 'refresh_token':
                // Test refresh token generation and verification
                const refreshToken = generateRefreshToken({ userId });
                expect(typeof refreshToken).toBe('string');
                expect(refreshToken.split('.')).toHaveLength(3);
                
                // Verify the token
                const decodedRefresh = verifyRefreshToken(refreshToken);
                expect(decodedRefresh.userId).toBe(userId);
                expect(decodedRefresh.type).toBe('refresh');
                expect(decodedRefresh.jti).toBeDefined();
                
                // Check expiration
                expect(isTokenExpired(refreshToken)).toBe(false);
                break;

              case 'invalid_token':
                // Test invalid token handling
                const invalidTokens = [
                  'invalid.token.format',
                  'not-a-jwt',
                  '',
                  null,
                  undefined
                ];
                
                for (const invalidToken of invalidTokens) {
                  if (invalidToken) {
                    expect(() => verifyAccessToken(invalidToken)).toThrow();
                    expect(() => verifyRefreshToken(invalidToken)).toThrow();
                  }
                  expect(isTokenExpired(invalidToken)).toBe(true);
                  expect(getTokenExpiration(invalidToken)).toBeNull();
                }
                break;

              case 'expired_check':
                // Test token expiration utilities
                const jwt = require('jsonwebtoken');
                
                // Create an expired token
                const expiredPayload = {
                  userId,
                  type: 'access',
                  iat: Math.floor(Date.now() / 1000) - 3600,
                  exp: Math.floor(Date.now() / 1000) - 1800
                };
                const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET);
                
                expect(isTokenExpired(expiredToken)).toBe(true);
                const expiredDate = getTokenExpiration(expiredToken);
                expect(expiredDate).toBeInstanceOf(Date);
                expect(expiredDate.getTime()).toBeLessThan(Date.now());
                
                // Verification should fail for expired token
                expect(() => verifyAccessToken(expiredToken)).toThrow();
                break;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Authorization header extraction should work correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            headerType: fc.constantFrom('valid', 'missing_bearer', 'empty', 'null', 'malformed'),
            token: fc.string({ minLength: 10, maxLength: 200 })
          }),
          async ({ headerType, token }) => {
            let authHeader;
            let shouldSucceed = false;

            switch (headerType) {
              case 'valid':
                authHeader = `Bearer ${token}`;
                shouldSucceed = true;
                break;
              case 'missing_bearer':
                authHeader = token;
                break;
              case 'empty':
                authHeader = '';
                break;
              case 'null':
                authHeader = null;
                break;
              case 'malformed':
                authHeader = `Basic ${token}`;
                break;
            }

            if (shouldSucceed) {
              const extractedToken = extractTokenFromHeader(authHeader);
              expect(extractedToken).toBe(token);
            } else {
              expect(() => extractTokenFromHeader(authHeader)).toThrow();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    test('Token type validation should prevent cross-usage', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 24, maxLength: 24 }).filter(s => /^[a-f0-9]{24}$/.test(s)),
          async (userId) => {
            // Generate both token types
            const accessToken = generateAccessToken({ userId });
            const refreshToken = generateRefreshToken({ userId });

            // Access token should only verify as access token
            expect(() => verifyAccessToken(accessToken)).not.toThrow();
            expect(() => verifyRefreshToken(accessToken)).toThrow();

            // Refresh token should only verify as refresh token
            expect(() => verifyRefreshToken(refreshToken)).not.toThrow();
            expect(() => verifyAccessToken(refreshToken)).toThrow();

            // Verify token types in decoded payload
            const decodedAccess = verifyAccessToken(accessToken);
            const decodedRefresh = verifyRefreshToken(refreshToken);
            
            expect(decodedAccess.type).toBe('access');
            expect(decodedRefresh.type).toBe('refresh');
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});