const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: [true, 'Conversation ID is required'],
    trim: true,
    // Format: "listingId_buyerId_sellerId"
    match: [/^[a-f\d]{24}_[a-f\d]{24}_[a-f\d]{24}$/, 'Invalid conversation ID format']
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Sender is required']
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Receiver is required']
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [1000, 'Message content cannot exceed 1000 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
messageSchema.index({ conversationId: 1 });
messageSchema.index({ createdAt: 1 }); // For chronological ordering
messageSchema.index({ conversationId: 1, createdAt: 1 }); // Compound index for conversation history

// Static method to generate conversation ID
messageSchema.statics.generateConversationId = function(listingId, buyerId, sellerId) {
  // Ensure consistent ordering: smaller ID first, then larger ID
  const userIds = [buyerId.toString(), sellerId.toString()].sort();
  return `${listingId}_${userIds[0]}_${userIds[1]}`;
};

// Static method to parse conversation ID
messageSchema.statics.parseConversationId = function(conversationId) {
  const parts = conversationId.split('_');
  if (parts.length !== 3) {
    throw new Error('Invalid conversation ID format');
  }
  return {
    listingId: parts[0],
    userId1: parts[1],
    userId2: parts[2]
  };
};

module.exports = mongoose.model('Message', messageSchema);