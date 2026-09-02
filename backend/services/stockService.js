import mongoose from 'mongoose';

import Product from '../models/Product.js';
import StockReservation from '../models/StockReservation.js';

export class InsufficientStockError extends Error {
  constructor(message, { productId, sizeId, colorTempId, availableQuantity }) {
    super(message);
    this.name = 'InsufficientStockError';
    this.productId = productId;
    this.sizeId = sizeId;
    this.colorTempId = colorTempId;
    this.availableQuantity = availableQuantity;
  }
}

const parseProductIdForReservation = (productId) => {
  let normalized = productId;
  if (normalized && typeof normalized === 'object') {
    normalized = normalized._id || normalized.id || normalized;
  }
  if (!mongoose.isValidObjectId(normalized)) {
    const err = new mongoose.Error.CastError('ObjectId', normalized, 'productId');
    err.message = `Invalid productId for stock reservation: ${String(normalized)}`;
    throw err;
  }
  return new mongoose.Types.ObjectId(normalized);
};

const syncProductSizesAndVariants = async (productId, session = null) => {
  try {
    const query = Product.findById(productId);
    if (session) query.session(session);
    const fullProd = await query;
    if (fullProd) {
      await fullProd.save({ session, validateBeforeSave: false });
    }
  } catch (e) {
    console.error('Failed to sync sizes/variants for product:', productId, e?.message || e);
  }
};

// Reserve stock atomically per item using conditional findOneAndUpdate on product.stock entries
// Returns reservation documents array on success; throws on failure
export const reserveStockForOrder = async (items, { orderId = null, ttlMs = 5 * 60 * 1000, session = null } = {}) => {
  // items: [{ productId, sizeId, colorTempId, quantity }]
  const reservations = [];
  for (const it of items) {
    const { productId, sizeId, colorTempId, quantity } = it;
    // Try to atomically decrement a matching stock entry
    const objectId = parseProductIdForReservation(productId);
    const query = { _id: objectId };
    let update;
    let options = { new: true };
    if (session) options.session = session;

    if (sizeId || colorTempId) {
      // match stock entry by sizeId and/or colorTempId and ensure quantity >= requested
      const stockMatch = {};
      if (sizeId) stockMatch['stock.sizeId'] = sizeId;
      if (colorTempId) stockMatch['stock.colorTempId'] = colorTempId;

      // Use positional filtered update via arrayFilters
      query['stock'] = { $elemMatch: { ...(sizeId ? { sizeId } : {}), ...(colorTempId ? { colorTempId } : {}), quantity: { $gte: quantity } } };
      update = { $inc: { 'inventory': -quantity } };
      // decrement the matching stock.$.quantity using arrayFilters
      // need to use arrayFilters
      options.arrayFilters = [{ 'elem.sizeId': sizeId }, { 'elem.colorTempId': colorTempId }].filter(Boolean).map((f, i) => ({ [`elem${i}`]: f }));
      // Build a more precise update depending on provided keys
      if (sizeId && colorTempId) {
        update = { $inc: { 'stock.$[elem0].quantity': -quantity, inventory: -quantity } };
        options.arrayFilters = [{ 'elem0.sizeId': sizeId, 'elem0.colorTempId': colorTempId }];
      } else if (sizeId) {
        update = { $inc: { 'stock.$[elem0].quantity': -quantity, inventory: -quantity } };
        options.arrayFilters = [{ 'elem0.sizeId': sizeId }];
      } else if (colorTempId) {
        update = { $inc: { 'stock.$[elem0].quantity': -quantity, inventory: -quantity } };
        options.arrayFilters = [{ 'elem0.colorTempId': colorTempId }];
      }

      const prod = await Product.findOneAndUpdate(query, update, options).select('stock inventory').lean();
      if (!prod) {
        // try fallback: if inventory overall is sufficient decrement inventory only
        const fallbackOptions = { new: true };
        if (session) fallbackOptions.session = session;
        const prod2 = await Product.findOneAndUpdate({ _id: objectId, inventory: { $gte: quantity } }, { $inc: { inventory: -quantity } }, fallbackOptions).select('inventory').lean();
        if (!prod2) {
          // restore inventory for any prior reservations (non-transactional fallback)
          for (const r of reservations) {
            try {
              const q = { _id: r.product };
              if (r.sizeId && r.colorTempId) {
                await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.sizeId': r.sizeId, 'elem.colorTempId': r.colorTempId }], new: true });
              } else if (r.sizeId) {
                await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.sizeId': r.sizeId }], new: true });
              } else if (r.colorTempId) {
                await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.colorTempId': r.colorTempId }], new: true });
              } else {
                await Product.findByIdAndUpdate(r.product, { $inc: { inventory: r.quantity } }, { new: true });
              }
              await syncProductSizesAndVariants(r.product);
            } catch (e) {
              // best-effort: if restore fails, leave reservation record for sweeper to handle
              console.warn('Failed to restore inventory for reservation during rollback', r._id, e?.message || e);
            }
            try { await StockReservation.findByIdAndUpdate(r._id, { status: 'released', restoredAt: new Date() }); } catch (e) {}
          }
          const fallbackProd = await Product.findById(objectId).select('stock inventory').session(options.session || null).lean();
          const availableQuantity = fallbackProd ? (fallbackProd.stock?.find(s => String(s.sizeId) === String(sizeId) && String(s.colorTempId) === String(colorTempId))?.quantity || 0) : 0;
          throw new InsufficientStockError('Insufficient stock', { productId, sizeId, colorTempId, availableQuantity });
        }
      }
    } else {
      // No SKU granular stock; decrement global inventory atomically
      const prod = await Product.findOneAndUpdate({ _id: objectId, inventory: { $gte: quantity } }, { $inc: { inventory: -quantity } }, options).select('inventory').lean();
      if (!prod) {
        // restore inventory for prior reservations (non-transactional fallback)
        for (const r of reservations) {
          try {
            const q = { _id: r.product };
            if (r.sizeId && r.colorTempId) {
              await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.sizeId': r.sizeId, 'elem.colorTempId': r.colorTempId }], new: true });
            } else if (r.sizeId) {
              await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.sizeId': r.sizeId }], new: true });
            } else if (r.colorTempId) {
              await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.colorTempId': r.colorTempId }], new: true });
            } else {
              await Product.findByIdAndUpdate(r.product, { $inc: { inventory: r.quantity } }, { new: true });
            }
            await syncProductSizesAndVariants(r.product);
          } catch (e) {
            console.warn('Failed to restore inventory for reservation during rollback', r._id, e?.message || e);
          }
          try { await StockReservation.findByIdAndUpdate(r._id, { status: 'released', restoredAt: new Date() }); } catch (e) {}
        }
        const fallbackProd = await Product.findById(objectId).select('inventory').session(options.session || null).lean();
        const availableQuantity = fallbackProd ? fallbackProd.inventory : 0;
        throw new InsufficientStockError('Insufficient stock', { productId, sizeId: null, colorTempId: null, availableQuantity });
      }
    }

    // create reservation record for bookkeeping and possible rollback path
    const expiresAt = new Date(Date.now() + ttlMs);
    const rdoc = await StockReservation.create([{ product: objectId, type: 'inventory', sizeId, colorTempId, quantity, status: 'reserved', order: orderId, expiresAt }], { session });
    reservations.push(rdoc[0]);

    // Sync sizes and variants
    await syncProductSizesAndVariants(objectId, session);
  }

  return reservations;
};

