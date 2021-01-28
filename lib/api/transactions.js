'use strict';

const { postRequest } = require('./utils');

class Transactions {
  constructor(url) {
    this.url = url;
  }
  propagate(rawtx) {
    return postRequest(this.url + 'tx/send', { rawtx })
      .then((data) => {
        return Promise.resolve(data.txId);
      });
  }
}

module.exports = Transactions;
