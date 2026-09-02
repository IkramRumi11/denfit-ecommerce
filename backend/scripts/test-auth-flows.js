#!/usr/bin/env node
// Lightweight test script to exercise auth flows: login (unverified) and resend-verification cooldown
// Usage: node ./scripts/test-auth-flows.js

import http from 'http';

function postJson(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3002,
      path: `/api/v1${path}`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        let parsed = raw;
        try { parsed = JSON.parse(raw); } catch (e) { /* leave as text */ }
        resolve({ status: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on('error', (e) => reject(e));
    req.write(data);
    req.end();
  });
}

(async function run() {
  console.log('Testing unverified login -> expect 401 with emailVerified:false');
  try {
    const login = await postJson('/auth/login', { email: 'unverified@example.com', password: 'Secret123!' });
    console.log('LOGIN:', login.status, JSON.stringify(login.body));
  } catch (e) {
    console.error('Login request failed:', e.message || e);
  }

  console.log('\nTesting resend-verification twice (second should be 429)');
  try {
    const r1 = await postJson('/auth/resend-verification', { email: 'user@example.com' });
    console.log('RESEND #1:', r1.status, JSON.stringify(r1.body));
    const r2 = await postJson('/auth/resend-verification', { email: 'user@example.com' });
    console.log('RESEND #2:', r2.status, JSON.stringify(r2.body));
  } catch (e) {
    console.error('Resend request failed:', e.message || e);
  }
})();
