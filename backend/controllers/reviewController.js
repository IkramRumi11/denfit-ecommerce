import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

// POST /api/v1/reviews
export const createReview = async (req, res, next) => {
  try {
    const user = req.user;
    const { product: productId, rating, title, body, images } = req.body || {};
    if (!productId || !rating) return res.status(400).json({ success: false, message: 'Missing product or rating' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Ensure user purchased this product at least once (verified customer)
    const purchased = await Order.exists({
      customer: user._id,
      'items.product': productId,
      $or: [
        { paymentStatus: 'paid' },
        { status: { $in: ['delivered', 'confirmed', 'shipped', 'processing'] } }
      ]
    });
    if (!purchased) {
      return res.status(403).json({ success: false, message: 'Only verified purchasers can submit reviews' });
    }

    // Ensure single review per user per product
    const existing = await Review.findOne({ product: productId, user: user._id });
    if (existing) return res.status(409).json({ success: false, message: 'You have already submitted a review for this product' });

    const review = await Review.create({
      product: productId,
      user: user._id,
      rating: Math.max(1, Math.min(5, Number(rating))),
      title: title || '',
      body: body || '',
      images: Array.isArray(images) ? images : [],
      status: 'approved', // auto-approve verified purchases
      verifiedPurchase: true,
      ipAddress: req.ip
    });

    // update product ratings (will be triggered by post save hook, but call explicitly for safety)
    try { await Review.updateProductRatings(productId); } catch (e) { console.warn('updateProductRatings failed', e); }

    res.status(201).json({ success: true, data: { review } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/reviews/product/:productId
export const getProductReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Number(req.query.limit) || 10);
    const onlyApproved = req.query.approved !== 'false';

    const filter = { product: productId };
    if (onlyApproved) filter.status = 'approved';

    const total = await Review.countDocuments(filter);
    const reviews = await Review.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'name avatar')
      .lean();

    res.json({ success: true, data: { reviews, pagination: { page, limit, total } } });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/reviews/summary/:productId
export const getProductReviewSummary = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: 'Invalid productId' });
    }

    let agg;
    try {
      agg = await Review.aggregate([
        {
          $match: {
            product: new mongoose.Types.ObjectId(productId), // ✅ FIX HERE
            status: 'approved'
          }
        },
        {
          $group: {
            _id: '$product',
            avg: { $avg: '$rating' },
            count: { $sum: 1 }
          }
        }
      ]);
    } catch (aggErr) {
      console.error(JSON.stringify({
        time: new Date().toISOString(),
        msg: 'reviews.summary.aggregate_failed',
        productId,
        error: aggErr?.message,
        stack: aggErr?.stack
      }));
      return res.status(500).json({ success: false, message: 'Failed to compute review summary' });
    }

    const stats = agg && agg[0]
      ? { average: Math.round(agg[0].avg * 10) / 10, count: agg[0].count }
      : { average: 0, count: 0 };

    res.json({ success: true, data: { summary: stats } });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/reviews/:id - allow owner to edit within 15 minutes
export const updateReview = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = req.user;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Not found' });

    // Only owner can edit via this endpoint
    if (!review.user.equals(user._id)) return res.status(403).json({ success: false, message: 'Forbidden' });

    // Enforce 15 minute edit window
    const fifteenMin = 15 * 60 * 1000;
    const now = Date.now();
    const created = new Date(review.createdAt).getTime();
    if (now - created > fifteenMin) return res.status(403).json({ success: false, message: 'Edit window expired' });

    const { rating, title, body, images } = req.body || {};
    if (typeof rating !== 'undefined') review.rating = Math.max(1, Math.min(5, Number(rating)));
    if (typeof title !== 'undefined') review.title = String(title).slice(0, 200);
    if (typeof body !== 'undefined') review.body = String(body).slice(0, 2000);
    if (Array.isArray(images)) review.images = images;

    // When user edits, set status back to pending for moderation unless already approved and owner edits small content
    // For simplicity, keep current status but if it was approved and substantial change, mark pending.
    // Here we keep existing status.

    await review.save();
    // Recalculate product ratings if review is approved
    try { await Review.updateProductRatings(review.product); } catch (e) { /* ignore */ }
    res.json({ success: true, data: { review } });
  } catch (err) { next(err); }
};

// DELETE /api/v1/reviews/:id - allow owner to delete their review
export const deleteReview = async (req, res, next) => {
  try {
    const id = req.params.id;
    const user = req.user;
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const review = await Review.findById(id);
    if (!review) return res.status(404).json({ success: false, message: 'Not found' });
    // Only owner can delete via this endpoint
    if (!review.user.equals(user._id)) return res.status(403).json({ success: false, message: 'Forbidden' });

    await Review.findByIdAndDelete(id);
    try { await Review.updateProductRatings(review.product); } catch (e) { /* ignore */ }
    res.json({ success: true });
  } catch (err) { next(err); }
};
