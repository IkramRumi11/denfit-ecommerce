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
  if (!normalized) {
    throw new Error(`Invalid productId for stock reservation: ${String(normalized)}`);
  }
  if (mongoose.isValidObjectId(normalized)) {
    return new mongoose.Types.ObjectId(normalized);
  }
  return normalized;
};

const syncProductSizesAndVariants = async (productId, session = null) => {
  try {
    const query = Product.findById(productId);
    if (session) query.session(session);
    const fullProd = await query;
    if (fullProd && typeof fullProd.save === 'function') {
      await fullProd.save({ session, validateBeforeSave: false });
    }
  } catch (e) {
    console.error('Failed to sync sizes/variants for product:', productId, e?.message || e);
  }
};

// Reserve stock atomically per item using conditional findOneAndUpdate
// Supports:
// 1. Stock combination matrix (colorTempId + sizeId)
// 2. Size / Volume variants (product.sizes)
// 3. Color variants (product.variants)
// 4. Standalone global inventory
export const reserveStockForOrder = async (items, rawOptions = {}) => {
  const { orderId = null, ttlMs = 5 * 60 * 1000, session = null } = rawOptions || {};
  // items: [{ productId, sizeId, colorTempId, quantity }]
  const reservations = [];
  for (const it of items) {
    const rawPid = it.productId || it.product || it.id || it._id;
    const objectId = parseProductIdForReservation(rawPid);
    const productId = String(objectId);
    const sizeId = it.sizeId !== undefined ? it.sizeId : (it.size || null);
    const colorTempId = it.colorTempId !== undefined ? it.colorTempId : (it.variantId || it.color || null);
    const quantity = Number(it.quantity || 1);

    // Fetch product to inspect its inventory tracking structure
    const queryProd = Product.findById(objectId).select('stock sizes sizesObjects variants inventory inStock name');
    if (session) queryProd.session(session);
    const existingProd = await queryProd.lean();

    if (!existingProd) {
      throw new mongoose.Error.DocumentNotFoundError(`Product not found: ${productId}`);
    }

    const hasStockMatrix = Array.isArray(existingProd.stock) && existingProd.stock.length > 0;
    const hasSizes = Array.isArray(existingProd.sizes) && existingProd.sizes.length > 0 &&
      existingProd.sizes.some(s => s && (s.quantity !== null && s.quantity !== undefined));
    const hasVariants = Array.isArray(existingProd.variants) && existingProd.variants.length > 0 &&
      existingProd.variants.some(v => v && (v.inventory !== null && v.inventory !== undefined));

    let reservationType = 'inventory';
    let reservedSizeId = sizeId || null;
    let reservedColorTempId = colorTempId || null;
    let updateSuccess = false;

    const options = { new: true };
    if (session) options.session = session;

    // 1. COLOR × SIZE STOCK MATRIX
    if (hasStockMatrix) {
      const targetSize = sizeId ? String(sizeId).trim().toLowerCase() : '';
      const targetColor = colorTempId ? String(colorTempId).trim().toLowerCase() : '';

      const targetSizeTokens = new Set();
      if (targetSize) {
        targetSizeTokens.add(targetSize);
      }
      if (Array.isArray(existingProd.sizes)) {
        existingProd.sizes.forEach(s => {
          if (!s) return;
          const sid = String(s.id || s._id || '').toLowerCase().trim();
          const sval = String(s.value || '').toLowerCase().trim();
          if (targetSize && (sid === targetSize || sval === targetSize)) {
            if (sid) targetSizeTokens.add(sid);
            if (sval) targetSizeTokens.add(sval);
          }
        });
      }

      const targetColorTokens = new Set();
      if (targetColor) {
        targetColorTokens.add(targetColor);
        targetColorTokens.add(targetColor.replace(/^#/, ''));
      }
      if (Array.isArray(existingProd.colors)) {
        existingProd.colors.forEach(c => {
          if (!c) return;
          const cid = String(c._id || c.id || c.tempId || '').toLowerCase().trim();
          const cname = String(c.name || c.displayName || '').toLowerCase().trim();
          const chex = String(c.hex || c.value || '').toLowerCase().trim();
          if (targetColor && (cid === targetColor || chex === targetColor || chex.replace(/^#/, '') === targetColor.replace(/^#/, '') || cname === targetColor)) {
            if (cid) targetColorTokens.add(cid);
            if (cname) targetColorTokens.add(cname);
            if (chex) {
              targetColorTokens.add(chex);
              targetColorTokens.add(chex.replace(/^#/, ''));
            }
          }
        });
      }
      if (Array.isArray(existingProd.variants)) {
        existingProd.variants.forEach(v => {
          if (!v) return;
          const vid = String(v._id || v.id || v.tempId || '').toLowerCase().trim();
          const vname = String(v.name || '').toLowerCase().trim();
          const vhex = String(v.hex || '').toLowerCase().trim();
          if (targetColor && (vid === targetColor || vhex === targetColor || vhex.replace(/^#/, '') === targetColor.replace(/^#/, '') || vname === targetColor)) {
            if (vid) targetColorTokens.add(vid);
            if (vname) targetColorTokens.add(vname);
            if (vhex) {
              targetColorTokens.add(vhex);
              targetColorTokens.add(vhex.replace(/^#/, ''));
            }
          }
        });
      }

      const matchedStock = existingProd.stock.find((st) => {
        if (!st) return false;
        const sSizeId = String(st.sizeId || '').trim().toLowerCase();
        const sColorId = String(st.colorTempId || '').trim().toLowerCase();

        const sizeMatches = targetSizeTokens.size === 0 || targetSizeTokens.has(sSizeId);
        const colorMatches = targetColorTokens.size === 0 || targetColorTokens.has(sColorId) || targetColorTokens.has(sColorId.replace(/^#/, ''));
        return sizeMatches && colorMatches;
      });

      if (!matchedStock) {
        // Combination does not exist in stock matrix -> 0 stock
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock for variant combination', {
          productId,
          sizeId,
          colorTempId,
          availableQuantity: 0
        });
      }

      if ((matchedStock.quantity || 0) < quantity) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock for variant combination', {
          productId,
          sizeId: matchedStock.sizeId,
          colorTempId: matchedStock.colorTempId,
          availableQuantity: Math.max(0, matchedStock.quantity || 0)
        });
      }

      // Atomically decrement stock entry and inventory
      const q = {
        _id: objectId,
        stock: {
          $elemMatch: {
            sizeId: matchedStock.sizeId,
            ...(matchedStock.colorTempId ? { colorTempId: matchedStock.colorTempId } : {}),
            quantity: { $gte: quantity }
          }
        }
      };
      const u = {
        $inc: {
          'stock.$[elem0].quantity': -quantity,
          inventory: -quantity
        }
      };
      const filterOpts = {
        ...options,
        arrayFilters: [{
          'elem0.sizeId': matchedStock.sizeId,
          ...(matchedStock.colorTempId ? { 'elem0.colorTempId': matchedStock.colorTempId } : {})
        }]
      };

      const updated = await Product.findOneAndUpdate(q, u, filterOpts).select('stock inventory').lean();
      if (!updated) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock during concurrent update', {
          productId,
          sizeId: matchedStock.sizeId,
          colorTempId: matchedStock.colorTempId,
          availableQuantity: 0
        });
      }

      reservationType = 'stock';
      reservedSizeId = matchedStock.sizeId;
      reservedColorTempId = matchedStock.colorTempId || null;
      updateSuccess = true;
    }
    // 2. SIZE / VOLUME VARIANTS (e.g. Fragrance 30ml, 50ml, 100ml)
    else if (hasSizes && sizeId) {
      const targetSize = String(sizeId).trim().toLowerCase();
      const matchedSize = existingProd.sizes.find((sz, idx) => {
        if (!sz) return false;
        const szId = String(sz.id || sz._id || '').trim().toLowerCase();
        const szVal = String(sz.value || sz.label || sz.name || '').trim().toLowerCase();
        return szId === targetSize || szVal === targetSize || `size_${idx}` === targetSize || `size_legacy_${idx}` === targetSize;
      });

      if (!matchedSize) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Requested size variant not found', {
          productId,
          sizeId,
          colorTempId: null,
          availableQuantity: 0
        });
      }

      const availableQty = typeof matchedSize.quantity === 'number' ? matchedSize.quantity : (matchedSize.inStock ? existingProd.inventory : 0);
      if (availableQty < quantity) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock for size variant', {
          productId,
          sizeId: matchedSize.value || matchedSize.id,
          colorTempId: null,
          availableQuantity: Math.max(0, availableQty)
        });
      }

      // Atomically decrement sizes array quantity and global inventory
      const sizeIdentifier = matchedSize.id || matchedSize._id || matchedSize.value;
      const q = {
        _id: objectId,
        sizes: {
          $elemMatch: {
            $or: [
              ...(matchedSize.id ? [{ id: matchedSize.id }] : []),
              ...(matchedSize._id ? [{ _id: matchedSize._id }] : []),
              { value: matchedSize.value }
            ],
            quantity: { $gte: quantity }
          }
        }
      };
      const u = {
        $inc: {
          'sizes.$[elem0].quantity': -quantity,
          inventory: -quantity
        }
      };
      const filterOpts = {
        ...options,
        arrayFilters: [{
          $or: [
            ...(matchedSize.id ? [{ 'elem0.id': matchedSize.id }] : []),
            ...(matchedSize._id ? [{ 'elem0._id': matchedSize._id }] : []),
            { 'elem0.value': matchedSize.value }
          ]
        }]
      };

      const updated = await Product.findOneAndUpdate(q, u, filterOpts).select('sizes inventory').lean();
      if (!updated) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock during concurrent update', {
          productId,
          sizeId: matchedSize.value || sizeIdentifier,
          colorTempId: null,
          availableQuantity: 0
        });
      }

      reservationType = 'size';
      reservedSizeId = matchedSize.id || matchedSize.value;
      reservedColorTempId = null;
      updateSuccess = true;
    }
    // 3. COLOR VARIANTS (product.variants with inventory)
    else if (hasVariants && colorTempId) {
      const targetColor = String(colorTempId).trim().toLowerCase();
      const matchedVariant = existingProd.variants.find((v) => {
        if (!v) return false;
        const vId = String(v._id || v.id || v.tempId || '').trim().toLowerCase();
        const vName = String(v.name || '').trim().toLowerCase();
        const vHex = String(v.hex || '').trim().toLowerCase();
        return vId === targetColor || vName === targetColor || vHex === targetColor;
      });

      if (!matchedVariant) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Requested color variant not found', {
          productId,
          sizeId: null,
          colorTempId,
          availableQuantity: 0
        });
      }

      const availableQty = typeof matchedVariant.inventory === 'number' ? matchedVariant.inventory : 0;
      if (availableQty < quantity) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock for color variant', {
          productId,
          sizeId: null,
          colorTempId: matchedVariant.name || matchedVariant._id,
          availableQuantity: Math.max(0, availableQty)
        });
      }

      const q = {
        _id: objectId,
        variants: {
          $elemMatch: {
            $or: [
              ...(matchedVariant._id ? [{ _id: matchedVariant._id }] : []),
              { name: matchedVariant.name }
            ],
            inventory: { $gte: quantity }
          }
        }
      };
      const u = {
        $inc: {
          'variants.$[elem0].inventory': -quantity,
          inventory: -quantity
        }
      };
      const filterOpts = {
        ...options,
        arrayFilters: [{
          $or: [
            ...(matchedVariant._id ? [{ 'elem0._id': matchedVariant._id }] : []),
            { 'elem0.name': matchedVariant.name }
          ]
        }]
      };

      const updated = await Product.findOneAndUpdate(q, u, filterOpts).select('variants inventory').lean();
      if (!updated) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock during concurrent update', {
          productId,
          sizeId: null,
          colorTempId: matchedVariant.name || matchedVariant._id,
          availableQuantity: 0
        });
      }

      reservationType = 'variant';
      reservedSizeId = null;
      reservedColorTempId = matchedVariant._id ? String(matchedVariant._id) : matchedVariant.name;
      updateSuccess = true;
    }
    // 4. STANDALONE PRODUCT GLOBAL INVENTORY
    else {
      // If product has sizes or stock or variants configured, DO NOT silently fall back to global inventory
      if (hasSizes || hasStockMatrix || hasVariants) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Product requires a specific variant selection', {
          productId,
          sizeId,
          colorTempId,
          availableQuantity: 0
        });
      }

      const availableQty = Number(existingProd.inventory) || 0;
      if (availableQty < quantity) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock', {
          productId,
          sizeId: null,
          colorTempId: null,
          availableQuantity: Math.max(0, availableQty)
        });
      }

      const updated = await Product.findOneAndUpdate(
        { _id: objectId, inventory: { $gte: quantity } },
        { $inc: { inventory: -quantity } },
        options
      ).select('inventory').lean();

      if (!updated) {
        await rollbackPriorReservations(reservations, session);
        throw new InsufficientStockError('Insufficient stock during concurrent update', {
          productId,
          sizeId: null,
          colorTempId: null,
          availableQuantity: 0
        });
      }

      reservationType = 'inventory';
      reservedSizeId = null;
      reservedColorTempId = null;
      updateSuccess = true;
    }

    // Create reservation record for bookkeeping and rollback path
    const expiresAt = new Date(Date.now() + ttlMs);
    const rdoc = await StockReservation.create([{
      product: objectId,
      type: reservationType,
      sizeId: reservedSizeId,
      colorTempId: reservedColorTempId,
      quantity,
      status: 'reserved',
      order: orderId,
      expiresAt
    }], { session });
    reservations.push(rdoc[0]);

    // Authoritatively re-sync product derived properties (sizes[].inStock, product.inStock, availability)
    await syncProductSizesAndVariants(objectId, session);
  }

  return reservations;
};

