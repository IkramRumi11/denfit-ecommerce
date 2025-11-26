//backend/src/config/security.js
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

// Rate limiters
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  // Skip the global auth limiter for the resend-verification endpoint so
  // the controller-level per-user cooldown (and Retry-After) can be authoritative.
  // This keeps the global IP-based rate limit for other auth endpoints while
  // allowing precise per-email cooldown UX for resend flows.
  skip: (req) => {
    try {
      const p = (req && (req.originalUrl || req.url || req.path) || '').toLowerCase();
      return p.includes('/resend-verification');
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
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const securityMiddleware = (app) => {
  // Set security HTTP headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  }));

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

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

  // Apply rate limiting to API routes
  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1/', apiLimiter);
};