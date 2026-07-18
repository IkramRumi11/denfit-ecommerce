import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAttributesInput } from '../utils/attributes.js';

test('normalizeAttributesInput converts JSON strings into plain objects for Mongoose Map fields', () => {
  const parsed = normalizeAttributesInput('{"material":["Leather"],"color":["Black"]}');

  assert.equal(typeof parsed, 'object');
  assert.equal(parsed.material[0], 'Leather');
  assert.equal(parsed.color[0], 'Black');
  assert.deepEqual(parsed, { material: ['Leather'], color: ['Black'] });
});

test('normalizeAttributesInput preserves objects and coerces scalar values to arrays of strings', () => {
  const parsed = normalizeAttributesInput({ material: ['Leather'], color: 'Black' });

  assert.equal(typeof parsed, 'object');
  assert.deepEqual(parsed, { material: ['Leather'], color: ['Black'] });
});

test('normalizeAttributesInput handles the reported admin payload shape', () => {
  const payload = '{"clothing-size":["S","M","L","XL"],"fabric":["Cotton","Polyester","Linen"],"occasion":["Casual"],"color":["Black"]}';
  const parsed = normalizeAttributesInput(payload);

  assert.equal(typeof parsed, 'object');
  assert.deepEqual(parsed, {
    'clothing-size': ['S', 'M', 'L', 'XL'],
    fabric: ['Cotton', 'Polyester', 'Linen'],
    occasion: ['Casual'],
    color: ['Black']
  });
});
