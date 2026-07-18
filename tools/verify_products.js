(async () => {
  const fs = require('fs');
  const base = 'http://localhost:3002';
  const results = {};
  const safeFetch = async (url) => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json().catch(() => null);
      return { status: res.status, body: json };
    } catch (e) {
      return { error: String(e) };
    }
  };

  results.list = await safeFetch(`${base}/api/v1/products`);
  results.search = await safeFetch(`${base}/api/v1/products/search?q=shirt&limit=5`);
  results.featured = await safeFetch(`${base}/api/v1/products/featured`);
  results.category = await safeFetch(`${base}/api/v1/products/category/accessories`);
  results.pagination = await safeFetch(`${base}/api/v1/products?limit=5&page=2`);

  try {
    if (results.list && results.list.body && results.list.body.data && Array.isArray(results.list.body.data.products) && results.list.body.data.products.length) {
      const id = results.list.body.data.products[0]._id || results.list.body.data.products[0].id;
      results.byId = await safeFetch(`${base}/api/v1/products/${id}`);
    } else {
      results.byId = { info: 'no-products-available' };
    }
  } catch (e) {
    results.byId = { error: String(e) };
  }

  if (!fs.existsSync('tmp')) fs.mkdirSync('tmp');
  fs.writeFileSync('tmp/verify-products.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
})();
