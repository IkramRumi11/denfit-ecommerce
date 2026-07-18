import EventEmitter from 'events';
import { createClient } from 'redis';
import { redisUrl } from '../config/redis.js';

const emitter = new EventEmitter();

// Try to create a Redis publisher for multi-instance notifications if Redis available
let pub = null;
const tryConnectRedis = async () => {
  if (pub) return pub;
  try {
    console.log('[DEBUG] systemSettingsService process.env.REDIS_URL:', process.env.REDIS_URL);
    console.log('[DEBUG] systemSettingsService using redisUrl:', redisUrl);
    pub = createClient({ url: redisUrl });
    pub.on('error', (e) => console.warn('systemSettingsService redis error', e?.message || e));
    await pub.connect();
    console.log('[DEBUG] systemSettingsService redis publisher connected');
    return pub;
  } catch (e) {
    pub = null;
    return null;
  }
};

export const notifyChange = async (payload) => {
  try {
    // emit locally
    emitter.emit('change', payload);
    // publish to redis channel so other instances can pick up
    const client = await tryConnectRedis();
    if (client) {
      try {
        await client.publish('system:settings', JSON.stringify(payload));
      } catch (e) { /* ignore */ }
    }
  } catch (e) {
    console.warn('notifyChange failed', e?.message || e);
  }
};

export const onChange = (fn) => emitter.on('change', fn);
export const offChange = (fn) => emitter.off('change', fn);

// If Redis is available, subscribe and re-emit messages from other instances
(async () => {
  try {
    console.log('[DEBUG] systemSettingsService creating sub client with redisUrl:', redisUrl);
    const sub = createClient({ url: redisUrl });
    sub.on('error', () => {});
    await sub.connect();
    await sub.subscribe('system:settings', (message) => {
      try {
        const payload = JSON.parse(message);
        emitter.emit('change', payload);
      } catch (e) {}
    });
  } catch (e) {
    // Not fatal — just no cross-instance propagation
  }
})();

export default { notifyChange, onChange, offChange };