// Helper to restore prior reservations when an InsufficientStockError occurs during loop or transaction abort
export async function rollbackPriorReservations(reservations, session = null) {
  if (!reservations || !reservations.length) return;
  for (const r of reservations) {
    try {
      const q = { _id: r.product };
      const opts = { new: true };
      if (session) opts.session = session;

      if (r.type === 'stock' || (r.sizeId && r.colorTempId)) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } },
          { ...opts, arrayFilters: [{ 'elem.sizeId': r.sizeId, ...(r.colorTempId ? { 'elem.colorTempId': r.colorTempId } : {}) }] }
        );
      } else if (r.type === 'size' || r.sizeId) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'sizes.$[elem].quantity': r.quantity } },
          { ...opts, arrayFilters: [{ $or: [{ 'elem.id': r.sizeId }, { 'elem._id': r.sizeId }, { 'elem.value': r.sizeId }] }] }
        );
      } else if (r.type === 'variant' || r.colorTempId) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'variants.$[elem].inventory': r.quantity } },
          { ...opts, arrayFilters: [{ $or: [{ 'elem._id': r.colorTempId }, { 'elem.id': r.colorTempId }, { 'elem.name': r.colorTempId }] }] }
        );
      } else {
        const updateQuery = Product.findByIdAndUpdate(r.product, { $inc: { inventory: r.quantity } }, opts);
        await updateQuery;
      }
      await syncProductSizesAndVariants(r.product, session);
      await StockReservation.findByIdAndUpdate(r._id, { status: 'released', restoredAt: new Date() });
    } catch (e) {
      console.warn('Failed to restore prior reservation during rollback:', r._id, e?.message || e);
    }
  }
}

