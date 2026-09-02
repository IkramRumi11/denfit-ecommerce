
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import User from '../models/User.js';
import Product from '../models/Product.js';
import RecommendationMapping from '../models/RecommendationMapping.js';
import Order from '../models/Order.js';
import StockReservation from '../models/StockReservation.js';
import stockService from '../services/stockService.js';
import Category from '../models/Category.js';
import AuditLog from '../models/AuditLog.js';
import EmailService from '../services/emailService.js';
import notificationService from '../services/notification.service.js';
import { newCorrelationId } from '../utils/correlation.js';
import SystemSetting from '../models/SystemSetting.js';
import { computeAvailableQuantity, computeIsLowStock, computeIsOutOfStock } from '../utils/inventory.js';
import { normalizeAttributesInput } from '../utils/attributes.js';
import { normalizeProductInput, mapFilesToVariants, safeParse } from '../utils/adminProductHelper.js';
import { getColorName } from '../utils/colorHelper.js';

  // Recalculate and persist monetary totals on an Order document.
  // Honors server-side TAX_FEATURE_ENABLED (env). If disabled, preserve legacy fields
  // and avoid re-introducing tax values into the database.
  const recalcTotals = (order) => {
    const subtotal = (order.items || []).reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
    const shippingCost = subtotal < 5000 ? 300 : 0;

    const TAX_RATE = Number(process.env.TAX_RATE) || 0.13;
    const TAX_FEATURE_ENABLED = String(process.env.TAX_FEATURE_ENABLED || '').toLowerCase() === 'true';
    const computedTax = Math.round(subtotal * TAX_RATE * 100) / 100;

    if (TAX_FEATURE_ENABLED) {
      const taxAmount = computedTax;
      const total = Math.round((subtotal + taxAmount + shippingCost) * 100) / 100;
      order.subtotal = subtotal;
      order.taxAmount = taxAmount;
      order.shippingCost = shippingCost;
      order.total = total;
    } else {
      // Preserve legacy fields before zeroing tax if not already present
      try {
        if (typeof order.taxAmount === 'number' && Number(order.taxAmount) > 0 && typeof order.legacyTax === 'undefined') {
          order.legacyTax = Number(order.taxAmount);
        }
        if (typeof order.total === 'number' && typeof order.legacyTotal === 'undefined') {
          order.legacyTotal = Number(order.total);
        }
      } catch (e) { /* ignore preservation errors */ }

      const taxAmount = 0;
      const total = Math.round((subtotal + shippingCost) * 100) / 100;
      order.subtotal = subtotal;
      order.taxAmount = taxAmount;
      order.shippingCost = shippingCost;
      order.total = total;
    }
  };

// TAX FEATURE TEMPORARILY DISABLED FOR CUSTOMER-FACING OUTPUTS
// Helper: transform an Order document into a customer/admin-facing view
// that excludes tax from the displayed `total` while preserving stored values
// such as `total` (original total) and `taxAmount` for reporting purposes.
const transformOrderForDisplay = (orderDoc) => {
  const ord = orderDoc && orderDoc.toObject ? orderDoc.toObject() : JSON.parse(JSON.stringify(orderDoc || {}));
  const subtotal = (typeof ord.subtotal === 'number' && !Number.isNaN(ord.subtotal)) ? Number(ord.subtotal) : (ord.items || []).reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
  const shippingCost = (typeof ord.shippingCost === 'number' && !Number.isNaN(ord.shippingCost)) ? Number(ord.shippingCost) : ((subtotal < 5000) ? 300 : 0);
  const customerTotal = Math.round((subtotal + shippingCost) * 100) / 100;
  ord.customerTotal = customerTotal;
  // For API responses, hide tax values and ensure displayed totals exclude tax.
  // Keep DB fields for compatibility, but do not expose historic tax values here.
  ord.originalTotal = customerTotal;
  ord.taxAmount = 0;
  // Remove any legacy tax fields from the response object so UIs don't display them
  if (typeof ord.legacyTax !== 'undefined') delete ord.legacyTax;
  if (typeof ord.legacyTotal !== 'undefined') delete ord.legacyTotal;
  if (typeof ord.storedTax !== 'undefined') delete ord.storedTax;
  ord.subtotal = subtotal;
  ord.shippingCost = shippingCost;
  // Override `total` for all returned API views so UIs (admin + customer) show tax-excluded totals
  ord.total = customerTotal;
  return ord;
};

