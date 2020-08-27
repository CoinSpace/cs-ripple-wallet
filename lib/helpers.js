'use strict';

var keypairs = require('ripple-keypairs');
var Big = require('big.js');

function generateAccount(seed, publicKey) {
  if (!seed) {
    return {
      secret: null,
      address: publicKey
    };
  }
  var entropy = Buffer.from(seed, 'hex');
  var secret = keypairs.generateSeed({entropy: entropy});
  var keypair = keypairs.deriveKeypair(secret);
  var address = keypairs.deriveAddress(keypair.publicKey);
  return {
    secret: secret,
    address: address
  };
}

function getAddressFromSecret(secret) {
  var keypair = keypairs.deriveKeypair(secret);
  return keypairs.deriveAddress(keypair.publicKey);
}

function max(a, b) {
  return Big(a).gt(b) ? a : b;
}

module.exports = {
  generateAccount: generateAccount,
  getAddressFromSecret: getAddressFromSecret,
  max: max
};
