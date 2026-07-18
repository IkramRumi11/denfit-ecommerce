import crypto from 'crypto';

export function newCorrelationId(prefix = 'cid') {
  return `${prefix}-${crypto.randomUUID()}`;
}

export default { newCorrelationId };
