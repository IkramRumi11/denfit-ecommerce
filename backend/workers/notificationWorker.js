#!/usr/bin/env node
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import Notification from '../models/Notification.js';
import notificationService from '../services/notification.service.js';
import { emitToUser } from '../sockets/index.js';
import { redisUrl, connection as redisConnectionOptions } from '../config/redis.js';

// Load .env only if variables are not already set (e.g., by Docker environment)
dotenv.config({ override: false });

console.log('[SENTINEL] notificationWorker running updated code');
console.log('[DEBUG] notificationWorker process.cwd():', process.cwd());
console.log('[DEBUG] notificationWorker env REDIS_URL:', process.env.REDIS_URL);
console.log('[DEBUG] notificationWorker using redisUrl:', redisUrl);
console.log('[DEBUG] notificationWorker redisConnectionOptions:', redisConnectionOptions);

dns.promises.lookup('redis').then((result) => {
  console.log('[DEBUG] notificationWorker DNS lookup redis:', result);
}).catch((err) => {
  console.warn('[DEBUG] notificationWorker DNS lookup redis failed:', err?.message || err);
});

const notificationWorkerRedisConnectionOptions = {
  ...redisConnectionOptions,
  maxRetriesPerRequest: null,
};
console.log('[DEBUG] notificationWorker redisConnection options:', notificationWorkerRedisConnectionOptions);

const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL;

if (!MONGO_URL) {
  throw new Error('[NOTIFICATION WORKER ERROR] MONGODB_URI is not set.');
}

(async () => {
  let worker;

  try {
    await mongoose.connect(MONGO_URL, {});
    console.log('Notification worker connected to MongoDB');
  } catch (err) {
    console.error('Notification worker failed to connect to MongoDB:', err?.message || err);
    process.exit(1);
  }

  worker = new Worker('notifications', async (job) => {
    const { name, data } = job;

    if (name === 'deliver') {
      const { notificationId } = data;
      const n = await Notification.findById(notificationId).lean();
      if (!n) {
        console.warn('[notification.job] notification not found', notificationId);
        return;
      }

      if (n.isDelivered) {
        return;
      }

      try {
        emitToUser(n.userId, 'notification', n);
        await Notification.findByIdAndUpdate(n._id, { isDelivered: true });
      } catch (e) {
        console.warn('[notification.job] notification delivery failed', e?.message || e);
        throw e;
      }
    }

    if (name === 'scheduledSend') {
      const targets = await notificationService.resolveTargetUsers(data.target);
      for (const uid of targets) {
        await notificationService.createNotification({
          userId: uid,
          title: data.title,
          message: data.message,
          metadata: data.metadata || {},
        });
      }
    }
  }, { connection: notificationWorkerRedisConnectionOptions });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down notification worker...`);
    try {
      if (worker) await worker.close();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error during notification worker shutdown:', err?.message || err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  console.log('Notification worker started (listening for jobs)');
})();
