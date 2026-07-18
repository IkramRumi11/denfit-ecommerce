# Email Debugging & Mailtrap Guide

This document describes how to quickly validate email delivery locally and what to do if your server fails to send emails.

1) Quick test with built-in script (no web UI)

```powershell
cd backend
npm run test:smtp -- your.address@example.com
```

This calls `scripts/send-test-email.cjs` which uses `EmailService` to send a test email. The script will log the SMTP response and any errors.

2) Using the debug endpoint

Start the server and hit e.g.: 
```
GET /api/v1/debug/email?to=you@mail.com&template=welcome
```

In the URL you can set `template` to `welcome`, `welcome-verified`, `password-reset`, `shipping`, or `custom` (use `html` and `subject` query params for `custom`). The route will return a `correlationId` so you can trace the send in the logs.

3) Correlation IDs for tracing

The app now generates `correlationId` values for all outgoing emails, either from queued worker jobs or direct sends. Search server logs for `correlation=` or `correlationId` to find the relevant entries.

4) Using Mailtrap for reliable local testing

Mailtrap provides a dev SMTP server with a safe inbox:
- Create a Mailtrap account and obtain SMTP credentials (host, port, user, pass)
- Update `.env` (or your shell) with:
  - `SMTP_HOST=smtp.mailtrap.io`
  - `SMTP_PORT=587`
  - `SMTP_USER=<your-mailtrap-user>`
  - `SMTP_PASS=<your-mailtrap-pass>`
  - `SMTP_FROM='DENFiT <hello@denfit.local>'`

Restart the server and use the test script or debug endpoint. Mailtrap will capture the emails even if the recipients are not real.

5) Port conflicts (EADDRINUSE)

If you get `EADDRINUSE: address already in use` for port 3002, either free the port or assign a different one in `.env`:

On PowerShell:
```powershell
Get-NetTCPConnection -LocalPort 3002 | Format-Table -AutoSize -Property LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess
Get-Process -Id (Get-NetTCPConnection -LocalPort 3002).OwningProcess | Select Id,ProcessName,Path
Stop-Process -Id <PID> -Force
```

Or set `PORT=3003` in `.env`.

6) Helpful logs to inspect
- `server.out` shows startup & SMTP logs.
- `server.err` has errors. `server-start.log` contains startup details.
- Email logs show `correlationId` and `accepted`/`rejected` arrays from the SMTP server.