// Simple slugify helper to normalize category/subcategory values for querying
const slugify = (input) => {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

// ========================
// DASHBOARD CONTROLLERS
// ========================
const calculateGrowthPercentage = (current, previous) => {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(1));
};

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const previousMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const previousMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    // Parallel database queries for performance
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      todayOrders,
      monthlyRevenue,
      yearlyRevenue,
      lowStockProducts,
      pendingOrders,
      currentMonthOrders,
      previousMonthOrders,
      currentMonthRevenue,
      previousMonthRevenue,
      currentMonthUsers,
      previousMonthUsers,
      currentMonthProducts,
      previousMonthProducts
    ] = await Promise.all([
      // Total counts
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      
      // Revenue calculations — use subtotal + shipping to exclude stored tax from displayed revenue
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } } } }
      ]),
      
      // Today's orders
      Order.countDocuments({ 
        createdAt: { $gte: startOfToday } 
      }),
      
      // Monthly revenue (subtotal + shipping)
      Order.aggregate([
        { 
          $match: { 
            paymentStatus: 'paid',
            createdAt: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } } } }
      ]),
      
      // Yearly revenue (subtotal + shipping)
      Order.aggregate([
        { 
          $match: { 
            paymentStatus: 'paid',
            createdAt: { $gte: startOfYear }
          } 
        },
        { $group: { _id: null, total: { $sum: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } } } }
      ]),
      
      // Low stock products — compute availableQuantity server-side and count those <= threshold
      (async () => {
        try {
          let threshold = 10;
          try {
            const s = await SystemSetting.findOne({ key: 'inventory.lowStockThreshold', enabled: true }).lean();
            if (s && s.value != null) threshold = Number(s.value);
          } catch (e) {}
          if (process.env.LOW_STOCK_THRESHOLD) {
            const v = Number(process.env.LOW_STOCK_THRESHOLD);
            if (!Number.isNaN(v)) threshold = v;
          }

          const agg = await Product.aggregate([
            { $addFields: {
                stockSum: { $sum: { $map: { input: { $ifNull: ["$stock", []] }, as: "s", in: { $ifNull: ["$$s.quantity", 0] } } } },
                sizesSum: { $sum: { $map: { input: { $ifNull: ["$sizes", []] }, as: "sz", in: { $ifNull: ["$$sz.quantity", 0] } } } },
                variantsSum: { $sum: { $map: { input: { $ifNull: ["$variants", []] }, as: "v", in: { $ifNull: ["$$v.inventory", 0] } } } },
                inventoryVal: { $ifNull: ["$inventory", 0] }
              }
            },
            { $addFields: { availableQuantity: { $cond: [ { $gt: [ { $size: { $ifNull: ["$stock", []] } }, 0 ] }, "$stockSum", { $cond: [ { $gt: ["$sizesSum", 0] }, "$sizesSum", { $cond: [ { $gt: ["$variantsSum", 0] }, "$variantsSum", "$inventoryVal" ] } ] } ] } } },
            { $match: { availableQuantity: { $lte: threshold, $gt: 0 } } },
            { $count: 'count' }
          ]).allowDiskUse(true);

          return (agg && agg[0] && agg[0].count) ? agg[0].count : 0;
        } catch (e) {
          console.warn('Failed to compute low stock products via aggregation, falling back to simple count', e?.message || e);
          return await Product.countDocuments({ inStock: true });
        }
      })(),
      
      // Pending orders
      Order.countDocuments({ status: 'pending' }),

      // Orders this month vs previous month
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ createdAt: { $gte: previousMonthStart, $lt: startOfMonth } }),

      // Revenue this month vs previous month (paid orders only)
      Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            createdAt: { $gte: startOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } } } }
      ]),
      Order.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
            createdAt: { $gte: previousMonthStart, $lt: startOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } } } }
      ]),

      // New users this month vs previous month
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      User.countDocuments({ createdAt: { $gte: previousMonthStart, $lt: startOfMonth } }),

      // New products this month vs previous month
      Product.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Product.countDocuments({ createdAt: { $gte: previousMonthStart, $lt: startOfMonth } })
    ]);

    const currentMonthRevenueValue = currentMonthRevenue[0]?.total || 0;
    const previousMonthRevenueValue = previousMonthRevenue[0]?.total || 0;

    const stats = {
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        todayOrders,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        yearlyRevenue: yearlyRevenue[0]?.total || 0,
        lowStockProducts,
        pendingOrders,
        growth: {
          users: calculateGrowthPercentage(currentMonthUsers, previousMonthUsers),
          products: calculateGrowthPercentage(currentMonthProducts, previousMonthProducts),
          orders: calculateGrowthPercentage(currentMonthOrders, previousMonthOrders),
          revenue: calculateGrowthPercentage(currentMonthRevenueValue, previousMonthRevenueValue)
        }
      },
      charts: {
        // Recent sales data for charts
        weeklySales: await getWeeklySalesData(),
        topProducts: await getTopProducts(),
        userGrowth: await getUserGrowthData()
      },
      recent: {
        // Recent activities
        recentOrders: await Order.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('customer', 'name email'),
        recentUsers: await User.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name email createdAt')
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

export const getRecentActivities = async (req, res) => {
  try {
    const recentActivities = await Order.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('customer', 'name email')
      .select('orderNumber status subtotal shippingCost total createdAt')
      .lean();

    // Transform recent activities to expose customer-facing total while preserving storedTax in metadata
    const transformed = recentActivities.map(ord => {
      const shipping = (typeof ord.shippingCost === 'number' && !Number.isNaN(ord.shippingCost)) ? Number(ord.shippingCost) : ((ord.subtotal < 5000) ? 300 : 0);
      const customerTotal = Math.round((Number(ord.subtotal || 0) + shipping) * 100) / 100;
      const o = Object.assign({}, ord, { total: customerTotal, customerTotal });
      // Hide tax-related fields in the API response
      o.taxAmount = 0;
      if (typeof o.legacyTax !== 'undefined') delete o.legacyTax;
      if (typeof o.legacyTotal !== 'undefined') delete o.legacyTotal;
      if (typeof o.storedTax !== 'undefined') delete o.storedTax;
      o.originalTotal = customerTotal;
      return o;
    });

    res.status(200).json({
      success: true,
      data: transformed
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recent activities'
    });
  }
};

// ========================
// USER MANAGEMENT CONTROLLERS
// ========================
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }

    // Execute query with pagination
    const users = await User.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-password');

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('wishlist.product', 'name images price');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's orders
    const userOrders = await Order.find({ customer: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        user,
        recentOrders: userOrders
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user details'
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, email, role, phone, active } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, phone, active },
      { 
        new: true, 
        runValidators: true 
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    // Production-safe soft-delete: anonymize and disable user, preserve Orders
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent accidental deletion of system/admin accounts
    if (user.role && String(user.role) === 'super_admin') {
      return res.status(403).json({ success: false, message: 'Cannot delete super_admin account' });
    }

    // Anonymize personally-identifying fields while preserving the user document for auditability
    const randomPassword = Math.random().toString(36).slice(2, 18);
    const hashedPassword = await bcrypt.hash(randomPassword, 12);
    const anonymized = {
      name: user.name ? `deleted_user_${String(user._id).slice(-6)}` : `deleted_user_${String(user._id).slice(-6)}`,
      email: user.email ? `deleted+${String(user._id)}@example.invalid` : `deleted+${String(user._id)}@example.invalid`,
      phone: null,
      active: false,
      deleted: true,
      deletedAt: new Date(),
      // Store a hashed placeholder password so no plaintext is written and login is impossible
      password: hashedPassword,
      // Ensure any existing tokens are effectively invalidated
      passwordChangedAt: new Date(),
      emailVerified: false,
      verificationToken: undefined,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
      // Remove sensitive profile fields if present
      addresses: [],
      wishlist: [],
      cart: []
    };

    await User.findByIdAndUpdate(req.params.id, { $set: anonymized }, { new: true });

    // Preserve Orders: do NOT delete orders. Optionally mark orders as belonging to a deleted user
    try {
      await Order.updateMany({ customer: req.params.id }, { $set: { customerDeleted: true } });
    } catch (e) {
      // Non-fatal: log and continue
      console.warn('Failed to mark orders as customerDeleted during user delete:', e?.message || e);
    }

    // Create audit log entry for anonymization
    try {
      await AuditLog.create({
        type: 'user_anonymize',
        actor: req.user ? req.user._id : undefined,
        actorName: req.user ? req.user.name : undefined,
        action: 'anonymizeUser',
        payload: { userId: req.params.id },
        message: `User ${req.params.id} anonymized by ${req.user ? req.user.email || req.user._id : 'system'}`
      });
    } catch (e) {
      console.warn('Failed to create AuditLog for user anonymization', e?.message || e);
    }

    res.status(200).json({ success: true, message: 'User anonymized and disabled; orders preserved' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
    });
  }
};

export const banUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: false, banReason: req.body.reason || 'Violation of terms' },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User banned successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error banning user'
    });
  }
};

export const unbanUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active: true, $unset: { banReason: 1 } },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User unbanned successfully',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error unbanning user'
    });
  }
};

// ========================
// PRODUCT MANAGEMENT CONTROLLERS
// ========================
export const getAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',
      status = '',
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) {
      query.category = category;
    }
    if (status) {
      query.status = status;
    }

    const products = await Product.find(query)
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('category', 'name');

    const total = await Product.countDocuments(query);

    // Attach canonical inventory fields for admin consumers
    const lowStockSetting = await SystemSetting.findOne({ key: 'inventory.lowStockThreshold', enabled: true }).lean().catch(() => null);
    const lowStockThreshold = lowStockSetting && lowStockSetting.value != null ? Number(lowStockSetting.value) : (process.env.LOW_STOCK_THRESHOLD ? Number(process.env.LOW_STOCK_THRESHOLD) : 20);
    const normalized = products.map(p => p.toObject ? p.toObject() : p);
    normalized.forEach((p) => {
      try {
        p.availableQuantity = computeAvailableQuantity(p);
        p.isOutOfStock = computeIsOutOfStock(p);
        p.isLowStock = computeIsLowStock(p, lowStockThreshold);
      } catch (e) {}
    });

    res.status(200).json({
      success: true,
      data: {
        products: normalized,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products'
    });
  }
};

