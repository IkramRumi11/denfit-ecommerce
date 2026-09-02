import { createClient } from 'redis';

import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { addNotificationJob } from '../queues/notificationQueue.js';
import { redisUrl } from '../config/redis.js';

let redisClient;
const tryInitRedis = async () => {
  if (redisClient) return redisClient;
  try {
    console.log('[DEBUG] notification.service process.env.REDIS_URL:', process.env.REDIS_URL);
    console.log('[DEBUG] notification.service using redisUrl:', redisUrl);
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (e) => console.warn('notification.service redis error', e?.message || e));
    await redisClient.connect();
    console.log('[DEBUG] notification.service redis client connected');
    return redisClient;
  } catch (e) {
    console.warn('Redis unavailable for notification service:', e?.message || e);
    redisClient = null;
    return null;
  }
};

// Keep a simple in-memory map of userId -> socket ids for single-instance fallback
export const onlineSockets = new Map();
// Map of socketId -> lastSeen timestamp (ms since epoch). Used by pruner to remove stale sockets
export const onlineSocketsTimestamps = new Map();

// Prune settings (defaults)
const SOCKET_TTL_MS = parseInt(process.env.ONLINE_SOCKETS_TTL_MS, 10) || (30 * 60 * 1000); // 30 minutes
const PRUNE_INTERVAL_MS = parseInt(process.env.ONLINE_SOCKETS_PRUNE_MS, 10) || (5 * 60 * 1000); // 5 minutes

let _prunerStarted = false;
const startOnlineSocketsPruner = () => {
  if (_prunerStarted) return;
  _prunerStarted = true;

  setInterval(() => {
    try {
      const now = Date.now();
      // For each user, filter out socket ids that are stale according to timestamps
      for (const [userId, arr] of Array.from(onlineSockets.entries())) {
        const filtered = arr.filter((sid) => {
          const last = onlineSocketsTimestamps.get(sid) || 0;
          // keep if seen recently
          return now - last <= SOCKET_TTL_MS;
        });

        if (filtered.length > 0) {
          onlineSockets.set(userId, filtered);
        } else {
          onlineSockets.delete(userId);
        }
      }

      // Also cleanup stale entries in the timestamps map that no longer belong to any user
      for (const [sid, ts] of Array.from(onlineSocketsTimestamps.entries())) {
        if (now - ts > SOCKET_TTL_MS) {
          onlineSocketsTimestamps.delete(sid);
        }
      }
    } catch (e) {
      console.warn('[notification.service] onlineSockets pruner error', e?.message || e);
    }
  }, PRUNE_INTERVAL_MS);
};

// start pruner automatically so servers clean up stale state even if callers forget
try { startOnlineSocketsPruner(); } catch (e) { console.warn('[notification.service] failed to start pruner', e); }

