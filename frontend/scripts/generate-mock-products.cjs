const fs = require('fs');
const path = require('path');
// Read megaMenuData.ts and extract the JS object literal
const megaMenuTsPath = path.join(__dirname, '..', 'src', 'data', 'megaMenuData.ts');
const megaMenuTs = fs.readFileSync(megaMenuTsPath, 'utf8');

// find the start of the megaMenuData object
const marker = 'export const megaMenuData';
const idx = megaMenuTs.indexOf(marker);
if (idx === -1) throw new Error('megaMenuData marker not found');
const eqIdx = megaMenuTs.indexOf('=', idx);
const startBrace = megaMenuTs.indexOf('{', eqIdx);
// find matching closing brace
let i = startBrace;
let depth = 0;
for (; i < megaMenuTs.length; i++) {
  if (megaMenuTs[i] === '{') depth++;
  else if (megaMenuTs[i] === '}') {
    depth--;
    if (depth === 0) break;
  }
}
if (i >= megaMenuTs.length) throw new Error('Could not find end of megaMenuData object');
const objText = megaMenuTs.slice(startBrace, i + 1);
// evaluate object literal in a safe function
const megaMenuData = (function(){
  return eval('(' + objText + ')');
})();

function slugify(input) {
  if (!input) return '';
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

function randomPrice(min=799, max=7999) {
  return Math.round(Math.random() * (max - min) + min);
}

function makeImages(seed, count=3) {
  const imgs = [];
  for (let i=0;i<count;i++) {
    imgs.push(`https://images.unsplash.com/photo-${seed}-${i}?w=800&h=800&fit=crop`);
  }
  return imgs;
}

const products = [];
let id = 100;

Object.entries(megaMenuData).forEach(([gender, data]) => {
  Object.entries(data.categories).forEach(([section, items]) => {
    (items || []).forEach((item) => {
      const catslug = slugify(item);
      // create 1 product per subcategory
      const images = [];
      const imgCount = 3; // 2-4 images
      for (let k=0;k<imgCount;k++) {
        // use a stable-looking unsplash id by hashing
        const seed = `${gender}-${catslug}-${k}`.replace(/[^a-z0-9]/g,'');
        images.push(`https://images.unsplash.com/photo-` + Buffer.from(seed).toString('hex').slice(0,12) + `?w=800&h=800&fit=crop`);
      }

      products.push({
        id: String(id++),
        name: `${item} - ${data.title.split("'")[0]} ${gender.charAt(0).toUpperCase()+gender.slice(1)}`,
        price: randomPrice(),
        images,
        category: catslug,
        gender,
        rating: (Math.round((Math.random()*1.5 + 3.5)*10))/10,
        sizes: ['S','M','L','XL'].slice(0, Math.max(1, Math.floor(Math.random()*4)+1)),
        description: `Quality ${item} from our ${data.title} — designed for style and comfort.`,
        inStock: Math.random() > 0.1
      });
    });
  });
});

// Add a few general items
for (let i=0;i<12;i++) {
  products.push({
    id: String(id++),
    name: `General Product ${i+1}`,
    price: randomPrice(),
    images: makeImages(`general${i}`, 3),
    category: 'general',
    gender: 'unisex',
    rating: 4.2,
    sizes: ['One Size'],
    description: 'General useful product for the store.',
    inStock: true
  });
}

const out = `export const mockProducts = ${JSON.stringify(products, null, 2)};\n`;

fs.writeFileSync(path.join(__dirname,'..','src','data','mockProducts.ts'), out, 'utf8');
console.log('Wrote', products.length, 'products to src/data/mockProducts.ts');
