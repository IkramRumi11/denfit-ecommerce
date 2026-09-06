import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/denfit';

async function updateFragrances() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const Product = mongoose.model('Product', new mongoose.Schema({}, { strict: false }));

    const fragrances = await Product.find({
      $or: [
        { category: /fragrance/i },
        { gender: 'fragrances' },
        { subcategory: /fragrance/i }
      ]
    });

    console.log(`Found ${fragrances.length} fragrance products to update.`);

    for (const f of fragrances) {
      console.log(`Updating ${f.name} (_id: ${f._id})...`);

      // Prepare updated sizes with distinct prices
      const currentSizes = Array.isArray(f.sizes) ? f.sizes : [];
      const updatedSizes = [
        {
          id: currentSizes[0]?.id || `vol_50_${Date.now().toString(36)}`,
          value: '50 ml',
          inStock: true,
          quantity: currentSizes[0]?.quantity != null ? currentSizes[0].quantity : 40,
          price: 145,
          originalPrice: 175
        },
        {
          id: currentSizes[1]?.id || `vol_100_${Date.now().toString(36)}`,
          value: '100 ml',
          inStock: true,
          quantity: currentSizes[1]?.quantity != null ? currentSizes[1].quantity : 25,
          price: 240,
          originalPrice: 280
        },
        {
          id: currentSizes[2]?.id || `vol_200_${Date.now().toString(36)}`,
          value: '200 ml',
          inStock: true,
          quantity: currentSizes[2]?.quantity != null ? currentSizes[2].quantity : 15,
          price: 390,
          originalPrice: 450
        }
      ];

      f.price = 145; // Base price matches 50ml
      f.originalPrice = 175;
      f.sizes = updatedSizes;
      f.availableSizes = ['50 ml', '100 ml', '200 ml'];

      await Product.updateOne(
        { _id: f._id },
        {
          $set: {
            price: 145,
            originalPrice: 175,
            sizes: updatedSizes,
            availableSizes: ['50 ml', '100 ml', '200 ml']
          }
        }
      );

      console.log(`✓ Updated ${f.name}: 50ml=Rs.145, 100ml=Rs.240, 200ml=Rs.390`);
    }

    console.log('All fragrances updated successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error updating fragrances:', err);
    process.exit(1);
  }
}

updateFragrances();
