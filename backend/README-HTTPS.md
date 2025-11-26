# Local HTTPS setup (mkcert) — DENFiT backend

This project supports running the backend and frontend locally over HTTPS so you can test Secure httpOnly cookies and realistic cross-origin behavior.

## Overview
- The backend will start an HTTPS server automatically when these env vars are set and point to existing files:
  - `SSL_KEY_PATH` — path to the private key file (PEM)
  - `SSL_CERT_PATH` — path to the certificate file (PEM)

- The frontend Vite dev server will also run over HTTPS when the same env vars are set (see `frontend/vite.config.ts`).

## Recommended (mkcert)
1. Install mkcert (Windows):
   - Install Chocolatey (if you don't have it) and then run:
     ```powershell
     choco install mkcert -y
     ```
   - Alternatively download the mkcert binary from https://github.com/FiloSottile/mkcert/releases

2. Install the local CA (one time):
```powershell
mkcert -install
```

3. Generate a cert for `localhost`:
```powershell
mkcert localhost 127.0.0.1 ::1
# This creates files like: localhost+2.pem and localhost+2-key.pem in the current folder
```

4. Set environment variables and start the backend (PowerShell example):
```powershell
$env:SSL_KEY_PATH = 'C:\path\to\localhost+2-key.pem'
$env:SSL_CERT_PATH = 'C:\path\to\localhost+2.pem'
$env:ALLOWED_ORIGINS = 'https://localhost:3000'
$env:COOKIE_SAMESITE = 'none'
cd 'c:\denfit-ecommerce 3\backend'
npm run dev
```

5. Start the frontend (Vite) with the same certs (so cookies with Secure flag are accepted):
```powershell
$env:SSL_KEY_PATH = 'C:\path\to\localhost+2-key.pem'
$env:SSL_CERT_PATH = 'C:\path\to\localhost+2.pem'
cd 'c:\denfit-ecommerce 3\frontend'
npm run dev
```

## Notes
- For cross-origin dev (frontend and backend on different ports), set `COOKIE_SAMESITE=none` and make sure both are served over HTTPS so the browser will send cookies with `Secure`.
- If you cannot run mkcert, consider using `ngrok` as an alternative (it gives a public HTTPS endpoint) — update `ALLOWED_ORIGINS` accordingly.
- If you prefer not to change Vite config, you can also run Vite in https mode using CLI args or other tooling.

## Troubleshooting
- If browsers warn about the cert: ensure mkcert CA is installed properly (`mkcert -install`).
- If cookies are not sent: verify `Secure` and `SameSite` settings and ensure both frontend and backend are HTTPS.

If you want, I can also add a small `scripts/start-https.ps1` helper to set env vars and run both servers with one command.