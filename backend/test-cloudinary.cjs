require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testCloudinary() {
  try {
    console.log('🔧 Testing Cloudinary Configuration...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key:', process.env.CLOUDINARY_API_KEY);
    console.log('API Secret:', process.env.CLOUDINARY_API_SECRET ? '✓ Set' : '✗ Missing');
    
    // Test with a simple image upload
    console.log('📤 Testing image upload...');
    
    const result = await cloudinary.uploader.upload('https://picsum.photos/200/300', {
      folder: 'denfit-test',
      public_id: 'test_image_' + Date.now()
    });
    
    console.log('✅ Cloudinary test successful!');
    console.log('📷 Image URL:', result.secure_url);
    console.log('🆔 Public ID:', result.public_id);
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
  }
}

testCloudinary();
