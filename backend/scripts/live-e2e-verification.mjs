import assert from 'assert';
import http from 'http';

const BASE = 'http://127.0.0.1:3002';

let cookieJar = '';
let xsrfToken = '';

function apiRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const headers = options.headers || {};
    if (cookieJar) {
      headers['Cookie'] = cookieJar;
    }
    if (xsrfToken) {
      headers['x-xsrf-token'] = xsrfToken;
      headers['X-CSRF-Token'] = xsrfToken;
    }
    const body = options.body ? JSON.stringify(options.body) : null;
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: options.method || 'GET',
        headers
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const setCookies = res.headers['set-cookie'];
          if (setCookies) {
            const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
            const cookiePairs = arr.map(c => c.split(';')[0]);
            cookieJar = cookiePairs.join('; ');
            for (const c of arr) {
              const m = c.match(/XSRF-TOKEN=([^;]+);/);
              if (m) {
                xsrfToken = decodeURIComponent(m[1]);
              }
            }
          }
          const text = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try { json = JSON.parse(text); } catch (e) {}
          resolve({ status: res.statusCode, headers: res.headers, text, json });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== Starting Live E2E Stock & Variant Isolation Verification ===\n');

  // Step 0: Warm up session & obtain CSRF tokens
  const health = await apiRequest('/api/v1/health');
  assert.strictEqual(health.status, 200, 'Health endpoint must return 200');
  console.log('✓ Step 0: Session initialized with CSRF token');

  // Step 1: Fetch test product (Vetiver Imperial Test)
  const fragId = '6a9d534a3cc28d6df1a7d412';
  const getRes = await apiRequest(`/api/v1/products/${fragId}`);
  assert.strictEqual(getRes.status, 200, 'Product fetch should return 200');
  const fragData = getRes.json.data?.product || getRes.json.product || getRes.json.data;
  assert(fragData, 'Product data should exist');

  const sizesList = fragData.sizesObjects || fragData.sizes || [];
  console.log(`✓ Step 1: Found Fragrance '${fragData.name}'`);
  console.log('  Initial Sizes / Volumes:');
  sizesList.forEach(s => {
    const val = typeof s === 'object' ? s.value : s;
    const qty = typeof s === 'object' ? s.quantity : 'N/A';
    const st = typeof s === 'object' ? s.inStock : 'N/A';
    console.log(`    - ${val}: quantity=${qty}, inStock=${st}`);
  });

  const size30Initial = sizesList.find(s => (s.value || s) === '30 ml');
  const size50Initial = sizesList.find(s => (s.value || s) === '50 ml');
  assert.strictEqual(size30Initial.quantity, 1, '30ml initial quantity should be 1');
  assert.strictEqual(size30Initial.inStock, true, '30ml initial inStock should be true');
  assert.strictEqual(size50Initial.quantity, 10, '50ml initial quantity should be 10');
  assert.strictEqual(size50Initial.inStock, true, '50ml initial inStock should be true');

  // Step 2: Attempt to purchase 30ml with quantity = 2 (Insufficient Stock test)
  console.log('\n--- Step 2: Testing Insufficient Stock Rejection ---');
  const orderOversellPayload = {
    items: [
      {
        product: fragId,
        name: fragData.name,
        size: '30 ml',
        price: size30Initial.price || 95,
        quantity: 2
      }
    ],
    shippingAddress: {
      name: 'Test Buyer',
      phone: '03001234567',
      street: 'House 123, Street 45, Gulberg 3, Main Boulevard',
      city: 'Lahore',
      state: 'Punjab',
      zipCode: '54000',
      country: 'Pakistan',
      email: 'testbuyer@example.com'
    },
    email: 'testbuyer@example.com',
    paymentMethod: 'cash_on_delivery',
    subtotal: 190,
    shippingCost: 0,
    discountAmount: 0,
    total: 190
  };

  const oversellRes = await apiRequest('/api/v1/orders', {
    method: 'POST',
    body: orderOversellPayload
  });

  console.log(`  Oversell Response status: ${oversellRes.status}`);
  console.log('  Oversell JSON:', JSON.stringify(oversellRes.json, null, 2));
  assert.strictEqual(oversellRes.status, 400, 'Oversell attempt should return 400');
  assert(
    oversellRes.json?.message?.includes('30 ml') || oversellRes.json?.message?.includes('1') || oversellRes.json?.message?.includes('out of stock') || oversellRes.json?.message?.includes('available'),
    'Error message should indicate insufficient stock for 30 ml'
  );
  console.log('✓ Step 2 Passed: Insufficient stock rejected cleanly without stock loss');

  // Step 3: Purchase exactly 1 unit of 30ml
  console.log('\n--- Step 3: Placing Order for 1 unit of 30ml ---');
  const orderSuccessPayload = {
    items: [
      {
        product: fragId,
        name: fragData.name,
        size: '30 ml',
        price: size30Initial.price || 95,
        quantity: 1
      }
    ],
    shippingAddress: {
      name: 'Test Buyer',
      phone: '03001234567',
      street: 'House 123, Street 45, Gulberg 3, Main Boulevard',
      city: 'Lahore',
      state: 'Punjab',
      zipCode: '54000',
      country: 'Pakistan',
      email: 'testbuyer@example.com'
    },
    email: 'testbuyer@example.com',
    paymentMethod: 'cash_on_delivery',
    subtotal: 95,
    shippingCost: 0,
    discountAmount: 0,
    total: 95
  };

  const orderRes = await apiRequest('/api/v1/orders', {
    method: 'POST',
    body: orderSuccessPayload
  });

  assert.strictEqual(orderRes.status, 201, `Order creation should return 201. Msg: ${orderRes.json?.message}`);
  const createdOrder = orderRes.json?.data?.order || orderRes.json?.order;
  assert(createdOrder, 'Order should be created');
  console.log(`✓ Step 3 Passed: Order #${createdOrder.orderNumber || createdOrder._id} created successfully`);

  // Step 4: Verify Post-Purchase Variant Isolation
  console.log('\n--- Step 4: Verifying Post-Purchase Variant Isolation ---');
  const getPostRes = await apiRequest(`/api/v1/products/${fragId}`);
  const postData = getPostRes.json?.data?.product || getPostRes.json?.product || getPostRes.json?.data;
  const postSizes = postData.sizesObjects || postData.sizes || [];
  console.log('  Post-Purchase Sizes / Volumes:');
  postSizes.forEach(s => {
    const val = typeof s === 'object' ? s.value : s;
    const qty = typeof s === 'object' ? s.quantity : 'N/A';
    const st = typeof s === 'object' ? s.inStock : 'N/A';
    console.log(`    - ${val}: quantity=${qty}, inStock=${st}`);
  });

  const size30Post = postSizes.find(s => (s.value || s) === '30 ml');
  const size50Post = postSizes.find(s => (s.value || s) === '50 ml');

  assert.strictEqual(size30Post.quantity, 0, '30ml quantity must now be 0');
  assert.strictEqual(size30Post.inStock, false, '30ml inStock must now be false');
  assert.strictEqual(size50Post.quantity, 10, '50ml quantity must remain unchanged at 10');
  assert.strictEqual(size50Post.inStock, true, '50ml inStock must remain true');
  assert.strictEqual(postData.inventory, 10, 'Total inventory must be 10');
  assert.strictEqual(postData.inStock, true, 'Top-level inStock must remain true because 50ml is available');

  console.log('✓ Step 4 Passed: 30ml variant isolated stock consumption verified (30ml=0/out of stock, 50ml=10/in stock)');

  // Step 5: Attempt to purchase 30ml now that it is out of stock
  console.log('\n--- Step 5: Attempting to purchase out-of-stock 30ml ---');
  const outOfStockRes = await apiRequest('/api/v1/orders', {
    method: 'POST',
    body: orderSuccessPayload
  });
  assert.strictEqual(outOfStockRes.status, 400, 'Purchasing out-of-stock variant must return 400');
  console.log(`  Out of stock response message: "${outOfStockRes.json?.message}"`);
  console.log('✓ Step 5 Passed: Out-of-stock variant purchase strictly blocked');

  // Step 6: Verify purchasing 50ml succeeds while 30ml is out of stock
  console.log('\n--- Step 6: Purchasing 2 units of available 50ml ---');
  const order50Payload = {
    items: [
      {
        product: fragId,
        name: fragData.name,
        size: '50 ml',
        price: size50Post.price || 145,
        quantity: 2
      }
    ],
    shippingAddress: {
      name: 'Test Buyer Two',
      phone: '03001234567',
      street: 'House 456, Block B, Clifton Road, Phase 5',
      city: 'Karachi',
      state: 'Sindh',
      zipCode: '75000',
      country: 'Pakistan',
      email: 'testbuyer2@example.com'
    },
    email: 'testbuyer2@example.com',
    paymentMethod: 'cash_on_delivery',
    subtotal: 290,
    shippingCost: 0,
    discountAmount: 0,
    total: 290
  };

  const order50Res = await apiRequest('/api/v1/orders', {
    method: 'POST',
    body: order50Payload
  });
  assert.strictEqual(order50Res.status, 201, 'Purchasing available 50ml must succeed');
  const getPost50Res = await apiRequest(`/api/v1/products/${fragId}`);
  const post50Data = getPost50Res.json?.data?.product || getPost50Res.json?.product || getPost50Res.json?.data;
  const post50Sizes = post50Data.sizesObjects || post50Data.sizes || [];
  const size50After = post50Sizes.find(s => (s.value || s) === '50 ml');
  assert.strictEqual(size50After.quantity, 8, '50ml quantity must now be 8');
  assert.strictEqual(size50After.inStock, true, '50ml inStock must remain true');
  console.log('✓ Step 6 Passed: 50ml successfully purchased and decremented to 8 while 30ml remains out of stock');

  // Step 7: Verify Fragrances and Brands Category Endpoints
  console.log('\n--- Step 7: Verifying Fragrances and Brands Category Endpoints ---');
  const fragCatRes = await apiRequest('/api/v1/products?category=fragrances');
  assert.strictEqual(fragCatRes.status, 200, 'Fragrances category fetch should return 200');
  const fragList = fragCatRes.json?.data?.products || fragCatRes.json?.products || [];
  assert(fragList.length > 0, 'Fragrances list should not be empty');
  console.log(`  Fragrances category active products count: ${fragList.length}`);

  const brandsRes = await apiRequest('/api/v1/brands');
  console.log(`  Brands fetch status: ${brandsRes.status}`);

  console.log('\n================================================================');
  console.log(' ALL 7 LIVE E2E INTEGRATION & VARIANT ISOLATION TESTS PASSED! ');
  console.log('================================================================\n');
}

main().catch(err => {
  console.error('\n❌ Live E2E Verification Failed:', err);
  process.exit(1);
});
