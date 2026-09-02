import { Page } from '@playwright/test';

// Test configuration
export const config = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  apiURL: process.env.API_URL || 'http://localhost:3002/api/v1',
  timeout: 30000,
};

// Test users
export const testUsers = {
  admin: {
    email: 'admin@denfit.com',
    password: 'TestAdmin123!',
    role: 'admin',
    name: 'Admin User',
  },
  customer: {
    email: 'admin@denfit.com',
    password: 'TestAdmin123!',
    role: 'customer',
    name: 'Test Customer',
  },
};

// Test products
export const testProducts = {
  active: {
    name: 'Test Whey Protein',
    price: 49.99,
    category: 'Protein',
    inventory: 100,
  },
  draft: {
    name: 'Draft Pre-Workout',
    price: 39.99,
    category: 'Pre-Workout',
    inventory: 50,
  },
};

// Helper to wait for API response
export async function waitForApiResponse(page: Page, urlPattern: string | RegExp, timeout = 10000) {
  return page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

// Helper to login as Admin
export async function loginAsAdmin(page: any) {
  await page.goto('/auth');
  await page.waitForLoadState('domcontentloaded');
  
  const emailInput = page.locator('input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill(testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(admin|dashboard|\/$)/, { timeout: 15000 });
  }
}

// Helper to login as Customer
export async function loginAsCustomer(page: any) {
  await page.goto('/auth');
  await page.waitForLoadState('domcontentloaded');
  
  const emailInput = page.locator('input[name="email"]').first();
  if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
    await emailInput.fill(testUsers.customer.email);
    await page.fill('input[name="password"]', testUsers.customer.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/(\/(home|dashboard|admin)|\/$)/, { timeout: 15000 });
  }
}

// Helper to add product to cart
export async function addProductToCart(page: any) {
  await page.goto('/shop');
  await page.waitForLoadState('domcontentloaded');
  const card = page.locator('[data-testid="product-card"], .product-card, a[href*="/product/"]').first();
  if (await card.isVisible({ timeout: 5000 }).catch(() => false)) {
    await card.click();
    await page.waitForURL(/\/product\//, { timeout: 10000 });
    
    // Select first available size button if any exist
    const sizeBtn = page.locator('button:not([disabled]):has-text("M"), button:not([disabled]):has-text("S"), button:not([disabled]):has-text("L"), button:not([disabled]):has-text("XL")').first();
    if (await sizeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await sizeBtn.click();
      await page.waitForTimeout(300);
    }
    
    const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")').first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false) && !await addBtn.isDisabled()) {
      await addBtn.click();
      await page.waitForTimeout(1000);
    }
  }
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
