# Discovery Report - DENFiT E-commerce Platform

**Generated:** November 26, 2025  
**Branch:** ai/audit-and-fixes  
**Repository:** denfit-ecommerce

---

## 1. Tech Stack Detection

### Frontend
- **Framework:** React 18.3.1 with TypeScript 5.5.4
- **Build Tool:** Vite 6.1.6
- **UI Libraries:** 
  - Tailwind CSS 3.4.18
  - Radix UI components (@radix-ui/react-*)
  - Headless UI 2.2.9
  - Framer Motion 12.23.24 (animations)
  - Lucide React (icons)
- **Routing:** React Router DOM 6.30.1
- **HTTP Client:** Axios 1.7.7
- **Linting:** ESLint 8.57.1 with TypeScript support, jsx-a11y plugin for accessibility

### Backend
- **Runtime:** Node.js (ES Modules)
- **Framework:** Express 4.18.2
- **Language:** JavaScript (ES6+) with TypeScript dev dependencies
- **Database:** MongoDB (via Mongoose 8.20.1)
- **Cache/Queue:** Redis (via ioredis 5.3.2) + BullMQ 5.64.1
- **Authentication:** JWT (jsonwebtoken 9.0.2) + bcryptjs 2.4.3
- **Email:** Nodemailer 7.0.10 with EJS templates
- **File Upload:** Multer 1.4.5 + Cloudinary 2.8.0
- **Security Middleware:**
  - Helmet 7.1.0 (security headers)
  - CORS 2.8.5
  - express-mongo-sanitize 2.2.0
  - xss-clean 0.1.4
  - express-rate-limit 8.2.1
  - hpp 0.2.3 (HTTP parameter pollution)
  - Custom CSRF protection (double-submit cookie)
- **Validation:** express-validator 7.0.1 + validator 13.11.0

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Services:** MongoDB 6, Redis 7
- **Package Manager:** npm
- **Process Manager:** nodemon (dev), node (prod)
- **Worker Processes:** BullMQ email worker

---

## 2. Project Structure

```
denfit-ecommerce/
├── backend/
│   ├── controllers/      # Route handlers (auth, admin, orders, products, users, upload)
│   ├── middleware/       # Auth, CSRF, error handling, upload
│   ├── models/          # Mongoose schemas (User, Product, Order, Category, AuditLog)
│   ├── routes/          # Express routes (auth, admin, products, orders, cart, wishlist)
│   ├── services/        # Business logic (emailService)
│   ├── workers/         # Background jobs (emailWorker)
│   ├── queues/          # BullMQ queue definitions
│   ├── email-templates/ # EJS email templates
│   ├── scripts/         # Utility scripts (seed-admin, smoke tests)
│   ├── tests/           # Test files
│   ├── utils/           # Helper functions (JWT generator)
│   └── server.js        # Main entry point
├── frontend/
│   ├── src/
│   │   ├── components/  # React components (admin, cart, layout, UI)
│   │   ├── pages/       # Page components
│   │   ├── layouts/     # Layout components (AdminLayout)
│   │   ├── context/     # React context providers
│   │   ├── hooks/       # Custom React hooks
│   │   ├── services/    # API service layer
│   │   ├── types/       # TypeScript type definitions
│   │   └── utils/       # Helper functions
│   └── vite.config.ts   # Vite configuration
├── scripts/             # Root-level scripts
├── docker-compose.yml   # Docker orchestration
└── package.json         # Root package (concurrently for dev)
```

---

## 3. Entry Points & Scripts

### Development (Local)
```powershell
# Install dependencies
npm ci                    # Root
cd backend && npm ci      # Backend
cd frontend && npm ci     # Frontend

# Run development servers
npm run dev               # Both frontend + backend (concurrently)
npm run dev:backend       # Backend only (nodemon on port 3002)
npm run dev:frontend      # Frontend only (Vite on port 3000)

# Background worker
cd backend && npm run worker  # Email worker process
```

### Development (Docker)
```powershell
# Copy environment file
Copy-Item .env.example .env

# Start all services
docker-compose up --build

# Services:
# - MongoDB: localhost:27017
# - Redis: localhost:6379
# - Backend: http://localhost:3002
# - Frontend: http://localhost:3000
```

