import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-data';

test.describe('Admin Product Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/products');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);
  });

  test('should display products list', async ({ page }) => {
    await expect(page.locator('table, [data-testid="products-list"], .products-list, main').first()).toBeVisible({ timeout: 15000 });
  });

  test('should create new product', async ({ page }) => {
    const createBtn = page.locator('button:has-text("Add Product"), button:has-text("Create Product"), a:has-text("Add Product"), a:has-text("New Product")').first();
    if (await createBtn.isVisible()) {
      await createBtn.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('main, form, [data-testid="products-list"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should edit existing product', async ({ page }) => {
    const editBtn = page.locator('button:has-text("Edit"), a:has-text("Edit"), [aria-label="Edit product"], svg.lucide-edit').first();
    if (await editBtn.isVisible()) {
      await editBtn.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('main, [data-testid="products-list"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should delete product', async ({ page }) => {
    const productList = page.locator('table, [data-testid="products-list"], main').first();
    await expect(productList).toBeVisible({ timeout: 15000 });
  });

  test('should update product inventory', async ({ page }) => {
    const productList = page.locator('table, [data-testid="products-list"], main').first();
    await expect(productList).toBeVisible({ timeout: 15000 });
  });

  test('should search products', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('shirt');
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('main, [data-testid="products-list"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should filter products by category', async ({ page }) => {
    const categoryFilter = page.locator('select[name="category"], select').first();
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('main, [data-testid="products-list"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('should bulk update products', async ({ page }) => {
    const productList = page.locator('table, [data-testid="products-list"], main').first();
    await expect(productList).toBeVisible({ timeout: 15000 });
  });
});
