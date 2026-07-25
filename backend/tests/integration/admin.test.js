// Integration tests for admin endpoints
import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Admin API Integration Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3002';
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@denfit.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';
  let adminToken = '';

  // Helper to get admin token
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

  test('GET /api/v1/admin/dashboard - should return dashboard stats', async () => {
    adminToken = await getAdminToken();

    const response = await fetch(`${baseURL}/api/v1/admin/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data, 'Should return dashboard data');
  });

  test('GET /api/v1/admin/users - should return users list', async () => {
    const response = await fetch(`${baseURL}/api/v1/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(Array.isArray(data.data.users), 'Should return users array');
  });

  test('GET /api/v1/admin/users/:id - should return user details', async () => {
    // Get first user
    const listRes = await fetch(`${baseURL}/api/v1/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listData = await listRes.json();
    const userId = listData.data.users[0]?._id;

    if (!userId) {
      console.log('No users found, skipping test');
      return;
    }

    const response = await fetch(`${baseURL}/api/v1/admin/users/${userId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.user, 'Should return user data');
  });

  test('PUT /api/v1/admin/users/:id/role - should update user role', async () => {
    // Get first non-admin user
    const listRes = await fetch(`${baseURL}/api/v1/admin/users`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const listData = await listRes.json();
    const user = listData.data.users.find(u => u.role !== 'admin');

    if (!user) {
      console.log('No non-admin users found, skipping test');
      return;
    }

    const response = await fetch(`${baseURL}/api/v1/admin/users/${user._id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        role: 'admin'
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('GET /api/v1/admin/audits - should return audit logs', async () => {
    const response = await fetch(`${baseURL}/api/v1/admin/audits`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(Array.isArray(data.data.audits), 'Should return audits array');
  });

  test('GET /api/v1/admin/audits?action=update - should filter audits by action', async () => {
    const response = await fetch(`${baseURL}/api/v1/admin/audits?action=update`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(Array.isArray(data.data.audits), 'Should return audits array');
  });

  test('GET /api/v1/admin/stats - should return statistics', async () => {
    const response = await fetch(`${baseURL}/api/v1/admin/dashboard/stats`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('Admin endpoints should reject non-admin users', async () => {
    // Register and login as regular user
    const email = `user-${Date.now()}@example.com`;
    const password = 'password123';
    await fetch(`${baseURL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Regular User',
        email,
        password,
        confirmPassword: password
      })
    });

    const loginRes = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const cookie = loginRes.headers.get('set-cookie');
    const match = cookie && cookie.match(/jwt=([^;]+)/);
    const userToken = match ? match[1] : '';

    if (!userToken) {
      console.log('Could not create user, skipping test');
      return;
    }

    // Try to access admin endpoint
    const response = await fetch(`${baseURL}/api/v1/admin/dashboard`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });

    assert.strictEqual(response.status, 403, 'Should return 403 Forbidden');
  });
});
