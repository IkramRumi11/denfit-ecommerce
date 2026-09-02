import { Queue } from 'bullmq';
import crypto from 'crypto';

import { connection } from '../config/redis.js';

const emailQueueConnection = {
  ...connection,
  maxRetriesPerRequest: null,
};

// Create a named queue for emails using centralized Redis config
const emailQueue = new Queue('emails', { connection: emailQueueConnection });

export const addEmailJob = async (name, data) => {
  try {
    // Ensure meta exists and add a correlationId if one isn't present
    data = data || {};
    data.meta = data.meta || {};
    if (!data.meta.correlationId) {
      data.meta.correlationId = crypto.randomUUID();
    }
    // Also attach an automatically computed 'source' if none present
    data.meta.source = data.meta.source || `queue:${name}`;
    // default options: 3 attempts, exponential backoff
    return await emailQueue.add(name, data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000
      }
    });
  } catch (err) {
    console.error('Failed to enqueue email job:', err?.message || err);
    throw err;
  }
};

export default emailQueue;
