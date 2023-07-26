import assert from 'assert/strict';
import {
  getAddressFromSecret,
  getAddressFromSeed,
  getSecretFromSeed,
} from '../lib/helpers.js';

// eslint-disable-next-line max-len
const RANDOM_SEED = Buffer.from('2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874', 'hex');

describe('helpers', () => {
  it('getSecretFromSeed', () => {
    const secret = getSecretFromSeed(RANDOM_SEED);
    assert.strictEqual(secret, 'ssJGzspgYMoCehAaJLX2a6xo4mCjX');
  });

  it('getAddressFromSeed', () => {
    const address = getAddressFromSeed(RANDOM_SEED);
    assert.strictEqual(address, 'rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF');
  });

  it('getAddressFromSecret', () => {
    const address = getAddressFromSecret('ssJGzspgYMoCehAaJLX2a6xo4mCjX');
    assert.strictEqual(address, 'rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF');
  });
});
