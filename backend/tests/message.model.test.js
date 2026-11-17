const fc = require('fast-check');
const Message = require('../models/message.model');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
require('./setup');

describe('Message Model Property Tests', () => {
  describe('Property 15: Message Storage Completeness', () => {
    test('**Feature: campus-connect-marketplace, Property 15: Message Storage Completeness** - For any message sent, the system should store it with all required fields (sender, receiver, content, timestamp) properly populated', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0)
          }),
          async (messageData) => {
            // Create test users
            const sender = new User({
              username: `sender_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `sender_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await sender.save();

            const receiver = new User({
              username: `receiver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `receiver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await receiver.save();

            // Create a test listing
            const listing = new Listing({
              title: 'Test Item',
              description: 'Test description',
              price: 100,
              category: 'Electronics',
              seller: sender._id
            });
            await listing.save();

            // Generate conversation ID
            const conversationId = Message.generateConversationId(listing._id, receiver._id, sender._id);

            // Create message
            const message = new Message({
              conversationId,
              sender: sender._id,
              receiver: receiver._id,
              content: messageData.content
            });

            const beforeSave = Date.now() - 100; // Add 100ms buffer for timing precision
            await message.save();
            const afterSave = Date.now() + 100; // Add 100ms buffer for timing precision

            // Verify message was saved with all required fields
            const savedMessage = await Message.findById(message._id).populate('sender receiver');
            
            // Check all required fields are present and properly populated
            expect(savedMessage.conversationId).toBe(conversationId);
            expect(savedMessage.sender._id.toString()).toBe(sender._id.toString());
            expect(savedMessage.receiver._id.toString()).toBe(receiver._id.toString());
            expect(savedMessage.content).toBe(messageData.content.trim());
            
            // Verify timestamp is properly set and reasonable (with timing tolerance)
            expect(savedMessage.createdAt).toBeInstanceOf(Date);
            expect(savedMessage.createdAt.getTime()).toBeGreaterThanOrEqual(beforeSave);
            expect(savedMessage.createdAt.getTime()).toBeLessThanOrEqual(afterSave);
            
            // Verify populated sender and receiver data
            expect(savedMessage.sender.username).toBe(sender.username);
            expect(savedMessage.receiver.username).toBe(receiver.username);
          }
        ),
        { numRuns: 10 } // Reduced runs due to database operations
      );
    }, 30000); // 30 second timeout
  });

  describe('Property 16: Conversation Grouping', () => {
    test('**Feature: campus-connect-marketplace, Property 16: Conversation Grouping** - For any message in the system, it should be grouped by a conversationId that uniquely combines listingId, buyerId, and sellerId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content1: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
            content2: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0)
          }),
          async (messageData) => {
            // Create test users
            const buyer = new User({
              username: `buyer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `buyer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await buyer.save();

            const seller = new User({
              username: `seller_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `seller_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await seller.save();

            // Create a test listing
            const listing = new Listing({
              title: 'Test Item',
              description: 'Test description',
              price: 100,
              category: 'Electronics',
              seller: seller._id
            });
            await listing.save();

            // Generate conversation ID using the static method
            const conversationId = Message.generateConversationId(listing._id, buyer._id, seller._id);

            // Create two messages in the same conversation
            const message1 = new Message({
              conversationId,
              sender: buyer._id,
              receiver: seller._id,
              content: messageData.content1
            });

            const message2 = new Message({
              conversationId,
              sender: seller._id,
              receiver: buyer._id,
              content: messageData.content2
            });

            await message1.save();
            await message2.save();

            // Verify both messages have the same conversationId
            expect(message1.conversationId).toBe(conversationId);
            expect(message2.conversationId).toBe(conversationId);

            // Verify conversationId format is correct (listingId_userId1_userId2)
            const parts = conversationId.split('_');
            expect(parts).toHaveLength(3);
            expect(parts[0]).toBe(listing._id.toString());
            
            // Verify user IDs are sorted consistently (smaller first)
            const userIds = [buyer._id.toString(), seller._id.toString()].sort();
            expect(parts[1]).toBe(userIds[0]);
            expect(parts[2]).toBe(userIds[1]);

            // Verify messages can be retrieved by conversationId
            const conversationMessages = await Message.find({ conversationId }).sort({ createdAt: 1 });
            expect(conversationMessages).toHaveLength(2);
            expect(conversationMessages[0].content).toBe(messageData.content1.trim());
            expect(conversationMessages[1].content).toBe(messageData.content2.trim());

            // Test that the same conversation ID is generated regardless of parameter order
            const conversationId2 = Message.generateConversationId(listing._id, seller._id, buyer._id);
            expect(conversationId).toBe(conversationId2);
          }
        ),
        { numRuns: 10 } // Reduced runs due to database operations
      );
    });
  });
});