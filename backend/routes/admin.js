import express from 'express';
import rateLimit from 'express-rate-limit';

import { protect, authorize } from '../middleware/auth.js';
import upload, { validateUploadedFiles, productUpload } from '../middleware/upload.js';
import { assertUrlSafe } from '../utils/urlSafety.js';
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
  suggestRelatedProducts,
  listRecommendationMappings,
  createRecommendationMapping,
  deleteRecommendationMapping,
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
import { getInvoice, getInvoicePdf } from '../controllers/invoiceController.js';
import { listStyleByYou, createStyleByYou, updateStyleByYou, deleteStyleByYou, searchProductsForLink } from '../controllers/adminStyleByYouController.js';
import { listDetailTemplates, getDetailTemplate, createDetailTemplate, updateDetailTemplate, deleteDetailTemplate, updateProductDetailSections } from '../controllers/adminDetailTemplateController.js';
import { getAllFlags, createFlag, updateFlag, deleteFlag } from '../controllers/adminFeatureController.js';
import { getSizeProfiles, createSizeProfile, updateSizeProfile, deleteSizeProfile } from '../controllers/adminSizeController.js';
import { listSettings, createSetting, updateSetting, deleteSetting, streamSettings, aggregateSettings, importFeatureFlagsToSettings, importSizeProfilesToSettings } from '../controllers/adminSettingsController.js';
import { listReviews, approveReview, rejectReview, featureReview, deleteReview } from '../controllers/adminReviewController.js';
import {
  getSubscribers,
  createAndSendCampaign,
  sendTestEmail,
  listCampaigns,
  deleteCampaign
} from '../controllers/adminEmailMarketingController.js';

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

// Protect admin routes: require authenticated admin users for all admin endpoints
router.use(protect);
router.use(authorize('admin', 'super_admin'));

  // Size profiles (admin managed lists of sizes per category/gender)
  router.get('/size-profiles', getSizeProfiles);
  router.post('/size-profiles', createSizeProfile);
  router.patch('/size-profiles/:id', updateSizeProfile);
  router.delete('/size-profiles/:id', deleteSizeProfile);

  // System settings (real-time)
  router.get('/settings', listSettings);
  router.post('/settings', createSetting);
  router.patch('/settings/:id', updateSetting);
  router.delete('/settings/:id', deleteSetting);
  router.get('/settings/stream', streamSettings);
  // Aggregate & import helpers
  router.get('/settings/aggregate', aggregateSettings);
  router.post('/settings/import/flags', importFeatureFlagsToSettings);
  router.post('/settings/import/size-profiles', importSizeProfilesToSettings);
  router.delete('/size-profiles/:id', deleteSizeProfile);

// ========================
// PROTECTED ROUTES (authenticated admin)
// ========================

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
  .post(productUpload(50), validateUploadedFiles, createProduct);

// Suggestions endpoint for admin related-products UI
router.get('/products/suggestions', suggestRelatedProducts);

// Recommendation mappings management (admin)
router.get('/recommendation-mappings', listRecommendationMappings);
router.post('/recommendation-mappings', createRecommendationMapping);
router.delete('/recommendation-mappings/:id', deleteRecommendationMapping);

// Bulk product operations (declare BEFORE `/products/:id` to avoid route param capture)
router.patch('/products/bulk/update', bulkUpdateProducts);
router.delete('/products/bulk', bulkDeleteProducts);

router.route('/products/:id')
  .get(getProductById)
  .patch(productUpload(50), validateUploadedFiles, updateProduct)
  .delete(deleteProduct);


// ========================
// ORDER MANAGEMENT ROUTES
// ========================
router.route('/orders')
  .get(getAllOrders);

router.get('/audits', getAudits);

router.route('/orders/:id')
  .get(getOrderById)
  .patch(updateOrderStatus);

// Generate / preview printable invoice for an order (admin only)
router.get('/orders/:id/invoice', getInvoice);
// Generate invoice PDF (download)
router.get('/orders/:id/invoice/pdf', getInvoicePdf);

router.patch('/orders/:id/tracking', updateOrderTracking);
router.patch('/orders/:id/cancel', cancelOrder);
router.patch('/orders/:id/refund', refundOrder);

