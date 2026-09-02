import express from 'express';

import { protect } from '../middleware/auth.js';
import { addNotificationJob } from '../queues/notificationQueue.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

const router = express.Router();

// GET /api/v1/wishlist
// Return the authenticated user's persisted wishlist (populated product info)
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id ? String(req.user._id) : null;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const user = await User.findById(userId).populate('wishlist.product', 'name images price').lean();
    const items = (user && Array.isArray(user.wishlist))
      ? user.wishlist.map(w => ({ product: w.product, addedAt: w.addedAt }))
      : [];

    res.status(200).json({ success: true, data: { items } });
  } catch (e) {
    console.error('GET /api/v1/wishlist error', e?.stack || e);
    res.status(500).json({ success: false, message: 'Error fetching wishlist' });
  }
});

// POST /api/v1/wishlist/items
// Persist wishlist item for the authenticated user and schedule a reminder notification.
router.post('/items', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id ? String(req.user._id) : null;
    const { productId, delayMs } = req.body || {};

    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });

    // Ensure product exists (best-effort)
    const prod = await Product.findById(productId).select('name').lean();
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Avoid duplicates
    const exists = (user.wishlist || []).some(w => String(w.product) === String(productId));
    if (!exists) {
      user.wishlist = user.wishlist || [];
      user.wishlist.push({ product: productId, addedAt: new Date() });
      await user.save();
    }

    // Default: schedule after 7 days (in ms) unless caller provides `delayMs` for testing
    const DEFAULT_DELAY = 7 * 24 * 60 * 60 * 1000; // 7 days
    const delay = typeof delayMs === 'number' && delayMs > 0 ? delayMs : DEFAULT_DELAY;

    const title = 'Wishlist reminder';
    const message = `You added ${prod.name} to your wishlist. Buy it now!`;

    await addNotificationJob('scheduledSend', { target: { userId }, title, message, metadata: { productId } }, { delay });

    console.info('[wishlist] scheduled reminder for user', userId, 'product=', productId, 'delayMs=', delay);

    // Return updated wishlist
    const updated = await User.findById(userId).populate('wishlist.product', 'name images price').lean();
    const items = (updated && Array.isArray(updated.wishlist))
      ? updated.wishlist.map(w => ({ product: w.product, addedAt: w.addedAt }))
      : [];

    res.status(200).json({ success: true, data: { items }, scheduledInMs: delay });
  } catch (e) {
    console.error('POST /api/v1/wishlist/items error', e?.stack || e);
    res.status(500).json({ success: false, message: 'Failed to schedule wishlist reminder' });
  }
});

// DELETE /api/v1/wishlist/items/:productId
router.delete('/items/:productId', protect, async (req, res) => {
  try {
    const userId = req.user && req.user._id ? String(req.user._id) : null;
    const { productId } = req.params || {};
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.wishlist = (user.wishlist || []).filter(w => String(w.product) !== String(productId));
    await user.save();

    const updated = await User.findById(userId).populate('wishlist.product', 'name images price').lean();
    const items = (updated && Array.isArray(updated.wishlist))
      ? updated.wishlist.map(w => ({ product: w.product, addedAt: w.addedAt }))
      : [];

    res.status(200).json({ success: true, data: { items } });
  } catch (e) {
    console.error('DELETE /api/v1/wishlist/items/:productId error', e?.stack || e);
    res.status(500).json({ success: false, message: 'Failed to remove wishlist item' });
  }
});

export default router;
