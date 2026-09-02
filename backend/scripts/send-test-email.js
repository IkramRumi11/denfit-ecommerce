#!/usr/bin/env node
// scripts/send-test-email.cjs
// Run: node scripts/send-test-email.cjs recipient@example.com
import dotenv from 'dotenv';

dotenv.config();
import EmailService from '../services/emailService.js';

(async function run() {
  const args = process.argv.slice(2);
  const recipient = args[0] || process.env.TEST_EMAIL_RECIPIENT;
  if (!recipient) {
    console.error('Please provide an email address as the first argument (or set TEST_EMAIL_RECIPIENT).');
    process.exit(1);
  }
  try {
    console.log('Sending test email to', recipient);
    const res = await EmailService.sendWelcomeEmail({ email: recipient, name: 'Test Recipient' }, `${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    console.log('Result:', res);
  } catch (err) {
    console.error('Error sending test email:', err);
    process.exit(1);
  }
})();
