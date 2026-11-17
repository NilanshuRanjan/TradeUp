const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: ['Textbooks', 'Furniture', 'Electronics', 'Clothing', 'Other'],
      message: 'Category must be one of: Textbooks, Furniture, Electronics, Clothing, Other'
    }
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Seller is required']
  },
  isSold: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
listingSchema.index({ seller: 1 });
listingSchema.index({ isSold: 1 });
listingSchema.index({ createdAt: -1 }); // For sorting by newest first
listingSchema.index({ seller: 1, isSold: 1, createdAt: -1 }); // Compound index for user's listings

module.exports = mongoose.model('Listing', listingSchema);