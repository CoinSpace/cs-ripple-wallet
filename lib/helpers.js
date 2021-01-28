'use strict';

const keypairs = require('ripple-keypairs');
const Big = require('big.js');

function generateAccount(seed, publicKey) {
  if (!seed) {
    return {
      secret: null,
      address: publicKey,
    };
  }
  const entropy = Buffer.from(seed, 'hex');
  const secret = keypairs.generateSeed({ entropy });
  const keypair = keypairs.deriveKeypair(secret);
  const address = keypairs.deriveAddress(keypair.publicKey);
  return {
    secret,
    address,
  };
}

function getAddressFromSecret(secret) {
  const keypair = keypairs.deriveKeypair(secret);
  return keypairs.deriveAddress(keypair.publicKey);
}

function max(a, b) {
  return Big(a).gt(b) ? a : b;
}

module.exports = {
  generateAccount,
  getAddressFromSecret,
  max,
};
