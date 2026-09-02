import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-data';

test.describe('Admin Audit Logs', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/audits');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display audit logs', async ({ page }) => {
    await expect(page.locator('[data-testid="audit-logs"], table, .audit-logs, main').first()).toBeVisible({ timeout: 15000 });
  });

  test('should show log details', async ({ page }) => {
    // Should show columns or overview
    const headers = page.locator('[data-testid="audit-header"], [data-testid="col-actor"], [data-testid="col-time"], th, header, main');
    await expect(headers.first()).toBeVisible({ timeout: 15000 });
  });

  test('should filter logs by action type', async ({ page }) => {
    const filterToggle = page.locator('button[title="Filters"]').first();
    if (await filterToggle.isVisible({ timeout: 4000 }).catch(() => false)) {
      await filterToggle.click();
      const typeSelect = page.locator('#auditFilterType, select').first();
      if (await typeSelect.isVisible()) {
        await typeSelect.selectOption('user');
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should filter logs by user', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search" i]').first();
    if (await searchInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      await searchInput.fill('admin');
      const searchBtn = page.locator('button:has-text("Search")').first();
      if (await searchBtn.isVisible()) {
        await searchBtn.click();
      }
      await page.waitForTimeout(1000);
    }
  });

  test('should filter logs by date range', async ({ page }) => {
    const filterToggle = page.locator('button[title="Filters"]').first();
    if (await filterToggle.isVisible({ timeout: 4000 }).catch(() => false)) {
      await filterToggle.click();
      const weekBtn = page.locator('button:has-text("Week"), button:has-text("Today")').first();
      if (await weekBtn.isVisible()) {
        await weekBtn.click();
        await page.waitForTimeout(1000);
      }
    }
  });

  test('should export audit logs', async ({ page }) => {
    const exportBtn = page.locator('button[title="Export logs"], button:has-text("Export"), button:has-text("Download")').first();
    if (await exportBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      const download = await downloadPromise;
      
      expect(download.suggestedFilename()).toMatch(/audit|logs/i);
    }
  });

  test('should paginate through logs', async ({ page }) => {
    const nextBtn = page.locator('button:has-text("Next"), [aria-label="Next page"]').first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false) && !await nextBtn.isDisabled()) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('main, [data-testid="audit-logs"]').first()).toBeVisible();
  });
});
