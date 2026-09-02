# DENFiT — High-Performance E-Commerce & Apparel Platform

[![CI Pipeline](https://github.com/IkramRumi11/denfit-ecommerce/actions/workflows/ci.yml/badge.svg)](https://github.com/IkramRumi11/denfit-ecommerce/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-18.x%20%7C%2020.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Production%20Ready-2496ED.svg)](https://www.docker.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](#)

DENFiT is a modern, enterprise-grade, full-stack e-commerce platform built for high-performance apparel retail. The platform features an ultra-responsive React/TypeScript storefront, a comprehensive administrative operations dashboard, real-time inventory management with concurrency controls, BullMQ background job queues, and hardened multi-tier security.

---

## 📑 Table of Contents

- [Architectural Overview](#-architectural-overview)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [Security Architecture](#-security-architecture)
- [Getting Started (Local Development)](#-getting-started-local-development)
- [Production Deployment](#-production-deployment)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [API Reference](#-api-reference)
- [Feature Flags](#-feature-flags)
- [Git & Branching Workflow](#-git--branching-workflow)

---

## 🏛 Architectural Overview

```
                          ┌───────────────────────────┐
                          │   Internet / Customers    │
                          └─────────────┬─────────────┘
                                        │ (HTTPS: 443 / 80)
                                        ▼
                          ┌───────────────────────────┐
                          │     Nginx Reverse Proxy   │
                          │   (Frontend Container)    │
                          └──────┬─────────────┬──────┘
             Static Assets / SPA │             │ /api/* & /socket.io/*
                                 ▼             ▼
                     ┌───────────────┐   ┌───────────────────────────┐
                     │ React (Vite)  │   │     Express API Server    │
                     │  Dist Bundle  │   │    (Backend Container)    │
                     └───────────────┘   └──────┬──────────────┬─────┘
                                                │              │
                                  Mongoose Pool │              │ BullMQ / Cache
                                                ▼              ▼
                                  ┌────────────────┐   ┌───────────────┐
                                  │ MongoDB 6 (rs0)│   │    Redis 7    │
                                  │  Replica Set   │   └───────┬───────┘
                                  └────────────────┘           │
                                                               ▼
                                                       ┌────────────────┐
                                                       │ Email / Notify │
                                                       │ Worker Pods    │
                                                       └────────────────┘
```

---

## 🛠 Tech Stack

### Frontend
- **Framework & Runtime:** React 18 with TypeScript 5
- **Build System:** Vite 6 with code splitting and asset hashing
- **Styling:** TailwindCSS with modern typography and fluid responsive design
- **State & Context:** React Context (Auth, Cart, Wishlist, Notifications, FeatureFlags)
- **Routing:** React Router v6 with strict `AdminRoute` and `ProtectedRoute` guards
- **Icons & Animation:** Lucide Icons, Framer Motion, and Accessible UI Primitives

### Backend
- **Framework:** Node.js (ES Modules) with Express 4
- **Database:** MongoDB 6 (Mongoose 8) with multi-document replica-set transactions
- **Caching & Job Queue:** Redis 7 with BullMQ (dedicated worker processes)
- **Authentication:** JWT with short-lived access tokens (15m) + refresh token rotation (7d)
- **Security Middleware:** Helmet, CORS, NoSQL query sanitizer, XSS sanitizer, HPP, Double-Submit CSRF, Rate limiters
- **Document Generation:** Chromium / Puppeteer for high-fidelity PDF invoice rendering

---

## ✨ Key Features

### 🛍 Customer Experience & Storefront
- **Dynamic Catalog:** Instant multi-facet filtering (Category, Size, Color, Price, In-Stock).
- **Cart & Wishlist:** Persistent cross-device server cart with instant optimistic UI updates.
- **Atomic Checkout:** Real-time stock validation, automated tax & shipping calculations, coupon redemption, and guest checkout support.
- **Order Lifecycle Tracking:** Real-time order status timeline, order notes, and PDF invoice downloads.

### 🛡 Administrative Command Center
- **Executive Analytics:** Metric widgets for revenue, average order value, conversion, and SVG revenue charts.
- **Product & Inventory Management:** Multi-variant creation (colors, hex values, size profiles, image galleries) with bulk stock adjustments.
- **Order Operations:** Transition order statuses (Pending $\to$ Processing $\to$ Shipped $\to$ Delivered), assign courier tracking, process refunds, and batch CSV exports.
- **User & RBAC Controls:** Search users, inspect purchase history, deactivate accounts, and manage permissions (`customer`, `admin`, `super_admin`).
- **Audit Logging:** Immutable forensic audit logs recording actor ID, IP address, action type, timestamp, and metadata diffs.

---

## 🔒 Security Architecture

The platform is fortified against the OWASP Top 10 vulnerabilities:

1. **CSRF Protection:** Double-Submit Cookie pattern with cryptographic matching on all state-changing verbs (`POST`, `PUT`, `PATCH`, `DELETE`).
2. **Injection Defense:** `express-mongo-sanitize` completely neutralizes MongoDB NoSQL operator injection; `express-xss-sanitizer` strips malicious HTML.
3. **SSRF Defense:** `assertUrlSafe` utility validates and restricts all outbound requests to public endpoints.
4. **Brute Force & Rate Limiting:** Global API rate limiter (`apiLimiter`: 120 req/min) and dedicated authentication rate limiter (`authLimiter`: 15 attempts/15min). Account lockout after 5 consecutive failed logins.
5. **No Client Price Manipulation:** Product prices are authoritatively verified and fetched from MongoDB at checkout creation time.

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18.x or 20.x
- npm 9+ or 10+
- Docker & Docker Compose (optional, for containerized local dev)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/IkramRumi11/denfit-ecommerce.git
cd denfit-ecommerce

# Install root, backend, and frontend packages
npm ci
cd backend && npm ci
cd ../frontend && npm ci
cd ..
```

### 2. Configure Environment Variables
```bash
# Backend environment setup
cp backend/.env.example backend/.env
```

### 3. Launch Development Servers
```bash
# Runs both Vite frontend (port 3000) and Express backend (port 3002) concurrently
npm run dev
```

* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend API:** [http://localhost:3002](http://localhost:3002)

---

## 🐳 Production Deployment

The production stack is containerized using Docker Compose with internal network isolation (`denfit-net`) and memory/CPU limits.

### 1. Setup Production Secrets
On your production host, configure `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Generate high-entropy random keys:
```bash
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex')); console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'));"
```

### 2. Launch with Automated Script
```bash
# Linux / macOS / Cloud VM:
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh

# Windows Server (PowerShell):
.\scripts\deploy-production.ps1
```

### 3. Manual Container Launch
```bash
# Build and run containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Verify container health
docker compose ps

# Seed initial admin account and catalog presets (one-time)
docker compose exec backend npm run seed-admin
docker compose exec backend npm run seed:all
```

---

## 🧪 Testing & Quality Assurance

The codebase includes full automated test suites across all layers (**113/113 tests passing**):

```bash
# 1. Run Playwright End-to-End Suite (57 tests across 8 suites)
npx playwright test

# 2. Run Backend Unit & Integration Tests (44 tests)
cd backend && npm test

# 3. Run Frontend Unit Tests (12 tests)
cd frontend && npm run test:unit

# 4. Run Linting (0 errors)
npm run lint --prefix backend
npm run lint --prefix frontend

# 5. Verify Production Build
npm run build --prefix frontend
```

---

## 🌐 API Reference

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/v1/health` | `GET` | Public | Healthcheck and CSRF initialization |
| `/api/v1/auth/register` | `POST` | Public | Account registration |
| `/api/v1/auth/login` | `POST` | Public | Account authentication with JWT cookie |
| `/api/v1/auth/refresh-token` | `POST` | Public | Rotate refresh token and issue new access JWT |
| `/api/v1/auth/logout` | `POST` | Public | Clear session and auth cookies |
| `/api/v1/products` | `GET` | Public | List products with search, pagination, filtering |
| `/api/v1/products/:id` | `GET` | Public | Fetch product details and stock breakdown |
| `/api/v1/orders` | `POST` | Public/User | Create order with stock reservation |
| `/api/v1/orders` | `GET` | Authenticated | Fetch current user's order history |
| `/api/v1/admin/dashboard` | `GET` | Admin | Aggregate dashboard analytics |
| `/api/v1/admin/orders` | `GET` | Admin | Query and filter all customer orders |
| `/api/v1/admin/orders/:id/status` | `PUT` | Admin | Transition order status |
| `/api/v1/admin/audits` | `GET` | Admin | Query forensic audit logs with filters |

---

## 🚩 Feature Flags

Runtime feature flags can be toggled without redeploying:
- **`RAPTOR_MINI`**: Controls the Raptor Mini preview interface mode.
- **Admin Flag Manager:** Configure per-environment and per-user feature flags dynamically via `/admin/features`.

---

## 🌿 Git & Branching Workflow

```
main ─────────── (Production Stable Release)
  ▲
  │ PR / Merge
develop ──────── (Integration & Pre-Release Staging)
  ▲
  │ Feature Branches
feature/* ────── (Active Development)
```

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit your changes: `git commit -m "feat: description"`
3. Push and open a Pull Request into `develop`.
4. After CI verification and staging sign-off, merge `develop` into `main`.

---

## 📄 License & Ownership

Copyright © 2026 DENFiT Apparel. All rights reserved.
