const fc = require('fast-check');
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const Message = require('../models/message.model');
const messageRoutes = require('../routes/message.routes');
const authMiddleware = require('../middleware/auth.middleware');
require('./setup');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/messages', messageRoutes);

describe('Message Routes Property Tests', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key';
  });

  describe('Property 14: Conversation Creation', () => {
    test('**Feature: campus-connect-marketplace, Property 14: Conversation Creation** - For any buyer interest expression in a listing, the system should create or retrieve a conversation between the buyer and seller with a unique conversationId', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            content: fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0)
          }),
          async (messageData) => {
            // Create test users
            const seller = new User({
              username: `seller_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `seller_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await seller.save();

            const buyer = new User({
              username: `buyer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `buyer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await buyer.save();

            // Create a test listing
            const listing = new Listing({
              title: 'Test Item',
              description: 'Test description',
              price: 100,
              category: 'Electronics',
              seller: seller._id
            });
            await listing.save();

            // Generate JWT token for buyer
            const token = jwt.sign({ userId: buyer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Send first message (creates conversation)
            const response1 = await request(app)
              .post('/api/messages')
              .set('Authorization', `Bearer ${token}`)
              .send({
                listingId: listing._id.toString(),
                receiverId: seller._id.toString(),
                content: messageData.content
              });

            expect(response1.status).toBe(201);
            expect(response1.body.success).toBe(true);
            expect(response1.body.data.conversationId).toBeDefined();

            const conversationId = response1.body.data.conversationId;

            // Verify conversation ID format and content
            expect(conversationId).toMatch(/^[a-f\d]{24}_[a-f\d]{24}_[a-f\d]{24}$/);
            
            // Parse conversation ID
            const parts = conversationId.split('_');
            expect(parts[0]).toBe(listing._id.toString());
            
            // User IDs should be sorted consistently
            const userIds = [buyer._id.toString(), seller._id.toString()].sort();
            expect(parts[1]).toBe(userIds[0]);
            expect(parts[2]).toBe(userIds[1]);

            // Send second message (should use same conversation)
            const response2 = await request(app)
              .post('/api/messages')
              .set('Authorization', `Bearer ${token}`)
              .send({
                listingId: listing._id.toString(),
                receiverId: seller._id.toString(),
                content: 'Second message'
              });

            expect(response2.status).toBe(201);
            expect(response2.body.data.conversationId).toBe(conversationId);

            // Verify both messages are in the same conversation
            const messages = await Message.find({ conversationId });
            expect(messages).toHaveLength(2);
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);
  });

  describe('Property 17: Message Chronological Ordering', () => {
    test('**Feature: campus-connect-marketplace, Property 17: Message Chronological Ordering** - For any conversation history request, the system should return messages ordered chronologically by creation timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ),
          async (messageContents) => {
            // Create test users
            const user1 = new User({
              username: `user1_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `user1_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await user1.save();

            const user2 = new User({
              username: `user2_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              email: `user2_${Date.now()}_${Math.random().toString(36).substring(2, 6)}@example.com`,
              password: 'testpassword123'
            });
            await user2.save();

            // Create a test listing
            const listing = new Listing({
              title: 'Test Item',
              description: 'Test description',
              price: 100,
              category: 'Electronics',
              seller: user1._id
            });
            await listing.save();

            const conversationId = Message.generateConversationId(listing._id, user1._id, user2._id);

            // Create messages with small delays to ensure different timestamps
            const createdMessages = [];
            for (let i = 0; i < messageContents.length; i++) {
              const message = new Message({
                conversationId,
                sender: i % 2 === 0 ? user1._id : user2._id,
                receiver: i % 2 === 0 ? user2._id : user1._id,
                content: messageContents[i]
              });
              await message.save();
              createdMessages.push(message);
              
              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Generate JWT token for user1
            const token = jwt.sign({ userId: user1._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Fetch conversation history
            const response = await request(app)
              .get(`/api/messages/${conversationId}`)
              .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(messageContents.length);

            // Verify chronological ordering (oldest first)
            const messages = response.body.data;
            for (let i = 1; i < messages.length; i++) {
              const prevTimestamp = new Date(messages[i - 1].createdAt).getTime();
              const currTimestamp = new Date(messages[i].createdAt).getTime();
              expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
            }

            // Verify content matches original order
            for (let i = 0; i < messageContents.length; i++) {
              expect(messages[i].content).toBe(messageContents[i].trim());
            }
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);
  });

  describe('Property 18: Immediate Message Display', () => {
    test('**Feature: campus-connect-marketplace, Property 18: Immediate Message Display** - For any message sent by a user, it should immediately appear in their conversation view without requiring a refresh', async () => {
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
              seller: receiver._id
            });
            await listing.save();

            // Generate JWT token for sender
            const token = jwt.sign({ userId: sender._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

            // Send message
            const sendResponse = await request(app)
              .post('/api/messages')
              .set('Authorization', `Bearer ${token}`)
              .send({
                listingId: listing._id.toString(),
                receiverId: receiver._id.toString(),
                content: messageData.content
              });

            expect(sendResponse.status).toBe(201);
            expect(sendResponse.body.success).toBe(true);
            
            const sentMessage = sendResponse.body.data;
            expect(sentMessage.content).toBe(messageData.content.trim());
            expect(sentMessage.sender.username).toBe(sender.username);
            expect(sentMessage.receiver.username).toBe(receiver.username);

            const conversationId = sentMessage.conversationId;

            // Immediately fetch conversation history (no refresh needed)
            const historyResponse = await request(app)
              .get(`/api/messages/${conversationId}`)
              .set('Authorization', `Bearer ${token}`);

            expect(historyResponse.status).toBe(200);
            expect(historyResponse.body.success).toBe(true);
            expect(historyResponse.body.data).toHaveLength(1);
            
            const retrievedMessage = historyResponse.body.data[0];
            expect(retrievedMessage.content).toBe(messageData.content.trim());
            expect(retrievedMessage.sender.username).toBe(sender.username);
            expect(retrievedMessage.receiver.username).toBe(receiver.username);
            expect(retrievedMessage._id).toBe(sentMessage._id);
          }
        ),
        { numRuns: 10 }
      );
    }, 30000);
  });
});