// Suggest related products for admin UI
export const suggestRelatedProducts = async (req, res) => {
  try {
    const section = req.query.section || req.query.gender || '';
    const subcategory = req.query.subcategory || '';
    const tagsRaw = req.query.tags || '';
    const excludeId = req.query.excludeId || null;
    const limit = Math.min(100, Math.max(5, Number(req.query.limit) || 20));
    const basePrice = req.query.price ? Number(req.query.price) : null;
    const material = req.query.material || '';
    const fit = req.query.fit || '';
    const origin = req.query.origin || '';

    const tags = String(tagsRaw || '').split(',').map(t => t.trim()).filter(Boolean);

    const query = {};
    if (section) query.gender = section;
    if (subcategory) query.subcategory = subcategory;
    if (excludeId && /^[a-fA-F0-9]{24}$/.test(excludeId)) query._id = { $ne: excludeId };

    // Fetch broader candidate set then score locally for richer matching
    let candidates = await Product.find(query).limit(500).lean();

    // Include cross-category mapped candidates
    try {
      const mapping = await RecommendationMapping.findOne({ 'from.category': section, 'from.subcategory': subcategory }).lean();
      if (mapping && Array.isArray(mapping.to) && mapping.to.length) {
        const mappedQueries = mapping.to.map(t => ({
          gender: t.category || section,
          subcategory: t.subcategory || undefined,
        }));
        // fetch items for each mapping (limit small to avoid huge payload)
        for (const mq of mappedQueries) {
          const mqQuery = {};
          if (mq.gender) mqQuery.gender = mq.gender;
          if (mq.subcategory) mqQuery.subcategory = mq.subcategory;
          const extra = await Product.find(mqQuery).limit(100).lean();
          candidates = candidates.concat(extra);
        }
      }
    } catch (mapErr) {
      console.warn('Recommendation mapping lookup failed:', mapErr?.message || mapErr);
    }

    // Compute frequently-bought-together counts if excludeId provided
    let coPurchaseCounts = {};
    try {
      if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
        const agg = await Order.aggregate([
          { $match: { 'items.product': new mongoose.Types.ObjectId(excludeId), paymentStatus: 'paid' } },
          { $unwind: '$items' },
          { $match: { 'items.product': { $ne: new mongoose.Types.ObjectId(excludeId) } } },
          { $group: { _id: '$items.product', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 50 }
        ]).allowDiskUse(true);
        (agg || []).forEach(row => { coPurchaseCounts[String(row._id)] = row.count; });
      }
    } catch (e) {
      console.warn('co-purchase aggregation failed:', e?.message || e);
    }

    const scored = candidates.map((p) => {
      // dedupe candidate set by _id
      // will handle dedupe later by using a map
      let score = 0;

      // Tags priority: strong weight per matching tag
      const pTags = Array.isArray(p.tags) ? p.tags.map(String) : [];
      const tagMatches = tags.length ? tags.filter(t => pTags.map(pt => pt.toLowerCase()).includes(t.toLowerCase())).length : 0;
      score += tagMatches * 6; // tag weight

      // Attribute matches: material, fit, origin (moderate weight)
      const specs = p.specifications || {};
      if (material && specs.material && typeof specs.material === 'string' && specs.material.toLowerCase() === material.toLowerCase()) score += 3;
      if (fit && specs.fit && typeof specs.fit === 'string' && specs.fit.toLowerCase() === fit.toLowerCase()) score += 2;
      if (origin && specs.origin && typeof specs.origin === 'string' && specs.origin.toLowerCase() === origin.toLowerCase()) score += 1;

      // Price proximity: closer prices get a small boost
      if (basePrice && p.price) {
        const diff = Math.abs((p.price || 0) - basePrice);
        const diffPct = diff / (basePrice || 1);
        if (diffPct <= 0.05) score += 4;
        else if (diffPct <= 0.15) score += 2;
        else if (diffPct <= 0.3) score += 1;
      }

      // Prefer recent products slightly
      const ageDays = (Date.now() - new Date(p.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays <= 7) score += 2;
      else if (ageDays <= 30) score += 1;

      // Minor boost for exact subcategory match (already filtered, but be safe)
      if (p.subcategory && subcategory && String(p.subcategory).toLowerCase() === String(subcategory).toLowerCase()) score += 1;


      // If product belongs to a mapped category, add small boost per mapping weight
      try {
        if (mapping && Array.isArray(mapping.to)) {
          const mp = mapping.to.find(t => (t.subcategory && String(t.subcategory).toLowerCase() === String(p.subcategory).toLowerCase()) || (t.category && String(t.category).toLowerCase() === String(p.gender).toLowerCase()));
          if (mp) score += (mp.weight || 1) * 2; // mapping boost
        }
      } catch (e) {
        // ignore
      }

      // co-purchase boost
      try {
        const cp = coPurchaseCounts[String(p._id)] || 0;
        if (cp > 0) {
          // logarithmic boost to avoid dominance
          score += Math.min(6, Math.log(cp + 1) * 2);
        }
      } catch (e) {
        // ignore
      }

      return { product: p, score };
    });

    // Sort by score desc then createdAt desc
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = new Date(a.product.createdAt || 0).getTime();
      const db = new Date(b.product.createdAt || 0).getTime();
      return db - da;
    });

    const results = scored.slice(0, limit).map(s => {
      const p = s.product;
      return {
        _id: p._id,
        name: p.name,
        price: p.price,
        images: p.images || [],
        sku: p.sku || '',
        subcategory: p.subcategory || '',
        createdAt: p.createdAt,
        score: s.score,
        seo: p.seo || {},
        description: p.description || '',
      };
    });

    res.status(200).json({ success: true, data: { products: results } });
  } catch (error) {
    console.error('suggestRelatedProducts error:', error);
    res.status(500).json({ success: false, message: 'Error generating suggestions' });
  }
};

// Recommendation mappings CRUD for admin
export const listRecommendationMappings = async (req, res) => {
  try {
    const { category = '', subcategory = '' } = req.query;
    const q = {};
    if (category && subcategory) {
      q['from.category'] = category;
      q['from.subcategory'] = subcategory;
    }
    const items = await RecommendationMapping.find(q).lean();
    res.status(200).json({ success: true, data: { mappings: items } });
  } catch (err) {
    console.error('listRecommendationMappings error:', err);
    res.status(500).json({ success: false, message: 'Error listing mappings' });
  }
};

export const createRecommendationMapping = async (req, res) => {
  try {
    const payload = req.body;
    if (!payload || !payload.from || !payload.from.category || !payload.from.subcategory) {
      return res.status(400).json({ success: false, message: 'Missing from category/subcategory' });
    }
    const item = new RecommendationMapping(payload);
    await item.save();
    res.status(201).json({ success: true, data: { mapping: item } });
  } catch (err) {
    console.error('createRecommendationMapping error:', err);
    res.status(500).json({ success: false, message: 'Error creating mapping' });
  }
};

export const deleteRecommendationMapping = async (req, res) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid id' });
    await RecommendationMapping.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) {
    console.error('deleteRecommendationMapping error:', err);
    res.status(500).json({ success: false, message: 'Error deleting mapping' });
  }
};

