'use strict';

var assert = require('assert');
var Wallet = require('../');
var fixtures = require('./wallet');

describe('Ripple Wallet', function() {
  var readOnlyWallet;

  before(function() {
    readOnlyWallet = Wallet.deserialize(JSON.stringify(fixtures));
  });

  it('should have more tests', function() {
    assert.equal('hi', 'hi');
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
