import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import bus from '../events/index.js';

const router = express.Router();

// POST /api/admin/notifications/send
router.post('/send', protect, authorize('admin'), async (req, res) => {
  try {
    const { target, title, message, metadata } = req.body;
    // Emit admin broadcast event
    bus.emit('ADMIN_BROADCAST', { target, title, message, metadata });
    // Log broadcast
    console.info('Admin broadcast triggered by', req.user.email || req.user._id, 'target=', target);
    res.status(200).json({ success: true });
  } catch (e) {
    console.error('POST /api/admin/notifications/send error', e?.stack || e);
    res.status(500).json({ success: false, message: 'Failed to send broadcast' });
  }
});

// POST /api/admin/notifications/schedule
router.post('/schedule', protect, authorize('admin'), async (req, res) => {
  try {
    const { target, title, message, scheduledAt, metadata } = req.body;
    // For scheduled sends, enqueue a job in the notification queue (worker handles scheduling/timer)
    const { addNotificationJob } = await import('../queues/notificationQueue.js');
    await addNotificationJob('scheduledSend', { target, title, message, scheduledAt, metadata }, { delay: new Date(scheduledAt).getTime() - Date.now() });
    console.info('Scheduled notification enqueued by', req.user.email || req.user._id);
    res.status(200).json({ success: true });
  } catch (e) {
    console.error('POST /api/admin/notifications/schedule error', e?.stack || e);
    res.status(500).json({ success: false, message: 'Failed to schedule notification' });
  }
});

export default router;
