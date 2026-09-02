// Integration test helper for managing CSRF cookies and authentication
import User from '../../models/User.js';

export const baseURL = process.env.API_URL || 'http://localhost:3002';
export const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@denfit.com';
export const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'TestAdmin123!';

let cachedCsrfToken = null;
let cachedCsrfCookie = null;

/**
 * Fetch CSRF token from health endpoint
 */
export async function getCsrf() {
  if (cachedCsrfToken && cachedCsrfCookie) {
    return { token: cachedCsrfToken, cookie: cachedCsrfCookie };
  }

  const res = await fetch(`${baseURL}/api/v1/health`);
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/XSRF-TOKEN=([^;]+)/);
  
  if (match) {
    cachedCsrfToken = match[1];
    cachedCsrfCookie = `XSRF-TOKEN=${match[1]}`;
  } else {
    cachedCsrfToken = 'test-csrf-token';
    cachedCsrfCookie = 'XSRF-TOKEN=test-csrf-token';
  }

  return { token: cachedCsrfToken, cookie: cachedCsrfCookie };
}

/**
 * Perform an API request with automatic CSRF token and cookie management
 */
export async function apiRequest(path, options = {}) {
  const { token: csrfToken, cookie: csrfCookie } = await getCsrf();
  
  const headers = {
    'Content-Type': 'application/json',
    'x-xsrf-token': csrfToken,
    ...options.headers
  };

  const cookies = [csrfCookie];
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
    cookies.push(`jwt=${options.token}`);
  }
  if (options.cookie) {
    cookies.push(options.cookie);
  }
  headers['Cookie'] = cookies.join('; ');

  const url = path.startsWith('http') ? path : `${baseURL}${path}`;
  return fetch(url, {
    ...options,
    headers
  });
}

/**
 * Ensure an admin user exists in DB and return JWT token
 */
export async function getAdminToken() {
  const { token: csrfToken, cookie: csrfCookie } = await getCsrf();
  
  // Ensure admin user exists in DB
  try {
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        emailVerified: true
      });
    }
  } catch (e) {
    // If direct DB not connected in test context, proceed with HTTP login
  }

  const response = await fetch(`${baseURL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-xsrf-token': csrfToken,
      'Cookie': csrfCookie
    },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword
    })
  });

  const cookie = response.headers.get('set-cookie') || '';
  const match = cookie.match(/jwt=([^;]+)/);
  if (match) {
    return match[1];
  }

  const data = await response.json().catch(() => ({}));
  if (data?.token) {
    return data.token;
  }
  if (data?.data?.token) {
    return data.data.token;
  }

  return '';
}
