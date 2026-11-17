const fc = require('fast-check');
const Listing = require('../models/listing.model');
const User = require('../models/user.model');
require('./setup');

describe('Listing Model Property Tests', () => {
  describe('Property 5: Listing Creation Validation', () => {
    test('**Feature: campus-connect-marketplace, Property 5: Listing Creation Validation** - For any listing creation attempt, the system should require all mandatory fields (title, description, price, category) and reject incomplete submissions with appropriate validation errors', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0), { nil: undefined }),
            price: fc.option(fc.float({ min: 0, max: 10000 }).filter(n => !isNaN(n) && isFinite(n)), { nil: undefined }),
            category: fc.option(fc.constantFrom('Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other'), { nil: undefined })
          }),
          async (listingData) => {
            // Create a test user first
            const user = new User({
              username: `testuser_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await user.save();

            const listing = new Listing({
              ...listingData,
              seller: user._id
            });

            // Check if all required fields are present
            const hasAllRequiredFields = listingData.title && 
                                       listingData.description && 
                                       listingData.price !== undefined && 
                                       listingData.category;

            if (hasAllRequiredFields) {
              // Should save successfully
              await expect(listing.save()).resolves.toBeTruthy();
              
              // Verify the listing was saved with correct data (accounting for trim)
              const savedListing = await Listing.findById(listing._id);
              expect(savedListing.title).toBe(listingData.title.trim());
              expect(savedListing.description).toBe(listingData.description.trim());
              expect(savedListing.price).toBe(listingData.price);
              expect(savedListing.category).toBe(listingData.category);
              expect(savedListing.seller.toString()).toBe(user._id.toString());
            } else {
              // Should fail validation
              await expect(listing.save()).rejects.toThrow();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Seller Association', () => {
    test('**Feature: campus-connect-marketplace, Property 6: Seller Association** - For any successfully created listing, the system should associate it with the authenticated user as the seller, ensuring ownership tracking', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            price: fc.float({ min: 0, max: 10000 }).filter(n => !isNaN(n) && isFinite(n)),
            category: fc.constantFrom('Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other')
          }),
          async (listingData) => {
            // Create a test user
            const user = new User({
              username: `testuser_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await user.save();

            // Create listing with seller association
            const listing = new Listing({
              ...listingData,
              seller: user._id
            });
            await listing.save();

            // Verify seller association
            const savedListing = await Listing.findById(listing._id).populate('seller');
            expect(savedListing.seller._id.toString()).toBe(user._id.toString());
            expect(savedListing.seller.username).toBe(user.username);
            expect(savedListing.seller.email).toBe(user.email);
          }
        ),
        { numRuns: 50 }
      );
    }, 10000);
  });

  describe('Property 7: Category Validation', () => {
    test('**Feature: campus-connect-marketplace, Property 7: Category Validation** - For any listing creation or update, the system should only accept categories from the predefined set and reject invalid categories', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
            price: fc.float({ min: 0, max: 10000 }).filter(n => !isNaN(n) && isFinite(n)),
            category: fc.string()
          }),
          async (listingData) => {
            // Create a test user
            const user = new User({
              username: `testuser_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await user.save();

            const listing = new Listing({
              ...listingData,
              seller: user._id
            });

            const validCategories = ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other'];
            const isValidCategory = validCategories.includes(listingData.category);

            if (isValidCategory) {
              // Should save successfully
              await expect(listing.save()).resolves.toBeTruthy();
              
              // Verify category was saved correctly
              const savedListing = await Listing.findById(listing._id);
              expect(savedListing.category).toBe(listingData.category);
            } else {
              // Should fail validation
              await expect(listing.save()).rejects.toThrow();
            }
          }
        ),
        { numRuns: 50 }
      );
    }, 10000);
  });
});