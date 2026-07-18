// backend/server.js
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import https from "https";

import csrfProtection from "./middleware/csrf.js";
import validateRequiredEnv from "./src/config/validateEnv.js";
import { securityMiddleware } from "./src/config/security.js";

// ✅ Config and routes
import { connectDB } from "./src/config/database.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import ordersRoutes from "./routes/orders.js";
import adminRoutes from "./routes/admin.js";
import reviewsRoutes from "./routes/reviews.js";
import featuresRoutes from './routes/features.js';
import styleByYouRoutes from './routes/styleByYou.js';
import debugRoutes from './routes/debug.js';
import filtersRoutes from './routes/filters.js';
import productTemplatesRoutes from './routes/productTemplates.js';
import newsletterRoutes from './routes/newsletter.js';
import wishlistRoutes from './routes/wishlist.js';
import cartRoutes from './routes/cart.js';
import notificationRoutes from './routes/notification.routes.js';
import adminNotificationRoutes from './routes/admin.notification.routes.js';
import { initSockets } from './sockets/index.js';
import notificationJob from './jobs/notification.job.js';
import { startReservationSweeper } from './jobs/reservationSweeper.job.js';
import paymentsRoutes from './routes/payments.js';
import errorHandler, { notFound } from "./middleware/errorHandler.js";

dotenv.config();

// In production, validate essential environment variables to avoid insecure startup.
if (process.env.NODE_ENV === 'production') {
  // List of env vars that MUST be set in production
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'MONGODB_URI',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'CLOUDINARY_API_SECRET'
  ];
  validateRequiredEnv(required, { fatal: true });
}

// Safety: never allow developer backdoors to remain enabled in production
if (process.env.NODE_ENV === 'production' && String(process.env.ALLOW_DEV_BACKDOORS).toLowerCase() === 'true') {
  console.error('FATAL: ALLOW_DEV_BACKDOORS must NOT be true in production. Exiting to avoid security risk.');
  process.exit(1);
}

// ==============================
// 🔧 Setup & Constants
// ==============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
console.log('SERVER STARTED FROM:', __filename);
const PORT = process.env.PORT || 3002;

const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:3000',
  'https://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const isLocalhostOrigin = (origin) =>
  /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(origin);

const FRONTEND_ORIGINS = Array.from(
  new Set([
    ...DEFAULT_FRONTEND_ORIGINS,
    ...(process.env.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ])
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests like curl or server-to-server
    if (isLocalhostOrigin(origin)) return callback(null, true);
    if (FRONTEND_ORIGINS.includes(origin)) return callback(null, true);
    console.warn('[CORS] Rejected origin:', origin);
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-xsrf-token'],
  exposedHeaders: ['Retry-After', 'X-Verification-Resend-Remaining'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

// ==============================
// 🚀 Express App Init
// ==============================
const app = express();

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Debugging: capture uncaught exceptions and unhandled rejections to avoid silent exits
process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err && err.stack ? err.stack : err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('unhandledRejection at:', promise, 'reason:', reason);
});

process.on('exit', (code) => {
  console.error('process exiting with code', code);
});
process.on('SIGINT', () => {
  console.warn('SIGINT received, shutting down');
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.warn('SIGTERM received, shutting down');
  process.exit(0);
});

// ==============================
// 🧱 Global Middleware
// ==============================
// Configure helmet but allow cross-origin resource policy for uploads/images
app.use(
  helmet({
    // Allow cross-origin loading of static assets like images from the API server
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(compression());

// Parse request bodies and cookies first so downstream sanitizers can access them
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply NoSQL query injection sanitization on parsed payloads
app.use(mongoSanitize());

// Apply full security middleware: XSS sanitization, HPP protection, and global rate limiting
securityMiddleware(app);

// ✅ CSRF protection (double-submit cookie pattern)
// Apply CSRF protection to normal routes but skip socket.io endpoints which
// perform long-polling POSTs that should not be processed by CSRF middleware.
app.use((req, res, next) => {
  try {
    if (req.path && req.path.startsWith('/socket.io')) return next();
    return csrfProtection(req, res, next);
  } catch (e) {
    return csrfProtection(req, res, next);
  }
});

// ==============================
// 🌐 Base Routes
// ==============================
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "DENFiT E-commerce Backend API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

// Health check (also triggers CSRF token cookie)
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "DENFiT API Server is running ✅",
    uptime: process.uptime(),
  });
});

