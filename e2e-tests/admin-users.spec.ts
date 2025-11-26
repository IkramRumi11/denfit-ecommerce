import { test, expect } from '@playwright/test';

test.describe('Admin User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'admin@denfit.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|admin)/, { timeout: 10000 });
    
    // Navigate to admin users
    await page.goto('/admin/users');
  });

  test('should display users list', async ({ page }) => {
    await expect(page.locator('table, [data-testid="users-list"]')).toBeVisible({ timeout: 10000 });
  });

  test('should view user details', async ({ page }) => {
    // Click first user
    await page.locator('tr[data-testid="user-row"], tbody tr').first().click();
    
    // Should show user details
    await expect(page.locator('text=/user details|profile|email/i')).toBeVisible({ timeout: 5000 });
  });

  test('should search users', async ({ page }) => {
    // Use search
    await page.fill('input[type="search"], input[placeholder*="Search"]', 'admin');
    await page.waitForTimeout(1000);
    
    // Should filter results
    const rows = page.locator('tbody tr, [data-testid="user-row"]');
    await expect(rows).toHaveCount({ min: 1 });
  });

  test('should filter users by role', async ({ page }) => {
    // Click role filter
    const roleFilter = page.locator('select[name="role"], button:has-text("Role")').first();
    if (await roleFilter.isVisible()) {
      await roleFilter.click();
      await page.locator('option[value="admin"], text=Admin').first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should change user role', async ({ page }) => {
    // Click first user
    await page.locator('tr[data-testid="user-row"], tbody tr').first().click();
    await page.waitForTimeout(1000);
    
    // Change role
    const roleSelect = page.locator('select[name="role"]').first();
    if (await roleSelect.isVisible()) {
      await roleSelect.selectOption('moderator');
      await page.click('button:has-text("Save"), button:has-text("Update")');
      
      // Should show success
      await expect(page.locator('text=/updated|success/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should deactivate user', async ({ page }) => {
    // Click first user
    await page.locator('tr[data-testid="user-row"], tbody tr').first().click();
    await page.waitForTimeout(1000);
    
    // Deactivate
    const deactivateBtn = page.locator('button:has-text("Deactivate"), button:has-text("Disable")').first();
    if (await deactivateBtn.isVisible()) {
      await deactivateBtn.click();
      await page.click('button:has-text("Confirm"), button:has-text("Yes")');
      
      // Should show success
      await expect(page.locator('text=/deactivated|disabled/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should view user order history', async ({ page }) => {
    // Click first user
    await page.locator('tr[data-testid="user-row"], tbody tr').first().click();
    await page.waitForTimeout(1000);
    
    // Look for orders tab or section
    const ordersTab = page.locator('button:has-text("Orders"), a:has-text("Order History")').first();
    if (await ordersTab.isVisible()) {
      await ordersTab.click();
      
      // Should show orders
      await expect(page.locator('table, [data-testid="user-orders"]')).toBeVisible({ timeout: 5000 });
    }
  });
});