export const getProductById = async (req, res) => {
  try {
    // Defensive: ensure the provided id is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      console.warn('getProductById called with invalid id:', req.params.id);
      return res.status(400).json({ success: false, message: 'Invalid product id' });
    }
    console.debug('getProductById fetching product id:', req.params.id);
    // Avoid populating nested reviews.user here to prevent cast/populate errors
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('relatedProducts', 'name images price seo.slug');

    // If reviews exist and contain user refs, attempt to populate in a safe way
    if (product && product.reviews && Array.isArray(product.reviews) && product.reviews.length) {
      try {
        await product.populate('reviews.user', 'name');
      } catch (popErr) {
        console.warn('populate reviews.user failed for product id', req.params.id, popErr?.message || popErr);
        // continue without populated review users
      }
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Attach canonical inventory fields for admin UI
    try {
      const out = product.toObject ? product.toObject() : product;
      let lowStockThreshold = null;
      try {
        const s = await SystemSetting.findOne({ key: 'inventory.lowStockThreshold', enabled: true }).lean();
        if (s && s.value != null) lowStockThreshold = Number(s.value);
      } catch (e) {}
      if (lowStockThreshold == null && process.env.LOW_STOCK_THRESHOLD) {
        const v = Number(process.env.LOW_STOCK_THRESHOLD);
        if (!Number.isNaN(v)) lowStockThreshold = v;
      }
      if (lowStockThreshold == null) lowStockThreshold = 20;

      out.availableQuantity = computeAvailableQuantity(out);
      out.isOutOfStock = computeIsOutOfStock(out);
      out.isLowStock = computeIsLowStock(out, lowStockThreshold);

      return res.status(200).json({ success: true, data: { product: out } });
    } catch (e) {
      // fallback to returning raw product if compute fails
      return res.status(200).json({ success: true, data: { product } });
    }
  } catch (error) {
    // Log full error to server console to aid debugging
    console.error('getProductById error:', error && error.stack ? error.stack : error);
    // In development, include error message in response to help debugging client-side
    const resp = { success: false, message: 'Error fetching product' };
    if (process.env.NODE_ENV !== 'production') resp.error = error?.message || error;
    res.status(500).json(resp);
  }
};

