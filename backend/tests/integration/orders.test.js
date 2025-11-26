// Integration tests for orders endpoints
import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Orders API Integration Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3002';
  let adminToken = '';
  let userToken = '';
  let testOrderId = '';

  // Helper to get tokens
  async function getAdminToken() {
    const response = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@denfit.com',
        password: 'admin123'
      })
    });
    const data = await response.json();
    return data.token;
  }

  test('POST /api/v1/orders - should create order', async () => {
    // Login as user first
    const loginRes = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@denfit.com',
        password: 'admin123'
      })
    });
    const loginData = await loginRes.json();
    userToken = loginData.token;

    // Get a product
    const productsRes = await fetch(`${baseURL}/api/v1/products`);
    const productsData = await productsRes.json();
    const product = productsData.data.products[0];

    if (!product) {
      console.log('No products found, skipping test');
      return;
    }

    // Create order
    const response = await fetch(`${baseURL}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        items: [{
          product: product._id,
          quantity: 2,
          price: product.price
        }],
        shippingAddress: {
          fullName: 'Test User',
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          phone: '555-1234'
        },
        paymentMethod: 'card'
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 201, 'Should return 201 Created');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.order, 'Should return order data');
    testOrderId = data.data.order._id;
  });

  test('GET /api/v1/orders - user should get their orders', async () => {
    const response = await fetch(`${baseURL}/api/v1/orders`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
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

    const response = await fetch(`${baseURL}/api/v1/orders/${testOrderId}`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.order, 'Should return order data');
  });

  test('GET /api/v1/admin/orders - admin should get all orders', async () => {
    adminToken = await getAdminToken();

    const response = await fetch(`${baseURL}/api/v1/admin/orders`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
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

    const response = await fetch(`${baseURL}/api/v1/admin/orders/${testOrderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        status: 'processing'
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

    const response = await fetch(`${baseURL}/api/v1/admin/orders/${testOrderId}/tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
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

    const response = await fetch(`${baseURL}/api/v1/admin/orders/${testOrderId}/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        amount: 10.00,
        reason: 'Test refund'
      })
    });

    const data = await response.json();
    assert.ok([200, 201].includes(response.status), 'Should return 200 or 201');
  });
});
