const http = require('http');

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
    console.log('GET /api/v1/health');
    const h = await request('/api/v1/health');
    console.log('Status', h.res.statusCode);
    const setCookie = h.res.headers['set-cookie'];
    console.log('set-cookie header:', setCookie);
    let xsrf = null;
    if (setCookie) {
      const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const c of arr) {
        const m = c.match(/XSRF-TOKEN=([^;]+);/);
        if (m) { xsrf = m[1]; break; }
      }
    }
    console.log('XSRF token extracted:', xsrf);

    console.log('\nPOST /api/v1/auth/check-email with header and cookie');
    const headers = {};
    if (xsrf) {
      headers['x-xsrf-token'] = xsrf;
      headers['Cookie'] = `XSRF-TOKEN=${xsrf}`;
    }
    const body = { email: 'smoketest@example.com' };
    const c = await request('/api/v1/auth/check-email', { method: 'POST', headers, body });
    console.log('Status', c.res.statusCode);
    console.log('Response body:', c.text);
    console.log('Response headers:', JSON.stringify(c.res.headers));

    // Try resend verification if appropriate
    console.log('\nAttempt resendVerification to test Retry-After');
    const rHeaders = Object.assign({}, headers);
    const rBody = { email: 'smoketest@example.com' };
    const r = await request('/api/v1/auth/resend-verification', { method: 'POST', headers: rHeaders, body: rBody });
    console.log('Status', r.res.statusCode);
    console.log('Body:', r.text);
    console.log('Headers:', JSON.stringify(r.res.headers));

  } catch (err) {
    console.error('Error during smoke test:', err);
    process.exit(1);
  }
})();
