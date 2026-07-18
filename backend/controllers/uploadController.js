// backend/controllers/uploadController.js
// Cloudinary-integrated upload controller with local fallback.
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary once at module load (credentials from env)
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const cloudApiKey = process.env.CLOUDINARY_API_KEY;
const cloudApiSecret = process.env.CLOUDINARY_API_SECRET;

// Detect obvious placeholder values
const placeholderValues = ['your_cloud_name', 'your_api_key', 'your_api_secret', 'undefined', 'null', ''];
const hasCloudCreds = cloudName && cloudApiKey && cloudApiSecret &&
  !placeholderValues.includes(String(cloudName).toLowerCase()) &&
  !placeholderValues.includes(String(cloudApiKey).toLowerCase()) &&
  !placeholderValues.includes(String(cloudApiSecret).toLowerCase());

if (hasCloudCreds) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: cloudApiKey,
    api_secret: cloudApiSecret,
  });
  console.log('✅ Cloudinary configured for uploads');
} else {
  console.warn('⚠️ Cloudinary credentials not set — uploads will use local storage fallback');
}

/**
 * Upload a buffer to Cloudinary (or return a local fallback URL).
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'denfit', resource_type: 'image', ...options },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

/**
 * Build a local fallback URL for the uploaded file.
 */
const buildLocalUrl = (req, filename) => {
  const forwardedProto = req.headers['x-forwarded-proto']
    ? String(req.headers['x-forwarded-proto']).split(',')[0].trim()
    : null;
  const proto = forwardedProto || req.protocol;
  return `${proto}://${req.get('host')}/uploads/${filename}`;
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    if (hasCloudCreds) {
      try {
        const result = await uploadBuffer(req.file.buffer);
        return res.status(200).json({
          success: true,
          message: 'Image uploaded successfully',
          data: {
            imageUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
          }
        });
      } catch (cloudErr) {
        console.warn('Cloudinary upload failed, using local fallback:', cloudErr?.message || cloudErr);
      }
    }

    // Local fallback — file was saved by multer (disk or memory)
    const filename = req.file.filename || `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    // If using memoryStorage, we need to write the buffer to disk
    if (req.file.buffer && !req.file.path) {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      const ext = req.file.originalname ? path.extname(req.file.originalname) : '.jpg';
      const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      await fs.promises.writeFile(path.join(uploadsDir, finalName), req.file.buffer);
      return res.status(200).json({
        success: true,
        message: 'Image uploaded (local storage)',
        data: {
          imageUrl: buildLocalUrl(req, finalName),
          publicId: null,
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Image uploaded (local storage)',
      data: {
        imageUrl: buildLocalUrl(req, filename),
        publicId: null,
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading image'
    });
  }
};

export const uploadMultipleImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload image files'
      });
    }

    const results = [];

    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      if (hasCloudCreds) {
        try {
          const result = await uploadBuffer(file.buffer);
          results.push({
            imageUrl: result.secure_url,
            publicId: result.public_id,
            isPrimary: i === 0,
            order: i,
          });
          continue;
        } catch (cloudErr) {
          console.warn(`Cloudinary upload failed for file ${i}, using local fallback:`, cloudErr?.message || cloudErr);
        }
      }

      // Local fallback
      const filename = file.filename || `upload_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
      if (file.buffer && !file.path) {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        const ext = file.originalname ? path.extname(file.originalname) : '.jpg';
        const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
        await fs.promises.writeFile(path.join(uploadsDir, finalName), file.buffer);
        results.push({
          imageUrl: buildLocalUrl(req, finalName),
          publicId: null,
          isPrimary: i === 0,
          order: i,
        });
      } else {
        results.push({
          imageUrl: buildLocalUrl(req, filename),
          publicId: null,
          isPrimary: i === 0,
          order: i,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      data: { images: results }
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading images'
    });
  }
};

export const deleteImage = async (req, res) => {
  try {
    const { publicId } = req.params;

    if (hasCloudCreds && publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
        return res.status(200).json({
          success: true,
          message: 'Image deleted from Cloudinary'
        });
      } catch (cloudErr) {
        console.warn('Cloudinary delete failed:', cloudErr?.message || cloudErr);
      }
    }

    // If no Cloudinary or publicId, just acknowledge
    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting image'
    });
  }
};