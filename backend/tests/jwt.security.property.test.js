const request = require('supertest');
const fc = require('fast-check');
const app = require('../server');
const User = require('../models/user.model');
const { connectDB, disconnectDB, clearDB } = require('./setup');
const { generateAccessToken, verifyAccessToken } = require('../utils/jwt.utils');

describe('JWT Security Property Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  describe('Property 30: JWT Token Verification', () => {
    test('Invalid tokens should be rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('missing', 'malformed', 'invalid'),
          async (tokenType) => {
            let authHeader = '';
            
            switch (tokenType) {
              case 'missing':
                authHeader = '';
                break;
              case 'malformed':
                authHeader = 'Bearer invalid.token.format';
                break;
              case 'invalid':
                authHeader = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature';
                break;
            }

            const requestBuilder = request(app).get('/api/listings/my');
            if (authHeader) {
              requestBuilder.set('Authorization', authHeader);
            }

            const response = await requestBuilder;
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
          }
        ),
        { numRuns: 5 }
      );
    });

    test('Valid tokens should be accepted', async () => {
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });
      await user.save();

      const validToken = generateAccessToken({ userId: user._id });
      const response = await request(app)
        .get('/api/listings/my')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).not.toBe(401);
    });
  });
});