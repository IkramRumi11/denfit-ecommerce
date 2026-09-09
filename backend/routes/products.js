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

router.get('/', getAllProducts);

// Private sale endpoints must be declared before dynamic /:id
router.get('/private-sale/eligibility', optionalAuth, checkPrivateSaleEligibilityEndpoint);
router.get('/private-sale', requirePrivateSaleAccess, getPrivateSaleProducts);

router.get('/brands', getActiveBrands);
router.get('/featured', getFeaturedProducts);
router.get('/filters', getFilters);
router.get('/search', searchProducts);
router.get('/category/:category', getProductsByCategory);
router.get('/:id', getProduct);

export default router;