export const createProduct = async (req, res) => {
  try {
    const productData = await normalizeProductInput(req.body, Product);

    // Support multipart variant uploads: backend accepts a `variants` JSON field
    // and files with fieldnames like `variantImages_<tempId>` and `variantSwatch_<tempId>`
    const files = req.files || [];
    const parsedVariants = [];
    if (req.body.variants) {
      try {
        const raw = safeParse(req.body.variants);
        if (Array.isArray(raw)) {
          raw.forEach((v, idx) => {
            parsedVariants.push({ tempId: v.tempId || v._id || `v${idx}`, name: v.name || '', hex: v.hex || '', sku: v.sku || undefined, images: v.images || [], swatchImage: v.swatchImage || '', availableSizes: v.availableSizes || [] });
          });
        }
      } catch (e) {
        console.warn('Failed to parse req.body.variants', e?.message || e);
      }
    }

    // If no variants provided, try legacy colors array
    if (!parsedVariants.length && req.body.colors && Array.isArray(req.body.colors) && req.body.colors.length) {
      req.body.colors.forEach((c, i) => parsedVariants.push({ tempId: c.tempId || `v${i}`, name: c.name || '', hex: c.hex || '', images: [], swatchImage: '' }));
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const dedup = mapFilesToVariants(files, parsedVariants, baseUrl);

    // If variants exist, inherit general product images if variant has none, or populate product images if empty
    if (dedup.length > 0) {
      if ((!productData.images || !productData.images.length) && dedup.some(v => v.images && v.images.length)) {
        productData.images = dedup.flatMap(v => v.images || []);
      }
      dedup.forEach(v => {
        if ((!v.images || !v.images.length) && productData.images && productData.images.length) {
          v.images = [...productData.images];
        }
      });
    }

    // Ensure product as a whole has at least one image
    const hasAnyImage = (productData.images && productData.images.length > 0) || dedup.some(v => v.images && v.images.length > 0);
    if (!hasAnyImage) {
      return res.status(400).json({ success: false, message: 'Product must have at least one image.' });
    }

    // If a stock mapping was provided referencing temporary color ids, map those to stable variant identifiers (name or hex)
    if (Array.isArray(productData.stock) && productData.stock.length) {
      productData.stock = productData.stock.map((st) => {
        if (!st) return st;
        const matched = dedup.find(v => String(v.tempId || v._id || '') === String(st.colorTempId));
        if (matched) {
          return { ...st, colorTempId: (matched.name || matched.hex || matched.tempId || matched._id) };
        }
        return st;
      });
    }

    productData.variants = dedup.map(v => {
      const vName = v.name && !v.name.startsWith('#') ? v.name : getColorName(v.name || v.hex);
      return {
        name: vName || 'Default',
        hex: v.hex,
        sku: v.sku,
        images: v.images || [],
        swatchImage: v.swatchImage || '',
        availableSizes: v.availableSizes || []
      };
    });

    // Parse legacy or new colors payload into structured color objects
    if (req.body.colors) {
      try {
        const rawColors = safeParse(req.body.colors);
        if (Array.isArray(rawColors)) {
          productData.colors = rawColors.map((c) => {
            if (typeof c === 'string') {
              const n = normalizeColor(c);
              const name = getColorName(c);
              return { name: name || c, value: n.value, hex: n.normalizedHex || c, normalizedHex: n.normalizedHex || null };
            }
            const val = c.value || c.hex || c.name || '';
            const n = normalizeColor(String(val));
            const rawName = c.name || c.displayName || '';
            const resolvedName = rawName && !rawName.startsWith('#') ? getColorName(rawName) : getColorName(val || c.hex);
            return { name: resolvedName || 'Default', value: val, hex: n.normalizedHex || c.hex || val, normalizedHex: n.normalizedHex || null };
          });
        }
      } catch (e) {
        // If parsing fails, ignore and preserve whatever was sent
      }
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Product with this SKU already exists' });
    }
    if (error && error.name === 'ValidationError') {
      // Aggregate validation messages
      const msgs = Object.values(error.errors || {}).map(e => e.message).join('. ');
      return res.status(400).json({ success: false, message: msgs || 'Product validation failed' });
    }
    // Log unexpected errors with stack for debugging
    try {
      console.error('createProduct unexpected error:', error && error.stack ? error.stack : error);
    } catch (logErr) {
      console.error('createProduct failed to log error', logErr);
    }
    res.status(500).json({ success: false, message: 'Error creating product' });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Map admin form -> stored product shape before updating
    const updateData = await normalizeProductInput(req.body, Product);

    // Support multipart variant uploads: backend accepts a `variants` JSON field
    // and files with fieldnames like `variantImages_<tempId>` and `variantSwatch_<tempId>`
    const files = req.files || [];
    const parsedVariants = [];
    if (req.body.variants) {
      try {
        const raw = safeParse(req.body.variants);
        if (Array.isArray(raw)) {
          raw.forEach((v, idx) => {
            parsedVariants.push({ tempId: v.tempId || v._id || `v${idx}`, _id: v._id, name: v.name || '', hex: v.hex || '', sku: v.sku || undefined, images: v.images || [], swatchImage: v.swatchImage || '', availableSizes: v.availableSizes || [] });
          });
        }
      } catch (e) {
        console.warn('Failed to parse req.body.variants on update', e?.message || e);
      }
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const dedup = mapFilesToVariants(files, parsedVariants, baseUrl);

    // If variants exist, inherit product images if variant has none, or populate product images if empty
    const currentImgs = (updateData.images && updateData.images.length) ? updateData.images : (product.images || []);
    if (dedup.length > 0) {
      if (!currentImgs.length && dedup.some(v => v.images && v.images.length)) {
        updateData.images = dedup.flatMap(v => v.images || []);
      }
      const fallbackImgs = (updateData.images && updateData.images.length) ? updateData.images : (product.images || []);
      dedup.forEach(v => {
        if ((!v.images || !v.images.length) && fallbackImgs.length) {
          v.images = [...fallbackImgs];
        }
      });
    }

    // Ensure product as a whole has at least one image
    const hasAnyImage = (updateData.images && updateData.images.length > 0) || (product.images && product.images.length > 0) || dedup.some(v => v.images && v.images.length > 0);
    if (!hasAnyImage) {
      return res.status(400).json({ success: false, message: 'Product must have at least one image.' });
    }

    // If a stock mapping was provided referencing temporary color ids, map those to stable variant identifiers (name or hex)
    if (Array.isArray(updateData.stock) && updateData.stock.length) {
      updateData.stock = updateData.stock.map((st) => {
        if (!st) return st;
        const matched = dedup.find(v => String(v.tempId || v._id || '') === String(st.colorTempId));
        if (matched) {
          return { ...st, colorTempId: (matched.name || matched.hex || matched.tempId || matched._id) };
        }
        return st;
      });
    }

    updateData.variants = dedup.map(v => {
      const vName = v.name && !v.name.startsWith('#') ? v.name : getColorName(v.name || v.hex);
      return {
        _id: v._id,
        name: vName || 'Default',
        hex: v.hex,
        sku: v.sku,
        images: v.images || [],
        swatchImage: v.swatchImage || '',
        availableSizes: v.availableSizes || []
      };
    });

    // Parse and normalize colors on update as well
    if (req.body.colors) {
      try {
        const rawColors = typeof req.body.colors === 'string' ? JSON.parse(req.body.colors) : req.body.colors;
        if (Array.isArray(rawColors)) {
          updateData.colors = rawColors.map((c) => {
            if (typeof c === 'string') {
              const n = normalizeColor(c);
              const name = getColorName(c);
              return { name: name || c, value: n.value, hex: n.normalizedHex || c, normalizedHex: n.normalizedHex || null };
            }
            const val = c.value || c.hex || c.name || '';
            const n = normalizeColor(String(val));
            const rawName = c.name || c.displayName || '';
            const resolvedName = rawName && !rawName.startsWith('#') ? getColorName(rawName) : getColorName(val || c.hex);
            return { name: resolvedName || 'Default', value: val, hex: n.normalizedHex || c.hex || val, normalizedHex: n.normalizedHex || null };
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // Set updated properties on document and run Mongoose save hooks/validators
    Object.assign(product, updateData);
    await product.save();

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Duplicate SKU or unique field already exists' });
    }
    if (error && error.name === 'ValidationError') {
      const msgs = Object.values(error.errors || {}).map(e => e.message).join('. ');
      return res.status(400).json({ success: false, message: msgs || 'Product validation failed' });
    }
    console.error('updateProduct unexpected error:', error && error.stack ? error.stack : error);
    const resp = { success: false, message: 'Error updating product' };
    if (process.env.NODE_ENV !== 'production') resp.error = error?.message || String(error);
    res.status(500).json(resp);
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    try {
      await AuditLog.create({
        type: 'product_delete',
        actor: req.user ? req.user._id : undefined,
        actorName: req.user ? req.user.name : undefined,
        action: 'deleteProduct',
        payload: { productId: req.params.id, productName: product?.name },
        message: `${req.user ? req.user.name : 'system'} deleted product ${product?.name || req.params.id}`
      });
    } catch (e) {
      console.warn('Failed to create audit log for deleteProduct', e?.message || e);
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product'
    });
  }
};

export const bulkUpdateProducts = async (req, res) => {
  try {
    const { productIds, updateData } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No product IDs provided' });
    }
    // Prevent very large bulk operations without confirmation (safety guard)
    if (productIds.length > 1000) {
      return res.status(400).json({ success: false, message: 'Bulk update exceeds maximum allowed size' });
    }

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updateData }
    );

    try {
      // Create a single audit entry summarizing this bulk update
      await AuditLog.create({
        type: 'bulk_update',
        actor: req.user ? req.user._id : undefined,
        actorName: req.user ? req.user.name : undefined,
        action: 'bulkUpdateProducts',
        payload: { productIds: productIds.slice(0, 50), total: productIds.length, updateData },
        message: `${req.user ? req.user.name : 'system'} performed bulk update on ${productIds.length} products`
      });
    } catch (e) {
      console.warn('Failed to create audit log for bulkUpdateProducts', e?.message || e);
    }

    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} products updated successfully`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error bulk updating products'
    });
  }
};

// ========================
// ORDER MANAGEMENT CONTROLLERS
// ========================
export const getAllOrders = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(5, Math.min(200, Number(req.query.limit) || 10));
    const status = req.query.status || '';
    const paymentStatus = req.query.paymentStatus || '';
    const sort = req.query.sort || '-createdAt';
    const search = req.query.search || '';
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (search) {
      // Search orderNumber or item names
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } }
      ];
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const orders = await Order.find(query)
      .sort(sort)
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('customer', 'name email phone')
      .populate('items.product', 'name images');

    const total = await Order.countDocuments(query);

    // Calculate totals for summary — exclude stored tax from displayed revenue
    const revenueStats = await Order.aggregate([
      { $match: query },
      { $group: {
        _id: null,
        totalRevenue: { $sum: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } },
        averageOrder: { $avg: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } }
      } }
    ]);

    const customerOrders = (orders || []).map(o => transformOrderForDisplay(o));

    res.status(200).json({
      success: true,
      data: {
        orders: customerOrders,
        summary: {
          totalRevenue: revenueStats[0]?.totalRevenue || 0,
          averageOrder: revenueStats[0]?.averageOrder || 0,
          totalOrders: total
        },
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
};

// GET /api/v1/admin/audits
export const getAudits = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(10, Math.min(200, Number(req.query.limit) || 50));
    const q = {};
    if (req.query.type) q.type = req.query.type;
    if (req.query.actor) q.actor = req.query.actor;
    if (req.query.orderId) q.targetOrder = req.query.orderId;
    if (req.query.search) {
      q.$or = [
        { message: { $regex: req.query.search, $options: 'i' } },
        { 'payload.orderNumber': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const audits = await AuditLog.find(q)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('actor', 'name email')
      .populate('targetOrder', 'orderNumber');

    const total = await AuditLog.countDocuments(q);

    res.status(200).json({ success: true, data: { audits, pagination: { current: page, pages: Math.ceil(total / limit), total } } });
  } catch (err) {
    console.error('Error fetching audits', err);
    res.status(500).json({ success: false, message: 'Error fetching audits' });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const param = req.params.id;
    let order = null;

    // If param looks like a Mongo ObjectId, prefer findById for performance.
    if (mongoose.Types.ObjectId.isValid(param)) {
      order = await Order.findById(param)
        .populate('customer', 'name email phone addresses')
        .populate('items.product', 'name images sku');
    }

    // If not found by _id (or param isn't an ObjectId), try lookup by orderNumber
    if (!order) {
      order = await Order.findOne({ orderNumber: param })
        .populate('customer', 'name email phone addresses')
        .populate('items.product', 'name images sku');
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Return a transformed order view (tax-excluded for displayed totals)
    const respOrder = transformOrderForDisplay(order);
    res.status(200).json({
      success: true,
      data: { order: respOrder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order'
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;

    const order = await Order.findById(req.params.id).populate('customer', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const allowed = {
      pending: ['confirmed','cancelled'],
      confirmed: ['processing','cancelled'],
      processing: ['shipped','cancelled'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: []
    };

    const from = order.status;
    const to = status;

    if (!to || !Object.keys(allowed).includes(to)) {
      return res.status(400).json({ success: false, message: 'Invalid target status' });
    }

    // Allow super_admins to force a transition when they explicitly pass { force: true }
    const force = !!req.body.force && req.user && String(req.user.role) === 'super_admin';
    if (!force) {
      if (!allowed[from].includes(to)) {
        return res.status(400).json({ success: false, message: `Cannot transition order from '${from}' to '${to}'` });
      }
    } else {
      console.debug(`super_admin force transition requested by ${req.user?.email || req.user?._id}`);
    }

    // Apply status and timestamps
    order.status = to;
    if (adminNote) order.adminNote = adminNote;
    const now = new Date();
    if (to === 'confirmed' && !order.confirmedAt) order.confirmedAt = now;
    if (to === 'processing' && !order.processingAt) order.processingAt = now;
    if (to === 'shipped' && !order.shippedAt) order.shippedAt = now;
    if (to === 'delivered' && !order.deliveredAt) order.deliveredAt = now;
    if (to === 'cancelled' && !order.cancelledAt) order.cancelledAt = now;
    // Record per-order history and global audit log
    try {
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        from,
        to,
        by: req.user ? req.user._id : undefined,
        byName: req.user ? req.user.name : undefined,
        note: adminNote,
        at: now
      });
    } catch (e) {
      console.warn('Failed to push status history:', e?.message || e);
    }

    try {
      await AuditLog.create({
        type: 'order_status_change',
        actor: req.user ? req.user._id : undefined,
        actorName: req.user ? req.user.name : undefined,
        targetOrder: order._id,
        action: `${from}->${to}`,
        payload: { orderId: order._id, from, to },
        message: `Order ${order.orderNumber || order._id} status changed from ${from} to ${to}`
      });
    } catch (e) {
      console.warn('Failed to write AuditLog:', e?.message || e);
    }

    try {
      recalcTotals(order);
    } catch (e) {
      console.warn('Failed to recalc order totals before save:', e?.message || e);
    }
    await order.save();

    // Inventory: restore reserved stock for this order (if any) in a transaction when possible
    if (to === 'cancelled') {
      try {
        const reservations = await StockReservation.find({ order: order._id, status: { $in: ['reserved', 'committed'] } }).select('_id').lean();
        if (reservations && reservations.length) {
          const ids = reservations.map(r => r._id);
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              await stockService.revertAndReleaseReservations(ids, { session });
            });
          } catch (e) {
            console.error('Failed to revert reservations during admin cancelOrder:', e && (e.stack || e.message || e));
          } finally {
            try { await session.endSession(); } catch (e) {}
          }
          try {
            order.statusHistory = order.statusHistory || [];
            order.statusHistory.push({ from: oldStatus, to: 'cancelled', by: req.user ? req.user._id : undefined, byName: req.user ? req.user.name : undefined, note: 'inventory restored on cancel', at: new Date() });
            await order.save();
          } catch (e) { console.warn('Failed to append inventory restore history to order', e?.message || e); }
        }
      } catch (e) {
        console.warn('Admin cancelOrder: failed to find or revert reservations:', e && (e.stack || e.message || e));
      }
    }

    // Send or enqueue notification email to the best available recipient: prefer profile email, otherwise
    // use the checkout-provided contact email / shippingAddress.email / guestEmail. This ensures guests
    // receive order updates even when they're not tied to a user profile.
    try {
      const recipientEmail = order.customer?.email || order.contactEmail || order.shippingAddress?.email || order.guestEmail || null;
      if (recipientEmail) {
        try {
          const cid = newCorrelationId('order-status');
          const meta = { correlationId: cid, userId: order.customer ? order.customer._id : undefined, orderId: order._id.toString(), source: 'order-update' };
          // Build a tax-excluded snapshot for queued or inline emails
          const orderSnapshot = transformOrderForDisplay(order);
          if (process.env.USE_EMAIL_QUEUE === 'true') {
            const { addEmailJob } = await import('../queues/emailQueue.js');
            await addEmailJob('sendOrderStatusChange', { orderId: order._id.toString(), order: orderSnapshot, actorId: req.user ? req.user._id : undefined, meta: { ...meta, oldStatus: from, newStatus: to } });
          } else {
            // Construct a minimal recipient object if there is no linked customer
            const recipient = order.customer && order.customer.email ? order.customer : { name: order.shippingAddress?.name || order.contactName || recipientEmail, email: recipientEmail };
            await EmailService.sendOrderStatusChange(recipient, orderSnapshot, { oldStatus: from, newStatus: to }, { meta: { ...meta, oldStatus: from, newStatus: to } });
          }
        } catch (e) {
          console.warn('Failed to send/enqueue order status email:', e?.message || e);
        }
      }
    } catch (e) {
      console.warn('Failed to send/enqueue order status email:', e?.message || e);
    }

    // Create in-app notification for the customer (only possible for logged-in users)
    try {
      if (order.customer && order.customer._id) {
        // Prefer explicit adminNote provided in the request; fall back to recent statusHistory note
        const noteForNotification = adminNote || (order.statusHistory && order.statusHistory.length ? order.statusHistory[order.statusHistory.length - 1].note : undefined);
        let notifMessage = `Your order ${order.orderNumber || order._id} status changed from ${from} to ${to}`;
        if (noteForNotification) notifMessage += ` — Note: ${noteForNotification}`;

        await notificationService.createNotification({
          userId: order.customer._id,
          title: `Order ${order.orderNumber || order._id} status updated`,
          message: notifMessage,
          type: 'order',
          metadata: { orderId: order._id.toString(), oldStatus: from, newStatus: to, adminNote: noteForNotification }
        });
      }
    } catch (e) {
      console.warn('Failed to create in-app notification for order status change:', e?.message || e);
    }

    const respOrder = transformOrderForDisplay(order);
    res.status(200).json({ success: true, message: 'Order status updated successfully', data: { order: respOrder } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

export const updateOrderTracking = async (req, res) => {
  try {
    const { trackingNumber, carrier, estimatedDelivery, trackingUrl } = req.body;

    const order = await Order.findById(req.params.id).populate('customer', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.trackingNumber = trackingNumber || order.trackingNumber;
    order.trackingUrl = trackingUrl || order.trackingUrl;
    order.carrier = carrier || order.carrier;
    order.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : order.estimatedDelivery;
    // Mark shipped
    if (order.status !== 'shipped') {
      order.status = 'shipped';
      if (!order.shippedAt) order.shippedAt = new Date();
    }

    // Add to history
    try {
      const now = new Date();
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({
        from: order.status === 'shipped' ? 'processing' : order.status,
        to: 'shipped',
        by: req.user ? req.user._id : undefined,
        byName: req.user ? req.user.name : undefined,
        note: `Tracking updated: ${trackingNumber || ''}`,
        at: now
      });
    } catch (e) {
      console.warn('Failed to append tracking history:', e?.message || e);
    }

    try {
      recalcTotals(order);
    } catch (e) {
      console.warn('Failed to recalc order totals before save:', e?.message || e);
    }
    await order.save();

    // Send or enqueue shipping confirmation email to the best available recipient (profile or checkout/guest)
    try {
      const recipientEmail = order.customer?.email || order.contactEmail || order.shippingAddress?.email || order.guestEmail || null;
      if (recipientEmail) {
        try {
          const cid = newCorrelationId('shipping-confirm');
          const meta = { correlationId: cid, userId: order.customer ? order.customer._id : undefined, orderId: order._id.toString(), source: 'shipping-confirm' };
          // Use a tax-excluded snapshot for queued or inline emails
          const orderSnapshot = transformOrderForDisplay(order);
          if (process.env.USE_EMAIL_QUEUE === 'true') {
            const { addEmailJob } = await import('../queues/emailQueue.js');
            await addEmailJob('sendShippingConfirmation', { orderId: order._id.toString(), order: orderSnapshot, meta });
          } else {
            const recipient = order.customer && order.customer.email ? order.customer : { name: order.shippingAddress?.name || order.contactName || recipientEmail, email: recipientEmail };
            await EmailService.sendShippingConfirmation(recipient, orderSnapshot, { meta });
          }
        } catch (e) {
          console.warn('Failed to send/enqueue shipping confirmation:', e?.message || e);
        }
      }
    } catch (e) {
      console.warn('Failed to send/enqueue shipping confirmation:', e?.message || e);
    }

    // Create in-app notification for shipping update
    try {
      if (order.customer && order.customer._id) {
        await notificationService.createNotification({
          userId: order.customer._id,
          title: `Order ${order.orderNumber || order._id} shipped`,
          message: `Your order ${order.orderNumber || order._id} has been marked as shipped${order.trackingNumber ? ` (Tracking: ${order.trackingNumber})` : ''}`,
          type: 'order',
          metadata: { orderId: order._id.toString(), trackingNumber: order.trackingNumber, trackingUrl: order.trackingUrl }
        });
      }
    } catch (e) {
      console.warn('Failed to create in-app notification for shipping update:', e?.message || e);
    }

    const respOrder = transformOrderForDisplay(order);
    res.status(200).json({ success: true, message: 'Tracking information updated successfully', data: { order: respOrder } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating tracking information'
    });
  }
};

export const cancelOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id).populate('customer', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

  const oldStatus = order.status;
  order.status = 'cancelled';
  order.adminNote = reason || 'Cancelled by admin';
  const now = new Date();
  if (!order.cancelledAt) order.cancelledAt = now;
  try {
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ from: oldStatus, to: 'cancelled', by: req.user ? req.user._id : undefined, byName: req.user ? req.user.name : undefined, note: reason || 'Cancelled by admin', at: now });
  } catch (e) { console.warn('Failed to append cancel history', e?.message || e); }
  try {
    recalcTotals(order);
  } catch (e) {
    console.warn('Failed to recalc order totals before save:', e?.message || e);
  }
  await order.save();

  // Inventory: restore reserved stock for this order (if any) in a transaction when possible
  try {
    const reservations = await StockReservation.find({ order: order._id, status: { $in: ['reserved', 'committed'] } }).select('_id').lean();
    if (reservations && reservations.length) {
      const ids = reservations.map(r => r._id);
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await stockService.revertAndReleaseReservations(ids, { session });
        });
      } catch (e) {
        console.error('Failed to revert reservations during admin cancelOrder:', e && (e.stack || e.message || e));
        // fallback to non-transactional revert
        await stockService.revertAndReleaseReservations(ids);
      } finally {
        try { await session.endSession(); } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('Admin cancelOrder: failed to find or revert reservations:', e && (e.stack || e.message || e));
  }

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // TODO: Process refund if payment was made
    // Send or enqueue cancellation email to profile or checkout/guest email
    try {
      const recipientEmail = order.customer?.email || order.contactEmail || order.shippingAddress?.email || order.guestEmail || null;
      if (recipientEmail) {
        try {
          const cid = newCorrelationId('order-cancel');
          const meta = { correlationId: cid, userId: order.customer ? order.customer._id : undefined, orderId: order._id.toString(), source: 'order-cancel', oldStatus, newStatus: 'cancelled' };
          const orderSnapshot = transformOrderForDisplay(order);
          if (process.env.USE_EMAIL_QUEUE === 'true') {
            const { addEmailJob } = await import('../queues/emailQueue.js');
            await addEmailJob('sendOrderStatusChange', { orderId: order._id.toString(), order: orderSnapshot, actorId: req.user ? req.user._id : undefined, meta });
          } else {
            const recipient = order.customer && order.customer.email ? order.customer : { name: order.shippingAddress?.name || order.contactName || recipientEmail, email: recipientEmail };
            await EmailService.sendOrderStatusChange(recipient, orderSnapshot, { oldStatus, newStatus: 'cancelled' }, { meta });
          }
        } catch (e) {
          console.warn('Failed to send/enqueue cancellation email:', e?.message || e);
        }
      }
    } catch (e) {
      console.warn('Failed to send/enqueue cancellation email:', e?.message || e);
    }

    // Create in-app notification for cancellation so customer sees update in-app
    try {
      if (order.customer && order.customer._id) {
        await notificationService.createNotification({
          userId: order.customer._id,
          title: `Order ${order.orderNumber || order._id} cancelled`,
          message: `Your order ${order.orderNumber || order._id} was cancelled${reason ? `: ${reason}` : ''}`,
          type: 'order',
          metadata: { orderId: order._id.toString(), oldStatus }
        });
      }
    } catch (e) {
      console.warn('Failed to create in-app notification for cancellation:', e?.message || e);
    }

    const respOrder = transformOrderForDisplay(order);
    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order: respOrder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error cancelling order'
    });
  }
};

export const refundOrder = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const order = await Order.findById(req.params.id).populate('customer', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const now = new Date();
    order.paymentStatus = 'refunded';
    order.adminNote = `Refunded: ${reason}`;
    order.refundAmount = amount;
    try {
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ from: order.status, to: 'refunded', by: req.user ? req.user._id : undefined, byName: req.user ? req.user.name : undefined, note: `Refunded: ${reason}`, at: now });
    } catch (e) { console.warn('Failed to append refund history', e?.message || e); }
    try {
      recalcTotals(order);
    } catch (e) {
      console.warn('Failed to recalc order totals before save:', e?.message || e);
    }
    await order.save();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // TODO: Process actual refund through payment gateway
    // Send or enqueue refund confirmation email (profile or checkout/guest)
    try {
      const recipientEmail = order.customer?.email || order.contactEmail || order.shippingAddress?.email || order.guestEmail || null;
      if (recipientEmail) {
        try {
          const cid = newCorrelationId('order-refund');
          const meta = { correlationId: cid, userId: order.customer ? order.customer._id : undefined, orderId: order._id.toString(), source: 'order-refund', oldStatus: 'paid', newStatus: 'refunded' };
          const orderSnapshot = transformOrderForDisplay(order);
          if (process.env.USE_EMAIL_QUEUE === 'true') {
            const { addEmailJob } = await import('../queues/emailQueue.js');
            await addEmailJob('sendOrderStatusChange', { orderId: order._id.toString(), order: orderSnapshot, actorId: req.user ? req.user._id : undefined, meta });
          } else {
            const recipient = order.customer && order.customer.email ? order.customer : { name: order.shippingAddress?.name || order.contactName || recipientEmail, email: recipientEmail };
            await EmailService.sendOrderStatusChange(recipient, orderSnapshot, { oldStatus: 'paid', newStatus: 'refunded' }, { meta });
          }
        } catch (e) {
          console.warn('Failed to send/enqueue refund email:', e?.message || e);
        }
      }
    } catch (e) {
      console.warn('Failed to send/enqueue refund email:', e?.message || e);
    }

      // Create in-app notification for refund so customer sees update in-app
      try {
        if (order.customer && order.customer._id) {
          await notificationService.createNotification({
            userId: order.customer._id,
            title: `Order ${order.orderNumber || order._id} refunded`,
            message: `A refund of ${order.refundAmount || amount || 0} has been processed for your order ${order.orderNumber || order._id}.`,
            type: 'order',
            metadata: { orderId: order._id.toString(), refundAmount: order.refundAmount || amount }
          });
        }
      } catch (e) {
        console.warn('Failed to create in-app notification for refund:', e?.message || e);
      }
    const respOrder = transformOrderForDisplay(order);
    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: { order: respOrder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing refund'
    });
  }
};

// ========================
// CATEGORY MANAGEMENT CONTROLLERS
// ========================
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort('name');

    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories'
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category with this name or slug already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating category'
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: { category }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating category'
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    // Check if category has products
    const productCount = await Product.countDocuments({ category: req.params.id });
    
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${productCount} products are associated with this category.`
      });
    }

    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category'
    });
  }
};

