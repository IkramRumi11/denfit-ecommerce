import { test, expect } from '@playwright/test';
import { testUsers } from './helpers/test-data';

test.describe('Authentication Flows', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test('should register a new user', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to auth page
    await page.click('text=Sign In');
    
    // Switch to register tab
    await page.click('text=Sign Up');
    
    // Fill registration form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should show success message or redirect
    await expect(page).toHaveURL(/\/(home|verify-email|dashboard)/, { timeout: 10000 });
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    // Fill login form
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Should redirect to home or dashboard
    await expect(page).toHaveURL(/\/(home|dashboard|admin)/, { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=/invalid|incorrect|wrong/i')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.fill('input[name="email"]', testUsers.admin.email);
    await page.fill('input[name="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|admin)/, { timeout: 10000 });
    
    // Logout
    await page.click('[aria-label="User menu"], [aria-label="Profile menu"], text=Logout');
    await page.click('text=Logout, text=Sign Out');
    
    // Should redirect to home
    await expect(page).toHaveURL('/', { timeout: 5000 });
  });

  test('should request password reset', async ({ page }) => {
    await page.goto('/auth');
    
    // Click forgot password
    await page.click('text=Forgot Password');
    
    // Enter email
    await page.fill('input[name="email"]', 'admin@denfit.com');
    await page.click('button[type="submit"]');
    
    // Should show success message
    await expect(page.locator('text=/email sent|check your email|reset link/i')).toBeVisible({ timeout: 5000 });
  });
});
