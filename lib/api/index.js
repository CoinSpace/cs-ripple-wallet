'use strict';

var Accounts = require('./accounts');
var Transactions = require('./transactions');
var Common = require('./common');

function API() {
  // eslint-disable-next-line no-undef
  var baseURL = process.env.API_XRP_URL;
  this.accounts = new Accounts(baseURL);
  this.transactions = new Transactions(baseURL);
  this.common = new Common(baseURL);
}

module.exports = API;
