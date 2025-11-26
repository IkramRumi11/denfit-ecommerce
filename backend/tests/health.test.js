import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import path from 'path';

// Enhanced health test: spawn server if not already running
async function startLocalServer() {
  const serverCwd = path.resolve('./');
  const server = spawn(process.execPath, ['server.js'], { cwd: serverCwd, env: process.env });
  server.stdout.on('data', (d) => process.stdout.write(`[server] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));

  const started = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start in time')), 5000);
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

test('GET /api/v1/health returns success', async (t) => {
  let serverProcess;
  try {
    // Try fetch first in case server is externally running
    try {
      const res = await fetch('http://localhost:3002/api/v1/health');
      if (res.ok) {
        const body = await res.json();
        assert.equal(body.success, true);
        return;
      }
    } catch (e) {
      // Not running; start local server
    }

    serverProcess = await startLocalServer();
    const res2 = await fetch('http://localhost:3002/api/v1/health');
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.success, true);
  } finally {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  }
});
