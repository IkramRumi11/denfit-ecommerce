#!/usr/bin/env node
// Lightweight test script to exercise auth flows: login (unverified) and resend-verification cooldown
// Usage: node ./scripts/test-auth-flows.cjs

const http = require('http');

function parseSetCookie(setCookie) {
  if (!setCookie) return {};
  const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
  const map = {};
  arr.forEach((c) => {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > -1) {
      const k = pair.slice(0, idx).trim();
      const v = pair.slice(idx + 1).trim();
      map[k] = v;
    }
  });
  return map;
}

function postJson(path, body, xsrfToken, cookies) {
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

    if (xsrfToken) {
      options.headers['x-xsrf-token'] = xsrfToken;
    }
    if (cookies) {
      const cookiePairs = Object.entries(cookies).map(([k, v]) => `${k}=${v}`);
      if (cookiePairs.length) options.headers['Cookie'] = cookiePairs.join('; ');
    }

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

function getJson(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 3002,
      path: `/api/v1${path}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => raw += chunk);
      res.on('end', () => {
        let parsed = raw;
        try { parsed = JSON.parse(raw); } catch (e) { /* leave as text */ }
        const cookies = parseSetCookie(res.headers['set-cookie']);
        resolve({ status: res.statusCode, headers: res.headers, body: parsed, cookies });
      });
    });
    req.on('error', (e) => reject(e));
    req.end();
  });
}

(async function run() {
  try {
    console.log('Fetching /health to obtain XSRF cookie/token');
    const h = await getJson('/health');
    console.log('HEALTH:', h.status, JSON.stringify(h.body));
    const xsrf = h.cookies['XSRF-TOKEN'];
    console.log('Extracted XSRF-TOKEN cookie:', xsrf ? '[present]' : '[not found]');

    // Ensure test user exists (register). If already exists, register will return 400 and we continue.
    console.log('\nRegistering test user (may return 400 if it already exists)');
    try {
      const reg = await postJson('/auth/register', { name: 'Test Unverified', email: 'unverified@example.com', password: 'Secret123!' }, xsrf, h.cookies);
      console.log('REGISTER:', reg.status, JSON.stringify(reg.body));
    } catch (e) {
      console.warn('Register request failed:', e.message || e);
    }

    console.log('\nTesting unverified login -> expect 401 with emailVerified:false');
    const login = await postJson('/auth/login', { email: 'unverified@example.com', password: 'Secret123!' }, xsrf, h.cookies);
    console.log('LOGIN:', login.status, JSON.stringify(login.body));
    console.log('LOGIN headers:', JSON.stringify(login.headers || {}));

    console.log('\nTesting resend-verification twice (second should be 429)');
    const r1 = await postJson('/auth/resend-verification', { email: 'unverified@example.com' }, xsrf, h.cookies);
    console.log('RESEND #1:', r1.status, JSON.stringify(r1.body));
    console.log('RESEND #1 headers:', JSON.stringify(r1.headers || {}));

    const r2 = await postJson('/auth/resend-verification', { email: 'unverified@example.com' }, xsrf, h.cookies);
    console.log('RESEND #2:', r2.status, JSON.stringify(r2.body));
    console.log('RESEND #2 headers:', JSON.stringify(r2.headers || {}));

  } catch (e) {
    console.error('Request failed:', e.message || e);
  }
})();
