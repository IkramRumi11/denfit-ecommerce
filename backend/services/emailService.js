// backend/services/emailService.js
import nodemailer from "nodemailer";
import crypto from 'crypto';
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { getColorName, resolveColorHex } from '../utils/colorHelper.js';

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
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || "denfitcustomercare@gmail.com";

// Default brand logo (user-provided). Use a direct image URL so email clients can load it.
const BRAND_LOGO = process.env.BRAND_LOGO || "https://res.cloudinary.com/doc6jwdo7/image/upload/v1770567054/Denfit_pzrih3.jpg";

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
    getColorName,
    resolveColorHex,
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
const sendMail = async ({ to, subject, html, text }, opts = {}) => {
  // minimal validation
  if (!to || !subject) throw new Error("sendMail missing required `to` or `subject`");

  const payload = {
    from: FROM,
    to,
    subject,
    html,
    text: text || htmlToTextFallback(html, "Please view this email in an HTML-capable client.")
  };

  const meta = opts.meta || {};
  // Ensure correlationId exists even for inline sends (helpful for tracing)
  if (!meta.correlationId) {
    meta.correlationId = `inline:${crypto.randomUUID()}`;
  }
  meta.source = meta.source || (opts && opts.source) || 'inline';
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
      // Optionally embed the brand logo as a CID attachment for clients
      // that block remote images. Enable by setting EMAIL_EMBED_LOGO=true.
      if (String(process.env.EMAIL_EMBED_LOGO || '').toLowerCase() === 'true' && BRAND_LOGO) {
        try {
          // download image
          const res = await fetch(BRAND_LOGO);
          if (res.ok) {
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const cid = 'denfit-logo@denfit';
            // replace remote URL occurrences with cid reference
            if (payload.html && payload.html.includes(BRAND_LOGO)) {
              payload.html = payload.html.split(BRAND_LOGO).join(`cid:${cid}`);
            }
            // attach image
            payload.attachments = payload.attachments || [];
            payload.attachments.push({
              filename: 'denfit-logo.jpg',
              content: buffer,
              cid
            });
          } else {
            console.warn('EMAIL_EMBED_LOGO: failed to fetch logo, status', res.status);
          }
        } catch (err) {
          console.warn('EMAIL_EMBED_LOGO: error fetching/attaching logo', err?.message || err);
        }
      }

      const info = await transporter.sendMail(payload);
      // Include correlation in log if provided
      const { correlationId, userId, orderId } = meta;
      console.log(`📩 Email sent to ${to} — id=${info.messageId} accepted=${JSON.stringify(info.accepted)} rejected=${JSON.stringify(info.rejected)} correlation=${correlationId || 'none'} userId=${userId || 'none'} orderId=${orderId || 'none'}`);
      return info;
    } catch (err) {
    // Provide more helpful debugging details for SMTP failures:
    console.error("❌ Failed to send email:", err?.message || err);
    if (err && typeof err === 'object') {
      console.error('SMTP error details:', {
        code: err.code,
        responseCode: err.responseCode,
        response: err.response,
        rejected: err.rejected,
      });
    }
    // Do not throw for critical flows — return error object so callers can handle
    return { error: err };
  }
};

