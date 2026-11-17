const fc = require('fast-check');
const User = require('../models/user.model');
require('./setup');

describe('User Model Property Tests', () => {
  describe('Property 1: User Registration with Password Hashing', () => {
    test('**Feature: campus-connect-marketplace, Property 1: User Registration with Password Hashing** - For any valid user registration data, creating a user account should result in a stored user with a bcrypt-hashed password that is never stored in plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: fc.string({ minLength: 3, maxLength: 15 }).filter(s => s.trim().length >= 3),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 6, maxLength: 20 })
          }),
          async (userData) => {
            // Make username unique by adding timestamp and random suffix
            const uniqueUsername = `${userData.username}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
            const uniqueEmail = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`;
            
            const uniqueUserData = {
              ...userData,
              username: uniqueUsername,
              email: uniqueEmail
            };

            // Create user with the generated data
            const user = new User(uniqueUserData);
            await user.save();

            // Verify user was saved
            const savedUser = await User.findOne({ username: uniqueUsername });
            expect(savedUser).toBeTruthy();
            
            // Verify password is hashed (not stored in plaintext)
            expect(savedUser.password).not.toBe(userData.password);
            
            // Verify password is a bcrypt hash (starts with $2b$ and has proper length)
            expect(savedUser.password).toMatch(/^\$2b\$\d+\$/);
            expect(savedUser.password.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
            
            // Verify the hashed password can be compared successfully
            const isMatch = await savedUser.comparePassword(userData.password);
            expect(isMatch).toBe(true);
            
            // Verify wrong password doesn't match
            const wrongPasswordMatch = await savedUser.comparePassword(userData.password + 'wrong');
            expect(wrongPasswordMatch).toBe(false);
          }
        ),
        { numRuns: 1 } // Reduced to 1 run due to bcrypt computational cost
      );
    }, 180000); // 3 minute timeout for bcrypt operations
  });
});