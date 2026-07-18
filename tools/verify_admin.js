(async () => {
  const fs = require('fs');
  const base = 'http://localhost:3002';
  const results = {};
  const safeFetch = async (url, opts) => {
    try {
      const res = await fetch(url, opts || {});
      const body = await res.text().catch(()=>null);
      let parsed = null;
      try { parsed = body ? JSON.parse(body) : null; } catch(e) { parsed = body; }
      return { status: res.status, headers: Object.fromEntries(res.headers), body: parsed };
    } catch (e) {
      return { error: String(e) };
    }
  };

  // 1) Unauthenticated access to admin settings
  results.unauth = await safeFetch(`${base}/api/v1/admin/settings`);

  // 2) Attempt login as default dev admin
  const loginRes = await safeFetch(`${base}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'denfitdatabase@gmail.com', password: 'Admin123!' })
  });
  results.adminLogin = loginRes;

  // Try to extract jwt from set-cookie
  let jwtToken = null;
  try {
    const sc = loginRes && loginRes.headers && (loginRes.headers['set-cookie'] || loginRes.headers['set-cookie']);
    if (sc) {
      const cookieStr = Array.isArray(sc) ? sc[0] : sc;
      const match = cookieStr.match(/jwt=([^;]+);/);
      if (match) jwtToken = match[1];
    }
  } catch (e) {}

  if (jwtToken) {
    results.jwtPresent = true;
    // call admin settings with cookie
    results.adminWithCookie = await safeFetch(`${base}/api/v1/admin/settings`, {
      headers: { Cookie: `jwt=${jwtToken}` }
    });
  } else {
    results.jwtPresent = false;
    results.adminWithCookie = { info: 'no-jwt-token-extracted' };
  }

  if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
  fs.writeFileSync('tmp/verify-admin.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
