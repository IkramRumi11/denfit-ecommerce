import { Worker } from 'bullmq';

import { connection } from '../config/redis.js';
import Notification from '../models/Notification.js';
import notificationService from '../services/notification.service.js';
import { emitToUser } from '../sockets/index.js';

const worker = new Worker('notifications', async (job) => {
  const { name, data } = job;
  if (name === 'deliver') {
    const { notificationId } = data;
    const n = await Notification.findById(notificationId).lean();
    if (!n) {
      console.warn('[notification.job] notification not found', notificationId);
      return;
    }
    // Skip if already delivered (e.g. fallback emit handled it)
    if (n.isDelivered) {
      console.debug('[notification.job] notification already delivered, skipping', {
        notificationId,
        reason: 'Previously processed'
      });
      return;
    }
    // Attempt to emit via socket
    try {
      console.debug('[notification.job] attempting socket delivery', {
        notificationId,
        userId: String(n.userId),
        type: n.type,
        title: n.title
      });
      emitToUser(n.userId, 'notification', n);
      await Notification.findByIdAndUpdate(n._id, { isDelivered: true });
      console.info('[notification.job] notification queued for websocket delivery', {
        notificationId,
        userId: String(n.userId)
      });
    } catch (e) {
      console.warn('[notification.job] notification delivery failed', {
        notificationId,
        error: e?.message || e
      });
    }
  }

  if (name === 'scheduledSend') {
    // data: { target, title, message }
    const targets = await notificationService.resolveTargetUsers(data.target);
    for (const uid of targets) {
      await notificationService.createNotification({ userId: uid, title: data.title, message: data.message, metadata: data.metadata || {} });
    }
  }
}, { connection });

worker.on('failed', (job, err) => {
  console.error('Notification job failed', job.name, err?.message || err);
});

export default worker;
