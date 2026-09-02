// Integration tests for orders endpoints
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { apiRequest, getAdminToken, adminEmail, adminPassword } from './testHelper.js';

describe('Orders API Integration Tests', () => {
  let adminToken = '';
  let userToken = '';
  let testOrderId = '';

  test('POST /api/v1/orders - should create order', async () => {
    adminToken = await getAdminToken();
    userToken = adminToken;

    // Create a product specifically for this order test with valid sizes, variants, and stock
    const createProdRes = await apiRequest('/api/v1/admin/products', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        name: `Order Test Product ${Date.now()}`,
        description: 'Product for order integration testing',
        price: 99.99,
        inventory: 100,
        category: 'clothing',
        gender: 'men',
        sizes: [{ id: 'size_m', value: 'M', inStock: true, quantity: 50 }],
        colors: [{ name: 'Black', hex: '#000000' }],
        variants: [{ name: 'Black', hex: '#000000', availableSizes: ['M'], inventory: 50 }],
        stock: [{ colorTempId: 'Black', sizeId: 'size_m', quantity: 50 }],
        images: [{ url: 'https://example.com/test-order-product.jpg', isPrimary: true, order: 0 }]
      })
    });

    const createProdData = await createProdRes.json();
    const product = createProdData.data?.product;
    assert.ok(product && product._id, 'Test product should be created');

    // Create order
    const response = await apiRequest('/api/v1/orders', {
      method: 'POST',
      token: userToken,
      body: JSON.stringify({
        items: [{
          product: product._id,
          quantity: 1,
          price: product.price,
          size: 'M',
          color: { name: 'Black', hex: '#000000' }
        }],
        shippingAddress: {
          name: 'Test Customer Full Name',
          street: '123 Main Street Extension, Flat 4B',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'Pakistan',
          phone: '03001234567',
          email: 'admin@denfit.com'
        },
        paymentMethod: 'cash_on_delivery'
      })
    });

    const data = await response.json();
    if (response.status !== 201) {
      console.error('Create order failed:', JSON.stringify(data, null, 2));
    }
    assert.strictEqual(response.status, 201, 'Should return 201 Created');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.order, 'Should return order data');
    testOrderId = data.data.order._id;
  });

  test('GET /api/v1/orders - user should get their orders', async () => {
    adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/orders', {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(Array.isArray(data.data.orders), 'Should return orders array');
  });

  test('GET /api/v1/orders/:id - user should get order details', async () => {
    if (!testOrderId) {
      console.log('No test order, skipping');
      return;
    }

    adminToken = await getAdminToken();

    const response = await apiRequest(`/api/v1/orders/${testOrderId}`, {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.order, 'Should return order data');
  });

  test('GET /api/v1/admin/orders - admin should get all orders', async () => {
    adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/admin/orders', {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(Array.isArray(data.data.orders), 'Should return orders array');
  });

  test('PUT /api/v1/admin/orders/:id/status - admin should update order status', async () => {
    if (!testOrderId) {
      console.log('No test order, skipping');
      return;
    }

    adminToken = await getAdminToken();

    const response = await apiRequest(`/api/v1/admin/orders/${testOrderId}`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        status: 'confirmed'
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('POST /api/v1/admin/orders/:id/tracking - admin should add tracking', async () => {
    if (!testOrderId) {
      console.log('No test order, skipping');
      return;
    }

    adminToken = await getAdminToken();

    const response = await apiRequest(`/api/v1/admin/orders/${testOrderId}/tracking`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        trackingNumber: 'TRACK123456',
        carrier: 'FedEx'
      })
    });

    const data = await response.json();
    assert.ok([200, 201].includes(response.status), 'Should return 200 or 201');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('POST /api/v1/admin/orders/:id/refund - admin should process refund', async () => {
    if (!testOrderId) {
      console.log('No test order, skipping');
      return;
    }

    adminToken = await getAdminToken();

    const response = await apiRequest(`/api/v1/admin/orders/${testOrderId}/refund`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        amount: 10.00,
        reason: 'Test refund'
      })
    });

    assert.ok([200, 201].includes(response.status), 'Should return 200 or 201');
  });
});
