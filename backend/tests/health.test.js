import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import path from 'path';

const TEST_PORT = process.env.TEST_HEALTH_PORT || '3008';

// Enhanced health test: spawn server if not already running
async function startLocalServer(port = TEST_PORT) {
  const serverCwd = path.resolve('./');
  const env = { ...process.env, PORT: String(port) };
  const server = spawn(process.execPath, ['server.js'], { cwd: serverCwd, env });
  server.stdout.on('data', (d) => process.stdout.write(`[server-health] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server-health] ${d}`));

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!server.killed) server.kill();
        reject(new Error('Server did not start in time'));
      }, 45000);
      server.stdout.on('data', (d) => {
        const s = String(d);
        if (s.includes(`localhost:${port}`) || s.includes('✅ HTTP')) {
          clearTimeout(timeout);
          resolve(true);
        }
      });
      server.on('error', (err) => {
        clearTimeout(timeout);
        if (!server.killed) server.kill();
        reject(err);
      });
    });
  } catch (err) {
    if (!server.killed) server.kill();
    throw err;
  }

  return server;
}

test('GET /api/v1/health returns success', async (t) => {
  let serverProcess;
  const baseUrl = `http://localhost:${TEST_PORT}`;
  try {
    // Try fetch first in case server is externally running on 3002
    try {
      const res = await fetch('http://localhost:3002/api/v1/health');
      if (res.ok) {
        const body = await res.json();
        assert.equal(body.success, true);
        return;
      }
    } catch (e) {
      // Not running; start local server on test port
    }

    serverProcess = await startLocalServer(TEST_PORT);
    const res2 = await fetch(`${baseUrl}/api/v1/health`);
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.success, true);
  } finally {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  }
});
