import EventEmitter from 'events';

import notificationService from '../services/notification.service.js';

const bus = new EventEmitter();

// Bind handlers
bus.on('USER_LOGIN', async (payload) => {
  try {
    const userId = payload.userId;
    await notificationService.createNotification({ userId, title: 'New sign-in', message: 'New device or first login detected', type: 'system', metadata: { ip: payload.ip } });
  } catch (e) { console.warn('USER_LOGIN handler error', e?.message || e); }
});

bus.on('ORDER_PLACED', async (payload) => {
  try {
    const userId = payload.userId;
    // Notify the customer
    await notificationService.createNotification({ userId, title: 'Order placed', message: `Your order ${payload.orderId} was placed successfully`, type: 'order', metadata: { orderId: payload.orderId } });

    // Also notify admin users about the new order so admins see it in the header
    try {
      const adminIds = await notificationService.resolveTargetUsers({ group: 'admin' });
      for (const adminId of adminIds) {
        // Mark admin-targeted notifications with type 'admin' so frontend can
        // distinguish them from customer-facing order notifications.
        await notificationService.createNotification({ userId: adminId, title: 'New order received', message: `Order ${payload.orderId} was placed`, type: 'admin', metadata: { orderId: payload.orderId } });
      }
    } catch (e) {
      console.warn('Failed to notify admins for ORDER_PLACED', e?.message || e);
    }
  } catch (e) { console.warn('ORDER_PLACED handler error', e?.message || e); }
});

bus.on('PAYMENT_FAILED', async (payload) => {
  try {
    const userId = payload.userId;
    await notificationService.createNotification({ userId, title: 'Payment failed', message: `Payment for order ${payload.orderId} failed`, type: 'payment', metadata: { orderId: payload.orderId } });
  } catch (e) { console.warn('PAYMENT_FAILED handler error', e?.message || e); }
});

bus.on('ADMIN_BROADCAST', async (payload) => {
  try {
    // payload: { target, title, message, metadata }
    const targets = await notificationService.resolveTargetUsers(payload.target);
    for (const uid of targets) {
      await notificationService.createNotification({ userId: uid, title: payload.title, message: payload.message, type: 'admin', metadata: payload.metadata || {} });
    }
  } catch (e) { console.warn('ADMIN_BROADCAST handler error', e?.message || e); }
});

export default bus;
