import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const backendDir = path.resolve(new URL('.', import.meta.url).pathname, '..');
const outDir = path.join(backendDir, 'tmp');
try { fs.mkdirSync(outDir, { recursive: true }); } catch (e) {}
const outPath = path.join(outDir, 'test-output.log');

const outStream = fs.createWriteStream(outPath, { flags: 'w' });

console.log('Running backend tests and writing logs to', outPath);

const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['--prefix', backendDir, 'test'];

const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });

child.stdout.on('data', (d) => {
  outStream.write(d);
});
child.stderr.on('data', (d) => {
  outStream.write(d);
});

child.on('close', (code) => {
  outStream.end(() => {
    console.log('Tests finished with exit code', code);
    console.log('Log written to', outPath);
    process.exit(code === 0 ? 0 : 1);
  });
});
