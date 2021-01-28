'use strict';

const { getRequest } = require('./utils');

class Common {
  constructor(url) {
    this.url = url;
  }
  fee() {
    return getRequest(this.url + 'fee').then((data) => {
      return data.fee;
    });
  }
  maxLedgerVersion() {
    return getRequest(this.url + 'ledgerVersion').then((data) => {
      return data.maxLedgerVersion;
    });
  }
}

module.exports = Common;
