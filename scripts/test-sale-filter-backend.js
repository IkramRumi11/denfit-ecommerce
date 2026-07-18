const http = require('http');

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function productDiscount(prod) {
  if (typeof prod.discountPercentage === 'number') return Number(prod.discountPercentage) || 0;
  const orig = prod.originalPrice || prod.compareAtPrice || prod.original_price;
  const p = prod.price || 0;
  if (orig && Number(orig) > Number(p)) {
    const pct = Math.round(((Number(orig) - Number(p)) / Number(orig)) * 100);
    return Number.isFinite(pct) ? pct : 0;
  }
  return 0;
}

function fetchProducts(callback) {
  const opt = {
    hostname: 'localhost',
    port: 3002,
    path: '/api/v1/products?limit=1000',
    method: 'GET'
  };
  const req = http.request(opt, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const obj = JSON.parse(data);
        const items = (obj && (obj.products || obj.data?.products)) || [];
        callback(null, items);
      } catch (e) {
        callback(e);
      }
    });
  });
  req.on('error', (err) => callback(err));
  req.end();
}

fetchProducts((err, products) => {
  if (err) return console.error('Fetch error', err);
  console.log('Fetched', products.length, 'products from backend');

  const decodedLower = 'accessories up to 30% off';
  const threshMatch = decodedLower.match(/(\d{1,3})\s*%?/);
  const threshold = threshMatch ? parseInt(threshMatch[1], 10) : null;
  const isUpTo = /up[- ]?to|upto/.test(decodedLower);

  // simplistic accessory targets
  const accessoryTargets = ['accessories','watches','belts','wallets','bags','sunglasses','hats','ties','handbags','jewelry','scarves','socks','hair accessories'];
  const matches = products.filter(p => {
    // check category-like fields
    const candidates = [p.category, p.subcategory, p.subCategory, p.type, p.section];
    if (Array.isArray(p.tags)) candidates.push(...p.tags);
    for (const c of candidates.filter(Boolean)) {
      try {
        if (accessoryTargets.includes(String(slugify(c)))) return true;
      } catch(e) {}
    }
    // fallback to name
    if (accessoryTargets.includes(String(slugify(p.name || '')))) return true;
    return false;
  }).filter(p => {
    const disc = productDiscount(p);
    if (threshold !== null) {
      if (isUpTo) {
        return disc > 0 && disc <= threshold;
      } else {
        return disc >= threshold;
      }
    }
    return true;
  });

  console.log('Matches:', matches.length);
  matches.slice(0,50).forEach(m => console.log('-', m._id || m.id, m.name, 'cat=', m.category, 'discount=', productDiscount(m)));
});
