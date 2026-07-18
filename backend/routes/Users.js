import express from 'express';
import asyncHandler from 'express-async-handler';

import { getMe, updateMe, updatePassword } from '../controllers/userController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// All user-specific routes require authentication
router.use(protect);

// Get current user's profile
router.get('/me', asyncHandler(getMe));

// Update profile
router.put('/me', asyncHandler(updateMe));

// Update password
router.put('/update-password', asyncHandler(updatePassword));

export default router;