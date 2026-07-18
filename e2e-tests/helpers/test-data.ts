// Test data and helper functions for E2E tests

export const testUsers = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@denfit.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!',
    role: 'admin'
  },
  customer: {
    email: 'test@example.com',
    password: 'password123',
    role: 'user'
  },
  newUser: {
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    role: 'user'
  }
};

export const testProduct = {
  name: 'Test Product E2E',
  description: 'This is a test product created by E2E tests',
  price: 29.99,
  stock: 100,
  category: 'Supplements'
};

export const testAddress = {
  fullName: 'John Doe',
  address: '123 Main Street',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  phone: '555-1234-5678'
};

export const testOrder = {
  status: 'pending',
  trackingNumber: 'TRACK123456789',
  carrier: 'FedEx',
  note: 'Test order note from E2E tests'
};

// Helper to wait for API response
export async function waitForApiResponse(page: any, urlPattern: string | RegExp, timeout = 5000) {
  return page.waitForResponse(
    (response: any) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

// Helper to login
export async function loginAsAdmin(page: any) {
  await page.goto('/auth');
  await page.fill('input[name="email"]', testUsers.admin.email);
  await page.fill('input[name="password"]', testUsers.admin.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(home|dashboard|admin)/, { timeout: 10000 });
}

export async function loginAsCustomer(page: any) {
  await page.goto('/auth');
  await page.fill('input[name="email"]', testUsers.customer.email);
  await page.fill('input[name="password"]', testUsers.customer.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(home|dashboard)/, { timeout: 10000 });
}

// Helper to add product to cart
export async function addProductToCart(page: any) {
  await page.goto('/shop');
  await page.locator('[data-testid="product-card"], .product-card').first().click();
  await page.click('button:has-text("Add to Cart"), button:has-text("Add To Cart")');
  await page.waitForTimeout(1000);
}

// Helper to clear cart
export async function clearCart(page: any) {
  await page.click('[aria-label="Cart"], button:has-text("Cart")');
  const removeButtons = page.locator('button:has-text("Remove"), [aria-label="Remove item"]');
  const count = await removeButtons.count();
  for (let i = 0; i < count; i++) {
    await removeButtons.first().click();
    await page.waitForTimeout(500);
  }
}
