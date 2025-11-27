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

// ✅ Config and routes
import { connectDB } from "./src/config/database.js";
import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import adminRoutes from "./routes/admin.js";
import featuresRoutes from './routes/features.js';
import errorHandler, { notFound } from "./middleware/errorHandler.js";

dotenv.config();

// In production, validate essential environment variables to avoid insecure startup.
if (process.env.NODE_ENV === 'production') {
  // List of env vars that MUST be set in production
  const required = [
    'JWT_SECRET',
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
const PORT = process.env.PORT || 3002;

const FRONTEND_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "http://localhost:3000,https://localhost:3000"
)
  .split(",")
  .map((o) => o.trim());

// ==============================
// 🚀 Express App Init
// ==============================
const app = express();

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
app.use(helmet());
app.use(mongoSanitize());
app.use(compression());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (FRONTEND_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error("CORS Not Allowed"), false);
    },
    credentials: true,
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "x-xsrf-token",
    ],
      // Ensure clients (browsers) can read these custom headers when present
      exposedHeaders: ["Retry-After", "X-Verification-Resend-Remaining"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ CSRF protection (double-submit cookie pattern)
app.use(csrfProtection);

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
app.use("/api/v1/admin", adminRoutes);
app.use('/api/v1/features', featuresRoutes);

// ==============================
// ⚠️ Error Handling
// ==============================
app.use(notFound);
app.use(errorHandler);

// ==============================
// 🗂️ Static Files
// ==============================
const uploadsPath = path.join(__dirname, "uploads");
if (fs.existsSync(uploadsPath)) {
  app.use("/uploads", express.static(uploadsPath));
}

// ==============================
// 🏁 Start Server
// ==============================
const startServer = async () => {
  try {
    await connectDB();

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
      https.createServer({ key, cert }, app).listen(PORT, "0.0.0.0", () => {
        console.log(`✅ HTTPS: https://localhost:${PORT}`);
        console.log(
          `🧠 Environment: ${process.env.NODE_ENV || "development"}`
        );
      });
    } else {
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`✅ HTTP: http://localhost:${PORT}`);
        console.log(
          `🧠 Environment: ${process.env.NODE_ENV || "development"}`
        );
        if (sslKey || sslCert)
          console.warn("⚠️ SSL files configured but not found on disk");
      });
    }
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
};

startServer();
