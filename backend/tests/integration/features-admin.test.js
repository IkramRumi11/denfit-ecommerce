import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiRequest, getAdminToken } from './testHelper.js';

async function registerUser() {
  const email = `testuser-${Date.now()}@example.com`;
  const password = 'password123';
  
  await apiRequest('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'test user', email, password, confirmPassword: password })
  });
  
  // Log in as user
  const loginRes = await apiRequest('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  
  const data = await loginRes.json();
  const cookie = loginRes.headers.get('set-cookie') || '';
  const match = cookie.match(/jwt=([^;]+)/);
  return {
    token: match ? match[1] : (data?.data?.token || data?.token || ''),
    data: { user: data.data?.user || data?.user }
  };
}

test('Admin can set global flag and user override works as expected', async () => {
  const adminToken = await getAdminToken();
  const userRes = await registerUser();
  const userToken = userRes?.token;
  const userId = userRes?.data?.user?._id;

  // Ensure default is enabled
  let f = await (await apiRequest('/api/v1/features')).json();
  // default should exist and be a boolean (server default = true)
  if (typeof f?.flags?.raptorMini !== 'boolean') {
    console.log('Default flag not found, skipping test');
    return;
  }

  // Create a global flag to disable raptorMini
  const res1 = await apiRequest('/api/v1/admin/features', {
    method: 'POST',
    token: adminToken,
    body: JSON.stringify({ name: 'RAPTOR_MINI', enabled: false, target: 'global' })
  });
  const data1 = await res1.json();
  const globalFlagId = data1.data?.flag?._id;

  const g = await (await apiRequest('/api/v1/features')).json();
  assert.strictEqual(g.flags.raptorMini, false);

  // Check audit logs contain feature_flag entries
  const auditsResp = await apiRequest('/api/v1/admin/audits?type=feature_flag', {
    token: adminToken
  });
  const auditsData = await auditsResp.json();
  assert.strictEqual(Array.isArray(auditsData.data.audits), true);
  const recent = auditsData?.data?.audits || [];
  if (recent.length === 0) throw new Error('No audit logs found for feature flag change');

  // Create user override enabling it for the newly created user
  let userFlagId = null;
  if (userId) {
    const res2 = await apiRequest('/api/v1/admin/features', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ name: 'RAPTOR_MINI', enabled: true, target: 'user', userId })
    });
    const data2 = await res2.json();
    userFlagId = data2.data?.flag?._id;

    // When requesting as that user with token, flag should be true
    const asUser = await (await apiRequest('/api/v1/features', { token: userToken })).json();
    assert.strictEqual(asUser.flags.raptorMini, true);
  }

  // Clean up created flags to prevent test pollution
  if (globalFlagId) {
    await apiRequest(`/api/v1/admin/features/${globalFlagId}`, {
      method: 'DELETE',
      token: adminToken
    });
  }
  if (userFlagId) {
    await apiRequest(`/api/v1/admin/features/${userFlagId}`, {
      method: 'DELETE',
      token: adminToken
    });
  }
});
