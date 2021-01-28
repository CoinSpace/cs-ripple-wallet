'use strict';

const { getRequest } = require('./utils');

class Accounts {
  constructor(url) {
    this.url = url;
  }
  info(address) {
    const self = this;
    return validateAddress(address).then(() => {
      return getRequest(self.url + 'account/' + address).then((data) => {
        return {
          sequence: data.sequence,
          balance: data.balance,
          isActive: data.isActive,
        };
      });
    });
  }
  txs(address, start) {
    const self = this;
    return validateAddress(address).then(() => {
      return getRequest(self.url + 'account/' + address + '/txs', { start })
        .then((data) => {
          const txs = data.txs.filter((tx) => {
            return tx.toCurrency === 'XRP';
          });
          const hasMoreTxs = data.txs.length === data.limit;
          return {
            txs,
            hasMoreTxs,
            cursor: hasMoreTxs && data.txs[data.txs.length - 1].id,
          };
        });
    });
  }
}

function validateAddress(address) {
  return new Promise((resolve, reject) => {
    if (!/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/i.test(address)) {
      reject(new Error(address + ' is not a valid address'));
    } else {
      resolve();
    }
  });
}

module.exports = Accounts;
