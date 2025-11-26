// Node smoke test that ignores TLS cert validation for local mkcert dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const http = require('http');

function doRequest(path, method = 'GET', body = null, cookies = null) {
  const data = body ? JSON.stringify(body) : null;
  const options = {
    hostname: 'localhost',
    port: 3002,
    path,
    method,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data ? Buffer.byteLength(data) : 0,
    },
  };
  if (cookies) options.headers['Cookie'] = cookies;

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        resolve({ statusCode: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const base = '/api/v1/auth';
    const ts = Date.now();
    const email = `smoketest+${ts}@example.com`;
    console.log('Registering', email);

    const reg = await doRequest(`${base}/register`, 'POST', { name: 'Smoke Tester', email, password: 'Password123!' });
    console.log('Register status:', reg.statusCode);
    console.log('Register body:', reg.body);
    const setCookie = reg.headers['set-cookie'];
    console.log('Set-Cookie header:', setCookie);
    const cookieJar = setCookie ? [setCookie[0].split(';')[0]] : [];

    const cookies = cookieJar.join('; ');
    console.log('\nGET /me with cookie jar');
    const me = await doRequest(`${base}/me`, 'GET', null, cookies);
    console.log('Status /me:', me.statusCode);
    console.log('Body /me:', me.body);

    console.log('\nLogging out');
    const lo = await doRequest(`${base}/logout`, 'POST', null, cookies);
    console.log('Status logout:', lo.statusCode);
    console.log('Body logout:', lo.body);

    console.log('\nGET /me after logout');
    const me2 = await doRequest(`${base}/me`, 'GET', null, cookies);
    console.log('Status /me after logout:', me2.statusCode);
    console.log('Body /me after logout:', me2.body);

  } catch (err) {
    console.error('Error during smoke test', err);
    process.exit(2);
  }
})();
