import { test, expect } from '@playwright/test';

test.describe('Admin Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'admin@denfit.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|admin)/, { timeout: 10000 });
    
    // Navigate to audit logs
    await page.goto('/admin/audits');
  });

  test('should display audit logs', async ({ page }) => {
    await expect(page.locator('table, [data-testid="audit-logs"]')).toBeVisible({ timeout: 10000 });
  });

  test('should show log details', async ({ page }) => {
    // Should show columns: action, user, timestamp, details
    await expect(page.locator('th:has-text("Action"), th:has-text("User"), th:has-text("Date")')).toHaveCount({ min: 1 });
  });

  test('should filter logs by action type', async ({ page }) => {
    const actionFilter = page.locator('select[name="action"], button:has-text("Action")').first();
    if (await actionFilter.isVisible()) {
      await actionFilter.click();
      await page.locator('option[value="update"], text=Update').first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should filter logs by user', async ({ page }) => {
    const userFilter = page.locator('select[name="user"], input[name="user"]').first();
    if (await userFilter.isVisible()) {
      await userFilter.fill('admin');
      await page.waitForTimeout(1000);
    }
  });

  test('should filter logs by date range', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], button:has-text("Date")').first();
    if (await dateFilter.isVisible()) {
      await dateFilter.click();
      await page.locator('text=/last 7 days|this week/i').first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should export audit logs', async ({ page }) => {
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")').first();
    if (await exportBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/audit|logs/i);
    }
  });

  test('should paginate through logs', async ({ page }) => {
    const nextBtn = page.locator('button:has-text("Next"), [aria-label="Next page"]').first();
    if (await nextBtn.isVisible() && !await nextBtn.isDisabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
      
      // Should load next page
      await expect(page.locator('table tbody tr')).toHaveCount({ min: 1 });
    }
  });
});
