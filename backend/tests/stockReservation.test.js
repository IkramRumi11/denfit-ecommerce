import assert from 'assert';
import Product from '../models/Product.js';
import StockReservation from '../models/StockReservation.js';
import {
  reserveStockForOrder,
  rollbackPriorReservations,
  revertAndReleaseReservations,
  InsufficientStockError
} from '../services/stockService.js';

console.log('--- Running Stock Reservation & Variant Isolation Tests ---');

let currentStore = {};
let currentReservations = [];

function createQueryMock(execFn) {
  const queryObj = {
    select() { return queryObj; },
    session() { return queryObj; },
    lean() { return Promise.resolve(execFn()); },
    then(resolve, reject) {
      return Promise.resolve(execFn()).then(resolve, reject);
    }
  };
  return queryObj;
}

// Monkey-patch Product and StockReservation for in-memory unit testing
Product.findById = function (id) {
  const normId = String(id?._id || id?.id || id || '');
  return createQueryMock(() => {
    const data = currentStore[normId];
    if (!data) return null;
    const doc = {
      ...JSON.parse(JSON.stringify(data)),
      save: async () => doc
    };
    return doc;
  });
};

Product.findByIdAndUpdate = function (id, update, options) {
  const normId = String(id?._id || id?.id || id || '');
  return createQueryMock(() => {
    const doc = currentStore[normId];
    if (!doc) return null;
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        if (k === 'inventory') doc.inventory = (doc.inventory || 0) + v;
      }
    }
    return JSON.parse(JSON.stringify(doc));
  });
};

Product.findOneAndUpdate = function (filter, update, options) {
  const id = String(filter._id?._id || filter._id?.id || filter._id || '');
  return createQueryMock(() => {
    const doc = currentStore[id];
    if (!doc) return null;

    const arrayFilters = options?.arrayFilters || [];

    if (update.$inc) {
      for (const [key, incVal] of Object.entries(update.$inc)) {
        if (key === 'inventory') {
          if (filter.inventory?.$gte !== undefined && doc.inventory < filter.inventory.$gte) {
            return null; // Insufficient inventory
          }
          doc.inventory += incVal;
        } else if (key.startsWith('sizes.$[elem0].quantity') || key.startsWith('sizes.$[elem].quantity')) {
          const f = arrayFilters.find(af => af['elem0.id'] || af['elem0._id'] || af['elem0.value'] || af['elem.id'] || af['elem._id'] || af['elem.value'] || af.$or);
          let targetId = f?.['elem0.id'] || f?.['elem0._id'] || f?.['elem.id'] || f?.['elem._id'];
          let targetVal = f?.['elem0.value'] || f?.['elem.value'];
          if (f?.$or) {
            const idMatch = f.$or.find(o => o['elem0.id'] || o['elem0._id'] || o['elem.id'] || o['elem._id']);
            const valMatch = f.$or.find(o => o['elem0.value'] || o['elem.value']);
            if (idMatch) targetId = idMatch['elem0.id'] || idMatch['elem0._id'] || idMatch['elem.id'] || idMatch['elem._id'];
            if (valMatch) targetVal = valMatch['elem0.value'] || valMatch['elem.value'];
          }
          const sz = doc.sizes?.find(s =>
            (targetId && (s.id === targetId || s._id === targetId || s.value === targetId)) ||
            (targetVal && s.value === targetVal)
          );
          if (!sz) return null;
          const gte = f?.['elem0.quantity']?.$gte ?? f?.['elem.quantity']?.$gte;
          if (gte !== undefined && sz.quantity < gte) {
            return null;
          }
          sz.quantity += incVal;
          if (sz.quantity <= 0) {
            sz.quantity = 0;
            sz.inStock = false;
          } else {
            sz.inStock = true;
          }
        } else if (key.startsWith('stock.$[elem0].quantity') || key.startsWith('stock.$[elem].quantity')) {
          const f = arrayFilters.find(af => (af['elem0.colorTempId'] || af['elem.colorTempId']) && (af['elem0.sizeId'] || af['elem.sizeId']));
          const colorId = f?.['elem0.colorTempId'] || f?.['elem.colorTempId'];
          const sizeId = f?.['elem0.sizeId'] || f?.['elem.sizeId'];
          const stk = doc.stock?.find(s => s.colorTempId === colorId && s.sizeId === sizeId);
          if (!stk) return null;
          const gte = f?.['elem0.quantity']?.$gte ?? f?.['elem.quantity']?.$gte;
          if (gte !== undefined && stk.quantity < gte) {
            return null;
          }
          stk.quantity += incVal;
          if (stk.quantity <= 0) {
            stk.quantity = 0;
            stk.inStock = false;
          } else {
            stk.inStock = true;
          }
        } else if (key.startsWith('variants.$[elem0].inventory') || key.startsWith('variants.$[elem].inventory')) {
          const f = arrayFilters.find(af => af['elem0._id'] || af['elem0.id'] || af['elem._id'] || af['elem.id'] || af.$or);
          let targetId = f?.['elem0._id'] || f?.['elem0.id'] || f?.['elem._id'] || f?.['elem.id'];
          if (f?.$or) {
            const m = f.$or.find(o => o['elem0._id'] || o['elem0.id'] || o['elem0.name'] || o['elem._id'] || o['elem.id'] || o['elem.name']);
            if (m) targetId = m['elem0._id'] || m['elem0.id'] || m['elem0.name'] || m['elem._id'] || m['elem.id'] || m['elem.name'];
          }
          const v = doc.variants?.find(x => x._id === targetId || x.id === targetId || x.name === targetId);
          if (!v) return null;
          const gte = f?.['elem0.inventory']?.$gte ?? f?.['elem.inventory']?.$gte;
          if (gte !== undefined && v.inventory < gte) {
            return null;
          }
          v.inventory += incVal;
        }
      }
    }

    return JSON.parse(JSON.stringify(doc));
  });
};

