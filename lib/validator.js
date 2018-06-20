'use strict';
var Big = require('big.js');
var helpers = require('./helpers');

function transaction(params) {
  var payment = params.payment;
  var wallet = params.wallet;

  if (!wallet.isActive) {
    throw new Error('Inactive account');
  }

  if (payment.destination.tag && !isUint32(payment.destination.tag)) {
    throw new Error('Invalid tag');
  }

  try {
    var instructions = {
      fee: '0.000012',
      sequence: 1,
      maxLedgerVersion: 1000
    };
    wallet.ripple.preparePayment(wallet.account.address, payment, instructions);
  } catch (e) {
    if (/^instance.payment.destination is not exactly one from/.test(e.message)) {
      throw new Error('Invalid address');
    }
    if (/^instance.payment.invoiceID does not match pattern/.test(e.message)) {
      throw new Error('Invalid invoiceID');
    }
  }

  if (payment.source.address === payment.destination.address) {
    throw new Error('Destination address equal source address');
  }

  var error;

  if (payment.destination.amount.value <= wallet.dustThreshold) {
    error = new Error('Invalid value');
    error.dustThreshold = wallet.dustThreshold;
    throw error;
  }

  var balance = Big(wallet.getBalance()).minus(wallet.minReserve);
  var fee = wallet.getDefaultFee();
  var needed = Big(payment.destination.amount.value).plus(fee);

  if (balance.lt(needed)) {
    error = new Error('Insufficient funds');
    error.details = 'Attempt to empty wallet';
    error.sendableBalance = helpers.max(balance.minus(fee), 0);
    throw error;
  }
}

function secret(secret) {
  try {
    helpers.getAddressFromSecret(secret);
  } catch (e) {
    throw new Error('Invalid private key');
  }
}

function isUint32(i) {
  if (!Number.isInteger(i)) return false;
  if (i < 0) return false;
  if (i > 4294967295) return false;
  return true;
}

module.exports = {
  transaction: transaction,
  secret: secret
};
