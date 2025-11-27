import express from 'express';
import { getFeatures } from '../controllers/featureController.js';

const router = express.Router();

// GET /api/v1/features
router.get('/', getFeatures);

export default router;
