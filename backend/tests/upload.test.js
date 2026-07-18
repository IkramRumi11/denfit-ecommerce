import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateUploadedFilesBuffer } from '../middleware/upload.js';

const runMiddleware = (mw, req) => new Promise((resolve) => {
  const res = {
    status: (code) => ({ json: (body) => resolve({ code, body }) })
  };
  const next = () => resolve({ code: 0 });
  Promise.resolve()
    .then(() => mw(req, res, next))
    .catch((e) => resolve({ code: 500, error: String(e) }));
});

test('validateUploadedFilesBuffer accepts jpg/png/webp/avif and rejects svg/svgz/invalid', async () => {
  // JPEG
  const jpg = Buffer.from([0xFF,0xD8,0xFF,0xE0,0x00,0x10,0x4A,0x46,0x49,0x46]);
  let r = await runMiddleware(validateUploadedFilesBuffer, { files: [{ buffer: Buffer.concat([jpg, Buffer.alloc(100)]), mimetype: 'image/jpeg' }] });
  assert.equal(r.code, 0, 'JPEG should be accepted');

  // PNG
  const png = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
  r = await runMiddleware(validateUploadedFilesBuffer, { files: [{ buffer: Buffer.concat([png, Buffer.alloc(100)]), mimetype: 'image/png' }] });
  assert.equal(r.code, 0, 'PNG should be accepted');

  // WEBP (RIFF)
  const webp = Buffer.from([0x52,0x49,0x46,0x46,0x00,0x00,0x00,0x00,0x57,0x45,0x42,0x50]);
  r = await runMiddleware(validateUploadedFilesBuffer, { files: [{ buffer: Buffer.concat([webp, Buffer.alloc(100)]), mimetype: 'image/webp' }] });
  assert.equal(r.code, 0, 'WEBP should be accepted');

  // AVIF (ftyp...avif in header)
  const avif = Buffer.from('....ftypavif....');
  r = await runMiddleware(validateUploadedFilesBuffer, { files: [{ buffer: Buffer.concat([avif, Buffer.alloc(100)]), mimetype: 'image/avif' }] });
  assert.equal(r.code, 0, 'AVIF should be accepted');

  // SVG should be rejected
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  r = await runMiddleware(validateUploadedFilesBuffer, { files: [{ buffer: svg, mimetype: 'image/svg+xml' }] });
  assert.equal(r.code, 400, 'SVG should be rejected');

  // SVGZ (gzipped svg) - simulate invalid mimetype
  const svgz = Buffer.from([0x1f,0x8b,0x08,0x00]); // gzip header
  r = await runMiddleware(validateUploadedFilesBuffer, { files: [{ buffer: svgz, mimetype: 'image/svg+xml' }] });
  assert.equal(r.code, 400, 'SVGZ should be rejected');

  // Invalid MIME with correct header should be rejected (mimetype mismatch)
  r = await runMiddleware(validateUploadedFilesBuffer, { files: [{ buffer: Buffer.concat([jpg, Buffer.alloc(100)]), mimetype: 'application/octet-stream' }] });
  assert.equal(r.code, 400, 'Invalid MIME should be rejected');
});
