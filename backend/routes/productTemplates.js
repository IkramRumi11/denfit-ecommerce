import express from 'express';
import { getProductTemplate } from '../controllers/filterController.js';

const router = express.Router();

// GET /api/v1/product-templates/:subcategory
router.get('/:subcategory', getProductTemplate);

export default router;
