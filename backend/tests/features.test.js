import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import path from 'path';

const TEST_PORT = process.env.TEST_FEATURES_PORT || '3009';

async function startLocalServer(port = TEST_PORT) {
  const serverCwd = path.resolve('./');
  const env = { ...process.env, PORT: String(port) };
  const server = spawn(process.execPath, ['server.js'], { cwd: serverCwd, env });
  server.stdout.on('data', (d) => process.stdout.write(`[server-features] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[server-features] ${d}`));

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

test('GET /api/v1/features returns feature flags (raptorMini default enabled)', async (t) => {
  let serverProcess;
  const base = `http://localhost:${TEST_PORT}`;
  try {
    // Try direct fetch first (if already running externally on 3002)
    try {
      const res = await fetch('http://localhost:3002/api/v1/features');
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

    serverProcess = await startLocalServer(TEST_PORT);
    
    // Allow server socket a brief moment to stabilize and fetch with retry
    let res2;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        res2 = await fetch(`${base}/api/v1/features`);
        if (res2.ok) break;
      } catch (e) {
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    assert.ok(res2, 'Server should respond to /api/v1/features');
    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.success, true);
    assert.equal(typeof body2.flags.raptorMini, 'boolean');
    assert.equal(body2.flags.raptorMini, true);
  } finally {
    if (serverProcess && !serverProcess.killed) {
      serverProcess.kill();
    }
  }
});
