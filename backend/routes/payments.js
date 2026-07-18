import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import Order from '../models/Order.js';
import StockReservation from '../models/StockReservation.js';
import stockService from '../services/stockService.js';
import mongoose from 'mongoose';

const router = express.Router();

// Webhook or callback endpoint for payment failure notifications
// Protected: only authenticated admins or a verified webhook can trigger this
router.post('/failure', protect, authorize('admin'), async (req, res) => {
  try {
    const { orderId, reason } = req.body || {};
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Only handle payments that are not already failed/cancelled
    if (order.paymentStatus === 'failed' || order.status === 'cancelled') {
      return res.status(200).json({ success: true, message: 'No action required' });
    }

    order.paymentStatus = 'failed';
    order.status = 'cancelled';
    if (!order.cancelledAt) order.cancelledAt = new Date();
    await order.save();

    // revert reservations if any
    const reservations = await StockReservation.find({ order: order._id, status: 'reserved' }).select('_id').lean();
    if (reservations && reservations.length) {
      const ids = reservations.map(r => r._id);
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await stockService.revertAndReleaseReservations(ids, { session });
        });
      } catch (e) {
        console.error('Payment failure revert transaction failed:', e && (e.stack || e.message || e));
        await stockService.revertAndReleaseReservations(ids);
      } finally {
        try { await session.endSession(); } catch (e) {}
      }
    }

    return res.status(200).json({ success: true, message: 'Payment failure handled, reservations restored' });
  } catch (e) {
    console.error('payments/failure error:', e && (e.stack || e.message || e));
    return res.status(500).json({ success: false, message: 'Error handling payment failure' });
  }
});

export default router;
