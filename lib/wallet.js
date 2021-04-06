'use strict';

const API = require('./api');
const validator = require('./validator');
const helpers = require('./helpers');
const { RippleAPI } = require('ripple-lib');
const Big = require('big.js');

class Wallet {
  constructor(options) {
    this.decimals = 6;
    this.factor = Big(10).pow(this.decimals);
    this.balance = '0';

    if (!options) {
      return this;
    }

    const { seed } = options;
    const { publicKey } = options;

    this.networkName = options.networkName;
    this.api = new API();
    this.ripple = new RippleAPI();
    this.fee = '0';
    this.isActive = false;
    this.txsCursor = undefined;
    this.sequence = 0;
    this.minReserve = 20;
    this.dustThreshold = 0.000001;
    this.isLocked = !seed;
    this.denomination = 'XRP';
    this.name = 'Ripple';

    if (seed) {
      this.account = helpers.generateAccount(seed);
    } else if (publicKey) {
      this.account = helpers.generateAccount(null, publicKey);
    } else {
      throw new Error('seed or publicKey should be passed');
    }
    this.addressString = this.account.address;
  }
  load(options) {
    const { done } = options;

    Promise.all([
      this.api.accounts.info(this.addressString),
      this.api.common.fee(),
    ]).then((results) => {
      this.balance = results[0].balance;
      this.sequence = results[0].sequence;
      this.isActive = results[0].isActive;
      this.fee = results[1];
      done(null, this);
    }).catch(done);
  }
  async update() {
    this.fee = await this.api.common.fee();
  }
  loadTxs() {
    return this.api.accounts.txs(this.addressString, this.txsCursor).then((data) => {
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
    });
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
  getBalance() {
    return this._unitToAtom(this.balance);
  }
  getMinReserve() {
    return this._unitToAtom(this.minReserve);
  }
  getNextAddress() {
    return this.addressString;
  }
  createTx(to, value, tag, invoiceId, needToActivateAccount) {
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

    validator.transaction({
      wallet: this,
      payment,
      needToActivateAccount,
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
  getDefaultFee() {
    return this._unitToAtom(this.fee);
  }
  getMaxAmount() {
    const balance = Big(this.balance).minus(this.minReserve).minus(this.fee);
    return this._unitToAtom(helpers.max(balance, 0));
  }
  sendTx(tx, done) {
    this.api.common.maxLedgerVersion().then((maxLedgerVersion) => {
      return {
        fee: this.fee,
        sequence: tx.sequence,
        maxLedgerVersion,
      };
    }).then((instructions) => {
      return this.ripple.preparePayment(tx.address, tx.payment, instructions);
    }).then((prepared) => {
      const signed = this.ripple.sign(prepared.txJSON, tx.secret);
      return this.api.transactions.propagate(signed.signedTransaction).then(() => {
        if (tx.address === this.addressString) {
          this.sequence++;
          this.balance = Big(this.balance).minus(tx.payment.source.maxAmount.value).minus(this.fee).toFixed();
        } else {
          this.balance = Big(this.balance).plus(tx.payment.source.maxAmount.value).toFixed();
        }
        done(null);
      }).catch((err) => {
        const resultCode = err.response && err.response.data && err.response.data.resultCode;
        if (/^tec/.test(resultCode)) {
          this.sequence++;
          throw new Error(resultCode);
        }
        if (/^tefPAST_SEQ/.test(resultCode)) {
          this.sequence++;
        }
        throw new Error('cs-node-error');
      });
    }).catch(done);
  }
  createPrivateKey(secret) {
    validator.secret(secret);
    return secret;
  }
  createImportTx(options) {
    const amount = Big(this._atomToUnit(options.amount)).minus(this.fee);
    if (amount.lt(0)) {
      throw new Error('Insufficient funds');
    }
    if (!this.isActive && amount.lt(this.minReserve)) {
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
        amount: this._unitToAtom(helpers.max(Big(info.balance).minus(this.minReserve), Big(0)).toFixed()),
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
  _atomToUnit(value) {
    return Big(value).div(this.factor).toFixed(this.decimals);
  }
  _unitToAtom(value) {
    return Big(value).times(this.factor).toFixed(0);
  }
  serialize() {
    return JSON.stringify({
      networkName: this.networkName,
      balance: this.balance,
      fee: this.fee,
      account: this.account,
      sequence: this.sequence,
      minReserve: this.minReserve,
      dustThreshold: this.dustThreshold,
    });
  }
  static deserialize(json) {
    const wallet = new Wallet();
    const deserialized = JSON.parse(json);

    wallet.networkName = deserialized.networkName;
    wallet.api = new API();
    wallet.balance = deserialized.balance;
    wallet.fee = deserialized.fee;
    wallet.account = deserialized.account;
    wallet.addressString = wallet.account.address;
    wallet.sequence = deserialized.sequence;
    wallet.minReserve = deserialized.minReserve;
    wallet.dustThreshold = deserialized.dustThreshold;
    return wallet;
  }
}

module.exports = Wallet;
