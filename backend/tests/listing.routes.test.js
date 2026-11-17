const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const listingRoutes = require('../routes/listing.routes');
require('./setup');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/listings', listingRoutes);

describe('Listing Routes Property Tests', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  // Helper function to create a test user and get auth token
  const createUserAndToken = async (userData = {}) => {
    const user = new User({
      username: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      email: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
      password: 'testpassword123',
      ...userData
    });
    await user.save();
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
    return { user, token };
  };

  describe('Property 8: Active Listing Filtering', () => {
    test('**Feature: campus-connect-marketplace, Property 8: Active Listing Filtering** - For any request to fetch listings, the system should return only listings where isSold is false, ensuring sold items never appear in active listings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              price: fc.float({ min: 0, max: 10000 }).filter(n => !isNaN(n) && isFinite(n)),
              category: fc.constantFrom('Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other'),
              isSold: fc.boolean()
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (listingsData) => {
            // Clean database before each property test iteration
            await Listing.deleteMany({});
            await User.deleteMany({});
            
            // Create a test user
            const { user } = await createUserAndToken();

            // Create listings with mixed sold/active status
            const createdListings = [];
            for (const listingData of listingsData) {
              const listing = new Listing({
                ...listingData,
                seller: user._id
              });
              await listing.save();
              createdListings.push(listing);
            }

            // Fetch active listings
            const response = await request(app)
              .get('/api/listings')
              .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data)).toBe(true);

            // Verify all returned listings have isSold: false
            response.body.data.forEach(listing => {
              expect(listing.isSold).toBe(false);
            });

            // Verify count matches expected active listings
            const expectedActiveCount = createdListings.filter(l => !l.isSold).length;
            expect(response.body.data.length).toBe(expectedActiveCount);
          }
        ),
        { numRuns: 10 } // Reduced for performance
      );
    });
  });

  describe('Property 9: Listing Status Update', () => {
    test('**Feature: campus-connect-marketplace, Property 9: Listing Status Update** - For any valid mark-as-sold operation by the listing owner, the system should update the isSold status to true and remove the listing from active displays', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            price: fc.float({ min: 0, max: 10000 }).filter(n => !isNaN(n) && isFinite(n)),
            category: fc.constantFrom('Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other')
          }),
          async (listingData) => {
            // Create a test user and listing
            const { user, token } = await createUserAndToken();
            
            const listing = new Listing({
              ...listingData,
              seller: user._id,
              isSold: false
            });
            await listing.save();

            // Mark listing as sold
            const response = await request(app)
              .put(`/api/listings/${listing._id}/sold`)
              .set('Authorization', `Bearer ${token}`)
              .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.isSold).toBe(true);

            // Verify listing is updated in database
            const updatedListing = await Listing.findById(listing._id);
            expect(updatedListing.isSold).toBe(true);

            // Verify listing no longer appears in active listings
            const activeListingsResponse = await request(app)
              .get('/api/listings')
              .expect(200);

            const foundInActive = activeListingsResponse.body.data.some(
              l => l._id.toString() === listing._id.toString()
            );
            expect(foundInActive).toBe(false);
          }
        ),
        { numRuns: 10 } // Reduced for performance
      );
    });
  });

  describe('Property 10: Listing Chronological Ordering', () => {
    test('**Feature: campus-connect-marketplace, Property 10: Listing Chronological Ordering** - For any request to fetch listings, the system should return them ordered by creation date with newest listings first', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
              description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
              price: fc.float({ min: 0, max: 10000 }).filter(n => !isNaN(n) && isFinite(n)),
              category: fc.constantFrom('Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other')
            }),
            { minLength: 2, maxLength: 5 }
          ),
          async (listingsData) => {
            // Clean database before each property test iteration
            await Listing.deleteMany({});
            await User.deleteMany({});
            
            // Create a test user
            const { user } = await createUserAndToken();

            // Create listings with small delays to ensure different timestamps
            const createdListings = [];
            for (let i = 0; i < listingsData.length; i++) {
              const listing = new Listing({
                ...listingsData[i],
                seller: user._id,
                isSold: false
              });
              await listing.save();
              createdListings.push(listing);
              
              // Small delay to ensure different createdAt timestamps
              if (i < listingsData.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 10));
              }
            }

            // Fetch listings
            const response = await request(app)
              .get('/api/listings')
              .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBe(listingsData.length);

            // Verify chronological ordering (newest first)
            for (let i = 0; i < response.body.data.length - 1; i++) {
              const currentDate = new Date(response.body.data[i].createdAt);
              const nextDate = new Date(response.body.data[i + 1].createdAt);
              expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime());
            }
          }
        ),
        { numRuns: 10 } // Reduced for performance
      );
    });
  });

  describe('Property 21: Owner-Only Modification Rights', () => {
    test('**Feature: campus-connect-marketplace, Property 21: Owner-Only Modification Rights** - For any listing modification attempt, the system should only allow the original seller to mark their own listings as sold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            price: fc.float({ min: 0, max: 10000 }).filter(n => !isNaN(n) && isFinite(n)),
            category: fc.constantFrom('Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other')
          }),
          async (listingData) => {
            // Clean database before each property test iteration
            await Listing.deleteMany({});
            await User.deleteMany({});
            
            // Create two different users
            const { user: owner, token: ownerToken } = await createUserAndToken();
            const { user: nonOwner, token: nonOwnerToken } = await createUserAndToken();

            // Create listing owned by first user
            const listing = new Listing({
              ...listingData,
              seller: owner._id,
              isSold: false
            });
            await listing.save();

            // Test that non-owner cannot mark as sold (test this first)
            const nonOwnerResponse = await request(app)
              .put(`/api/listings/${listing._id}/sold`)
              .set('Authorization', `Bearer ${nonOwnerToken}`)
              .expect(403);

            expect(nonOwnerResponse.body.success).toBe(false);
            expect(nonOwnerResponse.body.error).toMatch(/Access denied/);

            // Verify listing remains unsold after non-owner attempt
            let unchangedListing = await Listing.findById(listing._id);
            expect(unchangedListing.isSold).toBe(false);

            // Test that owner can mark as sold
            const ownerResponse = await request(app)
              .put(`/api/listings/${listing._id}/sold`)
              .set('Authorization', `Bearer ${ownerToken}`)
              .expect(200);

            expect(ownerResponse.body.success).toBe(true);
            expect(ownerResponse.body.data.isSold).toBe(true);

            // Verify listing is now sold
            const soldListing = await Listing.findById(listing._id);
            expect(soldListing.isSold).toBe(true);
          }
        ),
        { numRuns: 10 } // Reduced for performance
      );
    });
  });
});