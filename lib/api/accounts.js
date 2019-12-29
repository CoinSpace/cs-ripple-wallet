'use strict';
var getRequest = require('./utils').getRequest;

function Accounts(url) {
  this.url = url;
}

function validateAddress(address) {
  return new Promise(function(resolve, reject) {
    if (!/^r[1-9A-HJ-NP-Za-km-z]{25,34}$/i.test(address)) {
      reject(new Error(address + ' is not a valid address'));
    } else {
      resolve();
    }
  });
}

Accounts.prototype.info = function(address) {
  var self = this;
  return validateAddress(address).then(function() {
    return getRequest(self.url + 'account/' + address).then(function(data) {
      return {
        sequence: data.sequence,
        balance: data.balance,
        isActive: data.isActive
      };
    });
  });
};

Accounts.prototype.txs = function(address, start) {
  var self = this;
  return validateAddress(address).then(function() {
    return getRequest(self.url + 'account/' + address + '/txs', {start: start})
      .then(function(data) {
        var txs = data.txs.filter(function(tx) {
          return tx.toCurrency === 'XRP';
        });
        var hasMoreTxs = data.txs.length === data.limit;
        return {
          txs: txs,
          hasMoreTxs: hasMoreTxs,
          cursor: hasMoreTxs && data.txs[data.txs.length - 1].id
        };
      });
  });
};

module.exports = Accounts;
