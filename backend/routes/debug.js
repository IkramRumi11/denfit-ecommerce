import express from 'express';

import { optionalAuth } from '../middleware/auth.js';
import { checkHealth } from '../controllers/debugController.js';
import EmailService from '../services/emailService.js';
import User from '../models/User.js';
import { newCorrelationId } from '../utils/correlation.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

// Public health check (optional auth to show user when present)
router.get('/health', optionalAuth, checkHealth);

// Dev-only debug email endpoint
router.get('/email', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && String(process.env.ALLOW_DEV_BACKDOORS).toLowerCase() !== 'true') {
      return res.status(403).json({ success: false, message: 'Debug routes are disabled in production.' });
    }

    const { to, template = 'welcome', userId, orderId, subject, html } = req.query;
    if (!to) return res.status(400).json({ success: false, message: 'Missing `to` query parameter' });

    let user = null;
    if (userId) {
      user = await User.findById(userId);
    }

    const cid = newCorrelationId('debug');
    const meta = { correlationId: cid, userId: userId || undefined, orderId: orderId || undefined, source: 'debug-route' };

    let result = null;
    if (template === 'welcome') {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?mode=verify&token=test-debug-token`;
      result = await EmailService.sendWelcomeEmail(user || { email: to, name: 'Debug' }, verificationUrl, { meta });
    } else if (template === 'welcome-verified') {
      result = await EmailService.sendWelcomeVerifiedEmail(user || { email: to, name: 'Debug' }, { meta });
    } else if (template === 'password-reset') {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth?mode=reset&token=test-debug-token`;
      result = await EmailService.sendPasswordResetEmail(user || { email: to, name: 'Debug' }, resetUrl, { meta });
    } else if (template === 'shipping') {
      const order = { orderNumber: 'DEBUG-123', _id: orderId || 'DEBUG' };
      result = await EmailService.sendShippingConfirmation(user || { email: to, name: 'Debug' }, order, { meta });
    } else if (template === 'custom') {
      result = await EmailService.sendMail({ to, subject: subject || 'Debug Email', html: html || `<p>Debug email</p>` }, { meta });
    } else {
      return res.status(400).json({ success: false, message: 'Unknown template' });
    }

    return res.status(200).json({ success: true, message: 'Debug email sent', correlationId: cid, result });
  } catch (err) {
    console.error('Debug email route error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send debug email', error: err?.message || String(err) });
  }
});

export default router;

// Dev-only: emit a test notification to a user
router.post('/notify', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && String(process.env.ALLOW_DEV_BACKDOORS).toLowerCase() !== 'true') {
      return res.status(403).json({ success: false, message: 'Debug routes are disabled in production.' });
    }
    const { userId, title = 'Debug notification', message = 'This is a test notification from debug route', type = 'system' } = req.body || {};
    if (!userId) return res.status(400).json({ success: false, message: 'Missing userId in body' });
    const n = await notificationService.createNotification({ userId: String(userId), title, message, type });
    return res.status(200).json({ success: true, notification: n });
  } catch (err) {
    console.error('Debug notify route error', err);
    return res.status(500).json({ success: false, message: 'Failed to create test notification', error: err?.message || String(err) });
  }
});