const request = require('supertest');
const app = require('../app');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');

describe('Integration Tests - Essential Flows', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Listing.deleteMany({});
  });

  test('Complete user flow: register -> login -> create listing', async () => {
    // Register user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'test@university.edu',
        password: 'password123'
      });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);
    expect(registerResponse.body.data.accessToken).toBeDefined();

    const token = registerResponse.body.data.accessToken;

    // Create listing
    const listingResponse = await request(app)
      .post('/api/listings')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Item',
        description: 'Test description',
        price: 25.99,
        category: 'Electronics'
      });

    expect(listingResponse.status).toBe(201);
    expect(listingResponse.body.success).toBe(true);
    expect(listingResponse.body.data.title).toBe('Test Item');

    // Get user's listings
    const myListingsResponse = await request(app)
      .get('/api/listings/my')
      .set('Authorization', `Bearer ${token}`);

    expect(myListingsResponse.status).toBe(200);
    expect(myListingsResponse.body.success).toBe(true);
    expect(myListingsResponse.body.data).toHaveLength(1);
  });
});