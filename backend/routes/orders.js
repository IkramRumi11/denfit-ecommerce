import express from 'express';

import { protect, optionalAuth } from '../middleware/auth.js';
import {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder
} from '../controllers/orderController.js';
import { validatePromoCode } from '../controllers/promoCodeController.js';

console.log('ORDERS ROUTE LOADED');
const router = express.Router();

// Validate promotional code at checkout
router.post('/validate-promo', validatePromoCode);

// Public endpoints are intentionally omitted: orders are user-specific and require auth
// Create an order (allow guest checkout — accept optional auth so req.user is set when present)
router.post('/', optionalAuth, (req, res, next) => {
  console.log('POST /orders route hit');
  return createOrder(req, res, next);
});

// Get all orders for current user
router.get('/', protect, getOrders);

// Get a single order
router.get('/:id', protect, getOrder);

// Cancel an order (user-scoped)
router.patch('/:id/cancel', protect, cancelOrder);

export default router;
