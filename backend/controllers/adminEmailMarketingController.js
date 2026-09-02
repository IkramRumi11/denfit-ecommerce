import NewsletterSubscriber from '../models/NewsletterSubscriber.js';
import User from '../models/User.js';
import EmailCampaign from '../models/EmailCampaign.js';
import EmailService from '../services/emailService.js';

// Helper: chunk array
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

// GET /api/v1/admin/email-marketing/subscribers
export const getSubscribers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, source, verified, status, q } = req.query;

    const wantCustomers = !source || source === 'customer' || source === 'all';
    const wantNewsletter = !source || source === 'newsletter' || source === 'all';

    // Build filters
    const subFilter = {};
    if (status === 'active' || status === 'unsubscribed') subFilter.status = status;
    if (verified === 'true') subFilter.isVerified = true;
    if (q) subFilter.email = { $regex: q, $options: 'i' };

    const userFilter = { role: 'customer' };
    if (verified === 'true') userFilter.emailVerified = true;
    if (q) userFilter.email = { $regex: q, $options: 'i' };

    // Fetch both sets in parallel when needed
    const [subsCount, subsItems, usersCount, usersItems] = await Promise.all([
      wantNewsletter ? NewsletterSubscriber.countDocuments(subFilter) : Promise.resolve(0),
      wantNewsletter ? NewsletterSubscriber.find(subFilter).sort({ subscribedAt: -1 }).limit(Number(limit) * 5) : Promise.resolve([]),
      wantCustomers ? User.countDocuments(userFilter) : Promise.resolve(0),
      wantCustomers ? User.find(userFilter).select('email createdAt emailVerified').sort({ createdAt: -1 }).limit(Number(limit) * 5) : Promise.resolve([]),
    ]);

    // Normalize users into subscriber-like shape
    const normalizedUsers = (usersItems || []).map(u => ({
      _id: u._id,
      email: u.email,
      source: 'customer',
      isVerified: !!u.emailVerified,
      subscribedAt: u.createdAt || u._id.getTimestamp?.() || new Date(),
      status: 'active'
    }));

    const normalizedSubs = (subsItems || []).map(s => ({
      _id: s._id,
      email: s.email,
      source: s.source || 'newsletter',
      isVerified: !!s.isVerified,
      subscribedAt: s.subscribedAt,
      status: s.status || 'active'
    }));

    // Merge according to requested source
    let merged = [];
    if (source === 'customer') merged = normalizedUsers;
    else if (source === 'newsletter') merged = normalizedSubs;
    else merged = [...normalizedUsers, ...normalizedSubs];

    // Sort by subscribedAt desc
    merged.sort((a, b) => new Date(b.subscribedAt) - new Date(a.subscribedAt));

    // Total is sum of counts when listing all, or specific count otherwise
    const total = source === 'customer' ? usersCount : (source === 'newsletter' ? subsCount : (subsCount + usersCount));

    // Apply pagination
    const pageNum = Math.max(1, Number(page));
    const lim = Math.max(1, Number(limit));
    const start = (pageNum - 1) * lim;
    const items = merged.slice(start, start + lim);

    return res.status(200).json({ success: true, data: { total, items } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/admin/email-marketing/campaigns (create + send)
export const createAndSendCampaign = async (req, res, next) => {
  try {
    const { subject, content, recipientType, from } = req.body || {};
    if (!subject || !content || !recipientType) return res.status(400).json({ success: false, message: 'Missing fields' });

    // Determine recipients across NewsletterSubscriber and User collections
    const recipientTypeNorm = String(recipientType || 'all').toLowerCase();

    // Build queries for both sources and decide which sources to include
    let includeUsers = false;
    let includeSubs = false;
    const subQuery = {};
    const userQuery = { role: 'customer' };

    switch (recipientTypeNorm) {
      case 'newsletter':
        includeSubs = true;
        subQuery.status = 'active';
        break;
      case 'customers':
        includeUsers = true;
        userQuery.active = true;
        break;
      case 'verified':
        includeUsers = true;
        includeSubs = true;
        userQuery.active = true;
        userQuery.emailVerified = true;
        subQuery.isVerified = true;
        subQuery.status = 'active';
        break;
      case 'active':
        includeUsers = true;
        includeSubs = true;
        userQuery.active = true;
        subQuery.status = 'active';
        break;
      case 'all':
      default:
        // All: include both sources, but respect unsubscribed flag for subscribers and only active users
        includeUsers = true;
        includeSubs = true;
        userQuery.active = true;
        subQuery.status = { $ne: 'unsubscribed' };
        break;
    }

    const [subs, users] = await Promise.all([
      includeSubs ? NewsletterSubscriber.find(subQuery).select('email') : Promise.resolve([]),
      includeUsers ? User.find(userQuery).select('email') : Promise.resolve([])
    ]);

    // Collect unique emails based on selected sources
    const emailsSet = new Set();
    if (includeUsers) (users || []).forEach(u => { if (u && u.email) emailsSet.add(String(u.email).toLowerCase().trim()); });
    if (includeSubs) (subs || []).forEach(s => { if (s && s.email) emailsSet.add(String(s.email).toLowerCase().trim()); });
    const emails = Array.from(emailsSet);

    const campaign = new EmailCampaign({ subject, content, recipientType: recipientTypeNorm, from: from || null, totalRecipients: emails.length });
    await campaign.save();

    // If no recipients, mark failed and return
    if (!emails.length) {
      campaign.status = 'failed';
      await campaign.save();
      return res.status(200).json({ success: true, message: 'No recipients', data: { campaign } });
    }

    // Send in batches to avoid overload
    const BATCH_SIZE = Number(process.env.EMAIL_BATCH_SIZE || 100);
    const BATCH_DELAY_MS = Number(process.env.EMAIL_BATCH_DELAY_MS || 500); // delay between batches
    const emailChunks = chunk(emails, BATCH_SIZE);

    let failed = 0;
    for (let i = 0; i < emailChunks.length; i++) {
      const batch = emailChunks[i];
      // send concurrently within batch - personalize unsubscribe link per recipient
      const sends = batch.map(async (e) => {
        try {
          // base64-encode the recipient email for the unsubscribe link
          const encoded = Buffer.from(String(e)).toString('base64');
          // Build absolute unsubscribe URL to backend endpoint
          const proto = req.headers['x-forwarded-proto'] ? String(req.headers['x-forwarded-proto']).split(',')[0].trim() : req.protocol;
          const host = req.get('host');
          const unsubscribeUrl = `${proto}://${host}/api/v1/newsletter/unsubscribe?e=${encodeURIComponent(encoded)}`;

          // If content contains a placeholder like {{unsubscribeUrl}} or {{unsubscribe}}, replace it.
          let personalized = String(content || '');
          if (personalized.match(/{{\s*unsubscribeUrl\s*}}/) || personalized.match(/{{\s*unsubscribe\s*}}/)) {
            personalized = personalized.replace(/{{\s*unsubscribeUrl\s*}}/g, unsubscribeUrl).replace(/{{\s*unsubscribe\s*}}/g, unsubscribeUrl);
          } else {
            // Append a small footer with unsubscribe link to ensure every email has one
            personalized = `${personalized}\n<hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />\n<p style="font-size:12px;color:#666;">If you no longer wish to receive these emails, <a href="${unsubscribeUrl}">unsubscribe</a>.</p>`;
          }

          const mailPayload = { to: e, subject, html: personalized };
          if (from) mailPayload.from = from;
          await EmailService.sendMail(mailPayload, { meta: { source: 'campaign', correlationId: `campaign:${campaign._id}`, recipient: e } });
        } catch (err) {
          failed++;
          console.error('Campaign send error for', e, err && err.message ? err.message : err);
        }
      });

      await Promise.all(sends);
      // delay between batches
      if (i < emailChunks.length - 1) await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }

    campaign.sentAt = new Date();
    campaign.status = failed ? 'failed' : 'sent';
    await campaign.save();

    return res.status(200).json({ success: true, message: 'Campaign processed', data: { campaign, failed } });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/admin/email-marketing/campaigns/test
export const sendTestEmail = async (req, res, next) => {
  try {
    const { to, subject, content } = req.body || {};
    if (!to || !subject || !content) return res.status(400).json({ success: false, message: 'Missing fields' });
    // Create a campaign record for this individual send so it appears in history
    const campaign = new EmailCampaign({ subject, content, recipientType: 'individual', from: null, totalRecipients: 1 });
    try {
      await campaign.save();
    } catch (saveErr) {
      console.warn('Failed to save individual campaign record', saveErr);
    }

    try {
      const info = await EmailService.sendMail({ to, subject, html: content }, { meta: { source: 'campaign-individual', recipient: to } });
      campaign.sentAt = new Date();
      campaign.status = 'sent';
      await campaign.save().catch(() => {});
      return res.status(200).json({ success: true, data: { info, campaign } });
    } catch (err) {
      campaign.status = 'failed';
      await campaign.save().catch(() => {});
      return res.status(500).json({ success: false, message: 'Failed to send', error: String(err?.message || err) });
    }
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/admin/email-marketing/campaigns/:id
export const deleteCampaign = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!id) return res.status(400).json({ success: false, message: 'Missing id' });
    const found = await EmailCampaign.findById(id);
    if (!found) return res.status(404).json({ success: false, message: 'Not found' });
    await EmailCampaign.deleteOne({ _id: id });
    return res.status(200).json({ success: true, message: 'Deleted' });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/admin/email-marketing/campaigns
export const listCampaigns = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [total, items] = await Promise.all([
      EmailCampaign.countDocuments({}),
      EmailCampaign.find({}).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
    ]);
    return res.status(200).json({ success: true, data: { total, items } });
  } catch (err) {
    next(err);
  }
};
