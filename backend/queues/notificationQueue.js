import { Queue } from 'bullmq';
import { connection } from '../config/redis.js';

const notificationQueueConnection = {
  ...connection,
  maxRetriesPerRequest: null,
};

const notificationQueue = new Queue('notifications', { connection: notificationQueueConnection });

export const addNotificationJob = async (name, data, opts = {}) => {
  return notificationQueue.add(name, data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    ...opts,
  });
};

export default notificationQueue;
