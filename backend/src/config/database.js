// src/config/database.js
import mongoose from 'mongoose';

import { logger } from '../utils/logger.js';

/**
 * Connect to MongoDB and initialize the database.
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.success(`✅ MongoDB connected: ${conn.connection.host}`);
    await initializeDatabase();
    return conn;
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

/**
 * Initialize base data for the database.
 * For example: create a default admin if not exists.
 */
const initializeDatabase = async () => {
  try {
    // FIXED import path (goes two levels up from src/config to models)
    const { default: User } = await import('../../models/User.js');

    // Check for existing admin user
    const adminExists = await User.findOne({ role: 'admin' });

    // Only create a default admin in non-production/dev environments when
    // explicitly allowed via ALLOW_DEV_BACKDOORS=true. This prevents accidental
    // creation of a privileged account in production environments.
    const allowDevBackdoors = String(process.env.ALLOW_DEV_BACKDOORS).toLowerCase() === 'true';

    if (!adminExists) {
      if (allowDevBackdoors) {
        await User.create({
          name: 'System Administrator',
          email: 'denfitdatabase@gmail.com',
          password: 'Admin123!',
          role: 'admin',
          emailVerified: true,
        });
        logger.info('🧩 Default admin user created successfully (dev backdoor)');
      } else {
        logger.warn('⚠️ No admin user found. Skipping default admin creation because ALLOW_DEV_BACKDOORS!=true');
      }
    }

    logger.success('✅ Database initialization complete');
  } catch (error) {
    logger.error('⚠️ Database initialization error:', error);
  }
};

/**
 * Mongoose event listeners for better visibility.
 */
mongoose.connection.on('connected', () => {
  logger.info('📡 Mongoose connected to database');
});

mongoose.connection.on('error', (err) => {
  logger.error('💥 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ Mongoose disconnected from database');
});
