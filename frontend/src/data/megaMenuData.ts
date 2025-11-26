export interface MegaMenuCategory {
  title: string;
  categories: {
    [section: string]: string[];
  };
  featured: {
    image: string;
    title: string;
    link: string;
  };
}

export interface MegaMenuData {
  [key: string]: MegaMenuCategory;
}

export const megaMenuData: MegaMenuData = {
  men: {
    title: "Men's Collection",
    categories: {
      'Clothing': [
        'T-Shirts',
        'Shirts',
        'Hoodies & Sweatshirts',
        'Jackets & Coats',
        'Jeans',
        'Pants & Trousers',
        'Shorts',
        'Suits & Blazers'
      ],
      'Footwear': [
        'Sneakers',
        'Loafers',
        'Boots',
        'Sandals',
        'Formal Shoes',
        'Sports Shoes'
      ],
      'Accessories': [
        'Watches',
        'Belts',
        'Wallets',
        'Bags',
        'Sunglasses',
        'Hats & Caps',
        'Ties'
      ],
      'Sportswear': [
        'Active Tops',
        'Training Shorts',
        'Sports Jackets',
        'Gym Wear',
        'Running Shoes'
      ]
    },
    featured: {
      image: "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=400&h=500&fit=crop",
      title: "New Season Essentials",
      link: "/shop?gender=men&filter=new"
    }
  },

  women: {
    title: "Women's Collection",
    categories: {
      'Clothing': [
        'Dresses',
        'Tops & Blouses',
        'Sweaters & Knits',
        'Jackets & Coats',
        'Jeans',
        'Pants & Trousers',
        'Skirts',
        'Jumpsuits & Rompers'
      ],
      'Footwear': [
        'Heels',
        'Flats',
        'Boots',
        'Sandals',
        'Sneakers',
        'Espadrilles'
      ],
      'Accessories': [
        'Handbags',
        'Jewelry',
        'Scarves',
        'Sunglasses',
        'Hats',
        'Belts',
        'Watches'
      ],
      'Activewear': [
        'Sports Bras',
        'Leggings',
        'Athletic Tops',
        'Yoga Pants',
        'Training Shoes'
      ]
    },
    featured: {
      image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&h=500&fit=crop",
      title: "Spring Collection",
      link: "/shop?gender=women&filter=new"
    }
  },

  kids: {
    title: "Kids' Collection",
    categories: {
      'Boys (2-8 Years)': [
        'T-Shirts & Tops',
        'Shirts',
        'Pants & Jeans',
        'Shorts',
        'Jackets',
        'Sets & Outfits'
      ],
      'Girls (2-8 Years)': [
        'Dresses',
        'Tops & Blouses',
        'Skirts',
        'Leggings',
        'Sets & Outfits',
        'Jackets'
      ],
      'Baby (0-24 Months)': [
        'Bodysuits',
        'Rompers',
        'Sleepwear',
        'Sets',
        'Accessories'
      ],
      'Accessories': [
        'Shoes',
        'Hats & Caps',
        'Bags',
        'Socks',
        'Hair Accessories'
      ]
    },
    featured: {
      image: "https://images.unsplash.com/photo-1503457574462-bd27054394c1?w=400&h=500&fit=crop",
      title: "Playtime Collection",
      link: "/shop?gender=kids&filter=new"
    }
  },

  sale: {
    title: "Sale",
    categories: {
      'Men': [
        'T-Shirts up to 50% off',
        'Jeans up to 40% off',
        'Jackets up to 60% off',
        'Accessories up to 30% off'
      ],
      'Women': [
        'Dresses up to 50% off',
        'Tops up to 40% off',
        'Shoes up to 60% off',
        'Bags up to 45% off'
      ],
      'Kids': [
        'Sets up to 50% off',
        'Outerwear up to 60% off',
        'Shoes up to 40% off',
        'Accessories up to 30% off'
      ],
      'Clearance': [
        'Last Season Items',
        'Final Reductions',
        'Limited Sizes',
        'Special Offers'
      ]
    },
    featured: {
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=500&fit=crop",
      title: "Up to 60% Off",
      link: "/shop?gender=sale"
    }
  }
};

// Utility functions for mega menu
export const getMegaMenuData = (category: string): MegaMenuCategory | null => {
  return megaMenuData[category] || null;
};

export const getAllCategories = (): string[] => {
  return Object.keys(megaMenuData);
};

export const getCategorySections = (category: string): string[] => {
  const data = getMegaMenuData(category);
  return data ? Object.keys(data.categories) : [];
};

export const getSectionItems = (category: string, section: string): string[] => {
  const data = getMegaMenuData(category);
  return data?.categories[section] || [];
};

export default megaMenuData;