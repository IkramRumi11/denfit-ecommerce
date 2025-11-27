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
  bulkDeleteProducts,
  
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
  ,
  // Feature flags will be handled by a separate controller
} from '../controllers/adminController.js';
import { getAllFlags, createFlag, updateFlag, deleteFlag } from '../controllers/adminFeatureController.js';

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
router.delete('/products/bulk', bulkDeleteProducts);

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
    const files = req.files || [];
    console.debug(`/admin/uploads called; files: ${files.length}, user: ${req.user?.email || 'anonymous'}`);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudApiKey = process.env.CLOUDINARY_API_KEY;
    const cloudApiSecret = process.env.CLOUDINARY_API_SECRET;
    const results = [];

    if (cloudName && cloudApiKey && cloudApiSecret) {
      try {
        const cloudinary = await import('cloudinary');
        cloudinary.v2.config({ cloud_name: cloudName, api_key: cloudApiKey, api_secret: cloudApiSecret });
        let i = 0;
        for (const f of files) {
          const r = await cloudinary.v2.uploader.upload(f.path, { folder: 'denfit' });
          results.push({ url: r.secure_url, filename: r.public_id ? `${r.public_id}.${r.format}` : f.filename, publicId: r.public_id || null, isPrimary: i === 0, order: i });
          i++;
        }
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to local storage', cloudErr?.message || cloudErr);
        // Fallback to local file url if cloudinary or upload fails
        let i = 0;
        for (const f of files) {
          const url = `/uploads/${f.filename}`;
          results.push({ url, filename: f.filename, publicId: null, isPrimary: i === 0, order: i });
          i++;
        }
      }
    } else {
      let i = 0;
      for (const f of files) {
        const url = `/uploads/${f.filename}`;
        results.push({ url, filename: f.filename, publicId: null, isPrimary: i === 0, order: i });
        i++;
      }
    }

    console.debug('/admin/uploads results:', results.map(r => r.filename));
    res.status(200).json({ success: true, data: { files: results } });
  } catch (err) {
    console.error('/admin/uploads error:', err);
    next(err);
  }
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

// ========================
// FEATURE FLAGS Management (Admin)
// ========================
router.get('/features', getAllFlags);
router.post('/features', createFlag);
router.patch('/features/:id', updateFlag);
router.delete('/features/:id', deleteFlag);

export default router;