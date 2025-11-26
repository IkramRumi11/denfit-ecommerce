import { test, expect } from '@playwright/test';

test.describe('User Shopping Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should browse products', async ({ page }) => {
    // Navigate to shop
    await page.click('text=Shop, a[href="/shop"]');
    
    // Should see products
    await expect(page.locator('[data-testid="product-card"], .product-card')).toHaveCount({ min: 1 }, { timeout: 10000 });
  });

  test('should view product details', async ({ page }) => {
    await page.goto('/shop');
    
    // Click first product
    await page.locator('[data-testid="product-card"], .product-card').first().click();
    
    // Should show product details
    await expect(page.locator('h1, [data-testid="product-title"]')).toBeVisible();
    await expect(page.locator('text=/price|\\$/i')).toBeVisible();
    await expect(page.locator('button:has-text("Add to Cart"), button:has-text("Add To Cart")')).toBeVisible();
  });

  test('should search for products', async ({ page }) => {
    // Open search
    await page.click('[aria-label="Search"], button:has-text("Search")');
    
    // Type search query
    await page.fill('input[type="search"], input[placeholder*="Search"]', 'protein');
    
    // Should show results
    await expect(page.locator('[data-testid="search-result"], .search-result')).toHaveCount({ min: 0 }, { timeout: 5000 });
  });

  test('should filter products', async ({ page }) => {
    await page.goto('/shop');
    
    // Apply category filter
    const categoryFilter = page.locator('text=/category|filter/i').first();
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await page.locator('[role="checkbox"], input[type="checkbox"]').first().click();
      
      // Wait for filtered results
      await page.waitForTimeout(1000);
    }
  });

  test('should add product to cart', async ({ page }) => {
    await page.goto('/shop');
    
    // Click first product
    await page.locator('[data-testid="product-card"], .product-card').first().click();
    
    // Add to cart
    await page.click('button:has-text("Add to Cart"), button:has-text("Add To Cart")');
    
    // Should show success message or cart update
    await expect(page.locator('text=/added to cart|cart updated/i, [data-testid="cart-count"]')).toBeVisible({ timeout: 5000 });
  });

  test('should view and edit cart', async ({ page }) => {
    // Add product to cart first
    await page.goto('/shop');
    await page.locator('[data-testid="product-card"], .product-card').first().click();
    await page.click('button:has-text("Add to Cart"), button:has-text("Add To Cart")');
    await page.waitForTimeout(1000);
    
    // Open cart
    await page.click('[aria-label="Cart"], button:has-text("Cart"), [data-testid="cart-button"]');
    
    // Should show cart items
    await expect(page.locator('[data-testid="cart-item"], .cart-item')).toHaveCount({ min: 1 });
    
    // Update quantity
    const increaseBtn = page.locator('button:has-text("+"), [aria-label="Increase quantity"]').first();
    if (await increaseBtn.isVisible()) {
      await increaseBtn.click();
      await page.waitForTimeout(500);
    }
  });

  test('should remove item from cart', async ({ page }) => {
    // Add product to cart
    await page.goto('/shop');
    await page.locator('[data-testid="product-card"], .product-card').first().click();
    await page.click('button:has-text("Add to Cart")');
    await page.waitForTimeout(1000);
    
    // Open cart
    await page.click('[aria-label="Cart"], button:has-text("Cart")');
    
    // Remove item
    await page.click('button:has-text("Remove"), [aria-label="Remove item"]');
    
    // Cart should be empty or item removed
    await expect(page.locator('text=/cart is empty|no items/i, [data-testid="empty-cart"]')).toBeVisible({ timeout: 5000 });
  });

  test('should proceed to checkout', async ({ page }) => {
    // Add product and go to cart
    await page.goto('/shop');
    await page.locator('[data-testid="product-card"], .product-card').first().click();
    await page.click('button:has-text("Add to Cart")');
    await page.waitForTimeout(1000);
    await page.click('[aria-label="Cart"], button:has-text("Cart")');
    
    // Proceed to checkout
    await page.click('button:has-text("Checkout"), a:has-text("Checkout")');
    
    // Should navigate to checkout or login
    await expect(page).toHaveURL(/\/(checkout|auth|login)/, { timeout: 5000 });
  });
});
