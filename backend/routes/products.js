import express from 'express';

import {
  getAllProducts,
  getProduct,
  getFeaturedProducts,
  getFilters,
  getActiveBrands,
  getProductsByCategory,
  searchProducts,
  getPrivateSaleProducts,
  checkPrivateSaleEligibilityEndpoint
} from '../controllers/productController.js';
import { requirePrivateSaleAccess } from '../middleware/privateSaleMiddleware.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// ✅ GET /api/v1/products
router.get('/', getAllProducts);

// ✅ Private Sale endpoints (declared BEFORE /:id)
router.get('/private-sale/eligibility', optionalAuth, checkPrivateSaleEligibilityEndpoint);
router.get('/private-sale', requirePrivateSaleAccess, getPrivateSaleProducts);

// ✅ GET /api/v1/products/brands
router.get('/brands', getActiveBrands);

// ✅ GET /api/v1/products/featured
router.get('/featured', getFeaturedProducts);

// ✅ GET /api/v1/products/filters
router.get('/filters', getFilters);

// ✅ GET /api/v1/products/search
router.get('/search', searchProducts);

// ✅ GET /api/v1/products/category/:category
router.get('/category/:category', getProductsByCategory);

// ✅ GET /api/v1/products/:id
router.get('/:id', getProduct);

export default router;