export const commitReservations = async (reservationIds, { session = null } = {}) => {
  const update = { status: 'committed' };
  const opts = {};
  if (session) opts.session = session;
  await StockReservation.updateMany({ _id: { $in: reservationIds } }, update, opts);
};

export const releaseReservations = async (reservationIds, { session = null } = {}) => {
  // For cleanup we mark released; we do NOT automatically rollback inventory here because inventory was decremented atomically already.
  const update = { status: 'released' };
  const opts = {};
  if (session) opts.session = session;
  await StockReservation.updateMany({ _id: { $in: reservationIds } }, update, opts);
};

// Revert inventory changes for reservations and mark them released.
export const revertAndReleaseReservations = async (reservationIds, { session = null } = {}) => {
  // If a session is provided, prefer transactional, all-or-nothing rollback.
  if (session) {
    // Only operate on reservations that are still active (reserved or committed)
    const reservations = await StockReservation.find({ _id: { $in: reservationIds }, status: { $in: ['reserved', 'committed'] } }).session(session).lean();
    for (const r of reservations) {
      const q = { _id: r.product };
      if (r.sizeId && r.colorTempId) {
        await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.sizeId': r.sizeId, 'elem.colorTempId': r.colorTempId }], session, new: true });
      } else if (r.sizeId) {
        await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.sizeId': r.sizeId }], session, new: true });
      } else if (r.colorTempId) {
        await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.colorTempId': r.colorTempId }], session, new: true });
      } else {
        await Product.findByIdAndUpdate(r.product, { $inc: { inventory: r.quantity } }, { session, new: true });
      }
      await syncProductSizesAndVariants(r.product, session);
    }

    // mark released within the same transaction
    await StockReservation.updateMany({ _id: { $in: reservationIds }, status: { $in: ['reserved', 'committed'] } }, { $set: { status: 'released', restoredAt: new Date() } }, { session });
    return;
  }

  // Non-transactional fallback: best-effort, attempt to avoid double-restores by
  // atomically marking reservations as 'reverting' before performing the Product updates.
  for (const id of reservationIds) {
    // Atomically claim reservation for revert only if still active
    const claimed = await StockReservation.findOneAndUpdate({ _id: id, status: { $in: ['reserved', 'committed'] } }, { $set: { status: 'reverting', revertStartedAt: new Date() } }, { new: true }).lean();
    if (!claimed) continue; // already released or being handled

    try {
      const r = claimed;
      const q = { _id: r.product };
      if (r.sizeId && r.colorTempId) {
        await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.sizeId': r.sizeId, 'elem.colorTempId': r.colorTempId }], new: true });
      } else if (r.sizeId) {
        await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.sizeId': r.sizeId }], new: true });
      } else if (r.colorTempId) {
        await Product.findOneAndUpdate(q, { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } }, { arrayFilters: [{ 'elem.colorTempId': r.colorTempId }], new: true });
      } else {
        await Product.findByIdAndUpdate(r.product, { $inc: { inventory: r.quantity } }, { new: true });
      }
      await syncProductSizesAndVariants(r.product);

      // Mark as released (safe idempotent step for this path)
      await StockReservation.findOneAndUpdate({ _id: id, status: 'reverting' }, { $set: { status: 'released', restoredAt: new Date() } });
    } catch (e) {
      console.warn('Failed to revert inventory for reservation', id, e?.message || e);
      // leave it in 'reverting' so the sweeper/retry can pick it up later
    }
  }
};

export default { reserveStockForOrder, commitReservations, releaseReservations, revertAndReleaseReservations };

// exported above including revertAndReleaseReservations
