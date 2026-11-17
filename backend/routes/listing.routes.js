const express = require('express');
const Listing = require('../models/listing.model');
const authMiddleware = require('../middleware/auth.middleware');
const { asyncHandler, AppError } = require('../middleware/error.middleware');
const { validateListingCreation, validateObjectId } = require('../middleware/validation.middleware');
const router = express.Router();

// GET /api/listings - Fetch all active listings (public)
router.get('/', asyncHandler(async (req, res) => {
  const listings = await Listing.find({ isSold: false })
    .populate('seller', 'username')
    .sort({ createdAt: -1 }); // Newest first

  res.status(200).json({
    success: true,
    data: listings,
    message: 'Active listings retrieved successfully'
  });
}));

// GET /api/listings/my - Fetch user's listings (protected)
router.get('/my', authMiddleware, asyncHandler(async (req, res) => {
  const listings = await Listing.find({ seller: req.userId })
    .sort({ createdAt: -1 }); // Newest first

  res.status(200).json({
    success: true,
    data: listings,
    message: 'User listings retrieved successfully'
  });
}));

// GET /api/listings/:id - Fetch single listing (public)
router.get('/:id', validateObjectId('id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id)
    .populate('seller', 'username email');

  if (!listing) {
    throw new AppError('Listing not found', 404);
  }

  res.status(200).json({
    success: true,
    data: listing,
    message: 'Listing retrieved successfully'
  });
}));

// POST /api/listings - Create new listing (protected)
router.post('/', authMiddleware, validateListingCreation, asyncHandler(async (req, res) => {
  const { title, description, price, category } = req.body;

  // Create new listing
  const listing = new Listing({
    title,
    description,
    price,
    category,
    seller: req.userId
  });

  await listing.save();

  // Populate seller info for response
  await listing.populate('seller', 'username');

  res.status(201).json({
    success: true,
    data: listing,
    message: 'Listing created successfully'
  });
}));

// PUT /api/listings/:id/sold - Mark listing as sold (protected, owner only)
router.put('/:id/sold', authMiddleware, validateObjectId('id'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const listing = await Listing.findById(id);

  if (!listing) {
    throw new AppError('Listing not found', 404);
  }

  // Check if user is the owner of the listing
  if (listing.seller.toString() !== req.userId) {
    throw new AppError('Access denied. You can only modify your own listings.', 403);
  }

  // Check if listing is already sold
  if (listing.isSold) {
    throw new AppError('Listing is already marked as sold', 400);
  }

  // Mark as sold
  listing.isSold = true;
  await listing.save();

  res.status(200).json({
    success: true,
    data: listing,
    message: 'Listing marked as sold successfully'
  });
}));

module.exports = router;