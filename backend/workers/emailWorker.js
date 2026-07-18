#!/usr/bin/env node
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import { newCorrelationId } from '../utils/correlation.js';
import { redisUrl, connection as redisConnectionOptions } from '../config/redis.js';

// Load .env only if variables are not already set (e.g., by Docker environment)
dotenv.config({ override: false });

console.log('[SENTINEL] emailWorker running updated code');
console.log('[DEBUG] emailWorker process.cwd():', process.cwd());
console.log('[DEBUG] emailWorker env REDIS_URL:', process.env.REDIS_URL);
console.log('[DEBUG] emailWorker using redisUrl:', redisUrl);
console.log('[DEBUG] emailWorker redisConnectionOptions:', redisConnectionOptions);

dns.promises.lookup('redis').then((result) => {
  console.log('[DEBUG] emailWorker DNS lookup redis:', result);
}).catch((err) => {
  console.warn('[DEBUG] emailWorker DNS lookup redis failed:', err?.message || err);
});

const emailWorkerRedisConnectionOptions = {
  ...redisConnectionOptions,
  maxRetriesPerRequest: null,
};
console.log('[DEBUG] emailWorker redisConnection options:', emailWorkerRedisConnectionOptions);

// Ensure mongoose connects (worker may need DB access to fetch order/user details)
// In Docker: MONGODB_URI is provided by docker-compose.yml environment section
// In local dev: loads from backend/.env file
const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL;

// CRITICAL: Fail fast if MongoDB URL is not configured instead of silently
// falling back to 127.0.0.1 (which would cause ECONNREFUSED in Docker)
if (!MONGO_URL) {
  throw new Error(
    '[EMAIL WORKER ERROR] MONGODB_URI is not set.\n' +
    '  In Docker: Verify docker-compose.yml sets "MONGODB_URI" in email-worker environment section.\n' +
    '             Check that docker-compose.override.yml uses mapping syntax (key: value), not list syntax.\n' +
    '  In local dev: Verify backend/.env has "MONGODB_URI=mongodb://localhost:27017/denfit-ecommerce".\n' +
    '  Current env: MONGODB_URI=' + (process.env.MONGODB_URI || 'undefined') + ', MONGO_URL=' + (process.env.MONGO_URL || 'undefined')
  );
}

(async () => {
  let worker;

  try {
    await mongoose.connect(MONGO_URL, {});
    console.log('Email worker connected to MongoDB');
  } catch (err) {
    console.error('Email worker failed to connect to MongoDB:', err?.message || err);
    process.exit(1);
  }

  worker = new Worker('emails', async (job) => {
    try {
      const { name, data } = job;
      const meta = data.meta || {};
      if (!meta.correlationId) {
        meta.correlationId = job.id ? `job:${job.id}` : newCorrelationId('job');
        data.meta = meta; // persist on job data for callers (best-effort)
      }
      console.log(`Processing email job: ${job.name} id=${job.id} correlation=${meta.correlationId || 'none'} userId=${meta.userId || 'none'} orderId=${meta.orderId || 'none'}`);

      // Lazy import EmailService and models so startup is fast
      const EmailService = (await import('../services/emailService.js')).default;
      const User = (await import('../models/User.js')).default;
      const Order = (await import('../models/Order.js')).default;

      switch (job.name) {
        case 'sendWelcomeEmail': {
          const { userId, verificationUrl } = job.data;
          const user = userId ? await User.findById(userId) : job.data.user;
          if (!user) throw new Error('User not found for welcome email');
          return EmailService.sendWelcomeEmail(user, verificationUrl, { meta: data.meta });
        }

        case 'sendWelcomeVerifiedEmail': {
          const { userId } = job.data;
          const user = userId ? await User.findById(userId) : job.data.user;
          if (!user) throw new Error('User not found');
          return EmailService.sendWelcomeVerifiedEmail(user, { meta: data.meta });
        }

        case 'sendPasswordResetEmail': {
          const { userId, resetUrl } = job.data;
          const user = userId ? await User.findById(userId) : job.data.user;
          if (!user) throw new Error('User not found for password reset');
          return EmailService.sendPasswordResetEmail(user, resetUrl, { meta: data.meta });
        }

        case 'sendLoginNotification': {
          const { userId, meta } = job.data;
          const user = userId ? await User.findById(userId) : job.data.user;
          if (!user) throw new Error('User not found for login notification');
          return EmailService.sendLoginNotification(user, meta, { meta: data.meta });
        }

        case 'sendOrderStatusChange': {
          const { orderId, actorId, meta } = job.data;
          let order = job.data.order;
          if (!order && orderId) {
            order = await Order.findById(orderId).populate('customer', 'name email');
          }
          if (!order) throw new Error('Order not found for status change email');
          let customer = order.customer;
          if (!customer) {
            const email = order.contactEmail || order.shippingAddress?.email || order.guestEmail;
            customer = { name: order.shippingAddress?.name || 'Customer', email };
          }
          return EmailService.sendOrderStatusChange(customer, order, meta, { meta: data.meta });
        }

        case 'sendOrderConfirmation': {
          const { orderId, meta } = job.data;
          let order = job.data.order;
          if (!order && orderId) {
            order = await Order.findById(orderId).populate('customer', 'name email');
          }
          if (!order) throw new Error('Order not found for confirmation email');
          let customer = order.customer;
          if (!customer && order.guestEmail) {
            customer = { name: order.shippingAddress?.name || 'Customer', email: order.guestEmail };
          }
          return EmailService.sendOrderConfirmation(customer, order, { meta: data.meta });
        }

        case 'sendShippingConfirmation': {
          const { orderId } = job.data;
          let order = job.data.order;
          if (!order && orderId) {
            order = await Order.findById(orderId).populate('customer', 'name email');
          }
          if (!order) throw new Error('Order not found for shipping email');
          let customer = order.customer;
          if (!customer && order.guestEmail) {
            customer = { name: order.shippingAddress?.name || 'Customer', email: order.guestEmail };
          }
          return EmailService.sendShippingConfirmation(customer, order, { meta: data.meta });
        }

        default:
          throw new Error(`Unknown email job name: ${job.name}`);
      }
    } catch (err) {
      console.error('Email worker job failed:', err?.message || err);
      throw err; // let BullMQ handle retries/backoff
    }
  }, { connection: emailWorkerRedisConnectionOptions });

  worker.on('completed', (job) => {
    console.log(`Email job completed: ${job.id} (${job.name})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Email job failed: ${job?.id} (${job?.name})`, err?.message || err);
  });

  const shutdown = async (signal) => {
    console.log(`Received ${signal}, shutting down email worker...`);
    try {
      if (worker) await worker.close();
      await mongoose.disconnect();
      process.exit(0);
    } catch (err) {
      console.error('Error during worker shutdown:', err?.message || err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  console.log('Email worker started (listening for jobs)');
})();
