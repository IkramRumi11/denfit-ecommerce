import express from 'express';
import multer from 'multer';

import { validateUploadedFilesBuffer } from '../middleware/upload.js';
import { protect, authorize } from '../middleware/auth.js';
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage
} from '../controllers/uploadController.js';

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const memUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Protect all routes
router.use(protect);

// Upload routes
router.post('/image', memUpload.single('image'), validateUploadedFilesBuffer, uploadImage);
router.post('/images', memUpload.array('images', 10), validateUploadedFilesBuffer, uploadMultipleImages);
router.delete('/image/:publicId', deleteImage);

export default router;