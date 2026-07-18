// src/utils/token.ts
// Token helper: under cookie-only auth we no longer store JWT in localStorage.
// Keep no-op helpers for backward compatibility so call sites don't crash.
export const getToken = (): string | null => null;
export const setToken = (_token: string): void => {
  // no-op: token is stored as httpOnly cookie by the server
  // Mark param as used to avoid lint errors
  void _token;
};
export const removeToken = (): void => {
  // no-op
};