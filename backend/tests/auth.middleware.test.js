const fc = require('fast-check');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth.middleware');
const User = require('../models/user.model');
require('./setup');

// Mock response object
const createMockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock next function
const mockNext = jest.fn();

describe('Authentication Middleware Property Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('Property 26: Protected Endpoint Access Control', () => {
    test('**Feature: campus-connect-marketplace, Property 26: Protected Endpoint Access Control** - For any request to a protected API endpoint without valid authentication, the system should reject the request and return an unauthorized error', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.constant(undefined), // No Authorization header
            fc.constant(''), // Empty Authorization header
            fc.string().filter(s => !s.startsWith('Bearer ')), // Invalid format
            fc.string().map(s => `Bearer ${s}`).filter(s => s !== 'Bearer '), // Invalid token format
            fc.string().map(s => `Bearer invalid-token-${s}`) // Invalid tokens
          ),
          async (authHeader) => {
            const req = {
              header: jest.fn().mockReturnValue(authHeader)
            };
            const res = createMockResponse();

            await authMiddleware(req, res, mockNext);

            // Should return 401 status
            expect(res.status).toHaveBeenCalledWith(401);
            
            // Should return error response
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                success: false,
                error: expect.any(String)
              })
            );

            // Should not call next() for invalid auth
            expect(mockNext).not.toHaveBeenCalled();

            // Should not set user on request
            expect(req.user).toBeUndefined();
            expect(req.userId).toBeUndefined();
          }
        ),
        { numRuns: 50 }
      );
    });

    test('Valid JWT tokens should allow access', async () => {
      // Create a test user
      const testUser = new User({
        username: 'testuser123',
        email: 'test@example.com',
        password: 'password123'
      });
      await testUser.save();

      // Generate valid token
      const token = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      const req = {
        header: jest.fn().mockReturnValue(`Bearer ${token}`)
      };
      const res = createMockResponse();

      await authMiddleware(req, res, mockNext);

      // Should call next() for valid auth
      expect(mockNext).toHaveBeenCalled();
      
      // Should set user on request
      expect(req.user).toBeTruthy();
      expect(req.userId).toBeTruthy();
      
      // Should not call res.status or res.json
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });
});