// ==============================
// 🎯 Public API (specific emails)
// ==============================
const EmailService = {
  sendWelcomeEmail: async (user, verificationUrl, opts = {}) => {
    // Defensive dedupe: if the user's `lastVerificationSentAt` is very recent
    // (e.g. within the last few seconds), skip sending to avoid accidental duplicates
    try {
      const lastSent = user?.lastVerificationSentAt ? new Date(user.lastVerificationSentAt).getTime() : 0;
      const now = Date.now();
      const DEDUPE_MS = Number(process.env.EMAIL_DEDUPE_WINDOW_MS || 3000);
      // Allow callers to bypass the in-service dedupe when they have
      // performed their own atomic cooldown/update (e.g. register/resend flows)
      // by setting a source in opts.meta. For 'register' and 'resend-verification'
      // flows the DB-level `lastVerificationSentAt` is already set before
      // calling this function, so the naive dedupe check would incorrectly
      // skip the outgoing email. Respect an explicit env override as well.
      const source = (opts && opts.meta && opts.meta.source) || '';
      const bypassForSources = ['register', 'resend-verification'];
      // Also allow bypass if this send was queued for a welcome/resend job
      // (the queue often sets sources like 'queue:sendWelcomeEmail').
      const lowerSource = String(source || '').toLowerCase();
      const isQueuedWelcome = lowerSource.includes('sendwelcomeemail') || lowerSource.includes('queue:sendwelcomeemail');
      const allowDedupe = String(process.env.ENFORCE_EMAIL_DEDUPE || 'true').toLowerCase() === 'true';
      if (allowDedupe && !(bypassForSources.includes(source) || isQueuedWelcome)) {
        if (lastSent && (now - lastSent) < DEDUPE_MS) {
          console.log(`[EMAIL] Skipping welcome email to ${user.email} — last sent ${Math.round((now - lastSent) / 1000)}s ago`);
          return { skipped: true };
        }
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
    }, opts);
  },

  sendPasswordResetEmail: async (user, resetUrl, opts = {}) => {
    const html = await renderTemplate("password-reset", {
      name: user?.name || user?.email,
      resetUrl
    });
    return sendMail({
      to: user.email,
      subject: "DENFiT — Password reset instructions",
      html
    }, opts);
  },

  sendLoginNotification: async (user, { ipAddress, userAgent } = {}, opts = {}) => {
    const html = `
      <p>Hi ${user?.name || user?.email},</p>
      <p>We noticed a sign-in to your account from IP <strong>${ipAddress || "unknown"}</strong> with agent: ${userAgent || "unknown"}.</p>
      <p>If this wasn't you, please reset your password immediately.</p>
    `;
    return sendMail({
      to: user.email,
      subject: "New sign-in to your DENFiT account",
      html
    }, opts);
  },

  sendWelcomeVerifiedEmail: async (user, opts = {}) => {
    const ctaUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/account`;
    const html = await renderTemplate("welcome-verified", {
      name: user?.name || user?.email,
      // Provide a post-verification CTA (account/dashboard) to the template.
      ctaUrl
    });
    // Attempt to upsert the subscriber record (do not fail the email send if this fails)
    try {
      const NS = await import('../models/NewsletterSubscriber.js');
      const NewsletterSubscriberModel = NS.default;
      if (NewsletterSubscriberModel) {
        await NewsletterSubscriberModel.findOneAndUpdate(
          { email: String(user.email).toLowerCase().trim() },
          {
            $set: { source: 'customer', isVerified: true, status: 'active' },
            $setOnInsert: { subscribedAt: user.createdAt || new Date() }
          },
          { upsert: true }
        );
      }
    } catch (e) {
      console.warn('Failed to upsert NewsletterSubscriber on verified welcome:', e?.message || e);
    }

    return sendMail({
      to: user.email,
      subject: "Your email is verified — Welcome to DENFiT",
      html
    }, opts);
  }
  ,

  // Order confirmation (when an order is first placed)
  sendOrderConfirmation: async (user, order, opts = {}) => {
    try {
      // Resolve recipient safely: prefer order-level contact info (contactEmail or shippingAddress.email),
      // then logged-in user's email, then guestEmail. This ensures the email entered at checkout
      // is used for order communications and does NOT overwrite the user's profile email.
      const recipientEmail = order?.contactEmail || order?.shippingAddress?.email || user?.email || order?.guestEmail || order?.email;
      const recipientName = (order && (order.shippingAddress && order.shippingAddress.name)) || user?.name || user?.email || 'Customer';

      if (!recipientEmail) {
        console.error(`sendOrderConfirmation: no recipient email for order ${order?._id || 'unknown'}`);
        return { error: 'no-recipient' };
      }

      const html = await renderTemplate('order-confirmation', {
        name: recipientName,
        order,
        ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order._id}`
      });
      return sendMail({
        to: recipientEmail,
        subject: `Order ${order.orderNumber} — confirmation`,
        html
      }, opts);
    } catch (err) {
      console.error('Error rendering/sending order confirmation email', err);
      return { error: err };
    }
  },

  // Order status change email
  sendOrderStatusChange: async (user, order, { oldStatus, newStatus } = {}, opts = {}) => {
    try {
      const recipientEmail = order?.contactEmail || order?.shippingAddress?.email || user?.email || order?.guestEmail || order?.email;
      const recipientName = (order && (order.shippingAddress && order.shippingAddress.name)) || user?.name || user?.email || 'Customer';

      if (!recipientEmail) {
        console.error(`sendOrderStatusChange: no recipient email for order ${order?._id || 'unknown'}`);
        return { error: 'no-recipient' };
      }

      const html = await renderTemplate('order-status-update', {
        name: recipientName,
        order,
        oldStatus,
        newStatus,
        ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order._id}`
      });
      return sendMail({
        to: recipientEmail,
        subject: `Order ${order.orderNumber} — status updated to ${newStatus}`,
        html
      }, opts);
    } catch (err) {
      console.error('Error rendering/sending order status email', err);
      return { error: err };
    }
  },

  sendShippingConfirmation: async (user, order, opts = {}) => {
    try {
      const recipientEmail = order?.contactEmail || order?.shippingAddress?.email || user?.email || order?.guestEmail || order?.email;
      const recipientName = (order && (order.shippingAddress && order.shippingAddress.name)) || user?.name || user?.email || 'Customer';

      if (!recipientEmail) {
        console.error(`sendShippingConfirmation: no recipient email for order ${order?._id || 'unknown'}`);
        return { error: 'no-recipient' };
      }

      const html = await renderTemplate('order-status-update', {
        name: recipientName,
        order,
        oldStatus: 'processing',
        newStatus: 'shipped',
        ctaUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/orders/${order._id}`
      });
      return sendMail({
        to: recipientEmail,
        subject: `Your order ${order.orderNumber} has shipped`,
        html
      }, opts);
    } catch (err) {
      console.error('Error rendering/sending shipping email', err);
      return { error: err };
    }
  }
};

// Expose sendMail for direct debug use
EmailService.sendMail = sendMail;

export default EmailService;
