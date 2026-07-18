import Newsletter from '../models/Newsletter.js';
import NewsletterSubscriber from '../models/NewsletterSubscriber.js';
import EmailService from '../services/emailService.js';

export const subscribe = async (req, res) => {
  try {
    const { email, source } = req.body || {};
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid email' });
    }
    const normalized = String(email).trim().toLowerCase();

    // Basic email validation
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(normalized)) return res.status(400).json({ success: false, message: 'Invalid email' });

    let subscriberDoc = null;
    let isNewOrReactivated = false;

    try {
      // Check if already subscribed (fast path)
      const existing = await NewsletterSubscriber.findOne({ email: normalized }).lean();
      if (existing) {
        if (String(existing.status) === 'active') {
          // Already subscribed — do not create duplicate or send email
          return res.status(200).json({ success: true, message: 'This email is already subscribed to our newsletter.' });
        }

        // Reactivate unsubscribed user
        subscriberDoc = await NewsletterSubscriber.findOneAndUpdate(
          { email: normalized },
          { $set: { status: 'active', subscribedAt: new Date(), source: 'newsletter' } },
          { new: true }
        );
        isNewOrReactivated = true;
      } else {
        // Not present — create new subscriber. Use create() and handle race (11000) gracefully.
        try {
          subscriberDoc = await NewsletterSubscriber.create({ email: normalized, source: 'newsletter', subscribedAt: new Date(), status: 'active' });
          isNewOrReactivated = true;
        } catch (err) {
          // Duplicate key (race) — fall back to fetch and reactivate if needed
          if (err && err.code === 11000) {
            subscriberDoc = await NewsletterSubscriber.findOneAndUpdate(
              { email: normalized },
              { $set: { status: 'active', subscribedAt: new Date(), source: 'newsletter' } },
              { new: true }
            );
            if (subscriberDoc && String(subscriberDoc.status) === 'active') {
              return res.status(200).json({ success: true, message: 'This email is already subscribed to our newsletter.' });
            }
            isNewOrReactivated = true;
          } else {
            throw err;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to ensure NewsletterSubscriber:', e && e.message ? e.message : e);
      // Continue — we'll try to upsert legacy Newsletter and still return success if possible
    }

    // Ensure legacy Newsletter record exists (best-effort). Use provided source for legacy tracking.
    try {
      await Newsletter.findOneAndUpdate(
        { email: normalized },
        { $setOnInsert: { email: normalized, source: source || 'website', subscribedAt: new Date() } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } catch (e) {
      console.warn('Failed to upsert legacy Newsletter collection', e && e.message ? e.message : e);
    }

    // Only send welcome/activation emails when this is a new subscription or a reactivation
    if (isNewOrReactivated) {
      try {
        await EmailService.sendMail({
          to: normalized,
          subject: 'Thanks for subscribing to DENFiT',
          html: `<p>Thanks for subscribing to DENFiT! You'll receive updates about new drops and exclusive offers.</p>`
        }, { meta: { source: 'newsletter-subscribe' } });
      } catch (e) {
        console.warn('Newsletter welcome email failed:', e && e.message ? e.message : e);
      }
    }

    // Response: prefer a friendly server-provided message
    if (isNewOrReactivated) {
      return res.status(200).json({ success: true, message: 'Thanks for subscribing to DENFiT', data: { email: normalized } });
    }

    // Fallback: already subscribed
    return res.status(200).json({ success: true, message: 'This email is already subscribed to our newsletter.' });
  } catch (err) {
    console.error('Newsletter subscribe error:', err && err.stack ? err.stack : err);
    // Handle duplicate key gracefully
    if (err && err.code === 11000) {
      return res.status(200).json({ success: true, message: 'This email is already subscribed to our newsletter.' });
    }
    return res.status(500).json({ success: false, message: 'Failed to subscribe', error: err?.message || String(err) });
  }
};

// GET /api/v1/newsletter/unsubscribe?e=<base64 or email>
export const unsubscribe = async (req, res) => {
  try {
    let { e, email } = req.query || {};
    let normalized = '';
    if (!e && !email) return res.status(400).json({ success: false, message: 'Missing email' });
    const raw = e || email;
    // If base64-ish, try decode
    try {
      const maybe = String(raw);
      // rudimentary check: if contains only base64 chars and length mod 4 === 0
      if (/^[A-Za-z0-9+/=]+$/.test(maybe) && maybe.length % 4 === 0) {
        const dec = Buffer.from(maybe, 'base64').toString('utf8');
        normalized = dec.toLowerCase().trim();
      } else {
        normalized = String(raw).toLowerCase().trim();
      }
    } catch (e2) {
      normalized = String(raw).toLowerCase().trim();
    }

    if (!normalized) return res.status(400).json({ success: false, message: 'Invalid email' });

    // Update if exists in subscriber collection
    const updated = await NewsletterSubscriber.findOneAndUpdate(
      { email: normalized },
      { $set: { status: 'unsubscribed' } },
      { new: true }
    );

    // Also mark in legacy Newsletter collection if present
    await Newsletter.findOneAndUpdate({ email: normalized }, { $set: { unsubscribedAt: new Date() } });

    if (!updated) return res.status(200).json({ success: true, message: 'Unsubscribed (no prior record)' });
    return res.status(200).json({ success: true, message: 'Unsubscribed', data: { email: updated.email } });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
  }
};
