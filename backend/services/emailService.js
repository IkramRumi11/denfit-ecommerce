// backend/services/emailService.js
import nodemailer from "nodemailer";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// ==============================
// 🧱 Path helpers
// ==============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==============================
// 🔐 SMTP config — support multiple env var names
// ==============================
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.SMTP_USERNAME || process.env.EMAIL_USERNAME;
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD;
const SMTP_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
const FROM = process.env.SMTP_FROM || process.env.EMAIL_FROM || `DENFiT <${SMTP_USER || "no-reply@denfit.local"}>`;
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "support@denfit.com";

// Default brand logo (user-provided)
const BRAND_LOGO = process.env.BRAND_LOGO || "https://i.ibb.co/9HMxJXcp/denfit-logo.png";

// ==============================
// ✅ Create transporter (if creds available)
// ==============================
let transporter = null;

if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for 587
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
  });

  // verify once
  transporter.verify().then(() => {
    console.log(`✅ SMTP transport ready (${SMTP_HOST}:${SMTP_PORT})`);
  }).catch(err => {
    console.warn("⚠️ SMTP verification failed (emails may fallback to console):", err?.message || err);
    transporter = null;
  });
} else {
  console.warn("⚠️ No SMTP config found — emails will be logged to console.");
}

// ==============================
// 🧩 Render EJS template helper
// ==============================
const renderTemplate = async (templateName, data = {}) => {
  const file = path.join(__dirname, "..", "email-templates", `${templateName}.ejs`);
  const finalData = {
    brand: {
      name: "DENFiT",
      logo: BRAND_LOGO,
      url: process.env.FRONTEND_URL || "http://localhost:3000"
    },
    supportEmail: SUPPORT_EMAIL,
    year: new Date().getFullYear(),
    ...data
  };

  // Provide safe defaults for commonly-used template variables so missing
  // callers don't cause a ReferenceError inside EJS templates.
  // `verificationUrl` is used by a couple of templates; if not supplied,
  // fall back to an explicit CTA (data.ctaUrl) or the brand URL.
  finalData.verificationUrl = finalData.verificationUrl || finalData.ctaUrl || finalData.brand.url;

  return ejs.renderFile(file, finalData, { async: true });
};

// ==============================
// 🔁 Fallback plain-text maker (very small, safe)
// ==============================
const htmlToTextFallback = (html, fallbackText) => {
  if (!html) return fallbackText || "";
  // Very small sanitizer: remove tags and decode some entities
  const stripped = html
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<(br|p|div|li|tr)[^>]*>/gi, "\n")
    .replace(/<\/[^>]+>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{2,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "");
  return stripped || fallbackText || "";
};

// ==============================
// 📤 Send email (with console fallback)
// ==============================
const sendMail = async ({ to, subject, html, text }) => {
  // minimal validation
  if (!to || !subject) throw new Error("sendMail missing required `to` or `subject`");

  const payload = {
    from: FROM,
    to,
    subject,
    html,
    text: text || htmlToTextFallback(html, "Please view this email in an HTML-capable client.")
  };

  if (!transporter) {
    // Development fallback: log nicely and return a fake info object
    console.log("\n--- EMAIL FALLBACK ---");
    console.log("To:", payload.to);
    console.log("From:", payload.from);
    console.log("Subject:", payload.subject);
    console.log("Text (fallback):\n", payload.text);
    console.log("HTML preview (first 800 chars):\n", (payload.html || "").slice(0, 800));
    console.log("----------------------\n");
    return { fallback: true };
  }

  try {
    const info = await transporter.sendMail(payload);
    console.log(`📩 Email sent to ${to} — id=${info.messageId}`);
    return info;
  } catch (err) {
    console.error("❌ Failed to send email:", err?.message || err);
    // Do not throw for critical flows — return error object so callers can handle
    return { error: err };
  }
};

// ==============================
// 🎯 Public API (specific emails)
// ==============================
const EmailService = {
  sendWelcomeEmail: async (user, verificationUrl) => {
    // Defensive dedupe: if the user's `lastVerificationSentAt` is very recent
    // (e.g. within the last few seconds), skip sending to avoid accidental duplicates
    try {
      const lastSent = user?.lastVerificationSentAt ? new Date(user.lastVerificationSentAt).getTime() : 0;
      const now = Date.now();
      const DEDUPE_MS = Number(process.env.EMAIL_DEDUPE_WINDOW_MS || 3000);
      if (lastSent && (now - lastSent) < DEDUPE_MS) {
        console.log(`[EMAIL] Skipping welcome email to ${user.email} — last sent ${Math.round((now - lastSent) / 1000)}s ago`);
        return { skipped: true };
      }
    } catch (e) {
      // ignore parsing errors and proceed to send
    }

    const html = await renderTemplate("welcome", {
      name: user?.name || user?.email,
      verificationUrl
    });
    return sendMail({
      to: user.email,
      subject: "Welcome to DENFiT — Verify your email",
      html
    });
  },

  sendPasswordResetEmail: async (user, resetUrl) => {
    const html = await renderTemplate("password-reset", {
      name: user?.name || user?.email,
      resetUrl
    });
    return sendMail({
      to: user.email,
      subject: "DENFiT — Password reset instructions",
      html
    });
  },

  sendLoginNotification: async (user, { ipAddress, userAgent } = {}) => {
    const html = `
      <p>Hi ${user?.name || user?.email},</p>
      <p>We noticed a sign-in to your account from IP <strong>${ipAddress || "unknown"}</strong> with agent: ${userAgent || "unknown"}.</p>
      <p>If this wasn't you, please reset your password immediately.</p>
    `;
    return sendMail({
      to: user.email,
      subject: "New sign-in to your DENFiT account",
      html
    });
  },

  sendWelcomeVerifiedEmail: async (user) => {
    const ctaUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/account`;
    const html = await renderTemplate("welcome-verified", {
      name: user?.name || user?.email,
      // Provide a post-verification CTA (account/dashboard) to the template.
      ctaUrl
    });
    return sendMail({
      to: user.email,
      subject: "Your email is verified — Welcome to DENFiT",
      html
    });
  }
  ,

  // Order status change email
  sendOrderStatusChange: async (user, order, { oldStatus, newStatus } = {}) => {
    try {
      const html = await renderTemplate('order-status-update', {
        name: user?.name || user?.email,
        order,
        oldStatus,
        newStatus,
        ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order._id}`
      });
      return sendMail({
        to: user.email,
        subject: `Order ${order.orderNumber} — status updated to ${newStatus}`,
        html
      });
    } catch (err) {
      console.error('Error rendering/sending order status email', err);
      return { error: err };
    }
  },

  sendShippingConfirmation: async (user, order) => {
    try {
      const html = await renderTemplate('order-status-update', {
        name: user?.name || user?.email,
        order,
        oldStatus: 'processing',
        newStatus: 'shipped',
        ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order._id}`
      });
      return sendMail({
        to: user.email,
        subject: `Your order ${order.orderNumber} has shipped`,
        html
      });
    } catch (err) {
      console.error('Error rendering/sending shipping email', err);
      return { error: err };
    }
  }
};

export default EmailService;
