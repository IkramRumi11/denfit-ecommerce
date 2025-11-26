const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const BASE = 'http://localhost:3002';

function request(path, opts = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = opts.headers || {};
    const body = opts.body ? JSON.stringify(opts.body) : null;
    if (body) headers['Content-Type'] = 'application/json';
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: opts.method || 'GET',
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          resolve({ res, text });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

(async function run() {
  try {
    // Check if server is up, otherwise spawn a local instance for the duration of this test
    const healthCheck = () =>
      new Promise((resolve) => {
        const req = http.request({ hostname: 'localhost', port: 3002, path: '/api/v1/health', method: 'GET' }, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.end();
      });

    let needToSpawn = false;
    try {
      const ok = await healthCheck();
      needToSpawn = !ok;
    } catch (err) {
      needToSpawn = true;
    }

    let serverProc;
    if (needToSpawn) {
      console.log('Server not running - starting local server');
      serverProc = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
      serverProc.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
      serverProc.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

      // Wait for server to start
      let started = false;
      for (let i = 0; i < 15; i++) {
        // Wait 500ms
        await new Promise((r) => setTimeout(r, 500));
        const ok = await healthCheck();
        if (ok) {
          started = true;
          break;
        }
      }
      if (!started) {
        throw new Error('Failed to start local server for smoke test.');
      }
    }
    console.log('GET /api/v1/health');
    const h = await request('/api/v1/health');
    const setCookie = h.res.headers['set-cookie'];
    let xsrf = null;
    if (setCookie) {
      const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const c of arr) {
        const m = c.match(/XSRF-TOKEN=([^;]+);/);
        if (m) { xsrf = m[1]; break; }
      }
    }
    console.log('XSRF token extracted:', xsrf);

    const headers = {};
    if (xsrf) {
      headers['x-xsrf-token'] = xsrf;
      headers['Cookie'] = `XSRF-TOKEN=${xsrf}`;
    }

    const ts = Date.now();
    const testEmail = `smoketest+${ts}@example.com`;
    console.log('\nRegistering user', testEmail);
    const regBody = { name: 'Smoke Tester', email: testEmail, password: 'Passw0rd!', passwordConfirm: 'Passw0rd!' };
    const reg = await request('/api/v1/auth/register', { method: 'POST', headers, body: regBody });
    console.log('Register status', reg.res.statusCode);
    console.log('Register body:', reg.text);

    console.log('\nImmediate resendVerification (should be throttled if implemented)');
    const r = await request('/api/v1/auth/resend-verification', { method: 'POST', headers, body: { email: testEmail } });
    console.log('Resend status', r.res.statusCode);
    console.log('Resend body', r.text);
    console.log('Resend headers', JSON.stringify(r.res.headers));

    console.log('\nSecond immediate resend (should be throttled and return 429 or similar)');
    const r2 = await request('/api/v1/auth/resend-verification', { method: 'POST', headers, body: { email: testEmail } });
    console.log('Second resend status', r2.res.statusCode);
    console.log('Second resend body', r2.text);
    console.log('Second resend headers', JSON.stringify(r2.res.headers));

  } catch (err) {
    console.error('Error during smoke register/resend test:', err);
    process.exit(1);
  }
})();
