import mongoose from 'mongoose';
import { createClient } from 'redis';

import { redisUrl } from '../config/redis.js';

export const checkHealth = async (req, res) => {
  const out = { time: new Date().toISOString(), environment: process.env.NODE_ENV || 'development' };
  try {
    out.mongodb = { state: mongoose.connection.readyState };
  } catch (e) {
    out.mongodb = { error: String(e?.message || e) };
  }

  try {
    console.log('[DEBUG] debugController using redisUrl:', redisUrl);
    const client = createClient({ url: redisUrl });
    await client.connect();
    try {
      const pong = await client.ping();
      out.redis = { reachable: true, pong };
    } catch (e) {
      out.redis = { reachable: false, error: String(e?.message || e) };
    }
    try { await client.disconnect(); } catch (e) {}
  } catch (e) {
    out.redis = { error: String(e?.message || e) };
  }

  // include user info when present
  if (req.user) out.user = { id: req.user._id, email: req.user.email, role: req.user.role };

  res.status(200).json({ success: true, data: out });
};

export default { checkHealth };