// ========================
// EMAIL MARKETING (ADMIN)
// ========================
// Subscribers list + filters
router.get('/email-marketing/subscribers', getSubscribers);
// Campaign creation / send
router.post('/email-marketing/campaigns', createAndSendCampaign);
router.post('/email-marketing/campaigns/test', sendTestEmail);
// Campaign history
router.get('/email-marketing/campaigns', listCampaigns);
router.delete('/email-marketing/campaigns/:id', deleteCampaign);

// Uploads (admin only) - accept multiple images

router.post('/uploads', upload.array('files', 10), validateUploadedFiles, async (req, res, next) => {
  try {
    const files = req.files || [];
    console.debug(`/admin/uploads called; files: ${files.length}, user: ${req.user?.email || 'anonymous'}`);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudApiKey = process.env.CLOUDINARY_API_KEY;
    const cloudApiSecret = process.env.CLOUDINARY_API_SECRET;
    // Treat obvious placeholder values as "not configured"
    const placeholderValues = ['your_cloud_name', 'your_api_key', 'your_api_secret', 'undefined', 'null', ''];
    const hasCloudCreds = cloudName && cloudApiKey && cloudApiSecret &&
      !placeholderValues.includes(String(cloudName).toLowerCase()) &&
      !placeholderValues.includes(String(cloudApiKey).toLowerCase()) &&
      !placeholderValues.includes(String(cloudApiSecret).toLowerCase());
    const results = [];
    // Base URL for local uploads fallback (ensures frontend can load absolute URLs)
    // Respect reverse-proxy headers (x-forwarded-proto) so generated URLs use the
    // correct scheme (https when frontend is served over TLS behind a proxy).
    const forwardedProto = req.headers['x-forwarded-proto'] ? String(req.headers['x-forwarded-proto']).split(',')[0].trim() : null;
    const proto = forwardedProto || req.protocol;
    const baseUrl = `${proto}://${req.get('host')}`;

    if (hasCloudCreds) {
      try {
        const cloudinary = await import('cloudinary');
        cloudinary.v2.config({ cloud_name: cloudName, api_key: cloudApiKey, api_secret: cloudApiSecret });
        let i = 0;
        for (const f of files) {
          console.debug('Uploading file (cloudinary attempt) from path:', f.path);
          const r = await cloudinary.v2.uploader.upload(f.path, { folder: 'denfit' });
          results.push({ url: r.secure_url, filename: r.public_id ? `${r.public_id}.${r.format}` : f.filename, publicId: r.public_id || null, isPrimary: i === 0, order: i });
          i++;
        }
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, falling back to local storage', cloudErr?.message || cloudErr);
        // Fallback to local file url if cloudinary or upload fails
        let i = 0;
        for (const f of files) {
          console.debug('Using local fallback for uploaded file at path:', f.path, 'filename:', f.filename);
          const url = `${baseUrl}/uploads/${f.filename}`;
          results.push({ url, filename: f.filename, publicId: null, isPrimary: i === 0, order: i });
          i++;
        }
      }
    } else {
      let i = 0;
      for (const f of files) {
        const url = `${baseUrl}/uploads/${f.filename}`;
        results.push({ url, filename: f.filename, publicId: null, isPrimary: i === 0, order: i });
        i++;
      }
    }

    // Log full result objects to aid debugging (urls, publicId, order, isPrimary)
    console.debug('/admin/uploads results:', results);
    res.status(200).json({ success: true, data: { files: results } });
  } catch (err) {
    console.error('/admin/uploads error:', err);
    next(err);
  }
});

