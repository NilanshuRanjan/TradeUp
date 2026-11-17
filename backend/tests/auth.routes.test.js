const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const authRoutes = require('../routes/auth.routes');
require('./setup');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Authentication Routes Property Tests', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('Property 2: Duplicate User Prevention', () => {
    test('**Feature: campus-connect-marketplace, Property 2: Duplicate User Prevention** - For any registration attempt with an existing username or email, the system should reject the registration and return an appropriate error without creating a duplicate account', async () => {
      // First create a user
      const existingUser = new User({
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'password123'
      });
      await existingUser.save();

      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Test duplicate username
            fc.record({
              username: fc.constant('existinguser'),
              email: fc.emailAddress().filter(email => email !== 'existing@example.com'),
              password: fc.string({ minLength: 6, maxLength: 50 })
            }),
            // Test duplicate email
            fc.record({
              username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length >= 3 && s !== 'existinguser'),
              email: fc.constant('existing@example.com'),
              password: fc.string({ minLength: 6, maxLength: 50 })
            })
          ),
          async (userData) => {
            const response = await request(app)
              .post('/api/auth/register')
              .send(userData);

            // Should return 409 conflict status
            expect(response.status).toBe(409);
            
            // Should return error response
            expect(response.body).toMatchObject({
              success: false,
              error: expect.stringMatching(/already exists/)
            });

            // Verify no duplicate user was created
            const userCount = await User.countDocuments({
              $or: [
                { username: userData.username },
                { email: userData.email }
              ]
            });
            expect(userCount).toBe(1); // Only the original user should exist
          }
        ),
        { numRuns: 3 }
      );
    }, 30000);
  });

  describe('Property 3: Valid Authentication Token Generation', () => {
    test('**Feature: campus-connect-marketplace, Property 3: Valid Authentication Token Generation** - For any user with valid credentials, successful login should return a valid JWT token that can be used for subsequent authenticated requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length >= 3),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 50 })
          }),
          async (userData) => {
            // Make username and email unique to avoid conflicts
            const uniqueUsername = `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`;
            
            const uniqueUserData = {
              username: uniqueUsername,
              email: uniqueEmail,
              password: userData.password
            };

            // Create user first
            const user = new User(uniqueUserData);
            await user.save();

            // Attempt login
            const response = await request(app)
              .post('/api/auth/login')
              .send({
                username: uniqueUsername,
                password: userData.password
              });

            // Should return 200 success status
            expect(response.status).toBe(200);
            
            // Should return success response with token
            expect(response.body).toMatchObject({
              success: true,
              data: {
                accessToken: expect.any(String),
                user: {
                  id: expect.any(String),
                  username: uniqueUsername,
                  email: uniqueEmail
                }
              }
            });

            // Verify token is valid JWT
            const decoded = jwt.verify(response.body.data.accessToken, process.env.JWT_SECRET);
            expect(decoded.userId).toBe(user._id.toString());
            expect(decoded.exp).toBeGreaterThan(Date.now() / 1000); // Token should not be expired
          }
        ),
        { numRuns: 1 } // Very reduced due to bcrypt cost
      );
    }, 120000);
  });

  describe('Property 4: Invalid Credential Rejection', () => {
    test('**Feature: campus-connect-marketplace, Property 4: Invalid Credential Rejection** - For any login attempt with invalid credentials, the system should reject authentication and return an error without generating a token', async () => {
      // Create a test user
      const testUser = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: 'correctpassword'
      });
      await testUser.save();

      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Wrong password
            fc.record({
              username: fc.constant('testuser'),
              password: fc.string({ minLength: 6, maxLength: 50 }).filter(p => p !== 'correctpassword')
            }),
            // Non-existent user
            fc.record({
              username: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length >= 3 && s !== 'testuser'),
              password: fc.string({ minLength: 6, maxLength: 50 })
            }),
            // Empty credentials
            fc.oneof(
              fc.record({ username: fc.constant(''), password: fc.string({ minLength: 6 }) }),
              fc.record({ username: fc.string({ minLength: 3 }), password: fc.constant('') })
            )
          ),
          async (loginData) => {
            const response = await request(app)
              .post('/api/auth/login')
              .send(loginData);

            // Should return error status (400 for validation, 401 for invalid credentials)
            expect([400, 401]).toContain(response.status);
            
            // Should return error response
            expect(response.body).toMatchObject({
              success: false,
              error: expect.any(String)
            });

            // Should not return a token
            expect(response.body.data?.accessToken).toBeUndefined();
          }
        ),
        { numRuns: 5 }
      );
    }, 30000);
  });
});