export const commitReservations = async (reservationIds, rawOptions = {}) => {
  const { session = null } = rawOptions || {};
  const update = { status: 'committed' };
  const opts = {};
  if (session) opts.session = session;
  await StockReservation.updateMany({ _id: { $in: reservationIds } }, update, opts);
};

export const releaseReservations = async (reservationIds, rawOptions = {}) => {
  const { session = null } = rawOptions || {};
  const update = { status: 'released' };
  const opts = {};
  if (session) opts.session = session;
  await StockReservation.updateMany({ _id: { $in: reservationIds } }, update, opts);
};

// Revert inventory changes for reservations and mark them released.
export const revertAndReleaseReservations = async (reservationIds, rawOptions = {}) => {
  const { session = null } = rawOptions || {};
  if (session) {
    const reservations = await StockReservation.find({ _id: { $in: reservationIds }, status: { $in: ['reserved', 'committed'] } }).session(session).lean();
    for (const r of reservations) {
      const q = { _id: r.product };
      if (r.type === 'stock' || (r.sizeId && r.colorTempId)) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } },
          { arrayFilters: [{ 'elem.sizeId': r.sizeId, ...(r.colorTempId ? { 'elem.colorTempId': r.colorTempId } : {}) }], session, new: true }
        );
      } else if (r.type === 'size' || r.sizeId) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'sizes.$[elem].quantity': r.quantity } },
          { arrayFilters: [{ $or: [{ 'elem.id': r.sizeId }, { 'elem._id': r.sizeId }, { 'elem.value': r.sizeId }] }], session, new: true }
        );
      } else if (r.type === 'variant' || r.colorTempId) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'variants.$[elem].inventory': r.quantity } },
          { arrayFilters: [{ $or: [{ 'elem._id': r.colorTempId }, { 'elem.id': r.colorTempId }, { 'elem.name': r.colorTempId }] }], session, new: true }
        );
      } else {
        await Product.findByIdAndUpdate(r.product, { $inc: { inventory: r.quantity } }, { session, new: true });
      }
      await syncProductSizesAndVariants(r.product, session);
    }

    await StockReservation.updateMany({ _id: { $in: reservationIds }, status: { $in: ['reserved', 'committed'] } }, { $set: { status: 'released', restoredAt: new Date() } }, { session });
    return;
  }

  // Non-transactional fallback:
  for (const id of reservationIds) {
    const claimed = await StockReservation.findOneAndUpdate({ _id: id, status: { $in: ['reserved', 'committed'] } }, { $set: { status: 'reverting', revertStartedAt: new Date() } }, { new: true }).lean();
    if (!claimed) continue;

    try {
      const r = claimed;
      const q = { _id: r.product };
      if (r.type === 'stock' || (r.sizeId && r.colorTempId)) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'stock.$[elem].quantity': r.quantity } },
          { arrayFilters: [{ 'elem.sizeId': r.sizeId, ...(r.colorTempId ? { 'elem.colorTempId': r.colorTempId } : {}) }], new: true }
        );
      } else if (r.type === 'size' || r.sizeId) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'sizes.$[elem].quantity': r.quantity } },
          { arrayFilters: [{ $or: [{ 'elem.id': r.sizeId }, { 'elem._id': r.sizeId }, { 'elem.value': r.sizeId }] }], new: true }
        );
      } else if (r.type === 'variant' || r.colorTempId) {
        await Product.findOneAndUpdate(
          q,
          { $inc: { inventory: r.quantity, 'variants.$[elem].inventory': r.quantity } },
          { arrayFilters: [{ $or: [{ 'elem._id': r.colorTempId }, { 'elem.id': r.colorTempId }, { 'elem.name': r.colorTempId }] }], new: true }
        );
      } else {
        await Product.findByIdAndUpdate(r.product, { $inc: { inventory: r.quantity } }, { new: true });
      }
      await syncProductSizesAndVariants(r.product);

      await StockReservation.findOneAndUpdate({ _id: id, status: 'reverting' }, { $set: { status: 'released', restoredAt: new Date() } });
    } catch (e) {
      console.warn('Failed to revert inventory for reservation', id, e?.message || e);
    }
  }
};

export default { reserveStockForOrder, commitReservations, releaseReservations, rollbackPriorReservations, revertAndReleaseReservations };


// exported above including revertAndReleaseReservations
