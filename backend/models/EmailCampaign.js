import mongoose from 'mongoose';

const EmailCampaignSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  content: { type: String, required: true }, // HTML
  recipientType: { type: String, enum: ['customers', 'newsletter', 'all','verified','active','individual'], required: true },
  from: { type: String, default: null },
  totalRecipients: { type: Number, default: 0 },
  sentAt: { type: Date },
  status: { type: String, enum: ['sent','failed'], default: 'sent' }
}, { timestamps: true });

const EmailCampaign = mongoose.models.EmailCampaign || mongoose.model('EmailCampaign', EmailCampaignSchema);
export default EmailCampaign;
