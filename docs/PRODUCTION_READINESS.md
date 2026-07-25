# Production Readiness Baseline & Register

**Project:** DENFiT E-commerce Platform  
**Baseline Date:** July 25, 2026  
**Latest Git Commit:** `d5f322c` on branch `feature/raptor-mini-flag`  
**Deployment Status:** 🔴 **BLOCKED**

---

## 1. Current Baseline Inventory

*   **Runtime Environment:** Docker Compose (Mongo 6 Replica Set, Redis 7, Express Backend, Vite + React Frontend, Background Workers).
*   **Active Services:** All services are running inside Docker containers:
    *   `backend` on port `3002` (development mode)
    *   `frontend` on port `3000` (development mode forwarded, container port 80/3001)
    *   `mongo` on port `27017` (healthy replica set `rs0`)
    *   `redis` on port `6379` (healthy)
    *   `email-worker` and `notification-worker` are running.
*   **CI/CD Configuration:** GitHub Actions (`.github/workflows/ci.yml`) is configured but has error-hiding configurations (`continue-on-error: true`).
*   **Dependencies Configured:** Configured across three scopes: Root, Backend, and Frontend.

---

## 2. Confirmed Blocker Register (P0 - P3)

The following register lists all confirmed technical, logic, and security issues across the codebase, ranked by severity.

| ID | Area | Finding | Evidence | Severity | Root Cause | Fix | Verification | Status |
| :--- | :--- | :--- | :--- | :---: | :--- | :--- | :--- | :---: |
| **B-01** | Test | `concurrency.test.js` hangs indefinitely | Execution of `npm run test` in backend hangs. Mongoose remains connected. | **P0** | No `after()` cleanup hook exists to call `mongoose.disconnect()`. | Add `after(async () => { await mongoose.disconnect(); });`. | `npm run test` exits cleanly. | 🟢 Resolved |
| **B-02** | Test | `features.test.js` has a reference error | Line 48: `ReferenceError: base is not defined` when server is spawned. | **P0** | `const base` is block-scoped inside the inner `try` block but accessed in the outer scope. | Move `const base` declaration to the root function scope. | Run `node --test tests/features.test.js` from clean state. | 🟢 Resolved |
| **B-03** | CI/CD | Silent Integration Test failure in CI | `.github/workflows/ci.yml#L82-L91` | **P0** | Integration tests run in `lint-and-test` job without starting the backend server; failure is hidden by `continue-on-error: true`. | Start backend server in CI or spin it up dynamically within the integration test bootstrap. | Remove `continue-on-error: true` and observe CI pass. | 🔴 Open |
| **B-04** | Security | Unpatched critical & high vulnerabilities | `npm audit` lists vulnerabilities in root, frontend, and backend scopes. | **P1** | Outdated direct and transitive dependencies (`shell-quote`, `lodash`, `axios`, `postcss`). | Safely upgrade affected dependencies in `package.json` files and test stability. | Run `npm audit` and verify 0 high/critical issues. | 🔴 Open |
| **B-05** | Logic | Product gender is overwritten by category name | `backend/utils/adminProductHelper.js#L220` | **P1** | Code logic explicitly assigns `productData.gender = productData.category;` on product creation/update. | Remove this override and preserve the product's actual gender value. | Verify product editing and creation tests pass. | 🟢 Resolved |
| **B-06** | CI/CD | Linting pipeline errors are silenced in CI | `.github/workflows/ci.yml#L61,L66` | **P1** | ESLint errors are bypassed in CI by setting `continue-on-error: true`. | Remove `continue-on-error: true` and clean up lint errors. | Clean ESLint runs on both frontend and backend. | 🔴 Open |
| **B-07** | Lint | Backend compilation warnings and errors | `npm run lint` in backend outputs **531 problems (22 errors, 509 warnings)**. | **P2** | Multiple `no-self-assign` code issues (subcategory, brand) and regex escape syntax issues. | Clean up unnecessary escapes and self-assignments. | `npm run lint` in backend reports 0 errors. | 🔴 Open |
| **B-08** | Lint | Frontend compilation warnings and errors | `npm run lint` in frontend outputs **253 problems (95 errors, 158 warnings)**. | **P2** | Unused variables, unescaped HTML characters in JSX, hook missing dependency arrays, and accessibility violations. | Address compile-blocking lint errors in key frontend pages. | `npm run lint` in frontend reports 0 errors. | 🔴 Open |

---

## 3. Test Coverage & Security Status

*   **Test Status:** 
    *   Playwright E2E tests: 59 scenarios configured (currently blocked by local hanging test suite and CI server missing setup).
    *   API tests: 33 API integration scenarios (currently failing silently in CI).
*   **Security Status:**
    *   **Root:** Critical vulnerability in `shell-quote` (potential command injection) and high severity vulnerability in `lodash`.
    *   **Backend:** Vulnerable `body-parser` and `postcss`.
    *   **Frontend:** Vulnerable `axios` (Prototype Pollution, open redirects) and `react-router`/`react-router-dom`.
*   **Deployment Risks:**
    *   High risk of data corruption in product updates due to the category-gender overwrite bug.
    *   CI/CD pipeline provides false positives (green builds) due to extensive use of `continue-on-error: true`.

---

## 4. Remediation Checklist & Definition of Done

*   [ ] Clean repository installation and frontend production build succeed.
*   [ ] Local unit tests exit cleanly and pass.
*   [ ] Local integration tests execute and pass self-contained.
*   [ ] CI/CD pipeline does not suppress errors (`continue-on-error: false` everywhere).
*   [ ] Security vulnerabilities (high/critical) are fully resolved.
*   [ ] Category-gender overwrite bug is fixed.
*   [ ] All backend and frontend lint errors (blocking issues) are resolved.

---

## 5. First Remediation Batch (Stage 1 & Stage 4)

We will address the core blockers preventing code quality verification first:

1.  **Fix Blocker B-01 (Hanging local tests):** Add database connection teardown to `backend/tests/concurrency.test.js`.
2.  **Fix Blocker B-02 (ReferenceError in test scope):** Correct scoping of `base` variable in `backend/tests/features.test.js`.
3.  **Fix Blocker B-05 (Gender overwrite bug):** Fix the logic bug in `backend/utils/adminProductHelper.js`.