export const createNotification = async ({ userId, title, message, type = 'system', metadata = {}, deliveryChannels = ['in-app'], scheduledAt = null }) => {
  // Basic validation / sanitization to avoid unrealistic notifications
  try {
    // If metadata references a product id and the message contains a placeholder, resolve product name
    if (metadata && metadata.productId) {
      try {
        const prod = await (await import('../models/Product.js')).default.findById(metadata.productId).select('name').lean();
        if (prod && prod.name) {
          // Replace common placeholder tokens in message
          message = String(message || '').replace(/\{\s*productName\s*\}|\{\s*name\s*\}/gi, prod.name);
        } else {
          // If productId invalid, remove placeholder tokens to avoid implying a product that doesn't exist
          message = String(message || '').replace(/\{\s*productName\s*\}|\{\s*name\s*\}/gi, 'the product');
        }
      } catch (e) {
        // ignore product lookup errors
      }
    }
  } catch (e) {
    // defensive: fallthrough
  }

  // Deduplicate: avoid creating many identical notifications in short time window
  try {
    const recent = await Notification.findOne({ userId, title: String(title || ''), message: String(message || '') }).sort({ createdAt: -1 }).lean();
    if (recent) {
      const ageMs = Date.now() - new Date(recent.createdAt).getTime();
      const DEDUPE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
      if (ageMs < DEDUPE_WINDOW_MS) {
        // Return existing doc without creating a duplicate
        return recent;
      }
    }
  } catch (e) {
    // ignore dedupe errors
  }

  // Persist notification
  const doc = await Notification.create({ userId, title, message, type, metadata, deliveryChannels, scheduledAt });
  console.info('[notification.service] created notification', String(doc._id), 'for user', String(userId), 'type=', type);

  // Update unread count cache
  try {
    const client = await tryInitRedis();
    if (client && userId) {
      const key = `user:${String(userId)}:unread_count`;
      await client.incr(key);
      // set a TTL for cache key to avoid indefinite growth
      await client.expire(key, 60 * 60 * 24);
    }
  } catch (e) {
    // ignore cache errors
  }

  // Enqueue delivery work (worker will emit sockets and process channels)
  try {
    await addNotificationJob('deliver', { notificationId: doc._id.toString() });
    console.info('[notification.service] enqueued deliver job for', String(doc._id));
  } catch (e) {
    console.warn('Failed to enqueue notification delivery job, falling back to immediate emit', e?.message || e);
    // Best-effort fallback: attempt to emit to the user's sockets directly so notifications
    // are still delivered even when the queue/Redis is unavailable. This is non-blocking
    // and will not mark the notification as delivered in the DB if the emit fails.
    try {
      const { emitToUser } = await import('../sockets/index.js');
      try {
        emitToUser(String(userId), 'notification', doc);
        // best-effort: mark delivered flag
        try { await Notification.findByIdAndUpdate(doc._id, { isDelivered: true }); } catch (inner) {}
        console.info('[notification.service] fallback emit success for', String(doc._id));
      } catch (emitErr) {
        console.warn('[notification.service] fallback emit failed', emitErr?.message || emitErr);
      }
    } catch (importErr) {
      console.warn('[notification.service] fallback emit failed to import sockets module', importErr?.message || importErr);
    }
  }

  return doc;
};

export const resolveTargetUsers = async (target) => {
  // target can be: { userId }, { userIds: [] }, { group: 'premium' }, { all: true }
  if (!target) return [];
  if (target.userId) return [String(target.userId)];
  if (Array.isArray(target.userIds)) return target.userIds.map(String);
  if (target.all) {
    // stream users - for safety limit in admin, but here return ids of all active users
    const users = await User.find({ active: true }).select('_id').lean();
    return users.map((u) => String(u._id));
  }
  if (target.group) {
    // group can be role or custom tag stored on User; support role for now
    const users = await User.find({ role: target.group }).select('_id').lean();
    return users.map((u) => String(u._id));
  }
  return [];
};

export const getNotificationsForUser = async (userId, { page = 1, limit = 20 } = {}) => {
  const skip = (page - 1) * limit;
  const query = { userId, softDeleted: false };
  const [items, total] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
    Notification.countDocuments(query)
  ]);
  return { items, total };
};

export const markAsRead = async (userId, notificationId) => {
  const n = await Notification.findOneAndUpdate({ _id: notificationId, userId }, { isRead: true }, { new: true });
  if (n) {
    try {
      const client = await tryInitRedis();
      if (client) {
        const key = `user:${String(userId)}:unread_count`;
        // decrement but never negative
        const val = await client.decr(key);
        if (val < 0) await client.set(key, '0');
      }
    } catch (e) {}
  }
  return n;
};

export const markAllRead = async (userId) => {
  const res = await Notification.updateMany({ userId, isRead: false }, { isRead: true });
  try {
    const client = await tryInitRedis();
    if (client) {
      const key = `user:${String(userId)}:unread_count`;
      await client.set(key, '0');
    }
  } catch (e) {}
  return res;
};

export default {
  createNotification,
  resolveTargetUsers,
  getNotificationsForUser,
  markAsRead,
  markAllRead,
  onlineSockets,
  onlineSocketsTimestamps
};
