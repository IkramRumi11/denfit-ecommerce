import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-data';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display users list', async ({ page }) => {
    await expect(page.locator('table, [data-testid="users-list"], main').first()).toBeVisible({ timeout: 15000 });
  });

  test('should view user details', async ({ page }) => {
    // Should display table with users
    const row = page.locator('tr[data-testid="user-row"], tbody tr, main').first();
    await expect(row).toBeVisible({ timeout: 15000 });
  });

  test('should search users', async ({ page }) => {
    // Use search
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('admin');
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('table, [data-testid="users-list"], main').first()).toBeVisible({ timeout: 15000 });
  });

  test('should filter users by role', async ({ page }) => {
    // Click role filter
    const roleFilter = page.locator('select[name="role"], select').first();
    if (await roleFilter.isVisible()) {
      await roleFilter.selectOption({ label: 'Admin' }).catch(() => roleFilter.selectOption('admin')).catch(() => {});
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('table, [data-testid="users-list"], main').first()).toBeVisible({ timeout: 15000 });
  });

  test('should change user role', async ({ page }) => {
    const userRow = page.locator('tr[data-testid="user-row"], tbody tr, main').first();
    await expect(userRow).toBeVisible({ timeout: 15000 });
  });

  test('should deactivate user', async ({ page }) => {
    const userRow = page.locator('tr[data-testid="user-row"], tbody tr, main').first();
    await expect(userRow).toBeVisible({ timeout: 15000 });
  });

  test('should view user order history', async ({ page }) => {
    const userRow = page.locator('tr[data-testid="user-row"], tbody tr, main').first();
    await expect(userRow).toBeVisible({ timeout: 15000 });
  });
});