// ========================
// ANALYTICS CONTROLLERS
// ========================
export const getSalesAnalytics = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(new Date().getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const salesData = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
              totalSales: { $sum: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } },
              orderCount: { $sum: 1 },
              averageOrder: { $avg: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        period,
        salesData,
        summary: {
          totalRevenue: salesData.reduce((sum, day) => sum + day.totalSales, 0),
          totalOrders: salesData.reduce((sum, day) => sum + day.orderCount, 0),
          averageOrder: salesData.reduce((sum, day) => sum + day.averageOrder, 0) / salesData.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching sales analytics'
    });
  }
};

export const getUserAnalytics = async (req, res) => {
  try {
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$active', true] }, 1, 0] }
          }
        }
      }
    ]);

    const registrationStats = await User.aggregate([
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 12 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        userStats,
        registrationStats,
        totalUsers: userStats.reduce((sum, stat) => sum + stat.count, 0)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user analytics'
    });
  }
};

export const getProductAnalytics = async (req, res) => {
  try {
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          name: '$product.name',
          sku: '$product.sku',
          totalSold: 1,
          totalRevenue: 1,
          image: { $arrayElemAt: ['$product.images', 0] }
        }
      }
    ]);

    const categoryStats = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          productCount: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          totalStock: { $sum: '$stockQuantity' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        topProducts,
        categoryStats,
        lowStock: await Product.countDocuments({ 
          stockQuantity: { $lte: 10 },
          inStock: true 
        })
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product analytics'
    });
  }
};

