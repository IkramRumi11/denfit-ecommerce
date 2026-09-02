# Master Production-Readiness Audit & Remediation Plan

## Audit Workstreams

- [ ] **Section 1: Authentication, Authorization & Session Security**
  - [ ] Inspect JWT token lifecycle (access vs refresh token signing, expiration, rotation, revocation blacklist)
  - [ ] Audit cookie flags (`httpOnly`, `secure`, `sameSite`, `path`, domain) in `authController.js` and `middleware/auth.js`
  - [ ] Verify RBAC enforcement across all admin & customer API endpoints
  - [ ] Audit password reset token generation, hashing, and single-use invalidation
  - [ ] Check for privilege escalation risks on `updateMe`, `register`, and user profile routes

- [ ] **Section 2: Web Application Security & Injection Defense**
  - [ ] CSRF double-submit token verification on all unsafe HTTP verbs
  - [ ] NoSQL Injection & MongoDB query sanitization (`express-mongo-sanitize`, regex injection guards)
  - [ ] XSS prevention (`express-xss-sanitizer`, DOMPurify, React escaping)
  - [ ] SSRF defense in image/URL fetchers (`assertUrlSafe`)
  - [ ] Malicious file upload & MIME validation (`middleware/upload.js`, magic number checks, SVG execution defense)
  - [ ] Security headers (`helmet`, CSP, HSTS, X-Content-Type-Options)
  - [ ] Rate limiting & brute force mitigation across all public and admin endpoints

- [ ] **Section 3: Business Logic & Financial Integrity**
  - [ ] Stock reservation & concurrent inventory check (`utils/inventory.js`, race conditions)
  - [ ] Price manipulation & client-tampering prevention in `orderController.js` and `cartController.js`
  - [ ] Coupon & discount validation (expiration, usage limits, minimum spend)
  - [ ] Order state machine (valid status transitions: pending -> processing -> shipped -> delivered / cancelled / refunded)
  - [ ] Refund logic & financial reconciliation

- [ ] **Section 4: Database, Transactions & Worker Reliability**
  - [ ] MongoDB connection options, replica set configuration, graceful shutdown hooks
  - [ ] Redis connection error handling, reconnect backoff, and fallback behavior
  - [ ] Worker queues (BullMQ/Redis for email and notifications, retry strategies, dead-letter handling)
  - [ ] Database indexes on query-heavy fields (`Order`, `Product`, `User`, `Audit`)

- [ ] **Section 5: API Surface & Route-by-Route Audit**
  - [ ] Audit every route in `backend/routes/` for authentication, authorization, and validation schemas
  - [ ] Error response data leakage check (`errorHandler.js`, unhandled rejections)

- [ ] **Section 6: Frontend Security & Production Optimization**
  - [ ] Auth state persistence, `AdminRoute` and `ProtectedRoute` redirects
  - [ ] Production Vite build configuration, source map stripping, asset optimization

- [ ] **Section 7: Docker & Infrastructure Hardening**
  - [ ] Audit `backend/Dockerfile`, `frontend/Dockerfile`, `nginx/nginx.conf`
  - [ ] Audit `docker-compose.prod.yml`, resource limits, non-root user execution, network isolation

- [ ] **Section 8: CI/CD & Secret Auditing**
  - [ ] Audit `.github/workflows/ci.yml`
  - [ ] Full repository scan for hardcoded secrets, test credentials, and exposed keys

- [ ] **Section 9: Full Automated Verification & Register Compilation**
  - [ ] Run backend unit & integration tests from clean state
  - [ ] Run frontend unit tests and production build
  - [ ] Run full Playwright E2E suite
  - [ ] Run backend & frontend ESLint and npm audit
  - [ ] Compile comprehensive Production Readiness Register with exact statuses
