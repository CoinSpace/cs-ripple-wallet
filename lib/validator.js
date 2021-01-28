'use strict';

const Big = require('big.js');
const helpers = require('./helpers');

function transaction(params) {
  const { payment } = params;
  const { wallet } = params;
  const { needToActivateAccount } = params;

  if (!wallet.isActive) {
    throw new Error('Inactive account');
  }

  if (payment.destination.tag && !isUint32(payment.destination.tag)) {
    throw new Error('Invalid tag');
  }

  try {
    const instructions = {
      fee: '0.000012',
      sequence: 1,
      maxLedgerVersion: 1000,
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

  if (payment.destination.amount.value <= wallet.dustThreshold) {
    const error = new Error('Invalid value');
    error.dustThreshold = wallet._unitToAtom(wallet.dustThreshold);
    throw error;
  }

  if (needToActivateAccount && Big(payment.destination.amount.value).lt(wallet.minReserve)) {
    const error = new Error('Invalid value');
    error.details = 'Less than minimum reserve';
    throw error;
  }

  const balance = Big(wallet.balance).minus(wallet.minReserve);
  const { fee } = wallet;
  const needed = Big(payment.destination.amount.value).plus(fee);

  if (balance.lt(needed)) {
    const error = new Error('Insufficient funds');
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
  transaction,
  secret,
};
