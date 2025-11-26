## Local development with Docker

This repository includes a `docker-compose.yml` that starts a full local development stack: MongoDB, Redis, the backend (with nodemon) and the frontend (Vite dev server).

Quick start:

1. Copy and edit environment variables:

```powershell
Copy-Item .env.example .env
# Edit .env to set JWT_SECRET and any other values you need
```

2. Start the stack:

```powershell
docker-compose up --build
```

3. Open the app in your browser:

- Frontend (Vite): http://localhost:3000
- Backend API: http://localhost:3002

Troubleshooting:

- If XSRF cookies are not being set in dev, ensure you're running the frontend at http://localhost:3000 (Vite) and backend at http://localhost:3002. The CSRF middleware sets cookies with SameSite/Lax for local HTTP environments.
- To quickly disable CSRF checks in development only:

```powershell
$env:SKIP_CSRF='true'; npm run dev --prefix backend
```

Security note: Never enable `SKIP_CSRF` in staging or production. Ensure `JWT_SECRET` and other sensitive keys are set through environment variables and never checked into source control.

