const request = require('supertest');
const fc = require('fast-check');
const app = require('../server');
const User = require('../models/user.model');
const { connectDB, disconnectDB, clearDB } = require('./setup');

describe('Input Validation Property Tests', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  beforeEach(async () => {
    await clearDB();
  });

  describe('Property 27: Input Validation', () => {
    test('Malicious inputs should be rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            maliciousInput: fc.constantFrom(
              '<script>alert("xss")</script>',
              "'; DROP TABLE users; --",
              'a'.repeat(1000)
            )
          }),
          async ({ maliciousInput }) => {
            const response = await request(app)
              .post('/api/auth/register')
              .send({
                username: maliciousInput,
                email: 'test@example.com',
                password: 'password123'
              });

            expect([400, 422]).toContain(response.status);
            expect(response.body.success).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });

    test('Valid inputs should be processed correctly', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'validuser',
          email: 'valid@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });
});