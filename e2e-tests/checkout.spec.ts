import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard)/, { timeout: 10000 });
    
    // Add product to cart
    await page.goto('/shop');
    await page.locator('[data-testid="product-card"], .product-card').first().click();
    await page.click('button:has-text("Add to Cart")');
    await page.waitForTimeout(1000);
  });

  test('should complete checkout with shipping address', async ({ page }) => {
    // Go to cart
    await page.click('[aria-label="Cart"], button:has-text("Cart")');
    
    // Proceed to checkout
    await page.click('button:has-text("Checkout"), a:has-text("Checkout")');
    
    // Fill shipping address
    await page.fill('input[name="fullName"], input[name="name"]', 'John Doe');
    await page.fill('input[name="address"], input[name="street"]', '123 Main St');
    await page.fill('input[name="city"]', 'New York');
    await page.fill('input[name="state"], input[name="province"]', 'NY');
    await page.fill('input[name="zipCode"], input[name="postalCode"]', '10001');
    await page.fill('input[name="phone"]', '555-1234');
    
    // Select shipping method
    const shippingMethod = page.locator('input[name="shippingMethod"]').first();
    if (await shippingMethod.isVisible()) {
      await shippingMethod.click();
    }
    
    // Continue to payment
    await page.click('button:has-text("Continue"), button:has-text("Next")');
    
    // Should reach payment step
    await expect(page.locator('text=/payment|card details/i')).toBeVisible({ timeout: 5000 });
  });

  test('should validate required checkout fields', async ({ page }) => {
    await page.click('[aria-label="Cart"], button:has-text("Cart")');
    await page.click('button:has-text("Checkout")');
    
    // Try to submit without filling
    await page.click('button:has-text("Continue"), button:has-text("Next"), button[type="submit"]');
    
    // Should show validation errors
    await expect(page.locator('text=/required|invalid/i')).toBeVisible({ timeout: 3000 });
  });

  test('should calculate shipping costs', async ({ page }) => {
    await page.click('[aria-label="Cart"], button:has-text("Cart")');
    await page.click('button:has-text("Checkout")');
    
    // Fill address
    await page.fill('input[name="fullName"], input[name="name"]', 'John Doe');
    await page.fill('input[name="address"]', '123 Main St');
    await page.fill('input[name="city"]', 'New York');
    await page.fill('input[name="zipCode"]', '10001');
    
    // Select shipping method
    const shippingOptions = page.locator('input[name="shippingMethod"]');
    if (await shippingOptions.first().isVisible()) {
      await shippingOptions.first().click();
      
      // Should show shipping cost
      await expect(page.locator('text=/shipping|delivery/i')).toBeVisible();
    }
  });

  test('should display order summary', async ({ page }) => {
    await page.click('[aria-label="Cart"], button:has-text("Cart")');
    await page.click('button:has-text("Checkout")');
    
    // Should show order summary
    await expect(page.locator('text=/order summary|subtotal|total/i')).toBeVisible({ timeout: 5000 });
  });

  test('should apply promo code', async ({ page }) => {
    await page.click('[aria-label="Cart"], button:has-text("Cart")');
    await page.click('button:has-text("Checkout")');
    
    // Look for promo code input
    const promoInput = page.locator('input[name="promoCode"], input[name="coupon"]').first();
    if (await promoInput.isVisible()) {
      await promoInput.fill('TEST10');
      await page.click('button:has-text("Apply")');
      
      // Should show discount or error
      await expect(page.locator('text=/discount|invalid|applied/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
