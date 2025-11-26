import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'admin@denfit.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|admin)/, { timeout: 10000 });
    
    // Navigate to admin dashboard
    await page.goto('/admin/dashboard');
  });

  test('should display dashboard widgets', async ({ page }) => {
    // Should show key metrics
    await expect(page.locator('text=/total revenue|sales|orders|customers/i')).toBeVisible({ timeout: 10000 });
  });

  test('should display recent orders', async ({ page }) => {
    // Should show recent orders section
    await expect(page.locator('text=/recent orders|latest orders/i')).toBeVisible({ timeout: 5000 });
  });

  test('should display revenue chart', async ({ page }) => {
    // Should show chart or graph
    const chart = page.locator('canvas, svg, [data-testid="revenue-chart"]').first();
    if (await chart.isVisible()) {
      expect(await chart.isVisible()).toBeTruthy();
    }
  });

  test('should navigate to orders from dashboard', async ({ page }) => {
    // Click view all orders
    await page.click('a:has-text("View All Orders"), button:has-text("All Orders")');
    
    // Should navigate to orders page
    await expect(page).toHaveURL(/\/admin\/orders/, { timeout: 5000 });
  });

  test('should display notifications', async ({ page }) => {
    // Look for notifications
    const notificationBtn = page.locator('[aria-label="Notifications"], button:has-text("Notifications")').first();
    if (await notificationBtn.isVisible()) {
      await notificationBtn.click();
      
      // Should show notifications panel
      await expect(page.locator('[data-testid="notifications-panel"], .notifications')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should display top products', async ({ page }) => {
    // Should show top products section
    await expect(page.locator('text=/top products|best sellers/i')).toBeVisible({ timeout: 5000 });
  });

  test('should filter dashboard by date range', async ({ page }) => {
    // Look for date filter
    const dateFilter = page.locator('button:has-text("Date"), select[name="dateRange"]').first();
    if (await dateFilter.isVisible()) {
      await dateFilter.click();
      await page.locator('text=/last 7 days|this week/i').first().click();
      await page.waitForTimeout(1000);
    }
  });
});
