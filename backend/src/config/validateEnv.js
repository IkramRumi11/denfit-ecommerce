// backend/src/config/validateEnv.js
// Simple environment validator used at startup to ensure required production env vars are present.
export function validateRequiredEnv(required = [], options = { fatal: true }) {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    const msg = `Missing required environment variables: ${missing.join(', ')}`;
    console.error('❌', msg);
    if (options.fatal) {
      console.error('Exiting due to missing production environment variables.');
      process.exit(1);
    }
    return false;
  }
  return true;
}

export default validateRequiredEnv;
