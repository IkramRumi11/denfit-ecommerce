import mongoose from 'mongoose';
import StockReservation from '../models/StockReservation.js';
import stockService from '../services/stockService.js';
import { supportsTransactions } from '../utils/dbUtils.js';

const DEFAULT_INTERVAL = process.env.RESERVATION_SWEEP_INTERVAL_MS ? parseInt(process.env.RESERVATION_SWEEP_INTERVAL_MS, 10) : (60 * 1000);

let _intervalId = null;

export const startReservationSweeper = async (opts = {}) => {
  const intervalMs = opts.intervalMs || DEFAULT_INTERVAL;
  const enabled = (process.env.RESERVATION_SWEEPER_ENABLED || 'true') === 'true' || opts.force === true;
  if (!enabled) {
    console.log('Reservation sweeper disabled by configuration');
    return;
  }

  const txSupported = await supportsTransactions();
  if (!txSupported) {
    console.warn('Reservation sweeper: MongoDB replica-set / transactions not available. Sweeper will run in non-transactional, best-effort mode. Consider enabling replica-set for fully atomic restoration.');
  }

  if (_intervalId) return; // already running

  console.log(`Starting reservation sweeper (interval ${intervalMs}ms)`);
  _intervalId = setInterval(async () => {
    try {
      const now = new Date();
      const expired = await StockReservation.find({ status: 'reserved', expiresAt: { $lte: now } }).select('_id').lean();
      if (!expired || expired.length === 0) return;
      const ids = expired.map(r => r._id);
      if (txSupported) {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            console.log(`Sweeper: reverting ${ids.length} expired reservations (tx)`);
            await stockService.revertAndReleaseReservations(ids, { session });
          });
        } catch (e) {
          console.error('Sweeper transaction failed:', e && (e.stack || e.message || e));
        } finally {
          try { await session.endSession(); } catch (e) {}
        }
      } else {
        try {
          console.log(`Sweeper: reverting ${ids.length} expired reservations (non-tx)`);
          await stockService.revertAndReleaseReservations(ids);
        } catch (e) {
          console.error('Sweeper non-transactional revert failed:', e && (e.stack || e.message || e));
        }
      }
    } catch (e) {
      console.error('Reservation sweeper error:', e && (e.stack || e.message || e));
    }
  }, intervalMs);
};

export const stopReservationSweeper = () => {
  if (_intervalId) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
};

export default { startReservationSweeper, stopReservationSweeper };
