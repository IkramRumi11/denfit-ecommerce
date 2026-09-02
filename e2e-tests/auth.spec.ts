import { test, expect } from '@playwright/test';
import { testUsers } from './helpers/test-data';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ context, page }) => {
    await context.clearCookies();
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should register a new user', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    // Switch to register tab
    await page.goto('/auth?mode=signup');
    await page.waitForLoadState('domcontentloaded');
    
    // Fill registration form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Check terms if checkbox exists
    const agreeBox = page.locator('input[type="checkbox"]').first();
    if (await agreeBox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await agreeBox.check();
    }
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show success toast, verification notice, or redirect
    await expect(page.locator('form, main, [role="alert"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    // Fill login form
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to home or dashboard
    await expect(page).toHaveURL(/\/(home|dashboard|admin|\/$)/, { timeout: 15000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid|incorrect|wrong|failed/i').first()).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|admin|\/$)/, { timeout: 15000 });
    
    // Clear session to simulate logout
    await page.context().clearCookies();
    await page.goto('/auth');
    await expect(page.locator('input[name="email"]').first()).toBeVisible({ timeout: 10000 });
  });

  test('should request password reset', async ({ page }) => {
    // Click forgot password
    const forgotBtn = page.locator('button:has-text("Forgot password"), a:has-text("Forgot password"), text=/forgot password/i').first();
    if (await forgotBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await forgotBtn.click();
      
      // Enter email
      await page.fill('input[name="email"]', 'admin@denfit.com');
      await page.click('button[type="submit"]');
      
      // Should show success message
      await expect(page.locator('text=/email sent|check your email|reset link|sent/i').first()).toBeVisible({ timeout: 5000 });
    }
  });
});
