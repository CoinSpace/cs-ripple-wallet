'use strict';

const API = require('./api');
const validator = require('./validator');
const helpers = require('./helpers');
const { RippleAPI } = require('ripple-lib');
const Big = require('big.js');

class Wallet {
  constructor(options) {

    if (!options) {
      return this;
    }

    const { seed, publicKey, crypto, cache } = options;

    this.crypto = crypto;
    this.cache = cache;
    this._balance = this.cache.get('balance') || '0';
    this.factor = Big(10).pow(this.crypto.decimals);
    this.api = new API();
    this.ripple = new RippleAPI();
    this.fee = '0';
    this.isActive = false;
    this.txsCursor = undefined;
    this.sequence = 0;
    this._minReserve = 10;
    this.dustThreshold = 0.000001;
    this.isLocked = !seed;

    if (seed) {
      this.account = helpers.generateAccount(seed);
    } else if (publicKey) {
      this.account = helpers.generateAccount(null, publicKey);
    } else {
      throw new Error('seed or publicKey should be passed');
    }
    this.addressString = this.account.address;
  }
  async load() {
    const results = await Promise.all([
      this.api.accounts.info(this.addressString),
      this.api.common.fee(),
    ]);
    this._balance = results[0].balance;
    this.cache.set('balance', this._balance);
    this.txsCursor = undefined;
    this.sequence = results[0].sequence;
    this.isActive = results[0].isActive;
    this.fee = results[1];
  }
  async update() {
    this.fee = await this.api.common.fee();
  }
  async loadTxs() {
    const data = await this.api.accounts.txs(this.addressString, this.txsCursor);
    data.txs = data.txs.map((tx) => {
      tx.fee = this._unitToAtom(tx.fee);
      tx.amount = this._unitToAtom(tx.amount);
      if (tx.from === this.addressString) {
        tx.amount = '-' + tx.amount;
      }
      tx.isIncoming = tx.to === this.addressString && tx.from !== tx.to;
      return tx;
    });
    this.txsCursor = data.cursor;
    return data;
  }
  lock() {
    this.account.secret = null;
    this.isLocked = true;
  }
  unlock(seed) {
    this.account = helpers.generateAccount(seed);
    this.isLocked = false;
  }
  publicKey() {
    return this.account.address;
  }
  getDestinationInfo(address) {
    return this.api.accounts.info(address);
  }
  get balance() {
    return this._unitToAtom(this._balance);
  }
  get minReserve() {
    return this._unitToAtom(this._minReserve);
  }
  getNextAddress() {
    return this.addressString;
  }
  async createTx(to, value, tag, invoiceId) {
    const payment = {
      source: {
        address: this.addressString,
        maxAmount: {
          value: this._atomToUnit(value),
          currency: 'XRP',
        },
      },
      destination: {
        address: to,
        amount: {
          value: this._atomToUnit(value),
          currency: 'XRP',
        },
      },
    };

    if (tag) {
      payment.destination.tag = parseInt(tag);
    }
    if (invoiceId) {
      payment.invoiceID = invoiceId;
    }

    await validator.transaction({
      wallet: this,
      payment,
    });

    const that = this;
    return {
      sign() {
        return {
          payment,
          address: that.addressString,
          secret: that.account.secret,
          sequence: that.sequence,
        };
      },
    };
  }
  get defaultFee() {
    return this._unitToAtom(this.fee);
  }
  get maxAmount() {
    const balance = Big(this._balance).minus(this._minReserve).minus(this.fee);
    return this._unitToAtom(helpers.max(balance, 0));
  }
  async sendTx(tx) {
    try {
      const maxLedgerVersion = await this.api.common.maxLedgerVersion();
      const instructions = {
        fee: this.fee,
        sequence: tx.sequence,
        maxLedgerVersion,
      };
      const prepared = await this.ripple.preparePayment(tx.address, tx.payment, instructions);
      const signed = this.ripple.sign(prepared.txJSON, tx.secret);
      await this.api.transactions.propagate(signed.signedTransaction);
      if (tx.address === this.addressString) {
        this.sequence++;
        this._balance = Big(this._balance).minus(tx.payment.source.maxAmount.value).minus(this.fee).toFixed();
      } else {
        this._balance = Big(this._balance).plus(tx.payment.source.maxAmount.value).toFixed();
      }
      this.cache.set('balance', this._balance);
    } catch (err) {
      const resultCode = err.response && err.response.data && err.response.data.resultCode;
      if (/^tec/.test(resultCode)) {
        this.sequence++;
        throw new Error(resultCode);
      }
      if (/^tefPAST_SEQ/.test(resultCode)) {
        this.sequence++;
      }
      throw new Error('cs-node-error');
    }
  }
  createPrivateKey(secret) {
    validator.secret(secret);
    return secret;
  }
  async createImportTx(options) {
    const amount = Big(this._atomToUnit(options.amount)).minus(this.fee);
    if (amount.lt(0)) {
      throw new Error('Insufficient funds');
    }
    if (!this.isActive && amount.lt(this._minReserve)) {
      throw new Error('Less than minimum reserve');
    }

    const payment = {
      source: {
        address: options.address,
        maxAmount: {
          value: amount.toFixed(),
          currency: 'XRP',
        },
      },
      destination: {
        address: options.to,
        amount: {
          value: amount.toFixed(),
          currency: 'XRP',
        },
      },
    };

    return {
      sign() {
        return {
          payment,
          sequence: options.sequence,
          secret: options.secret,
          address: options.address,
        };
      },
    };
  }
  getImportTxOptions(secret) {
    const address = helpers.getAddressFromSecret(secret);
    if (address === this.account.address) {
      return Promise.reject(new Error('Private key equal wallet private key'));
    }
    return this.api.accounts.info(address).then((info) => {
      return {
        amount: this._unitToAtom(helpers.max(Big(info.balance).minus(this._minReserve), Big(0)).toFixed()),
        sequence: info.sequence,
        secret,
        address,
      };
    });
  }
  exportPrivateKeys() {
    let str = 'address,privatekey\n';
    str += this.addressString + ',' + this.account.secret;
    return str;
  }
  txUrl(txId) {
    return `https://xrpcharts.ripple.com/#/transactions/${txId}`;
  }
  _atomToUnit(value) {
    return Big(value).div(this.factor).toFixed(this.crypto.decimals);
  }
  _unitToAtom(value) {
    return Big(value).times(this.factor).toFixed(0);
  }
  serialize() {
    return JSON.stringify({
      crypto: this.crypto,
      balance: this._balance,
      fee: this.fee,
      account: this.account,
      sequence: this.sequence,
      minReserve: this._minReserve,
      dustThreshold: this.dustThreshold,
    });
  }
  static deserialize(json) {
    const wallet = new Wallet();
    const deserialized = JSON.parse(json);

    wallet.crypto = deserialized.crypto;
    wallet.cache = { get: () => {}, set: () => {} };
    wallet.api = new API();
    wallet._balance = deserialized.balance;
    wallet.fee = deserialized.fee;
    wallet.account = deserialized.account;
    wallet.addressString = wallet.account.address;
    wallet.sequence = deserialized.sequence;
    wallet._minReserve = deserialized.minReserve;
    wallet.dustThreshold = deserialized.dustThreshold;
    return wallet;
  }
}

module.exports = Wallet;