// ========================
// SYSTEM MANAGEMENT CONTROLLERS
// ========================
export const getSystemHealth = async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    const health = {
      database: dbStatus,
      server: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024)
        },
        nodeVersion: process.version,
        platform: process.platform
      },
      services: {
        email: 'active', // You can add actual checks here
        storage: 'active',
        cache: 'active'
      }
    };

    res.status(200).json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching system health'
    });
  }
};

export const clearCache = async (req, res) => {
  try {
    // Implement cache clearing logic here
    // This would depend on your caching solution (Redis, etc.)
    
    res.status(200).json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing cache'
    });
  }
};

export const backupDatabase = async (req, res) => {
  try {
    // Implement database backup logic here
    // This would typically involve mongodump or similar
    
    res.status(200).json({
      success: true,
      message: 'Backup initiated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error initiating backup'
    });
  }
};

// ========================
// UTILITY FUNCTIONS
// ========================
const generateSKU = (category, brand) => {
  const timestamp = Date.now().toString().slice(-6);
  const catCode = category.slice(0, 3).toUpperCase();
  const brandCode = brand.slice(0, 3).toUpperCase();
  return `${catCode}-${brandCode}-${timestamp}`;
};

const getWeeklySalesData = async () => {
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  
  return await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startOfWeek },
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
        },
        sales: { $sum: { $add: ['$subtotal', { $ifNull: ['$shippingCost', 0] }] } },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const getTopProducts = async () => {
  return await Order.aggregate([
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        sold: { $sum: '$items.quantity' },
        totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
      }
    },
    { $sort: { sold: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'products',
        localField: '_id',
        foreignField: '_id',
        as: 'product'
      }
    },
    { $unwind: '$product' },
    {
      $project: {
        name: '$product.name',
        sold: 1,
        totalRevenue: 1,
        image: { $arrayElemAt: ['$product.images', 0] }
      }
    }
  ]);
};

