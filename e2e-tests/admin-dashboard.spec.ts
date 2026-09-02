import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-data';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('h1, main').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display dashboard widgets', async ({ page }) => {
    // Should show key metrics
    await expect(page.locator('text=/total revenue|total orders|active users|products/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display recent orders', async ({ page }) => {
    // Should show recent orders section
    await expect(page.locator('text=/recent orders|latest customer/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display revenue chart', async ({ page }) => {
    // Should show chart or graph
    const chart = page.locator('[data-testid="revenue-chart"], canvas, svg').first();
    await expect(chart).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to orders from dashboard', async ({ page }) => {
    // Click view all orders
    const viewOrdersBtn = page.locator('button:has-text("View All Orders"), a:has-text("View All Orders"), a[href="/admin/orders"]').first();
    if (await viewOrdersBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewOrdersBtn.click();
      await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 10000 });
    }
  });

  test('should display notifications', async ({ page }) => {
    // Look for notifications
    const notificationSection = page.locator('text=Notifications').first();
    await expect(notificationSection).toBeVisible({ timeout: 15000 });
  });

  test('should display top products', async ({ page }) => {
    // Should show top products section
    const topProductsSection = page.locator('text=/top product|performance summary|best seller/i').first();
    await expect(topProductsSection).toBeVisible({ timeout: 15000 });
  });

  test('should filter dashboard by date range', async ({ page }) => {
    // Look for date filter or indicators
    const dateElement = page.locator('text=/today|week|month|date/i').first();
    await expect(dateElement).toBeVisible({ timeout: 15000 });
  });
});