// ==============================
// 📦 API Routes
// ==============================
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/orders", ordersRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use('/api/v1/reviews', reviewsRoutes);
app.use('/api/v1/features', featuresRoutes);
app.use('/api/v1/style-by-you', styleByYouRoutes);
// Dev-only debug routes — only mount in non-production to prevent accidental exposure
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/v1/debug', debugRoutes);
}
// Filters routes (public + admin)
app.use('/api/v1/filters', filtersRoutes);
app.use('/api/v1/product-templates', productTemplatesRoutes);
app.use('/api/v1/newsletter', newsletterRoutes);
app.use('/api/v1/wishlist', wishlistRoutes);
app.use('/api/v1/cart', cartRoutes);
// Notification APIs
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/admin/notifications', adminNotificationRoutes);
app.use('/api/v1/payments', paymentsRoutes);

// Lightweight collections endpoint to satisfy frontend calls that expect /api/v1/collections
// Returns an empty list by default; replace with real implementation when collection data exists.
app.get('/api/v1/collections', (req, res) => {
  res.status(200).json({ success: true, data: { collections: [] } });
});

// ==============================
// 🗂️ Static Files (uploads)
// Ensure this is registered before the notFound/error handlers so static assets are served
// even for routes that don't match API endpoints.
const uploadsPath = path.join(__dirname, "uploads");
// Ensure uploads directory exists and always register static handler so
// files created after startup are still served without requiring a restart.
if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log(`Created uploads directory at ${uploadsPath}`);
  } catch (e) {
    console.error('Failed to create uploads directory:', e);
  }
}
app.use("/uploads", express.static(uploadsPath));

// ==============================
// ⚠️ Error Handling
// ==============================
app.use(notFound);
app.use(errorHandler);

// (static uploads moved earlier in the file)

// ==============================
// verify Puppeteer/Chromium accessibility on startup
const verifyPuppeteer = async () => {
  try {
    const puppeteer = await import('puppeteer');
    const launchOptions = {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    };
    const browser = await puppeteer.launch(launchOptions);
    const version = await browser.version();
    console.log(`✅ Puppeteer: launched successfully (Chromium version: ${version})`);
    await browser.close();
  } catch (err) {
    console.error('❌ Puppeteer: startup check failed:', err.message || err);
  }
};

// 🏁 Start Server
// ==============================
const startServer = async () => {
  try {
    await connectDB();
    verifyPuppeteer(); // run check in background

    const sslKey = process.env.SSL_KEY_PATH;
    const sslCert = process.env.SSL_CERT_PATH;

    if (
      sslKey &&
      sslCert &&
      fs.existsSync(sslKey) &&
      fs.existsSync(sslCert)
    ) {
      const key = fs.readFileSync(sslKey);
      const cert = fs.readFileSync(sslCert);
        const server = https.createServer({ key, cert }, app).listen(PORT, "0.0.0.0", () => {
          console.log(`✅ HTTPS: https://localhost:${PORT}`);
          console.log(
            `🧠 Environment: ${process.env.NODE_ENV || "development"}`
          );
          // initialize sockets bound to this server
          try { initSockets(server); } catch (e) { console.warn('Failed to init sockets', e?.message || e); }
        });
    } else {
        const server = app.listen(PORT, "0.0.0.0", () => {
          console.log(`✅ HTTP: http://localhost:${PORT}`);
          console.log(
            `🧠 Environment: ${process.env.NODE_ENV || "development"}`
          );
          if (sslKey || sslCert)
            console.warn("⚠️ SSL files configured but not found on disk");
          // initialize sockets now that server exists
          try { initSockets(server); } catch (e) { console.warn('Failed to init sockets', e?.message || e); }
          // start background job worker
          try { notificationJob; } catch (e) { console.warn('Failed to start notification job', e?.message || e); }
          // Start reservation sweeper (if configured and replica-set available)
          try { startReservationSweeper().catch(e => console.warn('Failed to start reservation sweeper', e?.message || e)); } catch (e) { console.warn('Failed to init reservation sweeper', e?.message || e); }
        });
      server.on('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${PORT} is already in use. Use a different port by setting PORT in .env or stop the process using that port.`);
          try {
            // Show any extra hint, attempt to hint on Windows
            if (process.platform === 'win32') {
              console.error(`Tip: run 'Get-NetTCPConnection -LocalPort ${PORT} | Format-Table -AutoSize -Property LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess' to find the PID`);
            } else {
              console.error(`Tip: run 'lsof -i :${PORT}' or 'ss -ltnp | grep ${PORT}' to find the PID`);
            }
          } catch (e) {}
          process.exit(1);
        } else {
          console.error('Server error:', err);
          process.exit(1);
        }
      });
    }
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
