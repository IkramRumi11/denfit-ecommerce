import express from 'express';

import { getFeatures } from '../controllers/featureController.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/v1/features
// Accept optional auth so per-user flags can be applied when JWT is present
router.get('/', optionalAuth, getFeatures);

export default router;
