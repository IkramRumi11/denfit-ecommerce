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

## Feature Flags

The backend exposes a lightweight feature flag endpoint for runtime toggles. The most common flag is `RAPTOR_MINI` which controls the 'Raptor mini (Preview)' UI behavior.

- To enable Raptor mini globally in development or production environment, set:

```powershell
$env:RAPTOR_MINI='true'
```

- The server exposes a GET endpoint at `/api/v1/features` (e.g. `http://localhost:3002/api/v1/features`) which returns the current runtime flags.

By default, `RAPTOR_MINI` is enabled if not explicitly set. You can disable it by setting `RAPTOR_MINI=false` in your environment.

### Admin feature flags

Admins can manage feature flags at runtime using the Admin UI at `/admin/features`. Available operations:
- Create/Update global flags (apply to all clients)
- Create per-environment flags (apply only in a specific NODE_ENV like `production` or `staging`)
- Create per-user flags (apply to a specific user ID — useful for beta testing)

Endpoints (admin-only):
- GET /api/v1/admin/features — list persisted flags
- POST /api/v1/admin/features — create or update a flag (name, enabled, target, envName, userId)
- PATCH /api/v1/admin/features/:id — update a flag
- DELETE /api/v1/admin/features/:id — delete a flag

The `/api/v1/features` endpoint will evaluate and return effective flags considering env vars and persisted flags. If you pass an Authorization token in the request (Bearer), per-user overrides will be applied.



