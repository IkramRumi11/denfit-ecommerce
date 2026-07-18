// src/config/api.ts
const env = (import.meta as any).env;
const rawApiUrl = (env?.VITE_API_URL || 'http://localhost:3002').toString().trim();
const baseApiUrl = rawApiUrl.replace(/\/$/, '');
export const API_BASE_URL = /\/api\/v1$/i.test(baseApiUrl) ? baseApiUrl : `${baseApiUrl}/api/v1`;

// Note: prefer using the top-level `src/api.ts` request helpers which use
// import.meta.env and the Vite proxy in development. This file provides
// a small fallback for other modules that import `API_BASE_URL` directly.
