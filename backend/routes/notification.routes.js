import express from 'express';

import { protect } from '../middleware/auth.js';
import notificationService from '../services/notification.service.js';

const router = express.Router();

// GET /api/notifications?page=1&limit=20
router.get('/', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const data = await notificationService.getNotificationsForUser(req.user._id, { page, limit });
    res.status(200).json({ success: true, data });
  } catch (e) {
    console.error('GET /api/notifications error', e?.stack || e);
    res.status(500).json({ success: false, message: 'Error fetching notifications' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const n = await notificationService.markAsRead(req.user._id, req.params.id);
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.status(200).json({ success: true, data: { notification: n } });
  } catch (e) {
    console.error('PATCH /api/notifications/:id/read error', e?.stack || e);
    res.status(500).json({ success: false, message: 'Error marking notification as read' });
  }
});

// PATCH /api/notifications/read-all
router.patch('/read-all', protect, async (req, res) => {
  try {
    await notificationService.markAllRead(req.user._id);
    res.status(200).json({ success: true });
  } catch (e) {
    console.error('PATCH /api/notifications/read-all error', e?.stack || e);
    res.status(500).json({ success: false, message: 'Error marking all as read' });
  }
});

export default router;
