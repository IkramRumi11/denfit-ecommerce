// backend/controllers/orderController.js
import mongoose from 'mongoose';

import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { newCorrelationId } from '../utils/correlation.js';
import EmailService from '../services/emailService.js';
import stockService, { InsufficientStockError } from '../services/stockService.js';
import StockReservation from '../models/StockReservation.js';
import { supportsTransactions } from '../utils/dbUtils.js';
import bus from '../events/index.js';
import User from '../models/User.js';

export const createOrder = async (req, res) => {
  console.log('Entered createOrder');
  let session = null;
  try {
    const isGuest = !req.user;
    const { items, shippingAddress, paymentMethod } = req.body || {};

    // Normalize and validate items — PRICES ARE VERIFIED FROM THE DATABASE, never from the client.
    let dbProductMap = {};
    const validationErrors = [];
    const normalizedItems = [];
    if (!items || !Array.isArray(items) || items.length === 0) {
      validationErrors.push('No items provided for order');
    } else {
      // 1. Collect all product IDs from the request so we can batch-fetch from DB
      const requestedProductIds = [];
      const parsedItems = [];
      items.forEach((it, idx) => {
        if (!it || typeof it !== 'object') {
          validationErrors.push(`items[${idx}] is invalid`);
          return;
        }
        const product = it.product || it.productId || it.product_id;
        let productId = null;
        try {
          if (typeof product === 'string') productId = product;
          else if (product && (product._id || product.id)) productId = product._id || product.id;
          else productId = product;
        } catch (e) {
          productId = product;
        }

        const size = String(it.size || '').trim();
        const rawColor = it.color || null;
        const incomingColorName = it.colorName || it.colorName === '' ? (it.colorName || null) : null;
        let color = null;
        try {
          if (rawColor && typeof rawColor === 'object') {
            color = {
              name: rawColor.name ? String(rawColor.name) : (incomingColorName ? String(incomingColorName) : undefined),
              hex: rawColor.hex ? String(rawColor.hex) : (rawColor.value ? String(rawColor.value) : undefined),
              tempId: rawColor.tempId ? String(rawColor.tempId) : (rawColor.id ? String(rawColor.id) : undefined)
            };
            if (!color.name && !color.hex && !color.tempId) color = null;
          } else if (rawColor && typeof rawColor === 'string') {
            color = { name: incomingColorName ? String(incomingColorName) : String(rawColor), hex: String(rawColor).startsWith('#') ? String(rawColor) : undefined };
          } else if (incomingColorName) {
            color = { name: String(incomingColorName) };
          }
        } catch (e) {
          color = rawColor && typeof rawColor === 'string' ? { name: String(rawColor) } : null;
        }

        const image = it.image || process.env.DEFAULT_PRODUCT_IMAGE || 'https://via.placeholder.com/150';
        const quantity = typeof it.quantity === 'number' ? it.quantity : parseInt(String(it.quantity || ''), 10) || NaN;

        if (!product) validationErrors.push(`items[${idx}].product is required`);
        if (!size) validationErrors.push(`items[${idx}].size is required`);
        if (!Number.isInteger(quantity) || quantity < 1) validationErrors.push(`items[${idx}].quantity must be an integer >= 1`);

        if (productId) requestedProductIds.push(String(productId));
        parsedItems.push({ idx, productId, image, size, quantity, color });
      });

      // 2. Batch-fetch all referenced products from the database in a single query
      dbProductMap = {};
      if (requestedProductIds.length > 0 && validationErrors.length === 0) {
        try {
          const validIds = requestedProductIds.filter(id => mongoose.Types.ObjectId.isValid(id));
          const dbProducts = await Product.find({ _id: { $in: validIds } })
            .select('_id name price images variants colors stock sizes')
            .lean();
          for (const p of dbProducts) {
            dbProductMap[String(p._id)] = p;
          }
        } catch (dbErr) {
          console.error('Failed to look up products for order price verification:', dbErr?.message || dbErr);
          return res.status(500).json({ success: false, message: 'Failed to verify product prices. Please try again.' });
        }
      }

      // 3. Build normalizedItems using the DATABASE price, not the client price
      for (const parsed of parsedItems) {
        const { idx, productId, image, size, quantity, color } = parsed;
        if (!productId) continue; // already flagged above

        const dbProduct = dbProductMap[String(productId)];
        if (!dbProduct) {
          validationErrors.push(`items[${idx}].product not found in database (id: ${productId})`);
          continue;
        }

        const verifiedPrice = Number(dbProduct.price);
        if (!Number.isFinite(verifiedPrice) || verifiedPrice <= 0) {
          validationErrors.push(`items[${idx}] has an invalid price in the database — please contact support`);
          continue;
        }

        // Use the product name from the database as the authoritative name
        const verifiedName = String(dbProduct.name || '').trim();
        if (!verifiedName) {
          validationErrors.push(`items[${idx}].name could not be resolved from the database`);
          continue;
        }

        normalizedItems.push({
          product: productId,
          productId,
          name: verifiedName,
          image,
          price: verifiedPrice,  // ← ALWAYS from database, never from client
          size,
          quantity,
          color
        });
      }
    }

    // Shipping validation (kept detailed)
    let normalizedShippingAddress = null;
    if (!shippingAddress || typeof shippingAddress !== 'object') {
      validationErrors.push('shippingAddress is required');
    } else {
      const s = Object.assign({}, shippingAddress);
      s.name = String(s.name || '').trim();
      s.street = String(s.street || '').trim();
      s.city = String(s.city || '').trim();
      s.state = String(s.state || '').trim();
      s.zipCode = String(s.zipCode || '').trim();
      s.country = String(s.country || 'Pakistan').trim();
      s.phone = String(s.phone || '').trim();
      s.email = String(s.email || '').trim();

      const requiredShipFields = ['name', 'street', 'city', 'state', 'phone'];
      requiredShipFields.forEach((f) => {
        if (!s[f] || s[f] === '') validationErrors.push(`shippingAddress.${f} is required`);
      });

      const nameRe = /^[A-Za-z ]{3,}$/;
      if (s.name && !nameRe.test(s.name)) validationErrors.push('shippingAddress.name must contain only letters and spaces and be at least 3 characters');
      const phoneRe = /^(\+\d{12}|03\d{9})$/;
      if (s.phone && !phoneRe.test(s.phone)) validationErrors.push('shippingAddress.phone must be + followed by 12 digits (13 chars) or start with 03 and be 11 digits');
      if (s.street && s.street.length < 20) validationErrors.push('shippingAddress.street must be at least 20 characters');
      if (s.city && s.city.length < 1) validationErrors.push('shippingAddress.city is required');
      if (s.zipCode && !/^\d+$/.test(s.zipCode)) validationErrors.push('shippingAddress.zipCode must contain only digits');

      normalizedShippingAddress = s;
    }

    let guestEmail = null;
    if (isGuest) {
      guestEmail = String((req.body && req.body.email) || (normalizedShippingAddress && normalizedShippingAddress.email) || '').trim();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!guestEmail || !emailRe.test(guestEmail)) validationErrors.push('shippingAddress.email is required for guest checkout and must be a valid email');
    }

    const validPaymentMethods = ['cash_on_delivery'];
    if (!paymentMethod || !validPaymentMethods.includes(paymentMethod)) validationErrors.push(`paymentMethod is required and must be one of: ${validPaymentMethods.join(', ')}`);

    if (validationErrors.length > 0) {
      const buildStructured = (errs) => {
        const out = {};
        errs.forEach((s) => {
          const m = String(s).match(/^([^\s]+)\s+(.+)$/);
          if (!m) { out._global = out._global || []; out._global.push(s); return; }
          const key = m[1]; const msg = m[2]; const parts = key.split('.'); let cur = out;
          for (let i = 0; i < parts.length; i++) {
            const p = parts[i]; const arrMatch = p.match(/^(.+)\[(\d+)\]$/);
            if (arrMatch) {
              const k = arrMatch[1]; const idx = Number(arrMatch[2]); cur[k] = cur[k] || []; while (cur[k].length <= idx) cur[k].push({});
              if (i === parts.length - 1) cur[k][idx] = msg; else { if (typeof cur[k][idx] !== 'object') cur[k][idx] = {}; cur = cur[k][idx]; }
            } else {
              if (i === parts.length - 1) cur[p] = msg; else { cur[p] = cur[p] || {}; cur = cur[p]; }
            }
          }
        });
        return out;
      };
      const structured = buildStructured(validationErrors);
      return res.status(400).json({ success: false, message: 'Invalid order payload', errors: structured });
    }

    // Calculate totals
    const subtotal = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // TAX system disabled: preserve fields but set taxAmount to 0
    // Original implementation: taxAmount = subtotal * 0.13
    const taxAmount = 0; // disabled
    const shippingCost = subtotal < 5000 ? 300 : 0;
    // originalTotal kept for historical/admin reporting but exclude tax when storing customer-facing total
    const originalTotal = Math.round((subtotal + taxAmount + shippingCost) * 100) / 100;
    const customerTotal = Math.round((subtotal + shippingCost) * 100) / 100;

    // Reservation + order creation
    let order = null;
    let reservations = [];
    try {
      const reserveItems = normalizedItems.map(it => {
        const dbProduct = dbProductMap[String(it.product)];

        const targetSizeStr = typeof it.size === 'string' ? it.size.trim().toLowerCase() : (it.size != null ? String(it.size).trim().toLowerCase() : '');
        let targetColorStr = '';
        let targetColorHex = '';
        let targetColorName = '';
        let targetVariantId = '';

        if (it.color) {
          if (typeof it.color === 'string') {
            targetColorStr = it.color.trim().toLowerCase();
          } else if (typeof it.color === 'object') {
            targetColorName = (it.color.name || '').trim().toLowerCase();
            targetColorHex = (it.color.hex || it.color.value || '').trim().toLowerCase();
            targetVariantId = String(it.color.tempId || it.color._id || it.color.id || '');
            targetColorStr = targetColorName || targetColorHex;
          }
        }
        if (it.colorName && typeof it.colorName === 'string') {
          targetColorName = it.colorName.trim().toLowerCase();
        }

        let resolvedSizeId = it.size || null;
        if (dbProduct) {
          const sizesArr = Array.isArray(dbProduct.sizesObjects) && dbProduct.sizesObjects.length
            ? dbProduct.sizesObjects
            : (Array.isArray(dbProduct.sizes) ? dbProduct.sizes : []);

          for (let idx = 0; idx < sizesArr.length; idx++) {
            const sz = sizesArr[idx];
            const szVal = sz && typeof sz === 'object' ? String(sz.value || sz.label || sz.name || '').trim().toLowerCase() : String(sz).trim().toLowerCase();
            const szId = sz && typeof sz === 'object' ? (sz.id || sz._id || `size_${idx}`) : `size_${idx}`;
            if (targetSizeStr && (szVal === targetSizeStr || String(szId).trim().toLowerCase() === targetSizeStr || `size_legacy_${idx}` === targetSizeStr)) {
              resolvedSizeId = szId;
              break;
            }
          }
        }

        let resolvedColorTempId = null;
        if (dbProduct && (targetColorStr || targetColorName || targetColorHex || targetVariantId)) {
          if (Array.isArray(dbProduct.variants) && dbProduct.variants.length) {
            const matchedVar = dbProduct.variants.find(v => {
              if (!v) return false;
              const vId = String(v._id || v.id || v.tempId || '');
              const vName = String(v.name || '').trim().toLowerCase();
              const vHex = String(v.hex || '').trim().toLowerCase();
              return (targetVariantId && vId === targetVariantId) ||
                (targetColorName && vName === targetColorName) ||
                (targetColorHex && (vHex === targetColorHex || vHex.replace(/^#/, '') === targetColorHex.replace(/^#/, ''))) ||
                (targetColorStr && (vName === targetColorStr || vHex === targetColorStr || vHex.replace(/^#/, '') === targetColorStr.replace(/^#/, '')));
            });
            if (matchedVar) {
              resolvedColorTempId = matchedVar.name || matchedVar.hex || String(matchedVar._id || matchedVar.id);
            }
          }

          if (!resolvedColorTempId && Array.isArray(dbProduct.colors) && dbProduct.colors.length) {
            const matchedCol = dbProduct.colors.find(c => {
              if (!c) return false;
              const cName = String(c.name || '').trim().toLowerCase();
              const cHex = String(c.hex || c.value || '').trim().toLowerCase();
              const cVal = String(c.value || '').trim().toLowerCase();
              return (targetColorName && cName === targetColorName) ||
                (targetColorHex && (cHex === targetColorHex || cVal === targetColorHex)) ||
                (targetColorStr && (cName === targetColorStr || cHex === targetColorStr || cVal === targetColorStr));
            });
            if (matchedCol) {
              resolvedColorTempId = matchedCol.name || matchedCol.hex || matchedCol.value;
            }
          }

          if (!resolvedColorTempId) {
            resolvedColorTempId = targetColorName || targetColorStr || targetColorHex || null;
          }
        }

        return {
          productId: it.product,
          sizeId: resolvedSizeId,
          colorTempId: resolvedColorTempId,
          quantity: it.quantity
        };
      });
      const orderData = {
        customer: req.user ? req.user.id : undefined,
        guestEmail: guestEmail || undefined,
        contactEmail: (normalizedShippingAddress && normalizedShippingAddress.email) || guestEmail || null,
        items: normalizedItems,
        shippingAddress: normalizedShippingAddress,
        paymentMethod,
        subtotal,
        taxAmount,
        shippingCost,
        total: originalTotal
      };

      const createOrderNonTransactional = async () => {
        reservations = await stockService.reserveStockForOrder(reserveItems, { ttlMs: 5 * 60 * 1000 });
        order = await Order.create(orderData);
        await StockReservation.updateMany({ _id: { $in: reservations.map(r => r._id) } }, { $set: { order: order._id } });
        await stockService.commitReservations(reservations.map(r => r._id));
      };

      const txSupported = await supportsTransactions();
      if (txSupported) {
        session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            reservations = await stockService.reserveStockForOrder(reserveItems, { orderId: null, ttlMs: 5 * 60 * 1000, session });
            const ord = new Order(orderData);
            await ord.save({ session });
            await stockService.commitReservations(reservations.map(r => r._id), { session });
            order = ord;
          });
        } catch (txErr) {
          if (txErr && txErr.name === 'InsufficientStockError') {
            throw txErr;
          }
          console.warn('Transaction failed or unsupported, falling back to non-transactional reservation:', txErr?.message || txErr);
          if (session && session.inTransaction()) { try { await session.abortTransaction(); } catch (e) {} }
          await createOrderNonTransactional();
        }
      } else {
        await createOrderNonTransactional();
      }
    } catch (createErr) {
      // attempt best-effort revert if reservations were created
      try {
        if (reservations && reservations.length) {
          const ids = reservations.map(r => (r && r._id) ? r._id : r);
          await stockService.revertAndReleaseReservations(ids);
        }
      } catch (reErr) {
        console.error('Failed to revert/release reservations after order creation error:', reErr?.message || reErr);
      }
      if (createErr && createErr.name === 'InsufficientStockError') {
        const { productId, sizeId, colorTempId, availableQuantity } = createErr;
        const dbProduct = dbProductMap[String(productId)];
        let sizeVal = sizeId;
        let colorName = colorTempId || 'Default';
        let displayMessage = `Only ${availableQuantity} items are available.`;
        
        if (dbProduct) {
          const matchedSize = dbProduct.sizes?.find(s => String(s.id) === String(sizeId) || String(s.value) === String(sizeId));
          sizeVal = matchedSize ? matchedSize.value : sizeId;
          
          const matchedVar = dbProduct.variants?.find(v => 
            String(v._id || v.id) === String(colorTempId) ||
            (v.name && String(v.name).toLowerCase() === String(colorTempId).toLowerCase())
          );
          if (matchedVar) colorName = matchedVar.name;
          
          if (availableQuantity === 0) {
            displayMessage = `${colorName} / Size ${sizeVal} is out of stock.`;
          } else {
            displayMessage = `Only ${availableQuantity} items are available for ${colorName} / Size ${sizeVal}.`;
          }
        }
        
        return res.status(400).json({
          status: 'fail',
          code: 'INSUFFICIENT_STOCK',
          message: displayMessage,
          availableQuantity
        });
      }
      if (createErr && createErr.name === 'ValidationError') {
        const errorsArr = Object.values(createErr.errors).map((e) => e.message || String(e));
        const buildStructured = (errs) => {
          const out = {};
          errs.forEach((s) => {
            const m = String(s).match(/^([^\s]+)\s+(.+)$/);
            if (!m) { out._global = out._global || []; out._global.push(s); return; }
            const key = m[1]; const msg = m[2]; const parts = key.split('.'); let cur = out;
            for (let i = 0; i < parts.length; i++) {
              const p = parts[i]; const arrMatch = p.match(/^(.+)\[(\d+)\]$/);
              if (arrMatch) {
                const k = arrMatch[1]; const idx = Number(arrMatch[2]); cur[k] = cur[k] || []; while (cur[k].length <= idx) cur[k].push({});
                if (i === parts.length - 1) cur[k][idx] = msg; else { if (typeof cur[k][idx] !== 'object') cur[k][idx] = {}; cur = cur[k][idx]; }
              } else {
                if (i === parts.length - 1) cur[p] = msg; else { cur[p] = cur[p] || {}; cur = cur[p]; }
              }
            }
          });
          return out;
        };
        const structured = buildStructured(errorsArr);
        return res.status(400).json({ success: false, message: 'Order validation failed', errors: structured });
      }
      if (createErr && createErr.name === 'CastError') {
        const msg = `Invalid value for ${createErr.path}: ${createErr.value}`;
        return res.status(400).json({ success: false, message: 'Invalid order payload', errors: [msg] });
      }
      if (createErr && createErr.name === 'BSONTypeError') {
        const msg = `Invalid product identifier provided for order item.`;
        return res.status(400).json({ success: false, message: 'Invalid order payload', errors: [msg] });
      }
      throw createErr;
    } finally {
      try { if (session) await session.endSession(); } catch (e) { /* ignore */ }
    }

    // Enqueue order confirmation email (best-effort)
    try {
      const { addEmailJob } = await import('../queues/emailQueue.js');
      const cid = newCorrelationId('order');
      const orderSnapshot = order && order.toObject ? order.toObject() : JSON.parse(JSON.stringify(order || {}));
      orderSnapshot.customerTotal = customerTotal;
      orderSnapshot.total = customerTotal;
      // Ensure tax is not exposed to customers
      orderSnapshot.taxAmount = 0;
      orderSnapshot.originalTotal = customerTotal;
      if (typeof orderSnapshot.legacyTax !== 'undefined') delete orderSnapshot.legacyTax;
      if (typeof orderSnapshot.legacyTotal !== 'undefined') delete orderSnapshot.legacyTotal;
      const job = await addEmailJob('sendOrderConfirmation', { orderId: order._id.toString(), order: orderSnapshot, meta: { correlationId: cid, userId: req.user ? req.user.id : undefined, orderId: order._id.toString(), source: 'order-created' } });
      console.log(`Enqueued order confirmation email job id=${job.id} correlation=${cid}`);
    } catch (e) {
      console.error('Error scheduling order confirmation email (queue unavailable?), falling back to inline send:', e?.message || e);
      try {
        const inlineSnapshot = order && order.toObject ? order.toObject() : JSON.parse(JSON.stringify(order || {}));
        inlineSnapshot.customerTotal = customerTotal;
        inlineSnapshot.total = customerTotal;
        if (req.user) {
          const customer = await User.findById(req.user.id).select('-password');
          if (customer) {
            const sendMeta = { correlationId: newCorrelationId('order-inline'), userId: req.user.id, orderId: order._id.toString(), source: 'order-inline-fallback' };
            const result = await EmailService.sendOrderConfirmation(customer, inlineSnapshot, { meta: sendMeta });
            console.log('Inline order confirmation send result:', result && (result.fallback || result.message || result.messageId) ? 'sent' : JSON.stringify(result));
          } else {
            console.warn('Inline fallback: customer not found, cannot send confirmation email');
          }
        } else {
          const guestRecipient = { name: (normalizedShippingAddress && normalizedShippingAddress.name) || 'Customer', email: guestEmail || (normalizedShippingAddress && normalizedShippingAddress.email) };
          if (guestRecipient.email) {
            const sendMeta = { correlationId: newCorrelationId('order-inline'), userId: undefined, orderId: order._id.toString(), source: 'order-inline-fallback' };
            const result = await EmailService.sendOrderConfirmation(guestRecipient, inlineSnapshot, { meta: sendMeta });
            console.log('Inline order confirmation (guest) send result:', result && (result.fallback || result.message || result.messageId) ? 'sent' : JSON.stringify(result));
          } else {
            console.warn('Inline fallback: guest email not provided, cannot send confirmation email');
          }
        }
      } catch (ie) {
        console.error('Inline order confirmation also failed:', ie?.message || ie);
      }
    }

    // Respond to client (customer-facing total)
    try {
      const respOrder = order && order.toObject ? order.toObject() : JSON.parse(JSON.stringify(order || {}));
      respOrder.customerTotal = customerTotal;
      respOrder.total = customerTotal;
      respOrder.taxAmount = 0;
      respOrder.originalTotal = customerTotal;
      if (typeof respOrder.legacyTax !== 'undefined') delete respOrder.legacyTax;
      if (typeof respOrder.legacyTotal !== 'undefined') delete respOrder.legacyTotal;
      return res.status(201).json({ success: true, message: 'Order created successfully', data: { order: respOrder } });
    } catch (e) {
      return res.status(201).json({ success: true, message: 'Order created successfully', data: { order } });
    }
  } catch (error) {
    console.error('CREATE ORDER ERROR');
    console.error(error);
    console.error(error && error.stack ? error.stack : 'No error.stack available');
    try {
      console.error('createOrder error:', error && (error.stack || error.message || error));
      console.error('createOrder error (full):', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    } catch (e) {
      console.error('createOrder error logging failed:', e);
    }
    return res.status(500).json({ success: false, message: 'Error creating order' });
  } finally {
    try { if (session) await session.endSession(); } catch (e) { /* ignore */ }
  }
};

export const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .sort({ createdAt: -1 });

    // Transform orders for customer-facing responses: override `total` to exclude tax
    const customerOrders = (orders || []).map(o => {
      const ord = o && o.toObject ? o.toObject() : JSON.parse(JSON.stringify(o || {}));
      const subtotal = (typeof ord.subtotal === 'number' && !Number.isNaN(ord.subtotal)) ? Number(ord.subtotal) : (ord.items || []).reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
      const shippingCost = (typeof ord.shippingCost === 'number' && !Number.isNaN(ord.shippingCost)) ? Number(ord.shippingCost) : ((subtotal < 5000) ? 300 : 0);
      const customerTotal = Math.round((subtotal + shippingCost) * 100) / 100;
      // Present tax-excluded total to customer and hide tax fields
      ord.customerTotal = customerTotal;
      ord.originalTotal = customerTotal;
      ord.taxAmount = 0;
      if (typeof ord.legacyTax !== 'undefined') delete ord.legacyTax;
      if (typeof ord.legacyTotal !== 'undefined') delete ord.legacyTotal;
      if (typeof ord.storedTax !== 'undefined') delete ord.storedTax;
      ord.subtotal = subtotal;
      ord.shippingCost = shippingCost;
      ord.total = customerTotal; // override for customer-facing API
      return ord;
    });

    res.status(200).json({ success: true, data: { orders: customerOrders } });
  } catch (error) {
    console.error('getOrders error:', error && (error.stack || error.message || error));
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
};

export const getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Prepare a customer-facing snapshot: compute subtotal/shipping and override total to exclude tax
    const ord = order && order.toObject ? order.toObject() : JSON.parse(JSON.stringify(order || {}));
    const subtotal = (typeof ord.subtotal === 'number' && !Number.isNaN(ord.subtotal)) ? Number(ord.subtotal) : (ord.items || []).reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
    const shippingCost = (typeof ord.shippingCost === 'number' && !Number.isNaN(ord.shippingCost)) ? Number(ord.shippingCost) : ((subtotal < 5000) ? 300 : 0);
    const customerTotal = Math.round((subtotal + shippingCost) * 100) / 100;
    ord.customerTotal = customerTotal;
    ord.originalTotal = customerTotal;
    ord.taxAmount = 0;
    if (typeof ord.legacyTax !== 'undefined') delete ord.legacyTax;
    if (typeof ord.legacyTotal !== 'undefined') delete ord.legacyTotal;
    if (typeof ord.storedTax !== 'undefined') delete ord.storedTax;
    ord.subtotal = subtotal;
    ord.shippingCost = shippingCost;
    ord.total = customerTotal; // tax-excluded for customer

    res.status(200).json({ success: true, data: { order: ord } });
  } catch (error) {
    console.error('getOrder error:', error && (error.stack || error.message || error));
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      customer: req.user.id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled'
      });
    }

    order.status = 'cancelled';
    await order.save();

    // Attempt to release any reservations associated with this order
    try {
      const reservations = await StockReservation.find({ order: order._id, status: { $in: ['reserved', 'committed'] } }).select('_id').lean();
      if (reservations && reservations.length) {
        const ids = reservations.map(r => r._id);
        try {
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              await stockService.revertAndReleaseReservations(ids, { session });
            });
          } catch (e) {
            // fallback to non-transactional revert
            await stockService.revertAndReleaseReservations(ids);
          } finally {
            try { await session.endSession(); } catch (e) {}
          }
        } catch (e) {
          // best-effort
          await stockService.revertAndReleaseReservations(ids);
        }
      }
    } catch (e) {
      console.warn('cancelOrder: failed to revert reservations for order', order._id, e && (e.stack || e.message || e));
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
    });
  } catch (error) {
    console.error('cancelOrder error:', error && (error.stack || error.message || error));
    res.status(500).json({
      success: false,
      message: 'Error cancelling order'
    });
  }
};