StockReservation.create = async function (docs) {
  const created = (Array.isArray(docs) ? docs : [docs]).map((d, i) => ({
    _id: `res_${currentReservations.length + i + 1}`,
    ...d
  }));
  currentReservations.push(...created);
  return created;
};

StockReservation.updateMany = async function () {
  return { modifiedCount: currentReservations.length };
};

StockReservation.findByIdAndUpdate = async function (id, update) {
  const r = currentReservations.find(x => String(x._id) === String(id));
  if (r && update.$set) {
    Object.assign(r, update.$set);
  }
  return r;
};

async function runTests() {
  // Test 1: Fragrance Volume Variant (30ml = 1, 50ml = 10)
  // Purchase 30ml (qty: 1) -> 30ml becomes 0 and inStock false, 50ml remains 10
  {
    currentStore = {
      frag_1: {
        _id: 'frag_1',
        name: 'Oud Royal',
        category: 'fragrances',
        inventory: 11,
        sizes: [
          { id: 'size_30', value: '30 ml', quantity: 1, inStock: true, price: 95 },
          { id: 'size_50', value: '50 ml', quantity: 10, inStock: true, price: 150 }
        ]
      }
    };
    currentReservations = [];

    const orderItems = [
      { product: 'frag_1', size: '30 ml', quantity: 1 }
    ];

    const reservations = await reserveStockForOrder(orderItems);
    assert.strictEqual(reservations.length, 1, 'Should create 1 reservation');
    assert.strictEqual(reservations[0].type, 'size', 'Reservation type should be size');

    const updated = currentStore.frag_1;
    const size30 = updated.sizes.find(s => s.value === '30 ml');
    const size50 = updated.sizes.find(s => s.value === '50 ml');

    assert.strictEqual(size30.quantity, 0, '30ml quantity must be decremented to 0');
    assert.strictEqual(size30.inStock, false, '30ml inStock must be updated to false');
    assert.strictEqual(size50.quantity, 10, '50ml quantity must remain unchanged at 10');
    assert.strictEqual(size50.inStock, true, '50ml inStock must remain true');
    assert.strictEqual(updated.inventory, 10, 'Total inventory must be decremented to 10');

    console.log('✓ Test 1 Passed: Fragrance 30ml variant isolated stock deduction');
  }

  // Test 2: Multiple Volumes Isolation (30ml=1, 50ml=5, 100ml=8, 200ml=3)
  // Purchase 100ml (qty: 2) -> 100ml becomes 6, all other volumes unchanged
  {
    currentStore = {
      frag_multi: {
        _id: 'frag_multi',
        name: 'Citrus Noir',
        category: 'fragrances',
        inventory: 17,
        sizes: [
          { id: 'v30', value: '30 ml', quantity: 1, inStock: true },
          { id: 'v50', value: '50 ml', quantity: 5, inStock: true },
          { id: 'v100', value: '100 ml', quantity: 8, inStock: true },
          { id: 'v200', value: '200 ml', quantity: 3, inStock: true }
        ]
      }
    };
    currentReservations = [];

    const orderItems = [
      { product: 'frag_multi', size: '100 ml', quantity: 2 }
    ];

    await reserveStockForOrder(orderItems);
    const updated = currentStore.frag_multi;

    assert.strictEqual(updated.sizes.find(s => s.value === '30 ml').quantity, 1, '30ml unchanged');
    assert.strictEqual(updated.sizes.find(s => s.value === '50 ml').quantity, 5, '50ml unchanged');
    assert.strictEqual(updated.sizes.find(s => s.value === '100 ml').quantity, 6, '100ml decremented by 2');
    assert.strictEqual(updated.sizes.find(s => s.value === '200 ml').quantity, 3, '200ml unchanged');
    assert.strictEqual(updated.inventory, 15, 'Total inventory decremented by 2');

    console.log('✓ Test 2 Passed: Multi-volume fragrance variant isolation');
  }

  // Test 3: Color × Size Apparel Matrix Isolation
  // Black/M = 2, Black/L = 5, Blue/M = 7. Purchase Black/M (qty: 1) -> Black/M = 1, others unchanged
  {
    currentStore = {
      apparel_1: {
        _id: 'apparel_1',
        name: 'Signature Hoodie',
        category: 'men',
        inventory: 14,
        colors: [
          { _id: 'col_black', name: 'Black', hex: '#000000' },
          { _id: 'col_blue', name: 'Blue', hex: '#0000ff' }
        ],
        sizes: [
          { id: 's_m', value: 'M' },
          { id: 's_l', value: 'L' }
        ],
        stock: [
          { colorTempId: 'col_black', sizeId: 's_m', quantity: 2, inStock: true },
          { colorTempId: 'col_black', sizeId: 's_l', quantity: 5, inStock: true },
          { colorTempId: 'col_blue', sizeId: 's_m', quantity: 7, inStock: true }
        ]
      }
    };
    currentReservations = [];

    const orderItems = [
      { product: 'apparel_1', color: '#000000', colorName: 'Black', size: 'M', quantity: 1 }
    ];

    const reservations = await reserveStockForOrder(orderItems);
    assert.strictEqual(reservations[0].type, 'stock', 'Reservation type should be stock matrix');

    const updated = currentStore.apparel_1;
    const bm = updated.stock.find(s => s.colorTempId === 'col_black' && s.sizeId === 's_m');
    const bl = updated.stock.find(s => s.colorTempId === 'col_black' && s.sizeId === 's_l');
    const blueM = updated.stock.find(s => s.colorTempId === 'col_blue' && s.sizeId === 's_m');

    assert.strictEqual(bm.quantity, 1, 'Black/M quantity decremented to 1');
    assert.strictEqual(bl.quantity, 5, 'Black/L quantity unchanged at 5');
    assert.strictEqual(blueM.quantity, 7, 'Blue/M quantity unchanged at 7');
    assert.strictEqual(updated.inventory, 13, 'Total inventory decremented to 13');

    console.log('✓ Test 3 Passed: Color × Size matrix variant isolation');
  }

  // Test 4: Insufficient Stock Rejection
  // 30ml = 1. Attempt to purchase 2 -> Throws InsufficientStockError, available = 1, no stock deducted
  {
    currentStore = {
      frag_insufficient: {
        _id: 'frag_insufficient',
        name: 'Amber Bloom',
        category: 'fragrances',
        inventory: 1,
        sizes: [
          { id: 'v30', value: '30 ml', quantity: 1, inStock: true }
        ]
      }
    };
    currentReservations = [];

    const orderItems = [
      { product: 'frag_insufficient', size: '30 ml', quantity: 2 }
    ];

    let errorThrown = false;
    try {
      await reserveStockForOrder(orderItems);
    } catch (err) {
      errorThrown = true;
      assert(err instanceof InsufficientStockError, 'Error should be InsufficientStockError');
      assert.strictEqual(err.availableQuantity, 1, 'Available stock should report 1');
    }

    assert.strictEqual(errorThrown, true, 'Should throw InsufficientStockError');
    assert.strictEqual(currentStore.frag_insufficient.sizes[0].quantity, 1, 'Stock must not be altered');
    assert.strictEqual(currentStore.frag_insufficient.inventory, 1, 'Inventory must not be altered');

    console.log('✓ Test 4 Passed: Insufficient stock rejected with accurate available quantity');
  }

  // Test 5: Symmetric Rollback
  // Reserve 1 unit of 30ml (was 1 -> becomes 0), then rollback -> exactly restored to 1 and inStock=true
  {
    currentStore = {
      frag_rollback: {
        _id: 'frag_rollback',
        name: 'Velvet Oud',
        category: 'fragrances',
        inventory: 1,
        sizes: [
          { id: 'v30', value: '30 ml', quantity: 1, inStock: true }
        ]
      }
    };
    currentReservations = [];

    const orderItems = [
      { product: 'frag_rollback', size: '30 ml', quantity: 1 }
    ];

    const reservations = await reserveStockForOrder(orderItems);
    assert.strictEqual(currentStore.frag_rollback.sizes[0].quantity, 0, 'Stock decremented during reservation');

    await rollbackPriorReservations(reservations);
    assert.strictEqual(currentStore.frag_rollback.sizes[0].quantity, 1, 'Stock restored to exact variant during rollback');
    assert.strictEqual(currentStore.frag_rollback.sizes[0].inStock, true, 'inStock restored to true');
    assert.strictEqual(currentStore.frag_rollback.inventory, 1, 'Total inventory restored');

    console.log('✓ Test 5 Passed: Symmetrical reservation and rollback for variants');
  }

  // Test 6: Standalone Product (no variants, no sizes)
  // Base inventory = 5. Purchase 2 -> inventory = 3. Rollback 2 -> inventory = 5.
  {
    currentStore = {
      standalone_1: {
        _id: 'standalone_1',
        name: 'Gift Card / Plain Cap',
        category: 'accessories',
        inventory: 5
      }
    };
    currentReservations = [];

    const orderItems = [
      { product: 'standalone_1', quantity: 2 }
    ];

    const reservations = await reserveStockForOrder(orderItems);
    assert.strictEqual(reservations[0].type, 'inventory', 'Reservation type should be inventory');
    assert.strictEqual(currentStore.standalone_1.inventory, 3, 'Inventory decremented to 3');

    await rollbackPriorReservations(reservations);
    assert.strictEqual(currentStore.standalone_1.inventory, 5, 'Inventory restored to 5');

    console.log('✓ Test 6 Passed: Standalone product global inventory reservation and rollback');
  }

  // Test 7: Variant Controlled Product Missing Variant Selection
  // Attempting to reserve without specifying variant should throw, not silently fall back to global inventory
  {
    currentStore = {
      variant_prod: {
        _id: 'variant_prod',
        name: 'Variant Shirt',
        category: 'men',
        inventory: 10,
        sizes: [
          { id: 's_s', value: 'S', quantity: 5 },
          { id: 's_m', value: 'M', quantity: 5 }
        ]
      }
    };
    currentReservations = [];

    const orderItems = [
      { product: 'variant_prod', quantity: 1 } // missing size
    ];

    let errorThrown = false;
    try {
      await reserveStockForOrder(orderItems);
    } catch (err) {
      errorThrown = true;
      assert(err instanceof InsufficientStockError, 'Error should be InsufficientStockError');
    }

    assert.strictEqual(errorThrown, true, 'Should reject reservation when required variant cannot be resolved');
    assert.strictEqual(currentStore.variant_prod.inventory, 10, 'Global inventory must NOT be silently consumed');

    console.log('✓ Test 7 Passed: Protected against silent fallback to global inventory');
  }

  console.log('\n========================================');
  console.log(' ALL 7 STOCK RESERVATION TESTS PASSED! ');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
