# Email / SMTP Debugging Guide

This document shows how to debug and test outgoing emails from the backend.

1) Quick test (inline, dev only):

 - Start the backend (or use `npm run test:smtp`):
   ```powershell
   cd backend
   npm run test:smtp --<recipient@example.com>
   ```
 - If `server` is running you can use the new debug route:
   ```powershell
   # Example: Send a welcome email to test@domain.com
   curl "http://localhost:3002/api/v1/debug/email?to=test@domain.com&template=welcome"
   ```

2) Mailtrap (recommended for development)

 - Sign up for a Mailtrap account (https://mailtrap.io) and create an inbox.
 - In the mailbox settings, you'll see SMTP credentials (host, port, username, password). Use these in your `.env`:
   ```env
   SMTP_HOST=smtp.mailtrap.io
   SMTP_PORT=587
   SMTP_USER=<your-mailtrap-username>
   SMTP_PASS=<your-mailtrap-password>
   SMTP_FROM="DENFiT Support <no-reply@example.com>"
   ```
 - Restart the backend, and test with `npm run test:smtp` or the debug route.
 - If emails appear in Mailtrap, that confirms the app is sending correctly.

3) Troubleshooting common issues

 - EADDRINUSE port error: If port 3002 is already in use, check the process:
   ```powershell
   Get-NetTCPConnection -LocalPort 3002 | Format-Table -AutoSize -Property LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess
   Get-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess | Select Id,ProcessName,Path
   Stop-Process -Id <PID> -Force
   ```
 - If using Gmail: make sure you use an app password (if 2FA) and not login credentials; Gmail occasionally blocks SMTP connections.
 - If SMTP server accepts but recipient never sees email, check spam/junk/quarantine or SPF/DKIM settings for your sending domain.

4) Correlation & logs

 - Each email send now includes a `correlationId` and the logs will include `userId` and `orderId` when available.
 - Jobs enqueued in the email queue get a `meta.correlationId` automatically (uuid) so the worker logs and email logs are correlated.
