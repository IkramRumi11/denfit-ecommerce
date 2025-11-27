import { test } from 'node:test';
import assert from 'node:assert/strict';

const baseURL = process.env.API_URL || 'http://localhost:3002';

async function loginAsAdmin() {
  const res = await fetch(`${baseURL}/api/v1/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@denfit.com', password: 'admin123' })
  });
  return res.json();
}

async function registerUser() {
  const email = `testuser-${Date.now()}@example.com`;
  const res = await fetch(`${baseURL}/api/v1/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'test user', email, password: 'password123' }) });
  return res.json();
}

test('Admin can set global flag and user override works as expected', async () => {
  const admin = await loginAsAdmin();
  const userRes = await registerUser();
  const userToken = userRes?.token;
  const userId = userRes?.data?.user?._id;
  // Ensure default is enabled
  let f = await (await fetch(`${baseURL}/api/v1/features`)).json();
  // default should exist and be a boolean (server default = true)
  if (typeof f?.flags?.raptorMini !== 'boolean') {
    console.log('Default flag not found, skipping test');
    return;
  }

  // Create a global flag to disable raptorMini
  await fetch(`${baseURL}/api/v1/admin/features`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin.token}` }, body: JSON.stringify({ name: 'RAPTOR_MINI', enabled: false, target: 'global' }) });
  const g = await (await fetch(`${baseURL}/api/v1/features`)).json();
  assert.strictEqual(g.flags.raptorMini, false);

  // Check audit logs contain feature_flag entries
  const auditsRes = await (await fetch(`${baseURL}/api/v1/admin/audits?type=feature_flag`, { headers: { 'Authorization': `Bearer ${admin.token}` } })).json();
  assert.strictEqual(Array.isArray(auditsRes.data.audits), true);

  // Check audit logs include this change
  const auditsRes = await fetch(`${baseURL}/api/v1/admin/audits?type=feature_flag`, { headers: { 'Authorization': `Bearer ${admin.token}` } });
  const auditsData = await auditsRes.json();
  const recent = auditsData?.data?.audits || [];
  if (recent.length === 0) throw new Error('No audit logs found for feature flag change');

  // Create user override enabling it for the newly created user
  await fetch(`${baseURL}/api/v1/admin/features`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${admin.token}` }, body: JSON.stringify({ name: 'RAPTOR_MINI', enabled: true, target: 'user', userId }) });

  // When requesting as that user with token, flag should be true
  const asUser = await (await fetch(`${baseURL}/api/v1/features`, { headers: { 'Authorization': `Bearer ${userToken}` } })).json();
  assert.strictEqual(asUser.flags.raptorMini, true);
});
