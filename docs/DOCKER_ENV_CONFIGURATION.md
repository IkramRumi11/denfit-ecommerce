# Docker Environment Configuration

This document describes the correct environment file setup for Docker Compose.

## Environment Files

Each service uses its own environment file:

| Service | Environment File | Purpose |
|---------|------------------|---------|
| Backend | `backend/.env` | Node.js backend env vars (NODE_ENV, MONGODB_URI, JWT_SECRET, etc.) |
| Email Worker | `backend/.env` | Shares backend env (same process, different command) |
| Frontend Dev | `frontend/.env.local` | Vite dev-time vars (VITE_API_URL, VITE_APP_NAME) |
| Frontend Prod | Build ARG | ARG VITE_API_URL passed during `docker build` |

## Root `.env` (Deprecated)

A `.env` file exists at the repository root for historical reasons but **should not be used**. Each service now references its own env file in docker-compose.yml.

To clean up, delete or rename this file. It is not loaded by docker-compose anymore.

## Docker Build for Production

When building the frontend image for production:

```bash
docker build \
  --build-arg VITE_API_URL=https://api.example.com/api/v1 \
  --build-arg VITE_APP_NAME=DENFiT \
  -t frontend:prod \
  ./frontend
```

## Development Workflow

```bash
# Start services (each uses its own .env file)
docker compose up --build

# Services started:
# - mongo (replica set enabled)
# - redis
# - backend (uses backend/.env, runs npm run dev for hot reload)
# - email-worker (uses backend/.env, runs npm run worker)
# - frontend (uses frontend/.env.local, runs npm run dev for dev server)
# - mongo-init (one-shot replica set initializer)
```
