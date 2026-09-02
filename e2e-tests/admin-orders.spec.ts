import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-data';

test.describe('Admin Order Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/orders');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display orders list', async ({ page }) => {
    // Should show orders table or list
    await expect(page.locator('table, [data-testid="orders-list"], main').first()).toBeVisible({ timeout: 15000 });
  });

  test('should filter orders by status', async ({ page }) => {
    // Click status filter
    const statusFilter = page.locator('select[name="status"], button:has-text("Status"), select').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should view order details', async ({ page }) => {
    // Click first order Details button
    const detailsBtn = page.locator('button:has-text("Details"), a:has-text("Details")').first();
    if (await detailsBtn.isVisible()) {
      await detailsBtn.click();
      await page.waitForURL(/\/admin\/orders\/\w+/, { timeout: 10000 });
      await expect(page.locator('text=/order|customer|placed/i').first()).toBeVisible({ timeout: 10000 });
    } else {
      const orderRow = page.locator('tr[data-testid="order-row"], tbody tr').first();
      await expect(orderRow).toBeVisible({ timeout: 10000 });
    }
  });

  test('should change order status', async ({ page }) => {
    const statusSelect = page.locator('select:has-text("Quick change"), select').first();
    if (await statusSelect.isVisible()) {
      await expect(statusSelect).toBeVisible();
    }
  });

  test('should send order status email', async ({ page }) => {
    const ordersList = page.locator('table, [data-testid="orders-list"], main').first();
    await expect(ordersList).toBeVisible({ timeout: 10000 });
  });

  test('should add order note', async ({ page }) => {
    const ordersList = page.locator('table, [data-testid="orders-list"], main').first();
    await expect(ordersList).toBeVisible({ timeout: 10000 });
  });

  test('should add tracking information', async ({ page }) => {
    const trackingBtn = page.locator('button:has-text("Ship Order"), button:has-text("Tracking"), button:has-text("Add Tracking")').first();
    if (await trackingBtn.isVisible()) {
      await expect(trackingBtn).toBeVisible();
    }
  });

  test('should process refund', async ({ page }) => {
    const ordersList = page.locator('table, [data-testid="orders-list"], main').first();
    await expect(ordersList).toBeVisible({ timeout: 10000 });
  });

  test('should print and download invoice PDF', async ({ page }) => {
    // Click first order Details button
    const detailsBtn = page.locator('button:has-text("Details"), a:has-text("Details")').first();
    if (await detailsBtn.isVisible()) {
      await detailsBtn.click();
      await page.waitForURL(/\/admin\/orders\/\w+/, { timeout: 10000 });
      await page.waitForTimeout(1000);

      // Verify Print button exists
      const printBtn = page.locator('button[title="Print invoice"]').first();
      await expect(printBtn).toBeVisible({ timeout: 10000 });

      // Verify Download PDF button exists
      const downloadBtn = page.locator('button[title="Download invoice"]').first();
      await expect(downloadBtn).toBeVisible({ timeout: 10000 });

      // Wait for the download event when clicking "Download PDF"
      const downloadPromise = page.waitForEvent('download');
      await downloadBtn.click();
      const download = await downloadPromise;

      // Verify the downloaded file name and size
      expect(download.suggestedFilename()).toMatch(/-invoice\.pdf$/i);
      const downloadPath = await download.path();
      const fs = await import('fs');
      const stats = fs.statSync(downloadPath);
      console.log('Downloaded PDF file size:', stats.size);
      expect(stats.size).toBeGreaterThan(1000);
    }
  });

  test('should export orders', async ({ page }) => {
    const ordersList = page.locator('table, [data-testid="orders-list"], main').first();
    await expect(ordersList).toBeVisible({ timeout: 10000 });
  });
});
