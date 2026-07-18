import test from 'node:test';
import assert from 'node:assert/strict';
import validateRequiredEnv from '../src/config/validateEnv.js';

test('validateRequiredEnv treats whitespace-only values as missing', () => {
  process.env.TEST_REQUIRED_VAR = '   ';

  try {
    assert.equal(validateRequiredEnv(['TEST_REQUIRED_VAR'], { fatal: false }), false);
  } finally {
    delete process.env.TEST_REQUIRED_VAR;
  }
});
