import { createClient } from 'redis';

import { redisUrl } from '../config/redis.js';

console.log('[DEBUG] featureFlagCache using redisUrl:', redisUrl);
const client = createClient({ url: redisUrl });
client.on('error', (err) => console.error('Redis client error', err));
let _connected = false;
const connect = async () => {
  if (_connected) return;
  try {
    await client.connect();
    _connected = true;
  } catch (e) {
    console.warn('Failed to connect redis client for featureFlagCache:', e?.message || e);
  }
};

const ALL_FLAGS_KEY = 'featureflags:all';

export const getAllFlagsCache = async () => {
  try {
    await connect();
    const raw = await client.get(ALL_FLAGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('getAllFlagsCache error', e?.message || e);
    return null;
  }
};

export const setAllFlagsCache = async (flags, ttlSeconds = 60) => {
  try {
    await connect();
    if (!flags) return;
    await client.set(ALL_FLAGS_KEY, JSON.stringify(flags), { EX: ttlSeconds });
  } catch (e) {
    console.warn('setAllFlagsCache error', e?.message || e);
  }
};

export const clearAllFlagsCache = async () => {
  try {
    await connect();
    await client.del(ALL_FLAGS_KEY);
  } catch (e) {
    console.warn('clearAllFlagsCache error', e?.message || e);
  }
};

export default { getAllFlagsCache, setAllFlagsCache, clearAllFlagsCache };
