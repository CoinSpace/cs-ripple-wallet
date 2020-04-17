'use strict';

var getRequest = require('./utils').getRequest;

function Common(url) {
  this.url = url;
}

Common.prototype.fee = function() {
  var self = this;
  return getRequest(self.url + 'fee').then(function(data) {
    return data.fee;
  });
};

Common.prototype.maxLedgerVersion = function() {
  var self = this;
  return getRequest(self.url + 'ledgerVersion').then(function(data) {
    return data.maxLedgerVersion;
  });
};

module.exports = Common;
