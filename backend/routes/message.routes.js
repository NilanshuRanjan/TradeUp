const express = require('express');
const Message = require('../models/message.model');
const Listing = require('../models/listing.model');
const User = require('../models/user.model');
const authMiddleware = require('../middleware/auth.middleware');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { validateMessageCreation, validateConversationId } = require('../middleware/validation.middleware');
const router = express.Router();

// GET /api/messages/inbox - Seller inbox: all conversations on seller's listings (protected)
router.get('/inbox', authMiddleware, asyncHandler(async (req, res) => {
  const sellerId = req.userId;

  // Find all listings that belong to this seller
  const myListings = await Listing.find({ seller: sellerId }).select('_id title category price isSold').lean();

  if (!myListings.length) {
    return res.status(200).json({
      success: true,
      data: [],
      message: 'No listings found'
    });
  }

  const listingIds = myListings.map(l => l._id.toString());

  // Find all messages where the conversationId starts with one of my listing IDs
  // conversationId format: listingId_userId1_userId2 (sorted)
  const allMessages = await Message.find({
    conversationId: {
      $in: await Message.distinct('conversationId', {
        $or: listingIds.map(id => ({
          conversationId: { $regex: `^${id}_` }
        }))
      })
    }
  })
    .populate('sender', 'username')
    .populate('receiver', 'username')
    .sort({ createdAt: -1 }) // newest first so we get latest message per conversation
    .lean();

  // Group by conversationId — keep only the latest message per conversation
  const conversationMap = new Map();
  for (const msg of allMessages) {
    if (!conversationMap.has(msg.conversationId)) {
      conversationMap.set(msg.conversationId, msg);
    }
  }

  // Build response grouped by listing
  const listingMap = new Map(myListings.map(l => [l._id.toString(), l]));
  const inboxByListing = new Map();

  for (const [convId, latestMsg] of conversationMap.entries()) {
    const parts = convId.split('_');
    if (parts.length !== 3) continue;
    const [listingId, uid1, uid2] = parts;

    if (!listingMap.has(listingId)) continue; // not my listing

    // The buyer is whichever user in the conversation is NOT the seller
    const buyerId = uid1 === sellerId ? uid2 : uid1;

    // Resolve buyer username from populated fields
    const senderStr = (latestMsg.sender?._id || latestMsg.sender)?.toString();
    let buyerUsername = 'Unknown';
    if (senderStr === buyerId) {
      buyerUsername = latestMsg.sender?.username || 'Unknown';
    } else {
      buyerUsername = latestMsg.receiver?.username || 'Unknown';
    }

    const entry = {
      conversationId: convId,
      buyerId,
      buyerUsername,
      latestMessage: latestMsg.content,
      latestMessageAt: latestMsg.createdAt,
    };

    if (!inboxByListing.has(listingId)) {
      inboxByListing.set(listingId, {
        listing: listingMap.get(listingId),
        conversations: []
      });
    }
    inboxByListing.get(listingId).conversations.push(entry);
  }

  const data = Array.from(inboxByListing.values());

  res.status(200).json({
    success: true,
    data,
    message: 'Inbox retrieved successfully'
  });
}));

// GET /api/messages/:conversationId - Fetch conversation history (protected)
router.get('/:conversationId', authMiddleware, validateConversationId, asyncHandler(async (req, res) => {
  const { conversationId } = req.params;

  // Parse conversation ID to verify user is part of the conversation
  const parts = conversationId.split('_');
  const [listingId, userId1, userId2] = parts;
  
  if (req.userId !== userId1 && req.userId !== userId2) {
    throw new AppError('Access denied. You are not part of this conversation.', 403);
  }

  // Fetch messages in chronological order
  const messages = await Message.find({ conversationId })
    .populate('sender', 'username')
    .populate('receiver', 'username')
    .sort({ createdAt: 1 }); // Oldest first for chat history

  res.status(200).json({
    success: true,
    data: messages,
    message: 'Conversation history retrieved successfully'
  });
}));

// POST /api/messages - Send new message (protected)
router.post('/', authMiddleware, validateMessageCreation, asyncHandler(async (req, res) => {
  const { listingId, receiverId, content } = req.body;

  // Verify listing exists
  const listing = await Listing.findById(listingId);
  if (!listing) {
    throw new AppError('Listing not found', 404);
  }

  // Prevent users from messaging themselves
  if (req.userId === receiverId) {
    throw new AppError('Cannot send message to yourself', 400);
  }

  // Generate conversation ID
  const conversationId = Message.generateConversationId(listingId, req.userId, receiverId);

  // Create new message
  const message = new Message({
    conversationId,
    sender: req.userId,
    receiver: receiverId,
    content
  });

  await message.save();

  // Populate sender and receiver info for response
  await message.populate('sender', 'username');
  await message.populate('receiver', 'username');

  res.status(201).json({
    success: true,
    data: message,
    message: 'Message sent successfully'
  });
}));

module.exports = router;