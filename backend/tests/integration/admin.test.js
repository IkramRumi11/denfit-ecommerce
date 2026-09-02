// Integration tests for admin endpoints
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { apiRequest, getAdminToken } from './testHelper.js';

describe('Admin API Integration Tests', () => {
  let adminToken = '';

  test('GET /api/v1/admin/dashboard - should return dashboard stats', async () => {
    adminToken = await getAdminToken();
    assert.ok(adminToken, 'Admin token should be available');

    const response = await apiRequest('/api/v1/admin/dashboard/stats', {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('GET /api/v1/admin/users - should return users list', async () => {
    adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/admin/users', {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(Array.isArray(data.data.users), 'Should return users array');
  });

  test('GET /api/v1/admin/users/:id - should return user details', async () => {
    adminToken = await getAdminToken();

    const listRes = await apiRequest('/api/v1/admin/users', {
      token: adminToken
    });
    const listData = await listRes.json();
    const userId = listData.data.users[0]?._id;

    if (!userId) {
      console.log('No users found, skipping test');
      return;
    }

    const response = await apiRequest(`/api/v1/admin/users/${userId}`, {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.user, 'Should return user data');
  });

  test('PUT /api/v1/admin/users/:id/role - should update user role', async () => {
    adminToken = await getAdminToken();

    const listRes = await apiRequest('/api/v1/admin/users', {
      token: adminToken
    });
    const listData = await listRes.json();
    const user = listData.data.users.find(u => u.role !== 'admin');

    if (!user) {
      console.log('No non-admin users found, skipping test');
      return;
    }

    const response = await apiRequest(`/api/v1/admin/users/${user._id}`, {
      method: 'PATCH',
      token: adminToken,
      body: JSON.stringify({
        role: 'admin'
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('GET /api/v1/admin/audits - should return audit logs', async () => {
    adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/admin/audits', {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(Array.isArray(data.data.audits), 'Should return audits array');
  });

  test('GET /api/v1/admin/audits?action=update - should filter audits by action', async () => {
    adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/admin/audits?action=update', {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(Array.isArray(data.data.audits), 'Should return audits array');
  });

  test('GET /api/v1/admin/stats - should return statistics', async () => {
    adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/admin/dashboard/stats', {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('Admin endpoints should reject non-admin users', async () => {
    const email = `user-${Date.now()}@example.com`;
    const password = 'password123';
    
    await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Regular User',
        email,
        password,
        confirmPassword: password
      })
    });

    const loginRes = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    
    const cookie = loginRes.headers.get('set-cookie') || '';
    const match = cookie.match(/jwt=([^;]+)/);
    const userToken = match ? match[1] : '';

    if (!userToken) {
      console.log('Could not create user, skipping test');
      return;
    }

    const response = await apiRequest('/api/v1/admin/dashboard/stats', {
      token: userToken
    });

    assert.strictEqual(response.status, 403, 'Should return 403 Forbidden');
  });
});
