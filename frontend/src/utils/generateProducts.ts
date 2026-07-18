// src/utils/generateProducts.ts
import { Product } from '../types';

export function generateProducts(count: number): Product[] {
  const products: Product[] = [];
  const categories = ['men', 'women', 'kids', 'sale'];
  const sizes = ['XS', 'S', 'M', 'L', 'XL'];
  const colors = ['black', 'white', 'red', 'blue', 'green'];

  for (let i = 1; i <= count; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    // PKR price range: 500 to 5000 PKR
    const price = Math.round(Math.random() * 4500 + 500); // Whole numbers for PKR

    const img = `https://picsum.photos/600/800?random=${i}`;

    products.push({
      id: String(i),
      _id: String(i),
      sku: `SKU-${category.toUpperCase().slice(0,3)}-${i}`,
      name: `${category.charAt(0).toUpperCase() + category.slice(1)} Product ${i}`,
      price: price,
      originalPrice: Math.random() > 0.7 ? Math.round(price * (1 + Math.random() * 0.4)) : undefined,
      images: [img, `https://picsum.photos/600/800?random=${i + 1000}`],
      image: img,
      category: category,
      type: 't-shirts',
      gender: category === 'men' ? 'men' : category === 'women' ? 'women' : 'unisex',
  sizes: sizes.slice(0, Math.floor(Math.random() * 3) + 2),
  colors: colors.slice(0, Math.floor(Math.random() * 2) + 1),
      inStock: Math.random() > 0.1,
      featured: Math.random() > 0.95,
      ratings: { average: Math.round((Math.random() * 4 + 1) * 10) / 10, count: Math.floor(Math.random() * 200) },
  slug: `product-${i}`,
    } as Product);
  }

  return products;
}
