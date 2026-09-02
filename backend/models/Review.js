import mongoose from 'mongoose';

import Product from './Product.js';

const reviewSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, trim: true, maxLength: 200 },
  body: { type: String, trim: true, maxLength: 2000 },
  images: [{ url: String, filename: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
  featured: { type: Boolean, default: false },
  verifiedPurchase: { type: Boolean, default: false },
  helpfulCount: { type: Number, default: 0 },
  ipAddress: String,
}, { timestamps: true });

// Recalculate product rating summary for approved reviews
reviewSchema.statics.updateProductRatings = async function(productId) {
  if (!productId) return;
  const pid = mongoose.Types.ObjectId.isValid(productId)
    ? new mongoose.Types.ObjectId(productId)
    : productId;
  const agg = await this.aggregate([
    { $match: { product: pid, status: 'approved' } },
    { $group: { _id: '$product', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]).exec();
  const stats = (agg && agg[0]) ? agg[0] : null;
  if (stats) {
    await Product.findByIdAndUpdate(productId, { 'ratings.average': Math.round(stats.avg * 10) / 10, 'ratings.count': stats.count }).exec();
  } else {
    // No approved reviews
    await Product.findByIdAndUpdate(productId, { 'ratings.average': 0, 'ratings.count': 0 }).exec();
  }
};

// After saving a review, if it is approved update product ratings
reviewSchema.post('save', async function(doc) {
  try {
    if (doc && doc.product && doc.status === 'approved') {
      await mongoose.model('Review').updateProductRatings(doc.product);
    }
  } catch (e) {
    console.error('Failed to update product ratings after review save', e);
  }
});

// When a review is removed or updated to non-approved, recalc ratings
reviewSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc && doc.product) await mongoose.model('Review').updateProductRatings(doc.product);
  } catch (e) {
    console.error('Failed to update product ratings after review delete', e);
  }
});

export default mongoose.model('Review', reviewSchema);
