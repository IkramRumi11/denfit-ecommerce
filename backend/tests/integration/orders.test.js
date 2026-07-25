// Integration tests for orders endpoints
import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Orders API Integration Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3002';
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@denfit.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';
  let adminToken = '';
  let userToken = '';
  let testOrderId = '';

  // Helper to get tokens
  async function getAdminToken() {
    const response = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });
    const cookie = response.headers.get('set-cookie');
    const match = cookie && cookie.match(/jwt=([^;]+)/);
    return match ? match[1] : '';
  }

  test('POST /api/v1/orders - should create order', async () => {
    // Login as user first
    const loginRes = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });
    const cookie = loginRes.headers.get('set-cookie');
    const match = cookie && cookie.match(/jwt=([^;]+)/);
    userToken = match ? match[1] : '';

    // Get a product
    const productsRes = await fetch(`${baseURL}/api/v1/products`);
    const productsData = await productsRes.json();
    const product = productsData.data.products[0];

    if (!product) {
      console.log('No products found, skipping test');
      return;
    }

    const size = (product.sizesObjects && product.sizesObjects[0]?.value) || (product.sizes && product.sizes[0]) || 'One size';
    const color = (product.colors && product.colors[0]) ? product.colors[0].name : undefined;

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
          quantity: 1,
          price: product.price,
          size,
          ...(color ? { color } : {})
        }],
        shippingAddress: {
          name: 'Test User Name', // required name
          street: '123 Main Street Extension, Flat 4B', // required >= 20 chars
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          phone: '03001234567' // required phone format
        },
        paymentMethod: 'cash_on_delivery' // required payment method
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

    const response = await fetch(`${baseURL}/api/v1/admin/orders/${testOrderId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
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

    const response = await fetch(`${baseURL}/api/v1/admin/orders/${testOrderId}/tracking`, {
      method: 'PATCH',
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
      method: 'PATCH',
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
