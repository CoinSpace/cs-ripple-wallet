'use strict';

const assert = require('assert');
const Wallet = require('../');
const fixtures = require('./wallet');
// eslint-disable-next-line max-len
const RANDOM_SEED = '2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874';
const RANDOM_SEED_PUB_KEY = 'rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF';
const crypto = {
  platform: 'ripple',
  decimals: 6,
};

describe('Ripple Wallet', () => {
  let readOnlyWallet;

  before(() => {
    readOnlyWallet = Wallet.deserialize(JSON.stringify(fixtures));
  });

  it('should have more tests', () => {
    assert.strictEqual('hi', 'hi');
  });

  describe('constructor', () => {
    it('with seed', () => {
      const wallet = new Wallet({
        crypto,
        seed: RANDOM_SEED,
      });
      assert.ok(wallet);
      assert.strictEqual(wallet.isLocked, false);
    });

    it('with publicKey', () => {
      const wallet = new Wallet({
        crypto,
        publicKey: readOnlyWallet.account.address,
      });
      assert.strictEqual(wallet.addressString, readOnlyWallet.addressString);
      assert.strictEqual(wallet.isLocked, true);
      assert.ok(wallet);
    });
  });

  describe('lock', () => {
    it('works', () => {
      const wallet = new Wallet({
        crypto,
        seed: RANDOM_SEED,
      });
      assert.strictEqual(wallet.isLocked, false);
      wallet.lock();
      assert.strictEqual(wallet.account.secret, null);
      assert.strictEqual(wallet.isLocked, true);
    });
  });

  describe('unlock', () => {
    it('works', () => {
      const wallet = new Wallet({
        crypto,
        publicKey: RANDOM_SEED_PUB_KEY,
      });
      assert.strictEqual(wallet.isLocked, true);
      wallet.unlock(RANDOM_SEED);
      assert.ok(wallet.account.secret);
      assert.strictEqual(wallet.isLocked, false);
    });
  });

  describe('publicKey', () => {
    it('works', () => {
      const wallet = new Wallet({
        crypto,
        seed: RANDOM_SEED,
      });
      const publicKey = wallet.publicKey();
      assert.ok(publicKey);
    });

    it('key is valid', () => {
      const wallet = new Wallet({
        crypto,
        seed: RANDOM_SEED,
      });
      const publicKey = wallet.publicKey();
      const secondWalet = new Wallet({
        crypto,
        publicKey,
      });
      secondWalet.unlock(RANDOM_SEED);
      assert.strictEqual(wallet.account.secret, secondWalet.account.secret);
      assert.strictEqual(wallet.addressString, secondWalet.addressString);
    });
  });

  describe('serialization & deserialization', () => {
    it('works', () => {
      assert.deepStrictEqual(fixtures, JSON.parse(readOnlyWallet.serialize()));
    });
  });

  describe('createPrivateKey', () => {
    it('works', () => {
      const privateKey = readOnlyWallet.createPrivateKey(
        'ssx7eWhbSz2eSRRqbvR7cUnQ7nC2a'
      );
      assert.strictEqual(privateKey, 'ssx7eWhbSz2eSRRqbvR7cUnQ7nC2a');
    });

    it('errors on invalid private key', ()=> {
      assert.throws(() => { readOnlyWallet.createPrivateKey('123'); });
    });
  });

  describe('exportPrivateKeys', () => {
    it('works', () => {
      const csv = readOnlyWallet.exportPrivateKeys();
      assert.strictEqual(typeof csv, 'string');
      assert(csv, 'address,privatekey\n' + readOnlyWallet.account.address + ',' + readOnlyWallet.account.secret);
    });
  });

});
