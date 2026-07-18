//backend/src/config/security.js
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { xss } from 'express-xss-sanitizer';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

// Rate limiters — tuned for SPA usage patterns
// Industry references: Stripe (100/sec), Shopify (2/sec burst), GitHub (5000/hr)
// A single page load in this SPA generates 5-10 API calls, so the limit must
// accommodate rapid navigation without blocking legitimate users.

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 15 : 1000, // 1000 auth attempts in dev/test, 15 in prod
  // Skip the global auth limiter for the resend-verification endpoint so
  // the controller-level per-user cooldown (and Retry-After) can be authoritative.
  skip: (req) => {
    try {
      const p = (req && (req.originalUrl || req.url || req.path) || '').toLowerCase();
      return p.includes('/resend-verification') || p.includes('/refresh-token');
    } catch (e) { return false; }
  },
  // Use a custom handler so clients receive structured JSON and a Retry-After header
  handler: (req, res) => {
    let retryAfterSec = Math.ceil(15 * 60);
    try {
      if (req && req.rateLimit && req.rateLimit.resetTime) {
        const delta = req.rateLimit.resetTime - Date.now();
        if (delta > 0) retryAfterSec = Math.ceil(delta / 1000);
      }
      res.setHeader('Retry-After', String(retryAfterSec));
    } catch (e) {}
    return res.status(429).json({ success: false, message: 'Too many authentication attempts, please try again later.', retryAfter: retryAfterSec });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window (industry standard for SPAs)
  max: process.env.NODE_ENV === 'production' ? 120 : 1000, // Higher limit in development to avoid blocking local SPA navigation
  // Skip rate limiting for authenticated users hitting non-sensitive endpoints.
  // Per-user abuse should be handled at the application layer, not IP-level.
  skip: (req) => {
    try {
      // Health checks and XSRF token fetches should never be rate limited
      const p = (req && (req.originalUrl || req.url || req.path) || '').toLowerCase();
      return p.includes('/health') || p.includes('/csrf');
    } catch (e) { return false; }
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again shortly.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
});

export const securityMiddleware = (app) => {
  // NOTE: helmet and mongoSanitize are already applied directly in server.js.
  // This function adds the remaining security layers.

  // Data sanitization against XSS
  app.use(xss());

  // Prevent parameter pollution
  app.use(hpp({
    whitelist: [
      'price',
      'rating',
      'category',
      'brand',
      'limit',
      'page'
    ]
  }));

  // Apply global rate limiting to all API routes
  // (auth-specific limiter is applied directly in routes/auth.js)
  app.use('/api/v1/', apiLimiter);
};