import React, { useEffect, useRef, useState } from 'react';

type Message = { 
  role: 'bot' | 'user'; 
  text: string; 
  timestamp?: string;
};

type ConversationContext = {
  category?: string;
  subcategory?: string;
  gender?: string;
  size?: string;
  height?: string;
  intent?: string;
  city?: string;
  previousTopics: string[];
  priceRange?: string;
};

const WHATSAPP_NUMBER = '923479317516';
const WHATSAPP_PREFILL = "Hi! I found you through the Denfit Fashion Assistant. I want help with my fashion.";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_PREFILL)}`;

const LOGO_SRC = 'https://res.cloudinary.com/doc6jwdo7/image/upload/v1770567054/Denfit_pzrih3.jpg';

// COMPREHENSIVE PRODUCT DATABASE - ALL CATEGORIES
const PRODUCT_DATABASE = {
  // MEN'S CATEGORIES
  men: {
    clothing: [
      { name: 'Classic Cotton T-Shirt', category: 'T-Shirts', description: '100% premium cotton, regular fit, perfect for everyday wear', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['White', 'Black', 'Navy', 'Grey', 'Olive'], material: 'Cotton', fit: 'Regular' },
      { name: 'Premium Oxford Shirt', category: 'Shirts', description: 'Formal Oxford cotton shirt with button-down collar', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['White', 'Blue', 'Pink', 'Grey'], material: 'Cotton', fit: 'Slim' },
      { name: 'Polo Collar T-Shirt', category: 'Polo', description: 'Knitted polo with breathable fabric', sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'White', 'Navy', 'Red'], material: 'Cotton Blend', fit: 'Regular' },
      { name: 'Premium Hoodie', category: 'Hoodies & Sweatshirts', description: 'Heavyweight fleece hoodie with premium stitching', sizes: ['S', 'M', 'L', 'XL', 'XXL'], colors: ['Black', 'Grey', 'Navy', 'Olive'], material: 'Cotton Fleece', fit: 'Oversized' },
      { name: 'Designer Denim Jacket', category: 'Jackets & Coats', description: 'Denim jacket with premium wash and finishing', sizes: ['S', 'M', 'L', 'XL'], colors: ['Light Blue', 'Dark Blue', 'Black'], material: 'Denim', fit: 'Regular' },
      { name: 'Slim Fit Jeans', category: 'Jeans', description: 'Stretch denim jeans with modern slim fit', sizes: ['28', '30', '32', '34', '36'], colors: ['Blue', 'Black', 'Grey'], material: 'Denim', fit: 'Slim' },
      { name: 'Chino Pants', category: 'Pants & Trousers', description: 'Cotton chino pants for smart casual look', sizes: ['28', '30', '32', '34', '36'], colors: ['Khaki', 'Navy', 'Black', 'Olive'], material: 'Cotton', fit: 'Regular' },
      { name: 'Cargo Shorts', category: 'Shorts', description: 'Summer cargo shorts with multiple pockets', sizes: ['S', 'M', 'L', 'XL'], colors: ['Khaki', 'Black', 'Olive'], material: 'Cotton', fit: 'Regular' },
      { name: 'Two-Piece Suit', category: 'Suits & Blazers', description: 'Formal suit with matching trousers', sizes: ['38R', '40R', '42R', '44R', '46R'], colors: ['Navy', 'Charcoal', 'Black'], material: 'Wool Blend', fit: 'Modern' }
    ],
    footwear: [
      { name: 'Premium Sneakers', category: 'Sneakers', description: 'Leather sneakers with cushioned sole', sizes: ['7', '8', '9', '10', '11', '12'], colors: ['White', 'Black', 'Grey'], material: 'Leather', fit: 'Regular' },
      { name: 'Leather Loafers', category: 'Loafers', description: 'Genuine leather loafers for formal occasions', sizes: ['7', '8', '9', '10', '11'], colors: ['Brown', 'Black'], material: 'Leather', fit: 'Regular' },
      { name: 'Winter Boots', category: 'Boots', description: 'Leather boots with waterproof finish', sizes: ['8', '9', '10', '11'], colors: ['Brown', 'Black'], material: 'Leather', fit: 'Regular' },
      { name: 'Leather Sandals', category: 'Sandals', description: 'Premium leather sandals for summer', sizes: ['7', '8', '9', '10', '11'], colors: ['Brown', 'Black'], material: 'Leather', fit: 'Regular' },
      { name: 'Formal Oxford Shoes', category: 'Formal Shoes', description: 'Classic Oxford shoes for business wear', sizes: ['7', '8', '9', '10', '11'], colors: ['Black', 'Brown'], material: 'Leather', fit: 'Regular' },
      { name: 'Running Shoes', category: 'Sports Shoes', description: 'Lightweight running shoes with air cushion', sizes: ['7', '8', '9', '10', '11', '12'], colors: ['White/Blue', 'Black/Red', 'Grey/Orange'], material: 'Mesh', fit: 'Regular' }
    ],
    accessories: [
      { name: 'Premium Watch', category: 'Watches', description: 'Stainless steel watch with leather strap', colors: ['Silver', 'Gold', 'Rose Gold'], material: 'Stainless Steel' },
      { name: 'Leather Belt', category: 'Belts', description: 'Genuine leather belt with metal buckle', sizes: ['28-32', '32-36', '36-40'], colors: ['Black', 'Brown', 'Tan'], material: 'Leather' },
      { name: 'Leather Wallet', category: 'Wallets', description: 'Slim leather wallet with multiple card slots', colors: ['Black', 'Brown', 'Navy'], material: 'Leather' },
      { name: 'Leather Backpack', category: 'Bags', description: 'Leather backpack for daily use', colors: ['Black', 'Brown', 'Grey'], material: 'Leather' },
      { name: 'Polarized Sunglasses', category: 'Sunglasses', description: 'UV protection polarized sunglasses', colors: ['Black', 'Brown', 'Grey'], material: 'Acetate' },
      { name: 'Baseball Cap', category: 'Hats & Caps', description: 'Premium cotton cap with embroidered logo', colors: ['Black', 'Navy', 'Grey', 'Olive'], material: 'Cotton' },
      { name: 'Silk Tie', category: 'Ties', description: 'Silk tie for formal occasions', colors: ['Navy', 'Burgundy', 'Grey', 'Black'], material: 'Silk' }
    ],
    sportswear: [
      { name: 'Dry Fit T-Shirt', category: 'Active Tops', description: 'Moisture-wicking performance t-shirt', sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'Grey', 'Navy', 'Red'], material: 'Polyester', fit: 'Regular' },
      { name: 'Training Shorts', category: 'Training Shorts', description: 'Lightweight shorts with inner lining', sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'Grey', 'Navy'], material: 'Polyester', fit: 'Regular' },
      { name: 'Track Jacket', category: 'Sports Jackets', description: 'Lightweight track jacket with zip', sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'Navy', 'Grey'], material: 'Polyester', fit: 'Regular' },
      { name: 'Gym T-Shirt', category: 'Gym Wear', description: 'Breathable t-shirt for gym workouts', sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'Grey', 'Blue'], material: 'Cotton Blend', fit: 'Regular' }
    ]
  },

  // WOMEN'S CATEGORIES
  women: {
    clothing: [
      { name: 'Floral Print Dress', category: 'Dresses', description: 'Floral print dress with flowy silhouette', sizes: ['XS', 'S', 'M', 'L', 'XL'], colors: ['Floral', 'Blue', 'Pink'], material: 'Chiffon', fit: 'Regular' },
      { name: 'Silk Blouse', category: 'Tops & Blouses', description: 'Silk blouse with delicate details', sizes: ['XS', 'S', 'M', 'L'], colors: ['White', 'Black', 'Navy'], material: 'Silk', fit: 'Regular' },
      { name: 'Cashmere Sweater', category: 'Sweaters & Knits', description: 'Luxury cashmere sweater for winter', sizes: ['XS', 'S', 'M', 'L'], colors: ['Cream', 'Grey', 'Navy'], material: 'Cashmere', fit: 'Regular' },
      { name: 'Trench Coat', category: 'Jackets & Coats', description: 'Classic trench coat with belt', sizes: ['XS', 'S', 'M', 'L'], colors: ['Beige', 'Black', 'Navy'], material: 'Cotton Blend', fit: 'Regular' },
      { name: 'Skinny Jeans', category: 'Jeans', description: 'Stretch skinny jeans', sizes: ['26', '28', '30', '32'], colors: ['Blue', 'Black', 'Grey'], material: 'Denim', fit: 'Skinny' },
      { name: 'Wide Leg Trousers', category: 'Pants & Trousers', description: 'Wide leg trousers for elegant look', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Cream', 'Navy'], material: 'Wool Blend', fit: 'Wide' },
      { name: 'Midi Skirt', category: 'Skirts', description: 'Midi length skirt with side slit', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Navy', 'Burgundy'], material: 'Polyester', fit: 'Regular' },
      { name: 'Two-Piece Set', category: 'Co-Ord Sets', description: 'Matching top and bottom set', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'White', 'Pink'], material: 'Cotton', fit: 'Regular' },
      { name: 'Jumpsuit', category: 'Jumpsuits & Rompers', description: 'One-piece jumpsuit with wide legs', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Navy', 'Olive'], material: 'Linen', fit: 'Regular' }
    ],
    footwear: [
      { name: 'Stiletto Heels', category: 'Heels', description: 'Elegant stiletto heels for evening wear', sizes: ['5', '6', '7', '8', '9'], colors: ['Black', 'Nude', 'Red'], material: 'Leather', heelHeight: '3"' },
      { name: 'Ballet Flats', category: 'Flats', description: 'Comfortable ballet flats for daily wear', sizes: ['5', '6', '7', '8', '9'], colors: ['Black', 'Nude', 'Red', 'Navy'], material: 'Leather' },
      { name: 'Ankle Boots', category: 'Boots', description: 'Leather ankle boots for winter', sizes: ['5', '6', '7', '8'], colors: ['Black', 'Brown', 'Tan'], material: 'Leather' },
      { name: 'Strappy Sandals', category: 'Sandals', description: 'Elegant strappy sandals for summer', sizes: ['5', '6', '7', '8'], colors: ['Gold', 'Silver', 'Black'], material: 'Leather' },
      { name: 'White Sneakers', category: 'Sneakers', description: 'Classic white leather sneakers', sizes: ['5', '6', '7', '8', '9'], colors: ['White', 'Black', 'Pink'], material: 'Leather' },
      { name: 'Wedge Sandals', category: 'Espadrilles', description: 'Comfortable wedge sandals', sizes: ['5', '6', '7', '8'], colors: ['Natural', 'Black', 'Navy'], material: 'Canvas' }
    ],
    accessories: [
      { name: 'Leather Handbag', category: 'Handbags', description: 'Premium leather handbag with gold hardware', colors: ['Black', 'Brown', 'Tan'], material: 'Leather' },
      { name: 'Pearl Necklace', category: 'Jewelry', description: 'Classic pearl necklace set', colors: ['White', 'Cream'], material: 'Pearl' },
      { name: 'Silk Scarf', category: 'Scarves', description: 'Printed silk scarf', colors: ['Multi-color', 'Floral', 'Abstract'], material: 'Silk' },
      { name: 'Designer Sunglasses', category: 'Sunglasses', description: 'Cat-eye sunglasses with UV protection', colors: ['Black', 'Brown', 'Tortoise'], material: 'Acetate' },
      { name: 'Wide Brim Hat', category: 'Hats', description: 'Straw hat for summer', colors: ['Natural', 'Black', 'White'], material: 'Straw' },
      { name: 'Leather Belt', category: 'Belts', description: 'Skinny leather belt', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Brown', 'Tan'], material: 'Leather' },
      { name: 'Rose Gold Watch', category: 'Watches', description: 'Rose gold watch with leather strap', colors: ['Rose Gold', 'Silver'], material: 'Stainless Steel' }
    ],
    activewear: [
      { name: 'Sports Bra', category: 'Sports Bras', description: 'High support sports bra', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Grey', 'Navy', 'Pink'], material: 'Polyester', support: 'High' },
      { name: 'High-Waist Leggings', category: 'Leggings', description: 'Compression leggings with high waist', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Grey', 'Navy', 'Burgundy'], material: 'Nylon/Spandex', fit: 'High Waist' },
      { name: 'Workout Tank Top', category: 'Athletic Tops', description: 'Breathable tank top for workouts', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Grey', 'Blue'], material: 'Polyester', fit: 'Regular' },
      { name: 'Yoga Pants', category: 'Yoga Pants', description: 'Flexible yoga pants with side pockets', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Grey', 'Navy'], material: 'Cotton Blend', fit: 'Regular' },
      { name: 'Running Shoes', category: 'Training Shoes', description: 'Lightweight running shoes for women', sizes: ['5', '6', '7', '8', '9'], colors: ['White/Pink', 'Black/Grey', 'Blue/White'], material: 'Mesh', fit: 'Regular' }
    ]
  },

  // KIDS CATEGORIES
  kids: {
    boys: [
      { name: 'Cartoon T-Shirt', category: 'T-Shirts & Tops', description: 'Cotton t-shirt with cartoon prints', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Blue', 'Red', 'Green', 'Yellow'], material: 'Cotton', age: '2-8 Years' },
      { name: 'School Shirt', category: 'Shirts', description: 'Formal shirt for school', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['White', 'Blue'], material: 'Cotton', age: '2-8 Years' },
      { name: 'Denim Jeans', category: 'Pants & Jeans', description: 'Durable denim jeans for boys', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Blue', 'Black'], material: 'Denim', age: '2-8 Years' },
      { name: 'Cargo Shorts', category: 'Shorts', description: 'Summer shorts with pockets', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Khaki', 'Navy', 'Green'], material: 'Cotton', age: '2-8 Years' },
      { name: 'Winter Jacket', category: 'Jackets', description: 'Warm winter jacket for boys', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Navy', 'Red', 'Black'], material: 'Polyester', age: '2-8 Years' },
      { name: 'Two-Piece Set', category: 'Sets & Outfits', description: 'Matching shirt and pants set', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Blue/White', 'Grey/Black'], material: 'Cotton', age: '2-8 Years' }
    ],
    girls: [
      { name: 'Princess Dress', category: 'Dresses', description: 'Beautiful dress for special occasions', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Pink', 'Purple', 'Blue'], material: 'Polyester', age: '2-8 Years' },
      { name: 'Floral Top', category: 'Tops & Blouses', description: 'Floral print top for girls', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Pink', 'White', 'Yellow'], material: 'Cotton', age: '2-8 Years' },
      { name: 'Tutu Skirt', category: 'Skirts', description: 'Tutu skirt for dance and play', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Pink', 'White', 'Purple'], material: 'Tulle', age: '2-8 Years' },
      { name: 'Leggings', category: 'Leggings', description: 'Comfortable leggings for daily wear', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Black', 'Pink', 'Purple'], material: 'Cotton', age: '2-8 Years' },
      { name: 'Party Set', category: 'Sets & Outfits', description: 'Complete party outfit set', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Pink/White', 'Blue/White'], material: 'Polyester', age: '2-8 Years' },
      { name: 'Puffer Jacket', category: 'Jackets', description: 'Warm puffer jacket for winter', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Pink', 'Purple', 'Navy'], material: 'Polyester', age: '2-8 Years' }
    ],
    baby: [
      { name: 'Cotton Bodysuit', category: 'Bodysuits', description: 'Soft cotton bodysuit for babies', sizes: ['0-3M', '3-6M', '6-12M', '12-24M'], colors: ['White', 'Blue', 'Pink', 'Yellow'], material: 'Cotton', age: '0-24 Months' },
      { name: 'Sleep Romper', category: 'Rompers', description: 'Comfortable romper for sleep', sizes: ['0-3M', '3-6M', '6-12M', '12-24M'], colors: ['White', 'Blue', 'Pink'], material: 'Cotton', age: '0-24 Months' },
      { name: 'Pyjama Set', category: 'Sleepwear', description: 'Warm pyjama set for night', sizes: ['0-3M', '3-6M', '6-12M', '12-24M'], colors: ['Blue', 'Pink', 'White'], material: 'Cotton', age: '0-24 Months' },
      { name: 'Gift Set', category: 'Sets', description: 'Complete baby gift set', sizes: ['0-3M', '3-6M', '6-12M', '12-24M'], colors: ['Blue/White', 'Pink/White'], material: 'Cotton', age: '0-24 Months' }
    ],
    accessories: [
      { name: 'School Shoes', category: 'Shoes', description: 'Comfortable shoes for school', sizes: ['1', '2', '3', '4', '5'], colors: ['Black', 'Brown', 'Navy'], material: 'Leather', age: '2-8 Years' },
      { name: 'Sun Hat', category: 'Hats & Caps', description: 'Sun protection hat for kids', sizes: ['One Size'], colors: ['Blue', 'Pink', 'Yellow'], material: 'Cotton', age: '2-8 Years' },
      { name: 'Backpack', category: 'Bags', description: 'School backpack for kids', colors: ['Blue', 'Pink', 'Black', 'Red'], material: 'Polyester', age: '2-8 Years' },
      { name: 'Character Socks', category: 'Socks', description: 'Fun socks with cartoon characters', sizes: ['S-M', 'L-XL'], colors: ['Multi-color'], material: 'Cotton', age: '2-8 Years' },
      { name: 'Hair Clip Set', category: 'Hair Accessories', description: 'Set of colorful hair clips', colors: ['Multi-color'], material: 'Plastic', age: '2-8 Years' }
    ]
  },

  // ACCESSORIES (UNISEX/GENERAL)
  accessories: {
    men: [
      { name: 'Chronograph Watch', category: 'Watches', description: 'Automatic chronograph watch with leather strap', colors: ['Black', 'Brown', 'Blue'], material: 'Stainless Steel' },
      { name: 'Reversible Belt', category: 'Belts', description: 'Reversible belt with two colors', sizes: ['32-36', '36-40'], colors: ['Black/Brown', 'Brown/Tan'], material: 'Leather' },
      { name: 'Leather Card Holder', category: 'Wallets', description: 'Slim leather card holder', colors: ['Black', 'Brown', 'Navy'], material: 'Leather' },
      { name: 'Laptop Backpack', category: 'Bags', description: 'Professional laptop backpack', colors: ['Black', 'Grey', 'Navy'], material: 'Nylon' },
      { name: 'Aviator Sunglasses', category: 'Sunglasses', description: 'Classic aviator sunglasses', colors: ['Gold', 'Silver', 'Black'], material: 'Metal' },
      { name: 'Fedora Hat', category: 'Hats & Caps', description: 'Classic fedora hat', colors: ['Black', 'Brown', 'Grey'], material: 'Wool' },
      { name: 'Silk Bow Tie', category: 'Ties', description: 'Formal silk bow tie', colors: ['Black', 'Navy', 'Burgundy'], material: 'Silk' }
    ],
    women: [
      { name: 'Designer Handbag', category: 'Handbags', description: 'Designer handbag with chain strap', colors: ['Black', 'Beige', 'Red'], material: 'Leather' },
      { name: 'Diamond Stud Earrings', category: 'Jewelry', description: 'Real diamond stud earrings', colors: ['White Gold', 'Yellow Gold'], material: 'Gold' },
      { name: 'Cashmere Scarf', category: 'Scarves', description: 'Luxury cashmere scarf', colors: ['Camel', 'Grey', 'Navy'], material: 'Cashmere' },
      { name: 'Cat-Eye Sunglasses', category: 'Sunglasses', description: 'Trendy cat-eye sunglasses', colors: ['Black', 'Tortoise', 'Gold'], material: 'Acetate' },
      { name: 'Wide Brim Hat', category: 'Hats', description: 'Summer wide brim hat', colors: ['White', 'Black', 'Natural'], material: 'Straw' },
      { name: 'Designer Belt', category: 'Belts', description: 'Designer logo belt', sizes: ['XS', 'S', 'M', 'L'], colors: ['Black', 'Brown'], material: 'Leather' },
      { name: 'Diamond Watch', category: 'Watches', description: 'Diamond bezel watch', colors: ['Rose Gold', 'White Gold'], material: 'Gold' }
    ],
    kids: [
      { name: 'School Backpack', category: 'Bags', description: 'Durable school backpack', colors: ['Blue', 'Pink', 'Black', 'Red'], material: 'Polyester' },
      { name: 'Baseball Cap', category: 'Hats', description: 'Adjustable baseball cap', colors: ['Blue', 'Red', 'Black', 'Green'], material: 'Cotton' },
      { name: 'Kids Sunglasses', category: 'Sunglasses', description: 'UV protection sunglasses for kids', colors: ['Blue', 'Pink', 'Black'], material: 'Plastic' },
      { name: 'Character Socks', category: 'Socks', description: 'Socks with favorite characters', sizes: ['S-M', 'L-XL'], colors: ['Multi-color'], material: 'Cotton' },
      { name: 'Hair Bow Set', category: 'Hair Accessories', description: 'Set of colorful hair bows', colors: ['Multi-color'], material: 'Satin' }
    ],
    general: [
      { name: 'Leather Tote Bag', category: 'Bags & Backpacks', description: 'Premium leather tote bag', colors: ['Black', 'Brown', 'Tan'], material: 'Leather' },
      { name: 'Smart Watch', category: 'Watches & Jewelry', description: 'Smart watch with fitness tracking', colors: ['Black', 'Silver', 'Gold'], material: 'Aluminum' },
      { name: 'Polarized Sunglasses', category: 'Eyewear', description: 'Professional polarized sunglasses', colors: ['Black', 'Brown', 'Grey'], material: 'Acetate' },
      { name: 'Leather Card Case', category: 'Small Leather Goods', description: 'Minimalist leather card case', colors: ['Black', 'Brown', 'Navy'], material: 'Leather' },
      { name: 'Bucket Hat', category: 'Hats & Caps', description: 'Trendy bucket hat', colors: ['Black', 'Beige', 'Navy'], material: 'Cotton' },
      { name: 'Phone Case', category: 'Tech Accessories', description: 'Premium leather phone case', colors: ['Black', 'Brown', 'Blue'], material: 'Leather' }
    ]
  },

  // SALE CATEGORIES
  sale: {
    men: [
      { name: 'Cotton T-Shirt (Sale)', category: 'T-Shirts up to 50% off', description: 'Premium cotton t-shirt on sale', sizes: ['S', 'M', 'L', 'XL'], colors: ['White', 'Black', 'Blue'], material: 'Cotton', discount: '50%' },
      { name: 'Denim Jeans (Sale)', category: 'Jeans up to 40% off', description: 'Slim fit jeans on sale', sizes: ['30', '32', '34', '36'], colors: ['Blue', 'Black'], material: 'Denim', discount: '40%' },
      { name: 'Winter Jacket (Sale)', category: 'Jackets up to 60% off', description: 'Winter jacket clearance sale', sizes: ['S', 'M', 'L', 'XL'], colors: ['Black', 'Navy', 'Grey'], material: 'Polyester', discount: '60%' },
      { name: 'Leather Belt (Sale)', category: 'Accessories up to 30% off', description: 'Genuine leather belt on sale', sizes: ['32-36', '36-40'], colors: ['Black', 'Brown'], material: 'Leather', discount: '30%' }
    ],
    women: [
      { name: 'Summer Dress (Sale)', category: 'Dresses up to 50% off', description: 'Floral summer dress on sale', sizes: ['XS', 'S', 'M', 'L'], colors: ['Floral', 'Blue', 'Pink'], material: 'Cotton', discount: '50%' },
      { name: 'Silk Top (Sale)', category: 'Tops up to 40% off', description: 'Silk blouse on clearance', sizes: ['XS', 'S', 'M'], colors: ['White', 'Black', 'Navy'], material: 'Silk', discount: '40%' },
      { name: 'Heels (Sale)', category: 'Shoes up to 60% off', description: 'Designer heels on sale', sizes: ['6', '7', '8'], colors: ['Black', 'Nude', 'Red'], material: 'Leather', discount: '60%' },
      { name: 'Handbag (Sale)', category: 'Bags up to 45% off', description: 'Designer handbag clearance', colors: ['Black', 'Brown', 'Tan'], material: 'Leather', discount: '45%' }
    ],
    kids: [
      { name: 'Kids Set (Sale)', category: 'Sets up to 50% off', description: 'Complete kids outfit set on sale', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Blue/White', 'Pink/White'], material: 'Cotton', discount: '50%' },
      { name: 'Winter Coat (Sale)', category: 'Outerwear up to 60% off', description: 'Kids winter coat clearance', sizes: ['2Y', '4Y', '6Y', '8Y'], colors: ['Navy', 'Red', 'Black'], material: 'Polyester', discount: '60%' },
      { name: 'School Shoes (Sale)', category: 'Shoes up to 40% off', description: 'School shoes on sale', sizes: ['1', '2', '3', '4'], colors: ['Black', 'Brown'], material: 'Leather', discount: '40%' },
      { name: 'Backpack (Sale)', category: 'Accessories up to 30% off', description: 'Kids backpack clearance', colors: ['Blue', 'Pink', 'Black'], material: 'Polyester', discount: '30%' }
    ],
    clearance: [
      { name: 'Last Season Jacket', category: 'Last Season Items', description: 'Previous season jacket at clearance price', sizes: ['S', 'M', 'L'], colors: ['Black', 'Navy'], material: 'Polyester', discount: '70%' },
      { name: 'Final Reduction Dress', category: 'Final Reductions', description: 'Final clearance price dress', sizes: ['XS', 'S', 'M'], colors: ['Black', 'Red'], material: 'Polyester', discount: '80%' },
      { name: 'Limited Size Shoes', category: 'Limited Sizes', description: 'Limited sizes available at clearance', sizes: ['7', '9', '11'], colors: ['Black', 'Brown'], material: 'Leather', discount: '65%' },
      { name: 'Special Offer Bundle', category: 'Special Offers', description: 'Special bundle offer', colors: ['Various'], material: 'Various', discount: 'Bundle Deal' }
    ]
  }
};

// QUICK CATEGORY BUTTONS
const CATEGORY_BUTTONS = [
  // Main Categories
  '👕 Men\'s Clothing',
  '👚 Women\'s Clothing',
  '👶 Kids Collection',
  '👜 Accessories',
  '💰 Sale Items',
  
  // Sub-categories
  '👖 Men\'s Jeans',
  '👔 Men\'s Shirts',
  '👟 Men\'s Footwear',
  '👗 Women\'s Dresses',
  '👠 Women\'s Shoes',
  '🎒 Kids Accessories',
  '🕶️ Sunglasses',
  '⌚ Watches',
  '🎩 Hats & Caps',
  
  // Common Queries
  '🚚 Delivery Info',
  '🔄 Exchange Policy',
  '📏 Size Guide',
  '🔥 Best Sellers',
  '💎 New Arrivals'
];

// BEST SELLERS LIST
const BEST_SELLERS = [
  'Premium Oxford Shirt (Men)',
  'Skinny Jeans (Women)',
  'Floral Print Dress',
  'Leather Sneakers (Men)',
  'Stiletto Heels',
  'Cartoon T-Shirt (Kids)',
  'Leather Handbag',
  'Chronograph Watch',
  'Cashmere Sweater',
  'Winter Boots'
];

// SIZE GUIDES
const SIZE_GUIDE = {
  tshirt: {
    'S': { chest: '36-38"', length: '27"', fit: 'Regular' },
    'M': { chest: '38-40"', length: '28"', fit: 'Regular' },
    'L': { chest: '40-42"', length: '29"', fit: 'Regular' },
    'XL': { chest: '42-44"', length: '30"', fit: 'Regular' },
    'XXL': { chest: '44-46"', length: '31"', fit: 'Regular' }
  },
  shirt: {
    'S': { collar: '14-14.5"', chest: '38-40"', sleeve: '32"' },
    'M': { collar: '15-15.5"', chest: '40-42"', sleeve: '33"' },
    'L': { collar: '16-16.5"', chest: '42-44"', sleeve: '34"' },
    'XL': { collar: '17-17.5"', chest: '44-46"', sleeve: '35"' }
  },
  jeans: {
    '28': { waist: '28"', inseam: '32"', fit: 'Slim' },
    '30': { waist: '30"', inseam: '32"', fit: 'Slim' },
    '32': { waist: '32"', inseam: '32"', fit: 'Regular' },
    '34': { waist: '34"', inseam: '32"', fit: 'Regular' },
    '36': { waist: '36"', inseam: '32"', fit: 'Regular' }
  },
  shoes: {
    '7': { uk: '7', us: '8', eu: '41' },
    '8': { uk: '8', us: '9', eu: '42' },
    '9': { uk: '9', us: '10', eu: '43' },
    '10': { uk: '10', us: '11', eu: '44' },
    '11': { uk: '11', us: '12', eu: '45' }
  }
};

const CITIES_PAKISTAN = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'];

export default function PremiumFashionChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'bot',
      text: `Welcome to Premium Fashion E-commerce! 👋

