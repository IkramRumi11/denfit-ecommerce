import dotenv from 'dotenv';
import { URL } from 'url';
import fs from 'fs';

// Load .env only if variables are not already set (e.g., by Docker environment)
// This prevents .env from overriding Docker-provided variables.
dotenv.config({ override: false });

const getEnvValue = (name) => {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const resolveRedisUrl = () => {
  const redisUrl = getEnvValue('REDIS_URL');
  if (redisUrl) return redisUrl;

  const redis = getEnvValue('REDIS');
  if (redis) return redis;

  const redisHost = getEnvValue('REDIS_HOST');
  if (redisHost) return `redis://${redisHost}:6379`;

  // Detect running in Docker container via explicit env or presence of /.dockerenv
  const isDockerEnv = String(getEnvValue('DOCKER') || getEnvValue('IS_DOCKER') || '').toLowerCase() === 'true' || fs.existsSync('/.dockerenv');
  if (isDockerEnv) {
    return 'redis://redis:6379';
  }

  // Default fallback for local development and Docker compose.
  return 'redis://redis:6379';
};

// Centralized Redis configuration for queues/workers.
// In Docker Compose, the Redis service name is `redis`.
// Explicit REDIS_URL takes precedence in all environments.
const REDIS_URL = resolveRedisUrl();
console.log('[SENTINEL] backend redis config initializing');
console.log('[DEBUG] backend process:', {
  cwd: process.cwd(),
  nodeEnv: process.env.NODE_ENV,
  REDIS_URL: process.env.REDIS_URL,
  REDIS: process.env.REDIS,
  REDIS_HOST: process.env.REDIS_HOST,
  DOCKER: process.env.DOCKER,
  IS_DOCKER: process.env.IS_DOCKER,
});
console.log('[DEBUG] backend resolved REDIS_URL:', REDIS_URL);

const buildConnectionOptions = () => {
  try {
    const parsed = new URL(REDIS_URL);
    if (String(getEnvValue('DOCKER') || getEnvValue('IS_DOCKER') || '').toLowerCase() === 'true' || fs.existsSync('/.dockerenv')) {
      const forbiddenHosts = ['localhost', '127.0.0.1', '::1', '0.0.0.0'];
      if (forbiddenHosts.includes(parsed.hostname)) {
        throw new Error(
          `Detected Docker runtime with REDIS_URL host=${parsed.hostname}. ` +
          'In Docker Compose the Redis service must be reached via the service name `redis`, not localhost.'
        );
      }
    }

    const options = {
      url: REDIS_URL,
      host: parsed.hostname,
      port: Number(parsed.port || 6379),
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    };

    if (parsed.username) {
      options.username = decodeURIComponent(parsed.username);
    }

    if (parsed.password) {
      options.password = decodeURIComponent(parsed.password);
    }

    if (parsed.pathname && parsed.pathname !== '/') {
      const db = Number(parsed.pathname.slice(1));
      if (!Number.isNaN(db)) options.db = db;
    }

    if (parsed.protocol === 'rediss:') {
      options.tls = {};
    }

    console.log('[DEBUG] backend Redis connection options:', {
      url: options.url,
      host: options.host,
      port: options.port,
      db: options.db,
      tls: Boolean(options.tls),
    });

    return options;
  } catch (err) {
    console.warn('[REDIS] Failed to parse REDIS_URL, falling back to redis host:', err?.message || err);
    return {
      url: 'redis://redis:6379',
      host: 'redis',
      port: 6379,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
    };
  }
};

export const redisUrl = REDIS_URL;
export const connection = buildConnectionOptions();

export default { redisUrl, connection };
