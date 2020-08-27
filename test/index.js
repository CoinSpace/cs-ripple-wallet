'use strict';

var assert = require('assert');
var Wallet = require('../');
var fixtures = require('./wallet');
// eslint-disable-next-line max-len
var RANDOM_SEED = '2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874';

describe('Ripple Wallet', function() {
  var readOnlyWallet;

  before(function() {
    readOnlyWallet = Wallet.deserialize(JSON.stringify(fixtures));
  });

  it('should have more tests', function() {
    assert.equal('hi', 'hi');
  });

  describe('constructor', function() {
    it('with seed', function() {
      var wallet = new Wallet({
        networkName: 'ripple',
        seed: RANDOM_SEED
      });
      assert.ok(wallet);
      assert.equal(wallet.isLocked, false);
    });

    it('with publicKey', function() {
      var wallet = new Wallet({
        networkName: 'ripple',
        publicKey: readOnlyWallet.account.address
      });
      assert.equal(wallet.addressString, readOnlyWallet.addressString);
      assert.equal(wallet.isLocked, true);
      assert.ok(wallet);
    });
  });

  describe('lock', function() {
    it('works', function() {
      var wallet = new Wallet({
        networkName: 'ripple',
        seed: RANDOM_SEED
      });
      assert.equal(wallet.isLocked, false);
      wallet.lock();
      assert.equal(wallet.account.secret, null);
      assert.equal(wallet.isLocked, true);
    });
  });

  describe('unlock', function() {
    it('works', function() {
      var wallet = new Wallet({
        networkName: 'ripple',
        publicKey: readOnlyWallet.account.address
      });
      assert.equal(wallet.isLocked, true);
      wallet.unlock(readOnlyWallet.account.secret);
      assert.equal(wallet.account.secret, readOnlyWallet.account.secret);
      assert.equal(wallet.isLocked, false);
    });
  });

  describe('dumpKeys', function() {
    it('works', function() {
      var wallet = new Wallet({
        networkName: 'ripple',
        seed: RANDOM_SEED
      });
      var keys = wallet.dumpKeys();
      assert.ok(keys);
      assert.ok(keys.private);
      assert.ok(keys.public);
    });

    it('dumped keys are valid', function() {
      var wallet = new Wallet({
        networkName: 'ripple',
        seed: RANDOM_SEED
      });
      var keys = wallet.dumpKeys();
      var secondWalet = new Wallet({
        networkName: 'ripple',
        publicKey: keys.public
      });
      secondWalet.unlock(keys.private);
      assert.equal(wallet.account.secret, secondWalet.account.secret);
      assert.equal(wallet.addressString, secondWalet.addressString);
    });
  });

  describe('serialization & deserialization', function() {
    it('works', function() {
      assert.deepEqual(fixtures, JSON.parse(readOnlyWallet.serialize()));
    });
  });

  describe('createPrivateKey', function() {
    it('works', function() {
      var privateKey = readOnlyWallet.createPrivateKey(
        'ssx7eWhbSz2eSRRqbvR7cUnQ7nC2a'
      );
      assert.equal(privateKey, 'ssx7eWhbSz2eSRRqbvR7cUnQ7nC2a');
    });

    it('errors on invalid private key', function(){
      assert.throws(function() { readOnlyWallet.createPrivateKey('123'); });
    });
  });

  describe('exportPrivateKeys', function() {
    it('works', function() {
      var csv = readOnlyWallet.exportPrivateKeys();
      assert.equal(typeof csv, 'string');
      assert(csv, 'address,privatekey\n' + readOnlyWallet.account.address + ',' + readOnlyWallet.account.secret);
    });
  });

});
