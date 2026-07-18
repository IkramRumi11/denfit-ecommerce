import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import path from 'path';

async function startLocalServer() {
  const serverCwd = path.resolve('./');
  const server = spawn(process.execPath, ['server.js'], { cwd: serverCwd, env: process.env });
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  const started = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 7000);
    server.stdout.on('data', (d) => {
      const s = String(d);
      if (s.includes('HTTP: http://localhost:3002') || s.includes('✅ HTTP')) {
        clearTimeout(timeout);
        resolve(true);
      }
    });
    server.on('error', (err) => reject(err));
  });

  return server;
}

test('GET /api/v1/features returns feature flags (raptorMini default enabled)', async (t) => {
  let serverProcess;
  try {
    // Try direct fetch first (if already running externally)
    const port = process.env.PORT || 3002;
    const base = `http://localhost:${port}`;
    try {
      const res = await fetch(`${base}/api/v1/features`);
      if (res.ok) {
        const body = await res.json();
        assert.equal(body.success, true);
        assert.equal(typeof body.flags.raptorMini, 'boolean');
        // Default is enabled
        assert.equal(body.flags.raptorMini, true);
        return;
      }
    } catch (e) {
      // server not running, start it
    }

    serverProcess = await startLocalServer();
    const res2 = await fetch(`${base}/api/v1/features`);
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.success, true);
    assert.equal(typeof body2.flags.raptorMini, 'boolean');
    assert.equal(body2.flags.raptorMini, true);
  } finally {
    if (serverProcess && !serverProcess.killed) serverProcess.kill();
  }
});
