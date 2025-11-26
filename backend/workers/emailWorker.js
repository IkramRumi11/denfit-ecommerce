#!/usr/bin/env node
import { Worker } from 'bullmq';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || 'redis://127.0.0.1:6379';
const connection = { connection: REDIS_URL };

// Ensure mongoose connects (worker may need DB access to fetch order/user details)
const MONGO_URL = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/denfit';

(async () => {
  try {
    await mongoose.connect(MONGO_URL, { });
    console.log('Email worker connected to MongoDB');
  } catch (err) {
    console.error('Email worker failed to connect to MongoDB:', err?.message || err);
  }

  const worker = new Worker('emails', async (job) => {
    try {
      const { name, data } = job;
      console.log(`Processing email job: ${job.name}`, data && { ...data, _small: true });

      // Lazy import EmailService and models so startup is fast
      const EmailService = (await import('../services/emailService.js')).default;
      const User = (await import('../models/User.js')).default;
      const Order = (await import('../models/Order.js')).default;

      switch (job.name) {
        case 'sendWelcomeEmail': {
          const { userId, verificationUrl } = job.data;
          const user = userId ? await User.findById(userId) : job.data.user;
          if (!user) throw new Error('User not found for welcome email');
          return EmailService.sendWelcomeEmail(user, verificationUrl);
        }

        case 'sendWelcomeVerifiedEmail': {
          const { userId } = job.data;
          const user = userId ? await User.findById(userId) : job.data.user;
          if (!user) throw new Error('User not found');
          return EmailService.sendWelcomeVerifiedEmail(user);
        }

        case 'sendPasswordResetEmail': {
          const { userId, resetUrl } = job.data;
          const user = userId ? await User.findById(userId) : job.data.user;
          if (!user) throw new Error('User not found for password reset');
          return EmailService.sendPasswordResetEmail(user, resetUrl);
        }

        case 'sendLoginNotification': {
          const { userId, meta } = job.data;
          const user = userId ? await User.findById(userId) : job.data.user;
          if (!user) throw new Error('User not found for login notification');
          return EmailService.sendLoginNotification(user, meta);
        }

        case 'sendOrderStatusChange': {
          const { orderId, actorId, meta } = job.data;
          const order = orderId ? await Order.findById(orderId).populate('customer', 'name email') : job.data.order;
          if (!order) throw new Error('Order not found for status change email');
          const customer = order.customer;
          return EmailService.sendOrderStatusChange(customer, order, meta);
        }

        case 'sendShippingConfirmation': {
          const { orderId } = job.data;
          const order = orderId ? await Order.findById(orderId).populate('customer', 'name email') : job.data.order;
          if (!order) throw new Error('Order not found for shipping email');
          const customer = order.customer;
          return EmailService.sendShippingConfirmation(customer, order);
        }

        default:
          throw new Error(`Unknown email job name: ${job.name}`);
      }
    } catch (err) {
      console.error('Email worker job failed:', err?.message || err);
      throw err; // let BullMQ handle retries/backoff
    }
  }, connection);

  worker.on('completed', (job) => {
    console.log(`Email job completed: ${job.id} (${job.name})`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Email job failed: ${job?.id} (${job?.name})`, err?.message || err);
  });

  console.log('Email worker started (listening for jobs)');
})();
