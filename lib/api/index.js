'use strict';

const Accounts = require('./accounts');
const Transactions = require('./transactions');
const Common = require('./common');

class API {
  constructor() {
    // eslint-disable-next-line no-undef
    const baseURL = process.env.API_XRP_URL;
    this.accounts = new Accounts(baseURL);
    this.transactions = new Transactions(baseURL);
    this.common = new Common(baseURL);
  }
}

module.exports = API;
