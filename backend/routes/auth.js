// backend/routes/auth.js
import express from 'express';

import { authLimiter } from '../src/config/security.js';
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  checkEmail,
  mergeGuestData,
  requestEmailChange,
  refreshToken
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password/:token', resetPassword);

// ✅ Support both GET and POST for email verification
router.post('/verify-email/:token', verifyEmail);
router.get('/verify-email/:token', verifyEmail);

// Resend verification relies on controller-level cooldown/Retry-After handling
router.post('/resend-verification', resendVerification);
router.post('/check-email', authLimiter, checkEmail);
// Allow logout to clear cookie even if token is invalid/stale
router.post('/logout', logout);
// Token refresh: silent re-authentication using refresh cookie
router.post('/refresh-token', refreshToken);

// Protected routes (require valid session)
router.use(protect);
router.get('/me', getMe);
router.patch('/update-me', updateMe);
router.patch('/update-password', updatePassword);
router.post('/merge-guest', mergeGuestData);
router.post('/request-email-change', requestEmailChange);

export default router;
