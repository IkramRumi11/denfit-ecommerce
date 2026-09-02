// Integration tests for authentication endpoints
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { apiRequest, getAdminToken, adminEmail, adminPassword } from './testHelper.js';

describe('Auth API Integration Tests', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  test('POST /api/v1/auth/register - should register new user', async () => {
    const response = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 201, 'Should return 201 Created');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('POST /api/v1/auth/register - should reject duplicate email', async () => {
    const response = await apiRequest('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test User',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword
      })
    });

    assert.strictEqual(response.status, 400, 'Should return 400 Bad Request');
  });

  test('POST /api/v1/auth/login - should login with valid credentials', async () => {
    const adminToken = await getAdminToken();
    assert.ok(adminToken, 'Should return JWT token for valid credentials');
  });

  test('POST /api/v1/auth/login - should reject invalid credentials', async () => {
    const response = await apiRequest('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })
    });

    assert.strictEqual(response.status, 401, 'Should return 401 Unauthorized');
  });

  test('GET /api/v1/auth/me - should return current user with valid token', async () => {
    const adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/auth/me', {
      token: adminToken
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.user, 'Should return user data');
  });

  test('GET /api/v1/auth/me - should reject without token', async () => {
    const response = await fetch('http://localhost:3002/api/v1/auth/me');
    assert.strictEqual(response.status, 401, 'Should return 401 Unauthorized');
  });

  test('POST /api/v1/auth/forgot-password - should accept valid email', async () => {
    const response = await apiRequest('/api/v1/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({
        email: adminEmail
      })
    });

    const data = await response.json();
    assert.ok([200, 201].includes(response.status), 'Should return 200 or 201');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('POST /api/v1/auth/logout - should logout user', async () => {
    const adminToken = await getAdminToken();

    const response = await apiRequest('/api/v1/auth/logout', {
      method: 'POST',
      token: adminToken
    });

    assert.ok([200, 204].includes(response.status), 'Should return 200 or 204');
  });
});
