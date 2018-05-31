'use strict';
var postRequest = require('./utils').postRequest;

function Transactions(url) {
  this.url = url;
}

Transactions.prototype.propagate = function(rawtx) {
  return postRequest(this.url + 'tx/send', {rawtx: rawtx})
    .then(function(data) {
      return Promise.resolve(data.txId);
    });
};

module.exports = Transactions;
