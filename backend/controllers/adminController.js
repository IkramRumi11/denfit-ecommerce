
import mongoose from 'mongoose';

import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import AuditLog from '../models/AuditLog.js';
import EmailService from '../services/emailService.js';

// ========================
// DASHBOARD CONTROLLERS
// ========================
export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);

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
      pendingOrders
    ] = await Promise.all([
      // Total counts
      User.countDocuments(),
      Product.countDocuments(),
      Order.countDocuments(),
      
      // Revenue calculations
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Today's orders
      Order.countDocuments({ 
        createdAt: { $gte: startOfToday } 
      }),
      
      // Monthly revenue
      Order.aggregate([
        { 
          $match: { 
            paymentStatus: 'paid',
            createdAt: { $gte: startOfMonth }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Yearly revenue
      Order.aggregate([
        { 
          $match: { 
            paymentStatus: 'paid',
            createdAt: { $gte: startOfYear }
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      
      // Low stock products
      Product.countDocuments({ 
        stockQuantity: { $lte: 10 },
        inStock: true 
      }),
      
      // Pending orders
      Order.countDocuments({ status: 'pending' })
    ]);

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
        pendingOrders
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
      .select('orderNumber status total createdAt');

    res.status(200).json({
      success: true,
      data: recentActivities
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
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Also delete user's orders (optional - based on business logic)
    await Order.deleteMany({ customer: req.params.id });

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
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

    res.status(200).json({
      success: true,
      data: {
        products,
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

export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name')
      .populate('reviews.user', 'name');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product'
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    const productData = {
      ...req.body,
    };
    // Only generate SKU if category exists (brand is optional)
    if (req.body.category) {
      productData.sku = generateSKU(req.body.category, req.body.brand || 'GEN');
    }

    const product = await Product.create(productData);

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating product'
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating product'
    });
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

    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updateData }
    );

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

    // Calculate totals for summary
    const revenueStats = await Order.aggregate([
      { $match: query },
      { $group: { 
        _id: null, 
        totalRevenue: { $sum: '$total' },
        averageOrder: { $avg: '$total' }
      }}
    ]);

    res.status(200).json({
      success: true,
      data: {
        orders,
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
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone addresses')
      .populate('items.product', 'name images sku');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { order }
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

    if (!allowed[from].includes(to)) {
      return res.status(400).json({ success: false, message: `Cannot transition order from '${from}' to '${to}'` });
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

    await order.save();

    // Send or enqueue notification email
    try {
      if (order.customer && order.customer.email) {
        if (process.env.USE_EMAIL_QUEUE === 'true') {
          const { addEmailJob } = await import('../queues/emailQueue.js');
          await addEmailJob('sendOrderStatusChange', { orderId: order._id.toString(), actorId: req.user ? req.user._id : undefined, meta: { oldStatus: from, newStatus: to } });
        } else {
          await EmailService.sendOrderStatusChange(order.customer, order, { oldStatus: from, newStatus: to });
        }
      }
    } catch (e) {
      console.warn('Failed to send/enqueue order status email:', e?.message || e);
    }

    res.status(200).json({ success: true, message: 'Order status updated successfully', data: { order } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order status'
    });
  }
};

export const updateOrderTracking = async (req, res) => {
  try {
    const { trackingNumber, carrier, estimatedDelivery } = req.body;

    const order = await Order.findById(req.params.id).populate('customer', 'name email');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.trackingNumber = trackingNumber || order.trackingNumber;
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

    await order.save();

    // Send or enqueue shipping confirmation email
    try {
      if (order.customer && order.customer.email) {
        if (process.env.USE_EMAIL_QUEUE === 'true') {
          const { addEmailJob } = await import('../queues/emailQueue.js');
          await addEmailJob('sendShippingConfirmation', { orderId: order._id.toString() });
        } else {
          await EmailService.sendShippingConfirmation(order.customer, order);
        }
      }
    } catch (e) {
      console.warn('Failed to send/enqueue shipping confirmation:', e?.message || e);
    }

    res.status(200).json({ success: true, message: 'Tracking information updated successfully', data: { order } });
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
  await order.save();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // TODO: Process refund if payment was made
    // Send or enqueue cancellation email
    try {
      if (order.customer && order.customer.email) {
        if (process.env.USE_EMAIL_QUEUE === 'true') {
          const { addEmailJob } = await import('../queues/emailQueue.js');
          await addEmailJob('sendOrderStatusChange', { orderId: order._id.toString(), actorId: req.user ? req.user._id : undefined, meta: { oldStatus, newStatus: 'cancelled' } });
        } else {
          await EmailService.sendOrderStatusChange(order.customer, order, { oldStatus, newStatus: 'cancelled' });
        }
      }
    } catch (e) {
      console.warn('Failed to send/enqueue cancellation email:', e?.message || e);
    }

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order }
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
    await order.save();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // TODO: Process actual refund through payment gateway
    // Send or enqueue refund confirmation email
    try {
      if (order.customer && order.customer.email) {
        if (process.env.USE_EMAIL_QUEUE === 'true') {
          const { addEmailJob } = await import('../queues/emailQueue.js');
          await addEmailJob('sendOrderStatusChange', { orderId: order._id.toString(), actorId: req.user ? req.user._id : undefined, meta: { oldStatus: 'paid', newStatus: 'refunded' } });
        } else {
          await EmailService.sendOrderStatusChange(order.customer, order, { oldStatus: 'paid', newStatus: 'refunded' });
        }
      }
    } catch (e) {
      console.warn('Failed to send/enqueue refund email:', e?.message || e);
    }

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: { order }
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
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 },
          averageOrder: { $avg: '$total' }
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
        sales: { $sum: '$total' },
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
        sold: { $sum: '$items.quantity' }
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