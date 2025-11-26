# E2E Tests - DENFiT E-commerce

## Overview
End-to-end tests using Playwright to verify critical user and admin flows.

## Test Coverage

### User Flows
- **Authentication** (`auth.spec.ts`)
  - User registration
  - Login/logout
  - Password reset
  - Email verification

- **Shopping** (`user-shopping.spec.ts`)
  - Browse products
  - Search and filter
  - View product details
  - Add to cart
  - Update cart quantities
  - Remove from cart

- **Checkout** (`checkout.spec.ts`)
  - Complete checkout flow
  - Shipping address validation
  - Shipping cost calculation
  - Order summary
  - Promo code application

### Admin Flows
- **Dashboard** (`admin-dashboard.spec.ts`)
  - View key metrics
  - Recent orders
  - Revenue charts
  - Notifications
  - Top products

- **Order Management** (`admin-orders.spec.ts`)
  - View orders list
  - Filter by status
  - View order details
  - Change order status
  - Send status emails
  - Add order notes
  - Add tracking information
  - Process refunds
  - Export orders

- **Product Management** (`admin-products.spec.ts`)
  - View products list
  - Create new product
  - Edit product
  - Delete product
  - Update inventory
  - Search products
  - Bulk operations

- **User Management** (`admin-users.spec.ts`)
  - View users list
  - View user details
  - Search users
  - Filter by role
  - Change user role
  - Deactivate users
  - View user order history

- **Audit Logs** (`admin-audit.spec.ts`)
  - View audit logs
  - Filter by action type
  - Filter by user
  - Filter by date range
  - Export logs
  - Pagination

## Running Tests

### Prerequisites
1. Ensure backend and frontend are running:
   ```bash
   npm run dev
   ```

2. Ensure test database is seeded with admin user:
   ```bash
   cd backend
   npm run seed-admin
   ```

### Run All Tests
```bash
npm run test:e2e
```

### Run Tests in UI Mode (Interactive)
```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode (See Browser)
```bash
npm run test:e2e:headed
```

### Run Specific Test File
```bash
npx playwright test e2e-tests/auth.spec.ts
```

### View Test Report
```bash
npm run test:e2e:report
```

## Test Configuration

- **Base URL:** http://localhost:3000
- **Browser:** Chromium
- **Retries:** 2 (in CI), 0 (local)
- **Timeout:** 30s per test
- **Screenshots:** On failure
- **Videos:** On failure
- **Traces:** On failure

## Test Data

Test credentials are defined in `helpers/test-data.ts`:
- **Admin:** admin@denfit.com / admin123
- **Customer:** test@example.com / password123

## CI Integration

Tests are configured to run in GitHub Actions (see `.github/workflows/ci.yml`).

## Troubleshooting

### Tests Failing Due to Timeout
- Increase timeout in `playwright.config.ts`
- Ensure backend/frontend are running and responsive

### Element Not Found
- Check if selectors match actual DOM structure
- Use `page.pause()` to debug interactively

### Authentication Issues
- Verify test users exist in database
- Check if JWT tokens are being set correctly

## Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Wait for navigation** after form submissions
3. **Clean up test data** after tests (if applicable)
4. **Use helper functions** for common operations
5. **Keep tests independent** - don't rely on test order

## Future Improvements

- [ ] Add API mocking for payment gateway
- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add mobile viewport tests
- [ ] Add accessibility testing with axe-core
- [ ] Add email verification flow tests
- [ ] Add webhook testing
