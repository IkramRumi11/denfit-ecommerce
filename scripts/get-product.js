const http = require('http');
const id = process.argv[2];
if (!id) { console.error('Usage: node get-product.js <id>'); process.exit(1); }
const opt = { hostname: 'localhost', port: 3002, path: `/api/v1/products/${id}`, method: 'GET' };
const req = http.request(opt, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try { const obj = JSON.parse(data); console.log(JSON.stringify(obj, null, 2)); } catch(e) { console.error('Parse error', e); }
  });
});
req.on('error', e => console.error('Request error', e));
req.end();
