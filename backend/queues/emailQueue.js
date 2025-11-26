import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || process.env.REDIS || 'redis://127.0.0.1:6379';

const connection = { connection: REDIS_URL };

// Create a named queue for emails
const emailQueue = new Queue('emails', connection);

export const addEmailJob = async (name, data) => {
  try {
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
