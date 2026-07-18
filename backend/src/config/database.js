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

    // CRITICAL: MongoMemoryServer should ONLY run in local Windows/macOS development
    // NOT in Docker. In Docker, MongoDB is available as a service.
    //
    // Why this matters:
    // - MongoMemoryServer tries to download a MongoDB binary for the current OS/platform
    // - On Alpine Linux (used in docker containers), no official MongoDB binary exists
    // - This causes HTTP 403 errors and startup failures
    // 
    // Detect if running in Docker:
    // - If running on Linux (except WSL) AND not explicitly in local dev mode
    // - If any of these are true, assume we're in a container
    const isLikelyDocker = 
      (!process.platform.includes('win') && 
       !process.platform.includes('darwin')) ||
      process.env.DOCKER === 'true';
    
    const allowInMemoryDB = 
      process.env.NODE_ENV !== 'production' && 
      !isLikelyDocker;

    if (allowInMemoryDB) {
      try {
        logger.warn('⚠️ Attempting to start in-memory MongoDB for development...');
        const { MongoMemoryServer } = await import('mongodb-memory-server');
        const mongod = await MongoMemoryServer.create();

        // Persist reference so we can stop it on process exit if needed
        global.__MONGOD__ = mongod;
        global.__IN_MEMORY_MONGO__ = true;
        process.env.MONGODB_URI = mongod.getUri();

        const conn = await mongoose.connect(mongod.getUri(), {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });

        logger.success(`✅ In-memory MongoDB started: ${conn.connection.host}`);
        await initializeDatabase();
        return conn;
      } catch (memErr) {
        logger.error('❌ In-memory MongoDB fallback failed:', memErr);
      }
    } else {
      // Provide helpful error message based on context
      if (isLikelyDocker) {
        logger.error(
          '❌ MongoDB connection failed in Docker environment.\n' +
          '   MongoMemoryServer fallback is DISABLED in Docker to prevent Alpine Linux compatibility errors.\n' +
          '   Verify:\n' +
          `   1. mongo service is running: docker compose ps\n` +
          `   2. MONGODB_URI is set: ${process.env.MONGODB_URI}\n` +
          `   3. Network connectivity: docker compose logs mongo | head -20\n` +
          `   4. docker-compose.override.yml uses mapping syntax (key: value), not list syntax`
        );
      } else {
        logger.error(
          '❌ MongoDB connection failed in local development.\n' +
          '   Ensure:\n' +
          '   1. MongoDB is running locally\n' +
          `   2. MONGODB_URI environment variable is set: ${process.env.MONGODB_URI}\n` +
          '   3. Check backend/.env file for correct MongoDB connection string'
        );
      }
    }

    process.exit(1);
  }
};

/**
 * Initialize base data for the database.
 * For example: create a default admin if not exists.
 */
const initializeDatabase = async () => {
  try {
    logger.info('✅ Database initialization complete. Create an admin user with the seed-admin script when needed.');
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