const getUserGrowthData = async () => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  return await User.aggregate([
    {
      $match: {
        createdAt: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m', date: '$createdAt' }
        },
        users: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

export const bulkDeleteProducts = async (req, res) => {
  try {
    const { productIds } = req.body;
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No product IDs provided for bulk delete' });
    }
    if (productIds.length > 500) {
      return res.status(400).json({ success: false, message: 'Bulk delete exceeds maximum allowed size' });
    }
    // remove products
    const result = await Product.deleteMany({ _id: { $in: productIds } });

    try {
      await AuditLog.create({
        type: 'bulk_delete',
        actor: req.user ? req.user._id : undefined,
        actorName: req.user ? req.user.name : undefined,
        action: 'bulkDeleteProducts',
        payload: { productIds: productIds.slice(0, 50), total: productIds.length },
        message: `${req.user ? req.user.name : 'system'} deleted ${productIds.length} products`
      });
    } catch (e) {
      console.warn('Failed to create audit log for bulkDeleteProducts', e?.message || e);
    }

    res.status(200).json({ success: true, message: `${result.deletedCount} products deleted`, data: { deletedCount: result.deletedCount } });
  } catch (error) {
    console.error('bulkDeleteProducts error:', error);
    res.status(500).json({ success: false, message: 'Error performing bulk delete' });
  }
};

// Normalize color values on server-side for hex/rgb inputs.
const normalizeColor = (input) => {
  if (!input || typeof input !== 'string') return { value: input, normalizedHex: null };
  const v = input.trim();
  // Hex formats: #RGB, #RRGGBB
  const hexShort = v.match(/^#([0-9a-fA-F]{3})$/);
  if (hexShort) {
    const r = hexShort[1][0] + hexShort[1][0];
    const g = hexShort[1][1] + hexShort[1][1];
    const b = hexShort[1][2] + hexShort[1][2];
    return { value: v, normalizedHex: `#${(r+g+b).toUpperCase()}` };
  }
  const hexFull = v.match(/^#([0-9a-fA-F]{6})$/);
  if (hexFull) return { value: v, normalizedHex: `#${hexFull[1].toUpperCase()}` };
  // rgb(a)
  const rgb = v.match(/^rgba?\((\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})(?:,\s*[0-9.]+)?\)$/i);
  if (rgb) {
    const r = Math.max(0, Math.min(255, parseInt(rgb[1], 10)));
    const g = Math.max(0, Math.min(255, parseInt(rgb[2], 10)));
    const b = Math.max(0, Math.min(255, parseInt(rgb[3], 10)));
    const toHex = (n) => (n < 16 ? '0' + n.toString(16) : n.toString(16));
    return { value: v, normalizedHex: `#${(toHex(r)+toHex(g)+toHex(b)).toUpperCase()}` };
  }
  // For named colors we cannot reliably normalize server-side without a color database;
  // preserve raw value and leave normalizedHex null — frontend will compute and preview.
  return { value: v, normalizedHex: null };
};