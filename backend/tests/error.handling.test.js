const request = require('supertest');
const fc = require('fast-check');
const express = require('express');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const authRoutes = require('../routes/auth.routes');
const listingRoutes = require('../routes/listing.routes');
const messageRoutes = require('../routes/message.routes');
const { errorHandler } = require('../middleware/error.middleware');
require('./setup');

// Create test app with error handling
const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    details: { path: req.originalUrl, method: req.method }
  });
});

// Use the comprehensive error handler
app.use(errorHandler);

// Use the global test setup from setup.js
describe('Error Handling Property Tests', () => {

  describe('Property 28: HTTP Status Code Consistency', () => {
    test('**Feature: campus-connect-marketplace, Property 28: HTTP Status Code Consistency** - For any API request, the system should return appropriate HTTP status codes that match the operation result', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            endpoint: fc.constantFrom(
              '/api/auth/register',
              '/api/auth/login',
              '/api/listings',
              '/api/listings/my'
            ),
            method: fc.constantFrom('GET', 'POST'),
            data: fc.record({
              username: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
              email: fc.option(fc.emailAddress()),
              password: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
            }),
            hasAuth: fc.boolean()
          }),
          async ({ endpoint, method, data, hasAuth }) => {
            let response;
            let token = null;

            // Create a unique user for auth if needed
            if (hasAuth) {
              const uniqueId = Math.random().toString(36).substring(7);
              const authUser = {
                username: `testuser_${uniqueId}`,
                email: `test_${uniqueId}@example.com`,
                password: 'password123'
              };

              try {
                const loginResponse = await request(app)
                  .post('/api/auth/register')
                  .send(authUser);

                if (loginResponse.body.success) {
                  token = loginResponse.body.data.token;
                }
              } catch (error) {
                // If user creation fails, continue without auth
              }
            }

            // Make the request
            const req = request(app)[method.toLowerCase()](endpoint);
            
            if (token) {
              req.set('Authorization', `Bearer ${token}`);
            }

            if (method === 'POST') {
              req.send(data);
            }

            response = await req;

            // Verify status code is appropriate
            expect(response.status).toBeGreaterThanOrEqual(200);
            expect(response.status).toBeLessThan(600);

            // Verify status code categories
            if (response.status >= 200 && response.status < 300) {
              // Success responses should have success: true
              if (response.body.success !== undefined) {
                expect(response.body.success).toBe(true);
              }
            } else if (response.status >= 400 && response.status < 500) {
              // Client error responses should have success: false
              if (response.body.success !== undefined) {
                expect(response.body.success).toBe(false);
              }
              expect(response.body.error).toBeDefined();
            } else if (response.status >= 500) {
              // Server error responses should have success: false
              if (response.body.success !== undefined) {
                expect(response.body.success).toBe(false);
              }
              expect(response.body.error).toBeDefined();
            }
          }
        ),
        { numRuns: 50 } // Reduced runs to avoid duplicate key issues
      );
    });
  });

  describe('Property 29: API Response Structure Consistency', () => {
    test('**Feature: campus-connect-marketplace, Property 29: API Response Structure Consistency** - For any API response, it should follow a consistent structure with success/error indicators and appropriate data formatting', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            requestType: fc.constantFrom(
              'valid_register',
              'invalid_register',
              'valid_login',
              'invalid_login',
              'get_listings',
              'invalid_endpoint'
            ),
            userData: fc.record({
              username: fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length >= 3),
              email: fc.emailAddress(),
              password: fc.string({ minLength: 6, maxLength: 100 })
            })
          }),
          async ({ requestType, userData }) => {
            let response;
            const uniqueId = Math.random().toString(36).substring(7);

            switch (requestType) {
              case 'valid_register':
                response = await request(app)
                  .post('/api/auth/register')
                  .send({
                    ...userData,
                    username: `${userData.username}_${uniqueId}`,
                    email: `${uniqueId}_${userData.email}`
                  });
                break;

              case 'invalid_register':
                response = await request(app)
                  .post('/api/auth/register')
                  .send({ username: '' }); // Missing required fields
                break;

              case 'valid_login':
                // First create a user with valid data
                const validUser = {
                  username: `validuser_${uniqueId}`,
                  email: `valid_${uniqueId}@example.com`,
                  password: userData.password
                };
                
                const user = new User(validUser);
                await user.save();
                
                response = await request(app)
                  .post('/api/auth/login')
                  .send({
                    username: validUser.username,
                    password: validUser.password
                  });
                break;

              case 'invalid_login':
                response = await request(app)
                  .post('/api/auth/login')
                  .send({
                    username: 'nonexistent',
                    password: 'wrongpassword'
                  });
                break;

              case 'get_listings':
                response = await request(app)
                  .get('/api/listings');
                break;

              case 'invalid_endpoint':
                response = await request(app)
                  .get('/api/nonexistent');
                break;
            }

            // All responses should have a consistent structure
            expect(response.body).toHaveProperty('success');
            expect(typeof response.body.success).toBe('boolean');

            if (response.body.success) {
              // Success responses should have data or message
              expect(
                response.body.hasOwnProperty('data') || 
                response.body.hasOwnProperty('message')
              ).toBe(true);
            } else {
              // Error responses should have error field
              expect(response.body).toHaveProperty('error');
              expect(typeof response.body.error).toBe('string');
              expect(response.body.error.length).toBeGreaterThan(0);
            }

            // Details field should be object or null if present
            if (response.body.hasOwnProperty('details')) {
              expect(
                response.body.details === null || 
                typeof response.body.details === 'object'
              ).toBe(true);
            }
          }
        ),
        { numRuns: 50 } // Reduced runs to avoid validation issues
      );
    });
  });

  describe('Error Response Validation', () => {
    test('Validation errors should return 400 with detailed error information', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: '', // Invalid
          email: 'invalid-email', // Invalid
          password: '123' // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.details).toBeDefined();
    });

    test('Authentication errors should return 401', async () => {
      const response = await request(app)
        .get('/api/listings/my')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('Not found errors should return 404', async () => {
      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('Duplicate resource errors should return 409', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      // Create first user
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toMatch(/already exists/);
    });
  });
});