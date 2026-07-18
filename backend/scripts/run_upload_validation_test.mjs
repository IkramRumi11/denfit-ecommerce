import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateUploadedFilesBuffer } from '../middleware/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outDir = path.join(__dirname, '..', 'tmp');
await fs.mkdir(outDir, { recursive: true });

const runMiddleware = (mw, req) => new Promise((resolve) => {
  const res = {
    status: (code) => ({ json: (body) => resolve({ code, body }) })
  };
  const next = () => resolve({ code: 0 });
  Promise.resolve()
    .then(() => mw(req, res, next))
    .catch((e) => resolve({ code: 500, error: String(e) }));
});

const jpg = Buffer.from([0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46]);
const png = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
const webp = Buffer.from([0x52,0x49,0x46,0x46,0x00,0x00,0x00,0x00,0x57,0x45,0x42,0x50]);
const avif = Buffer.from('....ftypavif....');
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
const svgz = Buffer.from([0x1f,0x8b,0x08,0x00]);

const cases = [
  { name: 'jpeg', file: { buffer: Buffer.concat([jpg, Buffer.alloc(100)]), mimetype: 'image/jpeg' } },
  { name: 'png', file: { buffer: Buffer.concat([png, Buffer.alloc(100)]), mimetype: 'image/png' } },
  { name: 'webp', file: { buffer: Buffer.concat([webp, Buffer.alloc(100)]), mimetype: 'image/webp' } },
  { name: 'avif', file: { buffer: Buffer.concat([avif, Buffer.alloc(100)]), mimetype: 'image/avif' } },
  { name: 'svg', file: { buffer: svg, mimetype: 'image/svg+xml' } },
  { name: 'svgz', file: { buffer: svgz, mimetype: 'image/svg+xml' } },
  { name: 'mismatch', file: { buffer: Buffer.concat([jpg, Buffer.alloc(100)]), mimetype: 'application/octet-stream' } }
];

const results = [];
for (const c of cases) {
  const res = await runMiddleware(validateUploadedFilesBuffer, { files: [c.file] });
  results.push({ case: c.name, result: res });
}

const outPath = path.join(outDir, 'upload-validation-result.json');
await fs.writeFile(outPath, JSON.stringify(results, null, 2), 'utf8');
console.log('Wrote', outPath);
console.log(JSON.stringify(results, null, 2));
