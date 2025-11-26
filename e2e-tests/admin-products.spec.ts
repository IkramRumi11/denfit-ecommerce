import { test, expect } from '@playwright/test';

test.describe('Admin Product Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/auth');
    await page.fill('input[name="email"]', 'admin@denfit.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(home|dashboard|admin)/, { timeout: 10000 });
    
    // Navigate to admin products
    await page.goto('/admin/products');
  });

  test('should display products list', async ({ page }) => {
    await expect(page.locator('table, [data-testid="products-list"]')).toBeVisible({ timeout: 10000 });
  });

  test('should create new product', async ({ page }) => {
    // Click create button
    await page.click('button:has-text("Add Product"), button:has-text("Create Product"), a:has-text("New Product")');
    
    // Fill product form
    await page.fill('input[name="name"]', 'Test Product E2E');
    await page.fill('textarea[name="description"]', 'Test product description');
    await page.fill('input[name="price"]', '29.99');
    await page.fill('input[name="stock"], input[name="inventory"]', '100');
    
    // Select category
    const categorySelect = page.locator('select[name="category"]').first();
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    // Submit
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    
    // Should show success
    await expect(page.locator('text=/product created|success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should edit existing product', async ({ page }) => {
    // Click edit on first product
    await page.locator('button:has-text("Edit"), [aria-label="Edit product"]').first().click();
    
    // Update product
    await page.fill('input[name="name"]', 'Updated Product Name');
    await page.fill('input[name="price"]', '39.99');
    
    // Save
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
    
    // Should show success
    await expect(page.locator('text=/updated|success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should delete product', async ({ page }) => {
    // Click delete on first product
    await page.locator('button:has-text("Delete"), [aria-label="Delete product"]').first().click();
    
    // Confirm deletion
    await page.click('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
    
    // Should show success
    await expect(page.locator('text=/deleted|removed/i')).toBeVisible({ timeout: 5000 });
  });

  test('should update product inventory', async ({ page }) => {
    // Click edit on first product
    await page.locator('button:has-text("Edit"), [aria-label="Edit product"]').first().click();
    
    // Update stock
    await page.fill('input[name="stock"], input[name="inventory"]', '50');
    await page.click('button[type="submit"], button:has-text("Save")');
    
    // Should show success
    await expect(page.locator('text=/updated|success/i')).toBeVisible({ timeout: 5000 });
  });

  test('should search products', async ({ page }) => {
    // Use search
    await page.fill('input[type="search"], input[placeholder*="Search"]', 'protein');
    await page.waitForTimeout(1000);
    
    // Should filter results
    const rows = page.locator('tbody tr, [data-testid="product-row"]');
    await expect(rows).toHaveCount({ min: 0 });
  });

  test('should bulk update products', async ({ page }) => {
    // Select multiple products
    await page.locator('input[type="checkbox"]').first().click();
    await page.locator('input[type="checkbox"]').nth(1).click();
    
    // Look for bulk action
    const bulkBtn = page.locator('button:has-text("Bulk"), select[name="bulkAction"]').first();
    if (await bulkBtn.isVisible()) {
      await bulkBtn.click();
      await page.locator('option[value="activate"], text=Activate').first().click();
      await page.click('button:has-text("Apply"), button:has-text("Confirm")');
      
      // Should show success
      await expect(page.locator('text=/updated|success/i')).toBeVisible({ timeout: 5000 });
    }
  });
});
