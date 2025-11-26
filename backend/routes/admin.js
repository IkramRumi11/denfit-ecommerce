import express from 'express';
import rateLimit from 'express-rate-limit';

import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  // Dashboard
  getDashboardStats,
  getRecentActivities,
  
  // User Management
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  banUser,
  unbanUser,
  
  // Product Management
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateProducts,
  
  // Order Management
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderTracking,
  cancelOrder,
  refundOrder,
  getAudits,
  
  // Category Management
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  
  // Analytics
  getSalesAnalytics,
  getUserAnalytics,
  getProductAnalytics,
  
  // System
  getSystemHealth,
  clearCache,
  backupDatabase
} from '../controllers/adminController.js';

const router = express.Router();

// ========================
// SECURITY & RATE LIMITING
// ========================
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many admin requests from this IP. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to all admin routes
router.use(adminLimiter);

// ========================
// PROTECT ALL ROUTES
// ========================
router.use(protect);
router.use(authorize('admin'));

// ========================
// DASHBOARD ROUTES
// ========================
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/activities', getRecentActivities);

// ========================
// USER MANAGEMENT ROUTES
// ========================
router.route('/users')
  .get(getAllUsers);

router.route('/users/:id')
  .get(getUserById)
  .patch(updateUser)
  .delete(deleteUser);

router.patch('/users/:id/ban', banUser);
router.patch('/users/:id/unban', unbanUser);

// ========================
// PRODUCT MANAGEMENT ROUTES
// ========================
router.route('/products')
  .get(getAllProducts)
  .post(createProduct);

router.route('/products/:id')
  .get(getProductById)
  .patch(updateProduct)
  .delete(deleteProduct);

router.patch('/products/bulk/update', bulkUpdateProducts);

// ========================
// ORDER MANAGEMENT ROUTES
// ========================
router.route('/orders')
  .get(getAllOrders);

router.get('/audits', getAudits);

router.route('/orders/:id')
  .get(getOrderById)
  .patch(updateOrderStatus);

router.patch('/orders/:id/tracking', updateOrderTracking);
router.patch('/orders/:id/cancel', cancelOrder);
router.patch('/orders/:id/refund', refundOrder);

// Uploads (admin only) - accept multiple images
router.post('/uploads', upload.array('files', 10), async (req, res, next) => {
  try {
    // If CLOUDINARY configured, prefer using Cloudinary (optional)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudApiKey = process.env.CLOUDINARY_API_KEY;
    const cloudApiSecret = process.env.CLOUDINARY_API_SECRET;
    const files = req.files || [];
    const results = [];
    if (cloudName && cloudApiKey && cloudApiSecret) {
      // lazy-load cloudinary to avoid hard dependency when not configured
      const cloudinary = await import('cloudinary');
      cloudinary.v2.config({ cloud_name: cloudName, api_key: cloudApiKey, api_secret: cloudApiSecret });
      let i = 0;
      for (const f of files) {
        const r = await cloudinary.v2.uploader.upload(f.path, { folder: 'denfit' });
        results.push({
          url: r.secure_url,
          filename: r.public_id ? `${r.public_id}.${r.format}` : f.filename,
          publicId: r.public_id || null,
          isPrimary: i === 0,
          order: i
        });
        i++;
      }
    } else {
      let i = 0;
      for (const f of files) {
        const url = `/uploads/${f.filename}`;
        results.push({ url, filename: f.filename, publicId: null, isPrimary: i === 0, order: i });
        i++;
      }
    }
    res.status(200).json({ success: true, data: { files: results } });
  } catch (err) { next(err); }
});

// ========================
// CATEGORY MANAGEMENT ROUTES
// ========================
router.route('/categories')
  .get(getAllCategories)
  .post(createCategory);

router.route('/categories/:id')
  .patch(updateCategory)
  .delete(deleteCategory);

// ========================
// ANALYTICS ROUTES
// ========================
router.get('/analytics/sales', getSalesAnalytics);
router.get('/analytics/users', getUserAnalytics);
router.get('/analytics/products', getProductAnalytics);

// ========================
// SYSTEM MANAGEMENT ROUTES
// ========================
router.get('/system/health', getSystemHealth);
router.post('/system/cache/clear', clearCache);
router.post('/system/backup', backupDatabase);

export default router;