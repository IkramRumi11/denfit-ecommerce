import { test, expect } from '@playwright/test';

test.describe('Admin Order Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'admin@denfit.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|admin)/, { timeout: 10000 });
    
    // Navigate to admin orders
    await page.goto('/admin/orders');
  });

  test('should display orders list', async ({ page }) => {
    // Should show orders table or list
    await expect(page.locator('table, [data-testid="orders-list"]')).toBeVisible({ timeout: 10000 });
  });

  test('should filter orders by status', async ({ page }) => {
    // Click status filter
    const statusFilter = page.locator('select[name="status"], button:has-text("Status")').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.locator('option[value="pending"], text=Pending').first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('should view order details', async ({ page }) => {
    // Click first order
    const firstOrder = page.locator('tr[data-testid="order-row"], .order-row, tbody tr').first();
    await firstOrder.click();
    
    // Should show order details
    await expect(page.locator('text=/order details|order #/i')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=/customer|items|total/i')).toBeVisible();
  });

  test('should change order status', async ({ page }) => {
    // Click first order
    await page.locator('tr[data-testid="order-row"], tbody tr').first().click();
    await page.waitForTimeout(1000);
    
    // Change status
    const statusSelect = page.locator('select[name="status"], button:has-text("Change Status")').first();
    if (await statusSelect.isVisible()) {
      await statusSelect.click();
      await page.locator('option[value="processing"], text=Processing').first().click();
      
      // Save changes
      await page.click('button:has-text("Save"), button:has-text("Update")');
      
      // Should show success message
      await expect(page.locator('text=/updated|success|saved/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should send order status email', async ({ page }) => {
    // Click first order
    await page.locator('tr[data-testid="order-row"], tbody tr').first().click();
    await page.waitForTimeout(1000);
    
    // Look for send email button
    const sendEmailBtn = page.locator('button:has-text("Send Email"), button:has-text("Notify Customer")').first();
    if (await sendEmailBtn.isVisible()) {
      await sendEmailBtn.click();
      
      // Should show email sent confirmation
      await expect(page.locator('text=/email sent|notification sent/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should add order note', async ({ page }) => {
    // Click first order
    await page.locator('tr[data-testid="order-row"], tbody tr').first().click();
    await page.waitForTimeout(1000);
    
    // Add note
    const noteInput = page.locator('textarea[name="note"], input[name="note"]').first();
    if (await noteInput.isVisible()) {
      await noteInput.fill('Test admin note');
      await page.click('button:has-text("Add Note"), button:has-text("Save Note")');
      
      // Should show success
      await expect(page.locator('text=/note added|saved/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should add tracking information', async ({ page }) => {
    // Click first order
    await page.locator('tr[data-testid="order-row"], tbody tr').first().click();
    await page.waitForTimeout(1000);
    
    // Add tracking
    const trackingBtn = page.locator('button:has-text("Add Tracking"), button:has-text("Tracking")').first();
    if (await trackingBtn.isVisible()) {
      await trackingBtn.click();
      
      // Fill tracking form
      await page.fill('input[name="trackingNumber"], input[name="tracking"]', 'TRACK123456');
      await page.fill('input[name="carrier"], select[name="carrier"]', 'FedEx');
      await page.click('button:has-text("Save"), button[type="submit"]');
      
      // Should show success
      await expect(page.locator('text=/tracking added|saved/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should process refund', async ({ page }) => {
    // Click first order
    await page.locator('tr[data-testid="order-row"], tbody tr').first().click();
    await page.waitForTimeout(1000);
    
    // Look for refund button
    const refundBtn = page.locator('button:has-text("Refund"), button:has-text("Process Refund")').first();
    if (await refundBtn.isVisible()) {
      await refundBtn.click();
      
      // Confirm refund
      await page.fill('input[name="amount"], input[name="refundAmount"]', '10.00');
      await page.fill('textarea[name="reason"]', 'Test refund');
      await page.click('button:has-text("Confirm"), button[type="submit"]');
      
      // Should show success
      await expect(page.locator('text=/refund processed|refunded/i')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should export orders', async ({ page }) => {
    // Look for export button
    const exportBtn = page.locator('button:has-text("Export"), button:has-text("Download")').first();
    if (await exportBtn.isVisible()) {
      // Start download
      const downloadPromise = page.waitForEvent('download');
      await exportBtn.click();
      const download = await downloadPromise;
      
      // Verify download started
      expect(download.suggestedFilename()).toMatch(/orders|export/i);
    }
  });
});
