// Integration tests for products endpoints
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { apiRequest, getAdminToken } from './testHelper.js';

describe('Products API Integration Tests', () => {
  let adminToken = '';
  let testProductId = '';

  test('GET /api/v1/products - should return products list', async () => {
    const response = await apiRequest('/api/v1/products');
    const data = await response.json();

    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(Array.isArray(data.data.products), 'Should return products array');
  });

  test('GET /api/v1/products?category=supplements - should filter by category', async () => {
    const response = await apiRequest('/api/v1/products?category=supplements');
    const data = await response.json();

    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(Array.isArray(data.data.products), 'Should return products array');
  });

  test('GET /api/v1/products?search=protein - should search products', async () => {
    const response = await apiRequest('/api/v1/products?search=protein');
    const data = await response.json();

    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(Array.isArray(data.data.products), 'Should return products array');
  });

  test('GET /api/v1/products?minPrice=10&maxPrice=50 - should filter by price', async () => {
    const response = await apiRequest('/api/v1/products?minPrice=10&maxPrice=50');
    const data = await response.json();

    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(Array.isArray(data.data.products), 'Should return products array');
  });

  test('GET /api/v1/products/:id - should return single product', async () => {
    const listRes = await apiRequest('/api/v1/products');
    const listData = await listRes.json();
    const productId = listData.data.products[0]?._id;

    if (!productId) {
      console.log('No products found, skipping single product test');
      return;
    }

    const response = await apiRequest(`/api/v1/products/${productId}`);
    const data = await response.json();

    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.product, 'Should return product data');
    assert.strictEqual(data.data.product._id, productId, 'Product ID should match');
  });

  test('GET /api/v1/products/invalid-id - should return 404', async () => {
    const response = await apiRequest('/api/v1/products/507f1f77bcf86cd799439011');
    assert.ok([404, 400].includes(response.status), 'Should return 404 or 400');
  });

  test('POST /api/v1/products - admin should create product', async () => {
    adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/admin/products', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        name: 'Test Product API',
        description: 'Test product from integration tests',
        price: 29.99,
        inventory: 100,
        images: [{ url: 'https://example.com/image.jpg', isPrimary: true, order: 0 }],
        category: 'clothing',
        gender: 'men'
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 201, 'Should return 201 Created');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.product, 'Should return product data');
    testProductId = data.data.product._id;
  });

  test('POST /api/v1/products - should reject without auth', async () => {
    const response = await apiRequest('/api/v1/admin/products', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Product',
        price: 29.99
      })
    });

    assert.strictEqual(response.status, 401, 'Should return 401 Unauthorized');
  });

  test('PUT /api/v1/products/:id - admin should update product', async () => {
    if (!testProductId) {
      console.log('No test product, skipping');
      return;
    }

    const response = await apiRequest(`/api/v1/admin/products/${testProductId}`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        name: 'Updated Test Product',
        price: 39.99
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('DELETE /api/v1/products/:id - admin should delete product', async () => {
    if (!testProductId) {
      console.log('No test product, skipping');
      return;
    }

    const response = await apiRequest(`/api/v1/admin/products/${testProductId}`, {
      method: 'DELETE',
      token: adminToken
    });

    assert.ok([200, 204].includes(response.status), 'Should return 200 or 204');
  });
});
