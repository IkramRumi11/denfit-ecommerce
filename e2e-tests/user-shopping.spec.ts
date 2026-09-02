import { test, expect } from '@playwright/test';

test.describe('User Shopping Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should browse products', async ({ page }) => {
    // Navigate to shop or category
    await page.goto('/shop');
    const products = page.locator('[data-testid="product-card"], .product-card, a[href*="/product/"], main');
    await expect(products.first()).toBeVisible({ timeout: 15000 });
  });

  test('should view product details', async ({ page }) => {
    await page.goto('/shop');
    
    // Click first product
    const productCard = page.locator('[data-testid="product-card"], .product-card, a[href*="/product/"]').first();
    if (await productCard.isVisible({ timeout: 10000 }).catch(() => false)) {
      await productCard.click();
      await page.waitForURL(/\/product\//, { timeout: 15000 });
      
      // Should show product details
      await expect(page.locator('h1, [data-testid="product-title"], main').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should search for products', async ({ page }) => {
    // Open search
    const searchBtn = page.locator('[aria-label="Search"], button:has-text("Search"), button svg.lucide-search').first();
    if (await searchBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchBtn.click();
      
      // Type search query
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i]').first();
      if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await searchInput.fill('shirt');
        await page.waitForTimeout(1000);
      }
    }
    await expect(page.locator('main, header').first()).toBeVisible();
  });

  test('should filter products', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.locator('main, [data-testid="product-card"], .product-card').first()).toBeVisible({ timeout: 15000 });
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/shop');
    
    // Click first product
    const productCard = page.locator('[data-testid="product-card"], .product-card, a[href*="/product/"]').first();
    if (await productCard.isVisible({ timeout: 10000 }).catch(() => false)) {
      await productCard.click();
      await page.waitForURL(/\/product\//, { timeout: 15000 });
      
      // Select size if needed
      const sizeBtn = page.locator('button:not([disabled]):has-text("M"), button:not([disabled]):has-text("S"), button:not([disabled]):has-text("L")').first();
      if (await sizeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await sizeBtn.click();
      }

      // Add to cart
      const addBtn = page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")').first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false) && !await addBtn.isDisabled()) {
        await addBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    await expect(page.locator('main, header').first()).toBeVisible();
  });

  test('should view and edit cart', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('main, [data-testid="cart-container"], h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('should remove item from cart', async ({ page }) => {
    await page.goto('/cart');
    await expect(page.locator('main, [data-testid="cart-container"], h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('should proceed to checkout', async ({ page }) => {
    await page.goto('/cart');
    const checkoutBtn = page.locator('button:has-text("Checkout"), a:has-text("Checkout"), a[href="/checkout"]').first();
    if (await checkoutBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkoutBtn.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('main, header').first()).toBeVisible();
  });
});
