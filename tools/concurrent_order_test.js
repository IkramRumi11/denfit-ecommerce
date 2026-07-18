import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';

// Usage: node tools/concurrent_order_test.js <baseUrl> <productId> <size> <concurrency> <qtyPerOrder>
// Example: node tools/concurrent_order_test.js http://localhost:5001 api/v1/orders 60d... 10 1

const [,, baseUrl, productId, size, concurrency = '10', qtyPerOrder = '1'] = process.argv;
if (!baseUrl || !productId) {
  console.error('Usage: node tools/concurrent_order_test.js <baseUrl> <productId> <size> <concurrency> <qtyPerOrder>');
  process.exit(2);
}

const concurrencyN = parseInt(concurrency, 10) || 10;
const qty = parseInt(qtyPerOrder, 10) || 1;

const makeOrder = async () => {
  const body = {
    items: [{ product: productId, name: 'Test item', size: size || 'M', price: 10, quantity: qty }],
    shippingAddress: { name: 'Tester', street: '123 Test Street, Some Area, City', city: 'City', state: 'State', phone: '03123456789', email: `test+${uuidv4()}@example.com` },
    paymentMethod: 'cash_on_delivery'
  };
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/orders`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const text = await res.text();
    return { status: res.status, body: text };
  } catch (e) {
    return { error: e.message || String(e) };
  }
};

(async () => {
  console.log('Starting', concurrencyN, 'concurrent order requests for product', productId, 'qty', qty);
  const promises = [];
  for (let i = 0; i < concurrencyN; i++) promises.push(makeOrder());
  const results = await Promise.all(promises);
  const summary = { success: 0, fail: 0, errors: [] };
  results.forEach(r => {
    if (r.error) { summary.fail++; summary.errors.push(r.error); }
    else if (r.status && r.status >= 200 && r.status < 300) summary.success++;
    else summary.fail++;
  });
  console.log('Results:', summary);
  console.log('Raw responses:', results.map(r => ({ status: r.status, bodyPreview: r.body && r.body.slice ? r.body.slice(0,200) : String(r) })));
})();