I'm your personal shopping assistant, here to help you find the perfect fashion items from our extensive collection.

🌟 Our Categories:
• 👕 Men's Fashion (Clothing, Footwear, Accessories)
• 👚 Women's Fashion (Dresses, Tops, Shoes, Bags)
• 👶 Kids Collection (Boys, Girls, Baby)
• 👜 Premium Accessories (Watches, Jewelry, Bags)
• 💰 Sale & Clearance Items

How can I assist you today?
1. Browse specific categories
2. Get size recommendations
3. Check delivery information
4. Learn about exchange policies
5. Find outfit suggestions

Simply type your query or use the quick buttons below! 🛍️`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>(CATEGORY_BUTTONS);
  const [context, setContext] = useState<ConversationContext>({
    previousTopics: []
  });
  const [logoSrc, setLogoSrc] = useState<string>(LOGO_SRC);
  const logoRetryRef = useRef(0);
  
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [chatBottom, setChatBottom] = useState<string>('64px');

  // Auto scroll
  useEffect(() => {
    if (!open) return;

    // If only the initial message is present when opening, show from top
    if (messages.length <= 1 && bodyRef.current) {
      bodyRef.current.scrollTop = 0;
      return;
    }

    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typing, open]);

  // Focus input when chat opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Lock background scrolling when chat opens while preserving layout (compensate for scrollbar)
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    const preventTouch = (e: TouchEvent) => {
      // allow touch events inside the chat container
      const target = e.target as HTMLElement | null;
      if (target && target.closest && target.closest('.chatbot-container')) return;
      e.preventDefault();
    };

    if (open) {
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
      // prevent background touch scrolling on mobile
      document.addEventListener('touchmove', preventTouch, { passive: false });
    } else {
      document.body.style.overflow = originalOverflow || '';
      document.body.style.paddingRight = originalPaddingRight || '';
      document.removeEventListener('touchmove', preventTouch);
    }

    return () => {
      document.body.style.overflow = originalOverflow || '';
      document.body.style.paddingRight = originalPaddingRight || '';
      document.removeEventListener('touchmove', preventTouch);
    };
  }, [open]);

  // Update chat bottom offset so the chat appears above the button without moving it
  useEffect(() => {
    const updateBottom = () => {
      if (buttonRef.current) {
        const btnH = buttonRef.current.offsetHeight || 56;
        const gap = 8; // spacing between chat bottom and button top
        setChatBottom(`${btnH + gap}px`);
      }
    };

    updateBottom();
    window.addEventListener('resize', updateBottom);
    return () => window.removeEventListener('resize', updateBottom);
  }, []);

  // Close chat when clicking/tapping outside the chatbot container or pressing Escape
  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (!open) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  // Premium font
  useEffect(() => {
    const id = 'premium-chatbot-font';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  // Ensure logo is brand image and provide a safe fallback (data-URI SVG) after a retry
  const handleLogoError = () => {
    // Retry once for transient failures
    if (logoRetryRef.current < 1) {
      logoRetryRef.current += 1;
      setLogoSrc(LOGO_SRC);
      return;
    }

    // Final fallback: embedded SVG wordmark (data URI). This avoids any text-letter icon fallback.
    const svg = encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">' +
      '<defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#111827"/><stop offset="1" stop-color="#4b5563"/></linearGradient></defs>' +
      '<rect width="100%" height="100%" rx="40" fill="url(%23g)"/>' +
      '<text x="50%" y="54%" font-family="\'Plus Jakarta Sans\', Arial, sans-serif" font-weight="700" font-size="56" fill="#fff" text-anchor="middle" alignment-baseline="middle">DENFiT</text>' +
      '</svg>'
    );

    setLogoSrc(`data:image/svg+xml;utf8,${svg}`);
  };

  const getCurrentTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Extract key info from user message
  const updateContext = (userText: string, prevContext: ConversationContext): ConversationContext => {
    const lower = userText.toLowerCase();
    const newContext = { ...prevContext };

    // Extract gender
    if (lower.includes('women') || lower.includes('woman') || lower.includes('female') || lower.includes('ladies')) {
      newContext.gender = 'women';
    } else if (lower.includes('men') || lower.includes('man') || lower.includes('male') || lower.includes('gents')) {
      newContext.gender = 'men';
    } else if (lower.includes('kid') || lower.includes('child') || lower.includes('baby') || lower.includes('boys') || lower.includes('girls')) {
      newContext.gender = 'kids';
    }

    // Extract category
    if (lower.includes('tshirt') || lower.includes('t-shirt') || lower.includes('tee')) {
      newContext.category = 'clothing';
      newContext.subcategory = 't-shirts';
    } else if (lower.includes('shirt')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'shirts';
    } else if (lower.includes('polo')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'polo';
    } else if (lower.includes('hoodie') || lower.includes('sweatshirt')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'hoodies';
    } else if (lower.includes('jacket') || lower.includes('coat')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'jackets';
    } else if (lower.includes('jean')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'jeans';
    } else if (lower.includes('pant') || lower.includes('trouser')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'pants';
    } else if (lower.includes('short')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'shorts';
    } else if (lower.includes('suit') || lower.includes('blazer')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'suits';
    } else if (lower.includes('shoe') || lower.includes('footwear') || lower.includes('sneaker') || lower.includes('loafer') || lower.includes('boot')) {
      newContext.category = 'footwear';
    } else if (lower.includes('dress')) {
      newContext.category = 'clothing';
      newContext.subcategory = 'dresses';
    } else if (lower.includes('accessor')) {
      newContext.category = 'accessories';
    } else if (lower.includes('sale') || lower.includes('discount') || lower.includes('clearance')) {
      newContext.category = 'sale';
    }

    // Extract size
    const sizeMatch = lower.match(/\b(xs|s|m|l|xl|xxl|2xl|3xl|28|30|32|34|36|38|40)\b/);
    if (sizeMatch) newContext.size = sizeMatch[0].toUpperCase();

    // Extract height
    const heightMatch = lower.match(/(\d)'(\d+)"|(\d\.\d+)|(\d+)cm/);
    if (heightMatch) newContext.height = heightMatch[0];

    // Extract city
    CITIES_PAKISTAN.forEach(city => {
      if (lower.includes(city.toLowerCase())) {
        newContext.city = city;
      }
    });

    // Track topics
    if (!newContext.previousTopics) newContext.previousTopics = [];
    if (lower.includes('delivery') || lower.includes('shipping')) newContext.previousTopics.push('delivery');
    if (lower.includes('price') || lower.includes('cost')) newContext.previousTopics.push('price');
    if (lower.includes('size') || lower.includes('fit')) newContext.previousTopics.push('size');
    if (lower.includes('exchange') || lower.includes('return') || lower.includes('refund')) newContext.previousTopics.push('return');
    if (lower.includes('color') || lower.includes('colour')) newContext.previousTopics.push('color');

    // Deduplicate topics
    newContext.previousTopics = [...new Set(newContext.previousTopics)];

    return newContext;
  };

  // Get products by category
  const getProductsByCategory = (gender?: string, category?: string, subcategory?: string) => {
    if (!gender && !category) return [];

    let products = [];

    if (gender === 'men') {
      if (category === 'clothing') {
        products = PRODUCT_DATABASE.men.clothing;
        if (subcategory) {
          products = products.filter(p => p.category.toLowerCase().includes(subcategory.toLowerCase()));
        }
      } else if (category === 'footwear') {
        products = PRODUCT_DATABASE.men.footwear;
      } else if (category === 'accessories') {
        products = PRODUCT_DATABASE.men.accessories;
      } else if (category === 'sportswear') {
        products = PRODUCT_DATABASE.men.sportswear;
      }
    } else if (gender === 'women') {
      if (category === 'clothing') {
        products = PRODUCT_DATABASE.women.clothing;
        if (subcategory) {
          products = products.filter(p => p.category.toLowerCase().includes(subcategory.toLowerCase()));
        }
      } else if (category === 'footwear') {
        products = PRODUCT_DATABASE.women.footwear;
      } else if (category === 'accessories') {
        products = PRODUCT_DATABASE.women.accessories;
      } else if (category === 'activewear') {
        products = PRODUCT_DATABASE.women.activewear;
      }
    } else if (gender === 'kids') {
      products = [
        ...PRODUCT_DATABASE.kids.boys,
        ...PRODUCT_DATABASE.kids.girls,
        ...PRODUCT_DATABASE.kids.baby,
        ...PRODUCT_DATABASE.kids.accessories
      ];
    } else if (category === 'accessories') {
      products = [
        ...PRODUCT_DATABASE.accessories.men,
        ...PRODUCT_DATABASE.accessories.women,
        ...PRODUCT_DATABASE.accessories.kids,
        ...PRODUCT_DATABASE.accessories.general
      ];
    } else if (category === 'sale') {
      products = [
        ...PRODUCT_DATABASE.sale.men,
        ...PRODUCT_DATABASE.sale.women,
        ...PRODUCT_DATABASE.sale.kids,
        ...PRODUCT_DATABASE.sale.clearance
      ];
    }

    return products.slice(0, 8); // Limit to 8 products
  };

  // Advanced AI Response with context awareness
  const generateAIResponse = (userText: string, currentContext: ConversationContext): string => {
    const lower = userText.toLowerCase().trim();

    // Enforce English-only responses: if user sends non-ASCII text heavily, gently ask for English.
    if (/[\u0400-\u04FF\u0600-\u06FF\u0900-\u097F]/u.test(userText) && userText.split(/\s+/).length > 1) {
      return `Please write your question in English so I can assist you best. If you prefer, contact our support on WhatsApp.`;
    }

    // Account / Login / Register
    if (lower.includes('login') || lower.includes('log in') || lower.includes('sign in') || lower.includes('register') || lower.includes('sign up') || lower.includes('create account')) {
      return `Account & Login Help:\n\n• To create an account: Go to the Sign Up page, enter your email, create a password, and verify via the confirmation email.\n• If you cannot register: check your spam folder for verification email or try a different email.\n• Forgot password: use the "Forgot Password" link on the login page to reset via your registered email or phone.\n• For security-sensitive help (account takeover, email change), please contact us on WhatsApp so we can verify your identity.`;
    }

    // Account management (orders, address, payment methods)
    if (lower.includes('account') || lower.includes('address') || lower.includes('profile') || lower.includes('order history') || lower.includes('payment method') || lower.includes('billing')) {
      return `Manage Your Account:\n\n• Orders: Visit Your Orders to view status, invoices, and tracking.\n• Address: Update addresses in Account Settings > Addresses.\n• Payment Methods: Add or remove cards under Account Settings > Payments.\n• For changes requiring verification (email/phone change), contact support on WhatsApp for secure processing.`;
    }

    // Greetings
    if (/^(hi|hello|hey|salam|assalam|good morning|good evening|what's up)$/i.test(lower.replace(/[^\w\s]/g, ''))) {
      return `Hello! Welcome to our premium fashion store. 👋

