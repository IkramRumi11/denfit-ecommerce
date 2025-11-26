# One-time Admin Seeding

This file documents the one-time manual seed script that can create a default admin user.

Location:

- `backend/scripts/seed-admin.js`

When to use:

- For local development or controlled test environments where you explicitly want a seeded admin account.
- Do NOT enable this in production unless you understand the security implications.

Safety:

- The script will refuse to run unless either:
  - `ALLOW_DEV_BACKDOORS=true` is set in your `.env`, OR
  - you pass the `--force` flag to the script.

Defaults created:

- Email: `denfitdatabase@gmail.com` (override with `SEED_ADMIN_EMAIL` env var)
- Password: `Admin123!` (override with `SEED_ADMIN_PASSWORD` env var)

How to run (PowerShell):

```powershell
# from repository root
cd backend

# Option A: use the env gate (recommended for dev)
# Make sure .env contains ALLOW_DEV_BACKDOORS=true and MONGODB_URI
node .\scripts\seed-admin.js

# Option B: force (bypass the ALLOW_DEV_BACKDOORS gate). Use with caution.
node .\scripts\seed-admin.js --force

# Option C: override seeded credentials via env vars
SEED_ADMIN_EMAIL=me@example.com SEED_ADMIN_PASSWORD=My$trongP@ss node .\scripts\seed-admin.js
```

After running

- If an admin already exists, the script will exit with a message and do nothing.
- If it creates an admin, change the password immediately in the app or via the database.

Notes

- This script is intentionally conservative and requires an explicit opt-in. Do not commit a `.env` with `ALLOW_DEV_BACKDOORS=true` for production.
- If you'd like, I can add a `backend` npm script `npm run seed-admin` that wraps this command.
