//backend/middleware/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve uploads directory relative to this middleware file to ensure
// multer writes to the same `uploads` folder served by Express static.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});

// Allowed MIME types and a small mapping of magic bytes checks for common image formats
// Block SVG/SVGZ entirely. Allow only jpg/jpeg, png, webp, avif
const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const magicHeaders = {
  jpg: Buffer.from([0xFF,0xD8,0xFF]),
  png: Buffer.from([0x89,0x50,0x4E,0x47]),
  webp: Buffer.from([0x52,0x49,0x46,0x46]),
  // avif/HEIF-like files are ISO BMFF-based and contain 'ftyp' and brand 'avif' within header
  avifSignature: Buffer.from('ftyp')
};

// File filter that checks reported MIME type and simple magic-bytes where possible
const fileFilter = (req, file, cb) => {
  if (!allowedMimes.includes(file.mimetype)) return cb(new Error('Invalid file type'), false);
  cb(null, true);
};

// Post-save validation of magic bytes to avoid spoofed MIME types
const postValidateMagicBytes = async (filePath, mimetype) => {
  try {
    const fd = await fs.promises.open(filePath, 'r');
    const header = Buffer.alloc(64);
    await fd.read(header, 0, 64, 0);
    await fd.close();
    if (mimetype === 'image/jpeg' && header.slice(0,3).equals(magicHeaders.jpg)) return true;
    if (mimetype === 'image/png' && header.slice(0,4).equals(magicHeaders.png)) return true;
    if (mimetype === 'image/webp' && header.slice(0,4).equals(magicHeaders.webp)) return true;
    if (mimetype === 'image/avif') {
      // crude check: look for 'ftyp' and 'avif' in header
      const txt = header.toString('utf8', 0, 64);
      if (txt.includes('ftyp') && txt.includes('avif')) return true;
    }
  } catch (e) {
    return false;
  }
  return false;
};

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter }); // 10MB per file

// Named wrapper for product create/update routes. Admin UI may send dynamic field names
// like `variantImages_<tempId>`; this wrapper centralizes handling while keeping route
// signatures free from direct `upload.any()` calls.
export const productUpload = (maxFiles = 50) => {
  return (req, res, next) => {
    // Use multer.any internally but keep it encapsulated so routes don't call upload.any()
    upload.any()(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  };
};

// Middleware wrapper to validate saved files' magic bytes and remove invalid files
export const validateUploadedFiles = async (req, res, next) => {
  const files = req.files || [];
  for (const f of files) {
    const ok = await postValidateMagicBytes(f.path, f.mimetype);
    if (!ok) {
      try { await fs.promises.unlink(f.path); } catch (e) {}
      return res.status(400).json({ success: false, message: 'Uploaded file failed validation' });
    }
  }
  next();
};

// Validator for memoryStorage uploads (checks magic bytes in buffer)
export const validateUploadedFilesBuffer = async (req, res, next) => {
  const files = req.files || [];
  for (const f of files) {
    try {
      const header = (f.buffer && f.buffer.length) ? f.buffer.slice(0, 64) : Buffer.alloc(0);
      const mimetype = f.mimetype;
      if (mimetype === 'image/jpeg' && header.slice(0,3).equals(magicHeaders.jpg)) continue;
      if (mimetype === 'image/png' && header.slice(0,4).equals(magicHeaders.png)) continue;
      if (mimetype === 'image/webp' && header.slice(0,4).equals(magicHeaders.webp)) continue;
      if (mimetype === 'image/avif') {
        const txt = header.toString('utf8', 0, 64);
        if (txt.includes('ftyp') && txt.includes('avif')) continue;
      }
    } catch (e) {
      return res.status(400).json({ success: false, message: 'Uploaded file failed validation' });
    }
    return res.status(400).json({ success: false, message: 'Uploaded file failed validation' });
  }
  next();
};

export default upload;