I'm here to help you discover the perfect fashion items from our extensive collection.

Which category interests you today?
• 👕 Men's Fashion
• 👚 Women's Fashion  
• 👶 Kids Collection
• 👜 Accessories
• 💰 Sale Items

Or are you looking for something specific?`;
    }

    // Best sellers / trending
    if (lower.includes('best seller') || lower.includes('popular') || lower.includes('trending') || lower.includes('hot') || lower.includes('recommendation')) {
      const bestSellersList = BEST_SELLERS.map((item, idx) => `${idx + 1}. ${item}`).join('\n');
      
      return `🔥 Our Best Selling Products:\n\n${bestSellersList}\n\nThese items are highly rated by our customers. Would you like more details about any of these products?`;
    }

    // New arrivals
    if (lower.includes('new arrival') || lower.includes('latest') || lower.includes('new collection')) {
      return `🎉 New Arrivals Collection:\n\n1. Premium Oxford Shirt (Men)\n2. Floral Print Dress (Women)\n3. Leather Sneakers (Men)\n4. Cashmere Sweater (Women)\n5. Smart Watch (Accessories)\n6. Kids Winter Jacket\n7. Designer Handbag\n8. Polarized Sunglasses\n\nOur new collection features the latest fashion trends and premium materials. Which category would you like to explore?`;
    }

    // Men's categories
    if (lower.includes('men') || lower.includes('man') || lower.includes('guy') || lower.includes('gentlemen')) {
      const menCategories = `👕 Men's Fashion Categories:\n\n• Clothing: T-Shirts, Shirts, Polo, Hoodies, Jackets, Jeans, Pants, Shorts, Suits\n• Footwear: Sneakers, Loafers, Boots, Sandals, Formal Shoes, Sports Shoes\n• Accessories: Watches, Belts, Wallets, Bags, Sunglasses, Hats, Ties\n• Sportswear: Active Tops, Training Shorts, Sports Jackets, Gym Wear\n\nWhich specific category are you interested in?`;
      
      if (lower.includes('tshirt') || lower.includes('t-shirt')) {
        const products = PRODUCT_DATABASE.men.clothing.filter(p => p.category === 'T-Shirts');
        const productList = products.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}\n  Sizes: ${p.sizes.join(', ')}`).join('\n\n');
        return `👕 Men's T-Shirts:\n\n${productList}\n\nNeed help with sizing or want to see colors?`;
      }
      
      if (lower.includes('shirt')) {
        const products = PRODUCT_DATABASE.men.clothing.filter(p => p.category === 'Shirts');
        const productList = products.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}\n  Sizes: ${p.sizes.join(', ')}`).join('\n\n');
        return `👔 Men's Shirts:\n\n${productList}\n\nThese shirts are perfect for formal and casual occasions.`;
      }
      
      if (lower.includes('jean')) {
        const products = PRODUCT_DATABASE.men.clothing.filter(p => p.category === 'Jeans');
        const productList = products.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}\n  Sizes: ${p.sizes.join(', ')}`).join('\n\n');
        return `👖 Men's Jeans:\n\n${productList}\n\nNeed size guidance? Share your waist measurement.`;
      }
      
      if (lower.includes('shoe') || lower.includes('footwear')) {
        const products = PRODUCT_DATABASE.men.footwear;
        const productList = products.map(p => `• ${p.name} (${p.category}): ${p.description}\n  Available in: ${p.colors.join(', ')}\n  Sizes: ${p.sizes.join(', ')}`).join('\n\n');
        return `👟 Men's Footwear:\n\n${productList}\n\nNeed help with shoe size conversion?`;
      }
      
      return menCategories;
    }

    // Women's categories
    if (lower.includes('women') || lower.includes('woman') || lower.includes('lady') || lower.includes('ladies')) {
      const womenCategories = `👚 Women's Fashion Categories:\n\n• Clothing: Dresses, Tops, Sweaters, Jackets, Jeans, Pants, Skirts, Sets, Jumpsuits\n• Footwear: Heels, Flats, Boots, Sandals, Sneakers, Espadrilles\n• Accessories: Handbags, Jewelry, Scarves, Sunglasses, Hats, Belts, Watches\n• Activewear: Sports Bras, Leggings, Athletic Tops, Yoga Pants, Training Shoes\n\nWhich category would you like to explore?`;
      
      if (lower.includes('dress')) {
        const products = PRODUCT_DATABASE.women.clothing.filter(p => p.category === 'Dresses');
        const productList = products.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}\n  Sizes: ${p.sizes.join(', ')}`).join('\n\n');
        return `👗 Women's Dresses:\n\n${productList}\n\nPerfect for parties, weddings, or casual outings.`;
      }
      
      if (lower.includes('top') || lower.includes('blouse')) {
        const products = PRODUCT_DATABASE.women.clothing.filter(p => p.category === 'Tops & Blouses');
        const productList = products.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}\n  Sizes: ${p.sizes.join(', ')}`).join('\n\n');
        return `👚 Women's Tops & Blouses:\n\n${productList}\n\nThese can be paired with jeans, skirts, or trousers.`;
      }
      
      if (lower.includes('shoe') || lower.includes('footwear') || lower.includes('heel')) {
        const products = PRODUCT_DATABASE.women.footwear;
        const productList = products.map(p => `• ${p.name} (${p.category}): ${p.description}\n  Available in: ${p.colors.join(', ')}\n  Sizes: ${p.sizes.join(', ')}`).join('\n\n');
        return `👠 Women's Footwear:\n\n${productList}\n\nNeed help finding the right size?`;
      }
      
      if (lower.includes('bag') || lower.includes('handbag')) {
        const products = PRODUCT_DATABASE.women.accessories.filter(p => p.category === 'Handbags');
        const productList = products.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}`).join('\n\n');
        return `👜 Women's Handbags:\n\n${productList}\n\nThese bags are perfect for different occasions.`;
      }
      
      return womenCategories;
    }

    // Kids categories
    if (lower.includes('kid') || lower.includes('child') || lower.includes('baby') || lower.includes('boys') || lower.includes('girls')) {
      if (lower.includes('boy')) {
        const products = PRODUCT_DATABASE.kids.boys;
        const productList = products.map(p => `• ${p.name} (${p.category}): ${p.description}\n  Ages: ${p.age}, Sizes: ${p.sizes.join(', ')}\n  Colors: ${p.colors.join(', ')}`).join('\n\n');
        return `👦 Boys Collection (2-8 Years):\n\n${productList}\n\nNeed help with age-to-size conversion?`;
      }
      
      if (lower.includes('girl')) {
        const products = PRODUCT_DATABASE.kids.girls;
        const productList = products.map(p => `• ${p.name} (${p.category}): ${p.description}\n  Ages: ${p.age}, Sizes: ${p.sizes.join(', ')}\n  Colors: ${p.colors.join(', ')}`).join('\n\n');
        return `👧 Girls Collection (2-8 Years):\n\n${productList}\n\nPerfect for school, parties, or daily wear.`;
      }
      
      if (lower.includes('baby')) {
        const products = PRODUCT_DATABASE.kids.baby;
        const productList = products.map(p => `• ${p.name} (${p.category}): ${p.description}\n  Ages: ${p.age}, Sizes: ${p.sizes.join(', ')}\n  Colors: ${p.colors.join(', ')}`).join('\n\n');
        return `👶 Baby Collection (0-24 Months):\n\n${productList}\n\nSoft and comfortable clothing for your little one.`;
      }
      
      return `👶 Kids Collection:\n\n• 👦 Boys (2-8 Years): T-Shirts, Shirts, Pants, Shorts, Jackets, Sets\n• 👧 Girls (2-8 Years): Dresses, Tops, Skirts, Leggings, Sets, Jackets\n• 👶 Baby (0-24 Months): Bodysuits, Rompers, Sleepwear, Sets\n• 🎒 Accessories: Shoes, Hats, Bags, Socks, Hair Accessories\n\nWhich specific category interests you?`;
    }

    // Accessories
    if (lower.includes('accessor') || lower.includes('watch') || lower.includes('bag') || lower.includes('sunglass') || lower.includes('jewelry') || lower.includes('belt') || lower.includes('hat')) {
      if (lower.includes('watch')) {
        const watches = [
          ...PRODUCT_DATABASE.accessories.men.filter(p => p.category === 'Watches'),
          ...PRODUCT_DATABASE.accessories.women.filter(p => p.category === 'Watches')
        ];
        const productList = watches.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}`).join('\n\n');
        return `⌚ Premium Watches:\n\n${productList}\n\nAvailable for both men and women.`;
      }
      
      if (lower.includes('bag') || lower.includes('handbag') || lower.includes('backpack')) {
        const bags = [
          ...PRODUCT_DATABASE.accessories.men.filter(p => p.category === 'Bags'),
          ...PRODUCT_DATABASE.accessories.women.filter(p => p.category === 'Handbags'),
          ...PRODUCT_DATABASE.accessories.general.filter(p => p.category.includes('Bag'))
        ];
        const productList = bags.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}`).join('\n\n');
        return `👜 Bags & Backpacks:\n\n${productList}\n\nPerfect for work, travel, or daily use.`;
      }
      
      if (lower.includes('sunglass')) {
        const sunglasses = [
          ...PRODUCT_DATABASE.accessories.men.filter(p => p.category === 'Sunglasses'),
          ...PRODUCT_DATABASE.accessories.women.filter(p => p.category === 'Sunglasses'),
          ...PRODUCT_DATABASE.accessories.general.filter(p => p.category === 'Eyewear')
        ];
        const productList = sunglasses.map(p => `• ${p.name}: ${p.description}\n  Available in: ${p.colors.join(', ')}`).join('\n\n');
        return `🕶️ Sunglasses:\n\n${productList}\n\nAll sunglasses offer UV protection.`;
      }
      
      return `👜 Premium Accessories:\n\n• ⌚ Watches & Jewelry\n• 👜 Bags & Backpacks\n• 🕶️ Eyewear & Sunglasses\n• 👔 Small Leather Goods\n• 🎩 Hats & Caps\n• 📱 Tech Accessories\n\nWhich type of accessory are you looking for?`;
    }

    // Sale items
    if (lower.includes('sale') || lower.includes('discount') || lower.includes('clearance') || lower.includes('offer')) {
      const saleProducts = [
        ...PRODUCT_DATABASE.sale.men,
        ...PRODUCT_DATABASE.sale.women,
        ...PRODUCT_DATABASE.sale.kids,
        ...PRODUCT_DATABASE.sale.clearance
      ];
      
      const productList = saleProducts.slice(0, 6).map(p => `• ${p.name} (${p.category}): ${p.description}\n  Discount: ${p.discount}`).join('\n\n');
      
      return `💰 Sale & Clearance Items:\n\n${productList}\n\nThese items are available at discounted prices for a limited time. Sizes and colors may be limited.`;
    }

    // Delivery and charges
    if (lower.includes('delivery') || lower.includes('ship') || lower.includes('dispatch') || lower.includes('charges') || lower.includes('fee')) {
      let cityInfo = '';
      if (currentContext.city) {
        cityInfo = `\n\n📍 For ${currentContext.city}: Delivery usually takes 5-7 working days (7-9 days for Sale items).`;
      } else {
        cityInfo = '\n\nPlease share your city for more accurate delivery estimates.';
      }
      
      return `🚚 Delivery Information:\n\n⏱️ Standard Delivery: 5-7 working days across Pakistan\n⚡ Sale Items Delivery: 7-9 working days\n\n💰 Delivery Charges:\n• Orders below Rs 5,000: Flat Rs 300 delivery fee\n• Orders Rs 5,000 and above: FREE delivery\n\n📦 We use reliable courier services across all major cities.${cityInfo}\n\n⚠️ Note: Delivery may be affected by weather conditions, disasters, local restrictions, service unavailability, or other circumstances beyond our control.`;
    }

    // Return / exchange / warranty
    if (lower.includes('return') || lower.includes('exchange') || lower.includes('refund') || lower.includes('warranty') || lower.includes('policy')) {
      return `🔄 Exchange & Return Policy:\n\n✅ Exchanges Available For:\n• Size doesn't fit properly\n• Manufacturing defects\n• Wrong item received\n• Damaged during delivery\n\n❌ Not Available:\n• Cash refunds\n• Warranty on discounted items\n• Personalized/customized items\n\n📝 Exchange Process:\n1. Contact us within 7 days of delivery\n2. Share order number and issue details\n3. Send photos if applicable\n4. We'll arrange pickup and replacement\n\nFor assistance, contact us on WhatsApp.`;
    }

    // Promo codes / coupons / gift cards
    if (lower.includes('promo') || lower.includes('coupon') || lower.includes('discount code') || lower.includes('voucher') || lower.includes('gift card') || lower.includes('promo code')) {
      return `💸 Promo Codes & Gift Cards:\n\n• How to apply: Enter the promo code at checkout in the "Apply Promo" field before payment.\n• Eligibility: Some offers are limited to specific collections or first-time customers.\n• Expiry: Check the offer terms for expiry and minimum order value.\n• Gift Cards: Available as digital codes; redeemable at checkout.\n\nIf a code doesn't work, share the code here or contact support on WhatsApp with your cart details.`;
    }

    // Cancel order / modify order
    if (lower.includes('cancel order') || lower.includes('cancel my order') || lower.includes('modify order') || lower.includes('change order')) {
      return `Order Cancellation / Modifications:\n\n• Cancellation windows: Orders can usually be canceled before dispatch. Check Your Orders for a Cancel button.\n• If dispatched: we can assist with return/exchange after delivery.\n• To modify items or address: contact us immediately on WhatsApp with your order number for fastest assistance.\n\nHave your order number ready to proceed.`;
    }

    // Wishlist / save for later
    if (lower.includes('wishlist') || lower.includes('save for later') || lower.includes('favorites') || lower.includes('save item')) {
      return `Wishlist & Saving Items:\n\n• Add to Wishlist: On any product page, click the heart icon or "Save" to add to your wishlist.\n• Access: View saved items under My Account > Wishlist.\n• Share: You can share your wishlist link with others.\n• Note: Wishlist items are not reserved and may go out of stock.`;
    }

    // Payment issues / failed payment
    if (lower.includes('payment failed') || lower.includes('failed payment') || lower.includes('card declined') || lower.includes('transaction failed') || lower.includes('payment issue')) {
      return `Payment Issues & Failed Transactions:\n\n• Common causes: incorrect card details, 3D Secure decline, insufficient funds, or temporary gateway issues.\n• Retry: Try a different card or payment method (COD, bank transfer, mobile wallet).\n• If money was deducted: do not worry — it usually refunds automatically within 3-7 business days. Contact us with payment reference for faster resolution.\n\nFor urgent payment disputes, contact support on WhatsApp with a screenshot of the transaction.`;
    }

    // Careers / hiring
    if (lower.includes('career') || lower.includes('careers') || lower.includes('jobs') || lower.includes('hiring') || lower.includes('work with')) {
      return `Careers at DENFiT:\n\n• We're often hiring for design, marketing, operations, and tech roles.\n• To apply: Visit our Careers page (link on footer) or send your CV and portfolio to careers@denfit.example (or contact via WhatsApp).\n• Internships: We offer internships during certain seasons—check the Careers page for listings.\n\nWould you like current openings or application instructions?`;
    }

    // International / shipping outside Pakistan
    if (lower.includes('international') || lower.includes('ship internationally') || lower.includes('outside pakistan') || lower.includes('deliver to')) {
      return `International Shipping:\n\n• We currently ship primarily within Pakistan. For international orders, contact us on WhatsApp with your country and postal code—we can provide a custom shipping quote.\n• Duties & Taxes: International shipments may incur customs duties payable by the recipient.\n• Delivery times vary by country and courier service.`;
    }

    // Size / fit general
    if (lower.includes('size') || lower.includes('fit') || lower.includes('measurement') || lower.includes('sizing')) {
      if (currentContext.size) {
        let sizeInfo = '';
        if (currentContext.subcategory === 't-shirts') {
          const guide = SIZE_GUIDE.tshirt[currentContext.size as keyof typeof SIZE_GUIDE.tshirt];
          if (guide) {
            sizeInfo = `\n\n📐 Size ${currentContext.size} Details:\n• Chest: ${guide.chest}\n• Length: ${guide.length}\n• Fit: ${guide.fit}`;
          }
        } else if (currentContext.subcategory === 'shirts') {
          const guide = SIZE_GUIDE.shirt[currentContext.size as keyof typeof SIZE_GUIDE.shirt];
          if (guide) {
            sizeInfo = `\n\n📐 Size ${currentContext.size} Details:\n• Collar: ${guide.collar}\n• Chest: ${guide.chest}\n• Sleeve: ${guide.sleeve}`;
          }
        } else if (currentContext.subcategory === 'jeans') {
          const guide = SIZE_GUIDE.jeans[currentContext.size as keyof typeof SIZE_GUIDE.jeans];
          if (guide) {
            sizeInfo = `\n\n📐 Size ${currentContext.size} Details:\n• Waist: ${guide.waist}\n• Inseam: ${guide.inseam}\n• Fit: ${guide.fit}`;
          }
        }
        
        return `📏 Size Guidance:\n\nFor accurate size recommendations, please share:\n1. Your height\n2. Weight (optional)\n3. Preferred fit (Slim, Regular, Loose)\n4. Specific product type${sizeInfo}\n\n💡 Tip: If between sizes, we recommend sizing up for comfort.`;
      }
      
      return `📏 Size Guide Assistance:\n\nTo help you find the perfect fit, please provide:\n\n1. Product Category (T-shirts, Jeans, Shoes, etc.)\n2. Your usual size\n3. Preferred fit (Slim/Regular/Loose)\n4. Any specific measurements you have\n\nOr ask about a specific size (e.g., "What is size M in t-shirts?")`;
    }

    // Price inquiry
    if (lower.includes('price') || lower.includes('cost') || lower.includes('amount') || lower.includes('rate') || lower.includes('kitna') || lower.includes('how much')) {
      if (currentContext.category && currentContext.gender) {
        return `For exact pricing of ${currentContext.gender}'s ${currentContext.category}:\n\n1. Visit our website for current prices\n2. Contact WhatsApp support with product name\n3. Check the product page for seasonal offers\n\n💎 Prices vary based on:\n• Material quality\n• Design complexity\n• Seasonal promotions\n• Collection type\n\nPlease specify the exact product name for precise pricing.`;
      }
      
      return `For pricing information:\n\n• Browse our website for current prices\n• Contact WhatsApp support with specific product names\n• Check sale section for discounted items\n\n🔔 Note: Prices are regularly updated. For the most accurate pricing, please provide the exact product name you're interested in.`;
    }

    // Colors available
    if (lower.includes('color') || lower.includes('colour') || lower.includes('available color') || lower.includes('shade')) {
      let colorResponse = '🎨 Available Colors:\n\n';
      
      if (currentContext.category === 'clothing') {
        colorResponse += '• Basic Colors: Black, White, Navy, Grey, Blue\n• Seasonal Colors: Olive, Burgundy, Beige, Brown\n• Pastel Colors: Light Blue, Pink, Lavender, Mint\n';
      } else if (currentContext.category === 'footwear') {
        colorResponse += '• Shoes: Black, Brown, Tan, White, Navy\n• Sneakers: White, Black, Grey, Blue, Multi-color\n';
      } else if (currentContext.category === 'accessories') {
        colorResponse += '• Bags: Black, Brown, Tan, Navy, Beige\n• Watches: Silver, Gold, Rose Gold, Black\n• Belts: Black, Brown, Tan, Navy\n';
      } else {
        colorResponse += '• Most items available in classic colors: Black, White, Navy, Grey\n• Some items available in seasonal and trendy colors\n• Check specific product pages for exact color availability\n';
      }
      
      colorResponse += '\n💡 Color Recommendations:\n• Black: Classic, versatile, professional\n• White: Clean, fresh, perfect for summer\n• Navy: Sophisticated alternative to black\n• Neutral tones: Easy to match with existing wardrobe';
      
      return colorResponse;
    }

    // Material inquiry
    if (lower.includes('material') || lower.includes('fabric') || lower.includes('cotton') || lower.includes('silk') || lower.includes('leather') || lower.includes('wool')) {
      return `🧵 Material Information:\n\n• Cotton: Breathable, comfortable, easy care\n• Silk: Luxurious, smooth, delicate care needed\n• Leather: Durable, premium, requires maintenance\n• Denim: Durable, versatile, ages beautifully\n• Wool Blend: Warm, comfortable, winter essential\n• Polyester: Durable, wrinkle-resistant, easy care\n• Cashmere: Luxury, extremely soft, premium warmth\n\nMost premium items are made from high-quality materials for durability and comfort.`;
    }

    // Care instructions
    if (lower.includes('care') || lower.includes('wash') || lower.includes('maintain') || lower.includes('clean')) {
      return `🧼 Care Instructions:\n\n• Cotton Items: Machine wash cold, tumble dry low\n• Silk Items: Dry clean recommended\n• Leather Items: Professional cleaning recommended\n• Denim: Wash inside out, cold water, air dry\n• Wool/Cashmere: Hand wash or dry clean\n• Delicate Items: Follow specific care label\n\n💡 Always check the care label inside your garment for specific instructions.`;
    }

    // Occasion styling
    if (lower.includes('occasion') || lower.includes('event') || lower.includes('party') || lower.includes('wedding') || lower.includes('formal') || lower.includes('casual') || lower.includes('office') || lower.includes('work')) {
      if (lower.includes('wedding') || lower.includes('marriage')) {
        return `💒 Wedding/Formal Events:\n\nMen:\n• Suit or Blazer with Dress Shirt\n• Formal Shoes\n• Tie or Bow Tie\n• Matching Belt\n\nWomen:\n• Formal Dress or Gown\n• Heels\n• Evening Bag\n• Jewelry Set\n\nWe have special occasion collections for both.`;
      } else if (lower.includes('office') || lower.includes('work') || lower.includes('business')) {
        return `💼 Office/Business Attire:\n\nMen:\n• Dress Shirts\n• Formal Trousers\n• Blazers\n• Leather Shoes\n• Professional Accessories\n\nWomen:\n• Blouses\n• Pencil Skirts/Trousers\n• Blazers\n• Formal Shoes\n• Professional Handbags\n\nOur collection includes business-appropriate styles.`;
      } else if (lower.includes('casual') || lower.includes('everyday') || lower.includes('daily')) {
        return `👕 Casual Everyday Wear:\n\n• T-Shirts & Polos\n• Jeans & Casual Pants\n• Comfortable Shoes/Sneakers\n• Hoodies & Sweatshirts\n• Casual Accessories\n\nPerfect for daily wear, outings, and relaxed occasions.`;
      }
      
      return `🎭 Occasion-Based Styling:\n\n1. Formal Events: Suits, Dresses, Heels, Formal Accessories\n2. Business/Office: Shirts, Trousers, Blazers, Professional Shoes\n3. Casual Outings: T-Shirts, Jeans, Sneakers, Casual Accessories\n4. Parties: Statement Pieces, Dressy Items, Special Occasion Wear\n5. Weddings: Traditional/Formal Attire, Matching Accessories\n\nWhat specific occasion are you dressing for?`;
    }

    // Payment methods
    if (lower.includes('payment') || lower.includes('cod') || lower.includes('cash on delivery') || lower.includes('pay') || lower.includes('credit card') || lower.includes('bank transfer')) {
      return `💳 Payment Methods:\n\n• Cash on Delivery (Available in most cities)\n• Credit/Debit Cards\n• Bank Transfer\n• Mobile Wallets (JazzCash, EasyPaisa)\n• Online Payment Gateway\n\n🔒 Secure Transactions: All online payments are processed through secure payment gateways.\n\nFor payment-related queries, contact our WhatsApp support.`;
    }

    // Order tracking
    if (lower.includes('track') || lower.includes('order status') || lower.includes('where is my order') || lower.includes('delivery status')) {
      return `📦 Order Tracking:\n\nTo track your order:\n\n1. Share your order number\n2. Provide registered phone number\n3. Contact WhatsApp support\n\nWe'll provide:\n• Current order status\n• Courier tracking number\n• Estimated delivery date\n• Delivery agent contact (if needed)\n\nTypical timeline:\n• Processing: 1-2 days\n• Dispatched: Day 3\n• In Transit: Days 4-6\n• Delivered: Days 5-7\n\nFor urgent tracking, contact us on WhatsApp.`;
    }

    // Thank you response
    if (lower.includes('thank') || lower.includes('thanks') || lower.includes('shukriya')) {
      return `You're most welcome! 😊\n\nI'm here to help with:\n• Finding perfect fashion items\n• Size and fit guidance\n• Delivery and policy information\n• Styling suggestions\n\nNeed anything else? Just ask! 🛍️`;
    }

    // Fallback with context awareness
    let contextHint = '';
    if (currentContext.previousTopics.length > 0) {
      contextHint = `\n\nEarlier you asked about: ${currentContext.previousTopics.join(', ')}`;
    }
    
    if (currentContext.gender) {
      contextHint += `\n\nI remember you're looking for ${currentContext.gender}'s fashion.`;
    }
    
    if (currentContext.category) {
      contextHint += `\nCategory: ${currentContext.category}`;
    }

    // If no specific match, provide general guidance
    return `I understand you're interested in fashion. Let me help you better! 🤔\n\nPlease tell me:\n• Which category? (Men's, Women's, Kids, Accessories, Sale)\n• Specific item type? (T-shirts, Dresses, Shoes, Bags, etc.)\n• Need help with sizing, delivery, or something else?\n${contextHint}\n\nOr use the quick reply buttons below for faster assistance! ⬇️`;
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || typing) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text,
        timestamp: getCurrentTime(),
      },
    ]);
    setInput('');
    setTyping(true);

    // Update context based on user message
    setContext(prevContext => updateContext(text, prevContext));

    setTimeout(() => {
      // Generate response with context
      const response = generateAIResponse(text, context);

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: response,
          timestamp: getCurrentTime(),
        },
      ]);

      // Update quick replies based on conversation
      updateQuickReplies(text);

      setTyping(false);
    }, 800);
  };

  const updateQuickReplies = (userText: string) => {
    const lower = userText.toLowerCase();
    let newQuickReplies = [...CATEGORY_BUTTONS];

    if (lower.includes('men')) {
      newQuickReplies = [
        '👕 T-Shirts',
        '👔 Shirts',
        '👖 Jeans',
        '👟 Footwear',
        '⌚ Accessories',
        '🚚 Delivery',
        '📏 Size Guide',
        '💰 Sale Items'
      ];
    } else if (lower.includes('women')) {
      newQuickReplies = [
        '👗 Dresses',
        '👚 Tops',
        '👖 Jeans',
        '👠 Shoes',
        '👜 Bags',
        '🚚 Delivery',
        '📏 Size Guide',
        '💰 Sale Items'
      ];
    } else if (lower.includes('kid')) {
      newQuickReplies = [
        '👦 Boys',
        '👧 Girls',
        '👶 Baby',
        '🎒 Accessories',
        '🚚 Delivery',
        '📏 Size Guide',
        '💰 Sale Items'
      ];
    } else if (lower.includes('accessor')) {
      newQuickReplies = [
        '⌚ Watches',
        '👜 Bags',
        '🕶️ Sunglasses',
        '👔 Belts',
        '🎩 Hats',
        '🚚 Delivery'
      ];
    } else if (lower.includes('delivery') || lower.includes('ship')) {
      newQuickReplies = [
        '📍 Karachi',
        '📍 Lahore',
        '📍 Islamabad',
        '📍 Other City',
        '💰 Charges',
        '⏱️ Time',
        '📦 Tracking'
      ];
    } else if (lower.includes('size') || lower.includes('fit')) {
      newQuickReplies = [
        '📏 T-Shirt Sizes',
        '📐 Shirt Sizes',
        '👖 Jean Sizes',
        '👟 Shoe Sizes',
        '🎯 Fit Guide'
      ];
    } else if (lower.includes('sale') || lower.includes('discount')) {
      newQuickReplies = [
        '👕 Men Sale',
        '👚 Women Sale',
        '👶 Kids Sale',
        '👜 Accessories Sale',
        '🔥 Clearance'
      ];
    } else if (lower.includes('price') || lower.includes('cost')) {
      newQuickReplies = [
        '💎 Check Website',
        '💬 WhatsApp Support',
        '💰 Sale Items',
        '🎁 Offers'
      ];
    }

    setQuickReplies(newQuickReplies.slice(0, 8)); // Limit to 8 buttons
  };

  const handleQuickReply = (reply: string) => {
    if (typing) return;

    const time = getCurrentTime();

    // Add the user message immediately
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        text: reply,
        timestamp: time,
      },
    ]);

    // Update conversation context synchronously for this reply
    const newContext = updateContext(reply, context);
    setContext(newContext);

    // Show typing indicator
    setTyping(true);

    // Generate and append bot response
    setTimeout(() => {
      const response = generateAIResponse(reply, newContext);

      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: response,
          timestamp: getCurrentTime(),
        },
      ]);

      updateQuickReplies(reply);
      setTyping(false);
    }, 300);
  };

  const renderQuickReplies = () => (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {quickReplies.map((reply, idx) => (
        <button
          key={idx}
          onClick={() => handleQuickReply(reply)}
          className="px-3 py-1.5 text-[11px] font-medium border border-gray-300 rounded-full hover:bg-black hover:text-white hover:border-black transition-all duration-200 text-gray-800 bg-white"
          disabled={typing}
        >
          {reply}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="fixed right-3 bottom-4 sm:right-4 sm:bottom-6 z-[9999]"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", boxSizing: 'border-box' }}
    >
      <div ref={containerRef} className="relative">
        {/* CHAT WINDOW (absolutely positioned above the button) */}
        {open && (
          <div
            className="absolute right-0 w-[calc(100vw-28px)] max-w-[420px] sm:w-[360px] sm:max-w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-200 chatbot-container flex flex-col box-border overflow-hidden z-50"
            style={{ maxHeight: 'calc(100vh - 96px)', bottom: chatBottom }}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 bg-gradient-to-r from-black via-gray-900 to-black text-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={logoSrc}
                    alt="DENFiT"
                    onError={handleLogoError}
                    className="w-9 h-9 rounded-full border-2 border-white/50 shadow-lg object-cover"
                    width={36}
                    height={36}
                  />
                  {/* Blinking online indicator */}
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white animate-pulse shadow-lg"></span>
                </div>
                <div>
                  <div className="text-sm font-bold tracking-wide">DENFiT Premium Fashion</div>
                  <div className="text-[10px] text-gray-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                    Online • Expert Assistance
                  </div>
                </div>
              </div>
              <button
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="text-gray-300 hover:text-white text-lg transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* CHAT BODY */}
            <div
              ref={bodyRef}
              className="px-3 py-3 overflow-y-auto bg-gradient-to-b from-white via-gray-50 to-white flex-1 min-h-0"
              style={{ maxHeight: 'calc(100vh - 220px)' }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`mb-3 flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'bot' ? (
                    <div className="flex items-start gap-3">
                          <img
                            src={logoSrc}
                            alt="DENFiT"
                            onError={handleLogoError}
                            className="w-8 h-8 rounded-full shadow-sm mt-1 object-cover"
                            width={32}
                            height={32}
                          />
                      <div className="max-w-[85%]">
                        <div className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line shadow-sm bg-white text-gray-900 border border-gray-200 rounded-bl-none`}>
                          {m.text}
                        </div>
                        {m.timestamp && (
                          <div className="text-[10px] text-gray-400 mt-1 text-left">
                            {m.timestamp}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`max-w-[85%] ${m.role === 'user' ? 'ml-auto' : ''}`}>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line shadow-sm ${
                          'bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-br-none'
                        }`}
                      >
                        {m.text}
                      </div>
                      {m.timestamp && (
                        <div
                          className={`text-[10px] text-gray-400 mt-1 ${
                            'text-right'
                          }`}
                        >
                          {m.timestamp}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {typing && (
                <div className="mb-3 flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-gray-600 font-medium">Denfit Assistant is typing</span>
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* QUICK REPLIES */}
            <div className="px-3 py-2.5 border-t border-gray-100 bg-gray-50/80 flex-none">
              {renderQuickReplies()}
            </div>

            {/* INPUT + WHATSAPP */}
            <div className="px-3 py-3 border-t bg-white flex-none">
              <div className="flex gap-2 mb-2.5">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask about categories, sizes, delivery, etc..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full text-sm sm:text-[13px] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                  disabled={typing}
                />
                <button
                  onClick={sendMessage}
                  className="bg-gradient-to-r from-black to-gray-800 text-white px-4 sm:px-5 py-2.5 rounded-full text-sm sm:text-[13px] font-semibold hover:from-gray-900 hover:to-black transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={typing}
                >
                  {typing ? '...' : 'Send'}
                </button>
              </div>

              {/* WhatsApp fallback */}
              <div className="pt-2.5 border-t border-gray-100">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="text-[10px] text-gray-500 leading-tight">
                    Need personal assistance? Chat on WhatsApp
                  </div>
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold rounded-full transition-all shadow-sm hover:shadow-md"
                  >
                    <span className="text-sm">💬</span>
                    <span>WhatsApp</span>
                  </a>
                </div>
                <div className="text-[9px] text-gray-400 leading-tight">
                  Talk to our customer care representative directly on WhatsApp, available from 10:00 AM to 09:00 PM PKT, Monday to Saturday.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FLOATING BUTTON */}
        <button
          ref={buttonRef}
          onClick={() => setOpen((s) => !s)}
          aria-label="Toggle Denfit fashion assistant"
          className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-black via-gray-900 to-black shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group border-2 border-white/30"
          style={{ touchAction: 'manipulation' }}
        >
          {/* Subtle blinking indicator (refined) */}
          {!open && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-md animate-pulse" style={{ transform: 'translate(28%, -28%)' }} />
          )}

          <div className="relative">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 border-2 border-white/50 shadow-md overflow-hidden flex items-center justify-center">
              <img
                src={logoSrc}
                alt="DENFiT"
                onError={handleLogoError}
                className="w-full h-full object-cover"
                width={32}
                height={32}
              />
            </div>
            {/* Pulse ring when open */}
            {open && (
              <>
                <div className="absolute inset-0 border-2 border-white/60 rounded-full animate-ping" />
                <div className="absolute inset-0 border-2 border-white/40 rounded-full animate-pulse" />
              </>
            )}
          </div>

          {/* Tooltip */}
          <div className="absolute right-full mr-3 px-3 py-1.5 bg-black text-white text-[11px] font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap shadow-xl pointer-events-none">
            💬 Denfit Fashion Assistant
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full w-0 h-0 border-t-4 border-t-transparent border-b-4 border-b-transparent border-l-4 border-l-black"></div>
          </div>
        </button>
      </div>
    </div>
  );
}