### Production
```powershell
# Build frontend
cd frontend && npm run build

# Start backend
cd backend && npm start

# Start worker
cd backend && npm run worker
```

### Testing & Quality
```powershell
# Linting
cd backend && npm run lint
cd frontend && npm run lint

# Tests
cd backend && npm run test:health

# Admin seeding
cd backend && npm run seed-admin
```

---

## 4. Environment Variables Required

### Critical (Production)
- `JWT_SECRET` - JWT signing key (REQUIRED)
- `MONGODB_URI` - MongoDB connection string
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email configuration
- `CLOUDINARY_API_SECRET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_CLOUD_NAME` - Media uploads

### Optional
- `NODE_ENV` - Environment (development/production)
- `PORT` - Backend port (default: 3002)
- `ALLOWED_ORIGINS` - CORS origins (default: http://localhost:3000)
- `REDIS_URL` - Redis connection (default: redis://localhost:6379)
- `FRONTEND_URL` - Frontend URL for emails
- `SKIP_CSRF` - Dev only, disable CSRF (NEVER in production)
- `ALLOW_DEV_BACKDOORS` - Dev only flag (NEVER in production)
- `SSL_KEY_PATH`, `SSL_CERT_PATH` - Optional HTTPS certificates

### Safety Checks
- Server validates required env vars in production mode
- Server exits if `ALLOW_DEV_BACKDOORS=true` in production
- CSRF can be skipped only if `SKIP_CSRF=true` AND `ALLOW_DEV_BACKDOORS=true`

---

## 5. Database Schema

### Collections
1. **users** - User accounts (customers + admins)
2. **products** - Product catalog
3. **orders** - Customer orders
4. **categories** - Product categories
5. **auditlogs** - Admin action audit trail

### Key Features
- Role-based access (user, admin, moderator)
- Email verification flow
- Password reset tokens
- Order status lifecycle
- Audit logging for admin actions

---

## 6. API Endpoints

### Public
- `GET /` - API info
- `GET /api/v1/health` - Health check + CSRF token

### Auth (`/api/v1/auth`)
- `POST /register` - User registration
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /forgot-password` - Request password reset
- `POST /reset-password/:token` - Reset password
- `POST /verify-email/:token` - Verify email
- `POST /resend-verification` - Resend verification email
- `GET /me` - Get current user

### Products (`/api/v1/products`)
- `GET /` - List products (with filters)
- `GET /:id` - Get product details
- Admin routes (protected)

### Admin (`/api/v1/admin`)
- Dashboard stats
- User management
- Order management
- Product management
- Audit logs

---

## 7. Current State Assessment

### ✅ Strengths
- Modern tech stack with security best practices
- Comprehensive security middleware (Helmet, CORS, CSRF, rate limiting)
- Email queue system with BullMQ
- Audit logging for admin actions
- Docker-based development environment
- TypeScript on frontend with accessibility linting
- Environment validation in production

### ⚠️ Areas for Improvement
- Limited test coverage (only health test exists)
- No E2E tests for critical flows
- Email templates exist but admin UI for sending may be incomplete
- No integration tests for API endpoints
- Missing performance monitoring/observability
- No CI/CD configuration detected
- Accessibility testing not automated
- Security vulnerability scanning not in CI

### 🔍 To Investigate
- Admin email sending UI completeness
- Order lifecycle email triggers
- Payment gateway integration status
- Refund/return workflow implementation
- Role-based permission granularity
- Database query performance
- Error logging and monitoring setup

---

## 8. Next Steps

1. **Static Analysis** - Run linters, dependency audits, identify dead code
2. **Functional Testing** - Create E2E tests for user and admin flows
3. **API Testing** - Integration tests for all endpoints
4. **Email System** - Verify/complete admin email UI and templates
5. **Admin UX** - Audit and improve admin panel workflows
6. **Security Hardening** - Vulnerability scan and fixes
7. **Performance** - Query optimization and benchmarking
8. **Accessibility** - Automated a11y testing
9. **CI/CD** - Set up automated testing pipeline
10. **Documentation** - Deployment guide and rollback procedures

---

**Status:** Discovery complete. Ready to proceed with comprehensive audit.
