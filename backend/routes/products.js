import express from 'express';

import {
  getAllProducts,
  getProduct,
  getFeaturedProducts,
  getProductsByCategory,
  searchProducts
} from '../controllers/productController.js';

const router = express.Router();

// ✅ GET /api/v1/products
router.get('/', getAllProducts);

// ✅ GET /api/v1/products/featured
router.get('/featured', getFeaturedProducts);

// ✅ GET /api/v1/products/search
router.get('/search', searchProducts);

// ✅ GET /api/v1/products/category/:category
router.get('/category/:category', getProductsByCategory);

// ✅ GET /api/v1/products/:id
router.get('/:id', getProduct);

export default router;
