// Integration tests for authentication endpoints
import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Auth API Integration Tests', () => {
  const baseURL = process.env.API_URL || 'http://localhost:3002';
  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@denfit.com';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let authToken = '';

  test('POST /api/v1/auth/register - should register new user', async () => {
    const response = await fetch(`${baseURL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    assert.ok(data.data.user, 'Should return user data');
    assert.strictEqual(data.data.user.email, testEmail, 'Email should match');
  });

  test('POST /api/v1/auth/register - should reject duplicate email', async () => {
    const response = await fetch(`${baseURL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const response = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.token, 'Should return JWT token');
    authToken = data.token;
  });

  test('POST /api/v1/auth/login - should reject invalid credentials', async () => {
    const response = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })
    });

    assert.strictEqual(response.status, 401, 'Should return 401 Unauthorized');
  });

  test('GET /api/v1/auth/me - should return current user with valid token', async () => {
    // Login first
    const loginRes = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // Get current user
    const response = await fetch(`${baseURL}/api/v1/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    assert.strictEqual(response.status, 200, 'Should return 200 OK');
    assert.ok(data.success, 'Response should indicate success');
    assert.ok(data.data.user, 'Should return user data');
  });

  test('GET /api/v1/auth/me - should reject without token', async () => {
    const response = await fetch(`${baseURL}/api/v1/auth/me`);
    assert.strictEqual(response.status, 401, 'Should return 401 Unauthorized');
  });

  test('POST /api/v1/auth/forgot-password - should accept valid email', async () => {
    const response = await fetch(`${baseURL}/api/v1/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail
      })
    });

    const data = await response.json();
    assert.ok([200, 201].includes(response.status), 'Should return 200 or 201');
    assert.ok(data.success, 'Response should indicate success');
  });

  test('POST /api/v1/auth/logout - should logout user', async () => {
    // Login first
    const loginRes = await fetch(`${baseURL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.token;

    // Logout
    const response = await fetch(`${baseURL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    assert.ok([200, 204].includes(response.status), 'Should return 200 or 204');
  });
});