// Upload from external URL (admin only)
router.post('/uploads/from-url', async (req, res, next) => {
  try {
    const { url } = req.body || {};
    console.debug('/admin/uploads/from-url called by:', req.user?.email || 'anonymous', 'url:', url);
    if (!url) return res.status(400).json({ success: false, message: 'Missing url' });

    // Basic validation
    let parsed;
    try {
      parsed = new URL(url);
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Invalid URL' });
    }

    // Fetch the remote image. Use global fetch when available (Node 18+),
    // otherwise fall back to node-fetch dynamic import.
    const fetchFn = (typeof globalThis.fetch === 'function')
      ? globalThis.fetch.bind(globalThis)
      : (await import('node-fetch')).default;
    const safeFetch = async (url, options = {}) => {
      await assertUrlSafe(url);
      return fetchFn(url, options);
    };
    let resp;
    try {
      resp = await safeFetch(parsed.toString());
    } catch (fetchErr) {
      console.error('/admin/uploads/from-url fetch threw error:', fetchErr && fetchErr.stack ? fetchErr.stack : fetchErr);
      return res.status(400).json({ success: false, message: 'Failed to fetch image', error: String(fetchErr?.message || fetchErr) });
    }
    console.debug('/admin/uploads/from-url fetch response status:', resp.status, 'statusText:', resp.statusText);
    if (!resp.ok) {
      console.error('/admin/uploads/from-url fetch failed:', { url: parsed.toString(), status: resp.status, statusText: resp.statusText });
      return res.status(400).json({ success: false, message: 'Failed to fetch image' });
    }

    // Safety limits
    const FETCH_TIMEOUT_MS = 10000; // 10s
    const MAX_BYTES = 5 * 1024 * 1024; // 5MB

    // helper to fetch with timeout
    const fetchWithTimeout = async (u) => {
      const fetchPromise = safeFetch(u);
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Fetch timeout')), FETCH_TIMEOUT_MS));
      return Promise.race([fetchPromise, timeout]);
    };

    let finalResp = resp;
    let finalUrl = parsed.toString();

    const checkContentLength = (r) => {
      const cl = r.headers.get('content-length');
      if (cl) {
        const n = Number(cl);
        if (!Number.isNaN(n) && n > MAX_BYTES) throw new Error('Remote file too large');
      }
    };

    const isImageType = (ct) => !!ct && ct.startsWith('image/');

    try {
      checkContentLength(finalResp);
    } catch (e) {
      console.error('Remote content-length too large:', e.message);
      return res.status(413).json({ success: false, message: 'Remote file too large' });
    }

    let contentType = finalResp.headers.get('content-type') || '';
    console.debug('/admin/uploads/from-url content-type:', contentType);

    if (!isImageType(contentType)) {
      // If HTML page, try to extract an image URL (og:image or first <img>)
      let html = '';
      try {
        html = await finalResp.text();
      } catch (e) {
        console.warn('Failed to read non-image response body snippet', e?.message || e);
      }

      // Attempt to find og:image
      const ogMatch = html && html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const imgMatch = html && html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
      const candidate = ogMatch ? ogMatch[1] : (imgMatch ? imgMatch[1] : null);
      if (!candidate) {
        console.warn('/admin/uploads/from-url rejected non-image URL with no candidate image:', { url: finalUrl, contentType });
        return res.status(400).json({ success: false, message: 'URL does not point to an image' });
      }

      // Resolve relative URLs
      let resolved;
      try {
        resolved = new URL(candidate, finalUrl).toString();
      } catch (e) {
        console.warn('Failed to resolve candidate image URL:', candidate, e?.message || e);
        return res.status(400).json({ success: false, message: 'Unable to resolve image URL from page' });
      }

      console.debug('/admin/uploads/from-url found candidate image URL:', resolved);

      // re-fetch the candidate image with timeout
      try {
        finalResp = await fetchWithTimeout(resolved);
        finalUrl = resolved;
      } catch (e) {
        console.error('Failed to fetch extracted image URL:', e?.message || e);
        return res.status(400).json({ success: false, message: 'Failed to fetch extracted image' });
      }

      if (!finalResp.ok) return res.status(400).json({ success: false, message: 'Failed to fetch extracted image' });
      try { checkContentLength(finalResp); } catch (e) { return res.status(413).json({ success: false, message: 'Remote file too large' }); }
      contentType = finalResp.headers.get('content-type') || '';
      if (!isImageType(contentType)) return res.status(400).json({ success: false, message: 'Extracted URL is not an image' });
    }

    // URL_ONLY_MODE: do not download or store the remote image. Validate via HEAD/GET and return the remote URL.
    // Respect reverse-proxy headers (x-forwarded-proto) for schemes if needed for logging, but DO NOT rewrite the image URL.
    let validatedUrl = finalUrl;
    try {
      // Prefer HEAD to avoid downloading the body
      const headResp = await safeFetch(validatedUrl, { method: 'HEAD' });
      const headCt = headResp.headers.get('content-type') || '';
      if (headResp.ok && headCt && headCt.startsWith('image/')) {
        // good
      } else {
        // If HEAD didn't confirm image, try a lightweight GET for pages to extract og:image
        const getResp = await safeFetch(validatedUrl);
        const getCt = getResp.headers.get('content-type') || '';
        if (getResp.ok && getCt && getCt.startsWith('image/')) {
          // direct image
        } else if (getResp.ok && getCt && getCt.includes('html')) {
          // parse HTML for og:image or first <img>
          let html = '';
          try { html = await getResp.text(); } catch (e) { html = ''; }
          const ogMatch = html && html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i);
          const imgMatch = html && html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
          const candidate = ogMatch ? ogMatch[1] : (imgMatch ? imgMatch[1] : null);
          if (candidate) {
            try {
              validatedUrl = new URL(candidate, validatedUrl).toString();
              // check HEAD on candidate
              const candHead = await safeFetch(validatedUrl, { method: 'HEAD' });
              const candCt = candHead.headers.get('content-type') || '';
              if (!(candHead.ok && candCt && candCt.startsWith('image/'))) {
                // fallback: accept candidate even if HEAD didn't confirm (some CDNs block HEAD)
                // but do not download content
              }
            } catch (e) {
              console.warn('Failed to resolve candidate image URL:', candidate, e?.message || e);
              return res.status(400).json({ success: false, message: 'Unable to resolve image URL from page' });
            }
          } else {
            return res.status(400).json({ success: false, message: 'URL does not point to an image' });
          }
        } else {
          return res.status(400).json({ success: false, message: 'URL does not point to an image' });
        }
      }
    } catch (e) {
      console.warn('/admin/uploads/from-url validation failed:', e?.message || e);
      return res.status(400).json({ success: false, message: 'Failed to validate image URL', error: String(e?.message || e) });
    }

    // Return the validated remote URL as the stored file reference. Do NOT store locally.
    const results = [{ url: validatedUrl, filename: null, publicId: null, isPrimary: true, order: 0 }];
    console.debug('/admin/uploads/from-url results (URL_ONLY_MODE):', results);
    return res.status(200).json({ success: true, data: { files: results } });
  } catch (err) {
    // Log structured error and request context for debugging
    try {
      console.error('/admin/uploads/from-url error:', err && err.stack ? err.stack : err);
      console.error('Request context:', { user: req.user?.email || 'anonymous', body: req.body });
    } catch (logErr) {
      console.error('Failed to log upload-from-url error', logErr);
    }

    // If debugging is enabled, return detailed error to caller to aid development
    const debug = String(process.env.DEBUG_ERRORS || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'development';
    if (debug) {
      return res.status(500).json({ success: false, message: err?.message || 'Upload failed', error: err && err.stack ? err.stack : String(err) });
    }

    // Otherwise, delegate to global error handler (will return generic 500)
    next(err);
  }
});

// ========================
// STYLE BY YOU (ADMIN CRUD)
// ========================
router.get('/style-by-you', listStyleByYou);
router.post('/style-by-you', upload.array('files', 10), validateUploadedFiles, createStyleByYou);
router.patch('/style-by-you/:id', upload.array('files', 10), validateUploadedFiles, updateStyleByYou);
router.delete('/style-by-you/:id', deleteStyleByYou);
router.get('/style-by-you/search/products', searchProductsForLink);

// ========================
// DETAIL TEMPLATES (ADMIN)
// ========================
router.get('/detail-templates', listDetailTemplates);
router.post('/detail-templates', createDetailTemplate);
router.get('/detail-templates/:id', getDetailTemplate);
router.patch('/detail-templates/:id', updateDetailTemplate);
router.delete('/detail-templates/:id', deleteDetailTemplate);

// Product-level detail sections / template assignment
router.patch('/products/:id/detail-sections', updateProductDetailSections);

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
// REVIEWS (ADMIN)
// ========================
router.get('/reviews', listReviews);
router.patch('/reviews/:id/approve', approveReview);
router.patch('/reviews/:id/reject', rejectReview);
router.patch('/reviews/:id/feature', featureReview);
router.delete('/reviews/:id', deleteReview);

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