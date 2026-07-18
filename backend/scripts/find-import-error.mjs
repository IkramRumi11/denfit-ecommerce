// Diagnostic loader: import modules one-by-one and report failures
import path from 'path';

const base = path.resolve(new URL(import.meta.url).pathname, '..', '..');
const modules = [
  './server.js',
  './routes/auth.js',
  './routes/products.js',
  './routes/orders.js',
  './routes/admin.js',
  './routes/features.js',
  './routes/debug.js',
  './middleware/errorHandler.js',
  './src/config/database.js',
];

console.log('Diagnostic import run starting from', base);

for (const mod of modules) {
  try {
    console.log(`-> importing ${mod} ...`);
    await import(path.join(base, mod));
    console.log(`   OK: ${mod}`);
  } catch (err) {
    console.error(`   FAIL importing ${mod}:`, err && err.stack ? err.stack : err);
    // stop after first failure to avoid noisy output
    process.exitCode = 1;
    break;
  }
}

console.log('Diagnostic import run completed.');
