import mongoose from 'mongoose';

const NewsletterSubscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  source: { type: String, enum: ['newsletter', 'customer'], required: true },
  isVerified: { type: Boolean, default: false },
  subscribedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['active', 'unsubscribed'], default: 'active' }
}, { timestamps: true });

const NewsletterSubscriber = mongoose.models.NewsletterSubscriber || mongoose.model('NewsletterSubscriber', NewsletterSubscriberSchema);
export default NewsletterSubscriber;
