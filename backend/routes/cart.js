// backend/routes/cart.js
// Server-side cart API for authenticated users.
// Persists cart items in the User document so carts survive across devices.
// Guest carts remain in localStorage (handled by the frontend CartContext).
import express from 'express';

import { protect } from '../middleware/auth.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

const router = express.Router();

// ──────────────────────────────────────────────
// GET /api/v1/cart — Retrieve the authenticated user's server-side cart
// ──────────────────────────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('cart').lean();
    const items = (user && Array.isArray(user.cart)) ? user.cart : [];
    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    console.error('GET /api/v1/cart error:', err?.stack || err);
    res.status(500).json({ success: false, message: 'Error fetching cart' });
  }
});

// ──────────────────────────────────────────────
// POST /api/v1/cart/sync — Bulk sync (merge) client-side cart to server
// Used after login to persist the guest cart to the user's account.
// ──────────────────────────────────────────────
router.post('/sync', protect, async (req, res) => {
  try {
    const { items } = req.body || {};
    if (!Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'items must be an array' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Merge incoming items with existing server cart (avoid duplicates by productId+size+color)
    const existing = user.cart || [];
    const merged = [...existing];

    for (const incoming of items) {
      if (!incoming.productId) continue;
      const key = `${incoming.productId}|${incoming.size || ''}|${incoming.color || ''}`;
      const idx = merged.findIndex(e =>
        `${e.productId}|${e.size || ''}|${e.color || ''}` === key
      );
      if (idx >= 0) {
        // Update quantity to the max of server vs client (user likely added more)
        merged[idx].quantity = Math.max(merged[idx].quantity || 1, incoming.quantity || 1);
      } else {
        merged.push({
          productId: incoming.productId,
          name: incoming.name || '',
          price: Number(incoming.price) || 0,
          image: incoming.image || '',
          size: incoming.size || '',
          color: incoming.color || undefined,
          colorName: incoming.colorName || undefined,
          quantity: Number(incoming.quantity) || 1,
        });
      }
    }

    user.cart = merged;
    await user.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, data: { items: user.cart } });
  } catch (err) {
    console.error('POST /api/v1/cart/sync error:', err?.stack || err);
    res.status(500).json({ success: false, message: 'Error syncing cart' });
  }
});

// ──────────────────────────────────────────────
// POST /api/v1/cart/items — Add a single item to the cart
// ──────────────────────────────────────────────
router.post('/items', protect, async (req, res) => {
  try {
    const { productId, name, price, image, size, color, colorName, quantity = 1 } = req.body || {};
    if (!productId) return res.status(400).json({ success: false, message: 'productId is required' });
    if (!size) return res.status(400).json({ success: false, message: 'size is required' });

    // Validate product exists
    const product = await Product.findById(productId).select('name price').lean();
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.cart = user.cart || [];
    const key = `${productId}|${size}|${color || ''}`;
    const idx = user.cart.findIndex(e =>
      `${e.productId}|${e.size || ''}|${e.color || ''}` === key
    );

    if (idx >= 0) {
      user.cart[idx].quantity = (user.cart[idx].quantity || 0) + (Number(quantity) || 1);
    } else {
      user.cart.push({
        productId,
        name: name || product.name,
        price: Number(price) || product.price,
        image: image || '',
        size,
        color: color || undefined,
        colorName: colorName || undefined,
        quantity: Number(quantity) || 1,
      });
    }

    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, data: { items: user.cart } });
  } catch (err) {
    console.error('POST /api/v1/cart/items error:', err?.stack || err);
    res.status(500).json({ success: false, message: 'Error adding item to cart' });
  }
});

// ──────────────────────────────────────────────
// PATCH /api/v1/cart/items — Update quantity of a cart item
// ──────────────────────────────────────────────
router.patch('/items', protect, async (req, res) => {
  try {
    const { productId, size, color, quantity } = req.body || {};
    if (!productId || !size) return res.status(400).json({ success: false, message: 'productId and size required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.cart = user.cart || [];
    const key = `${productId}|${size}|${color || ''}`;
    const idx = user.cart.findIndex(e =>
      `${e.productId}|${e.size || ''}|${e.color || ''}` === key
    );

    if (idx < 0) return res.status(404).json({ success: false, message: 'Item not found in cart' });

    if (Number(quantity) <= 0) {
      user.cart.splice(idx, 1);
    } else {
      user.cart[idx].quantity = Number(quantity);
    }

    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, data: { items: user.cart } });
  } catch (err) {
    console.error('PATCH /api/v1/cart/items error:', err?.stack || err);
    res.status(500).json({ success: false, message: 'Error updating cart item' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/v1/cart/items/:productId — Remove a specific item
// ──────────────────────────────────────────────
router.delete('/items/:productId', protect, async (req, res) => {
  try {
    const { productId } = req.params;
    const { size, color } = req.query;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.cart = (user.cart || []).filter(item => {
      const match = String(item.productId) === String(productId) &&
        (!size || item.size === size) &&
        (!color || item.color === color);
      return !match;
    });

    await user.save({ validateBeforeSave: false });
    res.status(200).json({ success: true, data: { items: user.cart } });
  } catch (err) {
    console.error('DELETE /api/v1/cart/items error:', err?.stack || err);
    res.status(500).json({ success: false, message: 'Error removing cart item' });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/v1/cart — Clear entire cart
// ──────────────────────────────────────────────
router.delete('/', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { $set: { cart: [] } });
    res.status(200).json({ success: true, data: { items: [] } });
  } catch (err) {
    console.error('DELETE /api/v1/cart error:', err?.stack || err);
    res.status(500).json({ success: false, message: 'Error clearing cart' });
  }
});

export default router;
