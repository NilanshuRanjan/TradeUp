import fc from 'fast-check';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../services/api';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  multiSet: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
    defaults: {},
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  })),
}));

describe('API Client Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset AsyncStorage mocks
    AsyncStorage.multiSet.mockResolvedValue();
    AsyncStorage.multiGet.mockResolvedValue([['', null], ['', null]]);
    AsyncStorage.multiRemove.mockResolvedValue();
  });

  describe('Property 24: Authentication Persistence', () => {
    /**
     * Feature: campus-connect-marketplace, Property 24: Authentication Persistence
     * For any successful login, the authentication token should persist across app sessions and remain valid until expiration.
     * Validates: Requirements 6.5
     */
    it('should persist authentication tokens across app sessions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 20 }),
            password: fc.string({ minLength: 6, maxLength: 50 }),
          }),
          fc.string({ minLength: 100, maxLength: 200 }), // JWT token
          async (credentials, mockToken) => {
            // Create a valid JWT-like token structure for testing
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = btoa(JSON.stringify({ 
              userId: 'test123',
              exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
            }));
            const signature = mockToken.substring(0, 43); // Mock signature
            const validToken = `${header}.${payload}.${signature}`;

            // Mock successful login response
            const mockResponse = {
              data: {
                success: true,
                data: {
                  token: validToken,
                  user: { id: 'test123', username: credentials.username }
                }
              }
            };

            // Mock axios post to return successful login
            apiClient.instance.post = jest.fn().mockResolvedValue(mockResponse);

            // Perform login
            const response = await apiClient.auth.login(credentials);

            // Verify token was stored
            expect(AsyncStorage.multiSet).toHaveBeenCalledWith([
              ['authToken', validToken],
              [expect.stringMatching(/tokenExpiry/), expect.any(String)]
            ]);

            // Verify response is successful
            expect(response.data.success).toBe(true);
            expect(response.data.data.token).toBe(validToken);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain authentication state across app restarts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 200 }), // JWT token
          fc.integer({ min: 1, max: 7200 }), // seconds until expiry
          async (mockToken, secondsUntilExpiry) => {
            // Create a valid JWT-like token structure
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = btoa(JSON.stringify({ 
              userId: 'test123',
              exp: Math.floor(Date.now() / 1000) + secondsUntilExpiry
            }));
            const signature = mockToken.substring(0, 43);
            const validToken = `${header}.${payload}.${signature}`;
            const expiryTime = (Math.floor(Date.now() / 1000) + secondsUntilExpiry) * 1000;

            // Mock AsyncStorage to return stored token
            AsyncStorage.multiGet.mockResolvedValue([
              ['authToken', validToken],
              ['tokenExpiry', expiryTime.toString()]
            ]);

            // Check if user is authenticated
            const isAuthenticated = await apiClient.auth.isAuthenticated();

            // Should be authenticated if token is not expired
            const now = Date.now();
            const shouldBeAuthenticated = now < expiryTime - 300000; // 5 minute buffer
            
            expect(isAuthenticated).toBe(shouldBeAuthenticated);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: JWT Token Expiration', () => {
    /**
     * Feature: campus-connect-marketplace, Property 25: JWT Token Expiration
     * For any JWT token generated, it should have a proper expiration time and become invalid after that time.
     * Validates: Requirements 7.2
     */
    it('should properly handle JWT token expiration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 200 }), // JWT token
          fc.integer({ min: -3600, max: 3600 }), // seconds from now (can be past or future)
          async (mockToken, secondsFromNow) => {
            // Create a JWT-like token with specific expiration
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const expTime = Math.floor(Date.now() / 1000) + secondsFromNow;
            const payload = btoa(JSON.stringify({ 
              userId: 'test123',
              exp: expTime
            }));
            const signature = mockToken.substring(0, 43);
            const testToken = `${header}.${payload}.${signature}`;
            const expiryTimeMs = expTime * 1000;

            // Mock AsyncStorage to return the token
            AsyncStorage.multiGet.mockResolvedValue([
              ['authToken', testToken],
              ['tokenExpiry', expiryTimeMs.toString()]
            ]);

            // Try to get valid token
            const retrievedToken = await apiClient.tokenManager.getValidToken();

            // Token should be null if expired (with 5 minute buffer)
            const now = Date.now();
            const isExpired = now >= expiryTimeMs - 300000;

            if (isExpired) {
              expect(retrievedToken).toBeNull();
              // Should have cleared the token
              expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['authToken', 'tokenExpiry']);
            } else {
              expect(retrievedToken).toBe(testToken);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject expired tokens during authentication', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 200 }), // JWT token
          fc.integer({ min: 1, max: 3600 }), // seconds in the past
          async (mockToken, secondsInPast) => {
            // Create an expired JWT-like token
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const expTime = Math.floor(Date.now() / 1000) - secondsInPast; // In the past
            const payload = btoa(JSON.stringify({ 
              userId: 'test123',
              exp: expTime
            }));
            const signature = mockToken.substring(0, 43);
            const expiredToken = `${header}.${payload}.${signature}`;
            const expiryTimeMs = expTime * 1000;

            // Mock AsyncStorage to return expired token
            AsyncStorage.multiGet.mockResolvedValue([
              ['authToken', expiredToken],
              ['tokenExpiry', expiryTimeMs.toString()]
            ]);

            // Check authentication status
            const isAuthenticated = await apiClient.auth.isAuthenticated();

            // Should not be authenticated with expired token
            expect(isAuthenticated).toBe(false);

            // Should have cleared the expired token
            expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(['authToken', 'tokenExpiry']);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Token Management Edge Cases', () => {
    it('should handle malformed JWT tokens gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // Invalid token format
          async (malformedToken) => {
            // Try to store malformed token
            const result = await apiClient.tokenManager.setToken(malformedToken);

            // Should handle gracefully and return false
            expect(result).toBe(false);
            expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 200 }),
          async (mockToken) => {
            // Mock AsyncStorage to throw error
            AsyncStorage.multiGet.mockRejectedValue(new Error('Storage error'));

            // Should handle error gracefully
            const token = await apiClient.tokenManager.getValidToken();
            expect(token).toBeNull();

            const isAuthenticated = await apiClient.auth.isAuthenticated();
            expect(isAuthenticated).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});