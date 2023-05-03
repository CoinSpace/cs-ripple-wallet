import API from './api/index.js';
import { RippleAPI } from 'ripple-lib';
import {
  getAddressFromSecret,
  getAddressFromSeed,
  getSecretFromSeed,
} from './helpers.js';
import {
  isHash256,
  isUint32,
} from './validator.js';

import {
  Amount,
  CsWallet,
  Transaction,
  errors,
} from 'cs-common';

class RippleTransaction extends Transaction {
  get url() {
    if (this.development) {
      return `https://testnet.xrpl.org/transactions/${this.id}`;
    }
    return `https://livenet.xrpl.org/transactions/${this.id}`;
  }
}

export class InvalidDestinationTagError extends errors.InvalidMetaError {
  name = 'InvalidDestinationTagError';
  constructor(destinationTag, options) {
    super(`Invalid Destination Tag: "${destinationTag}"`, {
      ...options,
      meta: 'destinationTag',
    });
  }
}

export class InvalidInvoiceIDError extends errors.InvalidMetaError {
  name = 'InvalidInvoiceIDError';
  constructor(invoiceId, options) {
    super(`Invalid invoiceId: "${invoiceId}"`, {
      ...options,
      meta: 'invoiceId',
    });
  }
}

// tecDST_TAG_NEEDED
export class DestinationTagNeededError extends errors.InvalidMetaError {
  name = 'DestinationTagNeededError';
  constructor(message, options) {
    super(message || 'Destination Tag Needed', {
      ...options,
      meta: 'invoiceId',
    });
  }
}

export default class RippleWallet extends CsWallet {
  #api;
  #ripple;
  #minReserve = 10_000000n;
  #dustThreshold = 1n;
  #sequence = 0;
  #address;
  #balance = 0n;
  #isActive = false;

  get isMetaSupported() {
    return true;
  }

  get isImportSupported() {
    return true;
  }

  get address() {
    return this.#address;
  }

  get balance() {
    return new Amount(this.#balance, this.crypto.decimals);
  }

  constructor(options = {}) {
    super(options);
    this.#api = new API(this);
    this.#ripple = new RippleAPI();
  }

  async create(seed) {
    this.state = CsWallet.STATE_INITIALIZING;
    this.typeSeed(seed);
    this.#address = getAddressFromSeed(seed);
    this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  async open(publicKey) {
    this.typePublicKey(publicKey);
    this.state = CsWallet.STATE_INITIALIZING;
    this.#address = publicKey.data;
    this.#init();
    this.state = CsWallet.STATE_INITIALIZED;
  }

  #init() {
    this.#balance = BigInt(this.storage.get('balance') || 0);
  }

  async load() {
    this.state = CsWallet.STATE_LOADING;
    const info = await this.#api.accounts.info(this.#address);
    this.#balance = this.#unitToAtom(info.balance);
    this.#sequence = info.sequence;
    this.#isActive = info.isActive;
    this.storage.set('balance', this.#balance.toString());
    await this.storage.save();
    this.state = CsWallet.STATE_LOADED;
  }

  async reload() {
    // TODO reload logic
  }

  async cleanup() {
    await super.cleanup();
  }

  async loadTransactions({ cursor } = {}) {
    const data = await this.#api.accounts.txs(this.#address, cursor);
    return {
      transactions: this.#transformTxs(data.transactions),
      hasMore: data.hasMore,
      cursor: data.cursor,
    };
  }

  #transformTxs(txs) {
    return txs.map((tx) => {
      return this.#transformTx(tx);
    });
  }

  #transformTx(tx) {
    const incoming = tx.to === this.#address && tx.from !== tx.to;
    return new RippleTransaction({
      type: RippleTransaction.TYPE_TRANSFER,
      id: tx.id,
      to: tx.to,
      from: tx.from,
      amount: new Amount(this.#unitToAtom(tx.amount), this.crypto.decimals),
      incoming,
      fee: new Amount(this.#unitToAtom(tx.fee), this.crypto.decimals),
      // TODO check timestamp
      timestamp: new Date(tx.timestamp),
      confirmed: true,
      status: tx.status,
      meta: {
        destinationTag: tx.destinationTag,
        invoiceId: tx.invoiceId,
      },
      development: this.development,
    });
  }

  getPublicKey() {
    return {
      data: this.#address,
    };
  }

  getPrivateKey(seed) {
    this.typeSeed(seed);
    const secret = getSecretFromSeed(seed);
    return [{
      address: this.#address,
      secret,
    }];
  }

  async #getMinerFee() {
    return this.#unitToAtom(await this.#api.common.fee());
  }

  async #getAccountInfo(address) {
    return this.#api.accounts.info(address);
  }

  async validateAddress({ address }) {
    super.validateAddress({ address });
    try {
      RippleAPI.decodeAccountID(address);
    } catch (err) {
      throw new errors.InvalidAddressError(address, { cause: err });
    }
    if (address === this.#address) {
      throw new errors.DestinationEqualsSourceError();
    }
    return true;
  }

  async validateMeta({ address, meta = {} }) {
    super.validateMeta({ address, meta });
    if (meta.destinationTag !== undefined && !isUint32(meta.destinationTag)) {
      throw new InvalidDestinationTagError(meta.destinationTag);
    }
    if (meta.invoiceId !== undefined && !isHash256(meta.invoiceId)) {
      throw new InvalidInvoiceIDError(meta.invoiceId);
    }
    return true;
  }

  async validateAmount({ address, amount, meta = {} }) {
    super.validateAmount({ address, amount, meta });
    if (!this.#isActive) {
      throw new errors.InactiveAccountError();
    }
    const { value } = amount;
    if (value < this.#dustThreshold) {
      throw new errors.SmallAmountError(new Amount(this.#dustThreshold, this.crypto.decimals));
    }
    const maxAmount = await this.#estimateMaxAmount();
    if (value > maxAmount) {
      throw new errors.BigAmountError(new Amount(maxAmount, this.crypto.decimals));
    }
    const destinationInfo = await this.#getAccountInfo(address);
    if (!destinationInfo.isActive && value < this.#minReserve) {
      throw new errors.MinimumReserveDestinationError(new Amount(this.#minReserve, this.crypto.decimals));
    }
    return true;
  }

  async #estimateMaxAmount() {
    if (this.#balance < this.#minReserve) {
      return 0n;
    }
    const minerFee = await this.#getMinerFee();
    const maxAmount = this.#balance - minerFee - this.#minReserve;
    if (maxAmount < 0n) {
      return 0n;
    }
    return maxAmount;
  }

  async estimateMaxAmount({ address, meta = {} }) {
    super.estimateMaxAmount({ address, meta });
    const maxAmount = await this.#estimateMaxAmount();
    return new Amount(maxAmount, this.crypto.decimals);
  }

  async estimateTransactionFee({ address, amount, meta = {} }) {
    super.estimateTransactionFee({ address, amount, meta });
    const minerFee = await this.#getMinerFee();
    return new Amount(minerFee, this.crypto.decimals);
  }

  async createTransaction({ address, amount, meta = {} }, seed) {
    super.createTransaction({ address, amount }, seed);
    const { value } = amount;
    const payment = {
      source: {
        address: this.#address,
        maxAmount: {
          value: this.#atomToUnit(value),
          currency: 'XRP',
        },
      },
      destination: {
        address,
        amount: {
          value: this.#atomToUnit(value),
          currency: 'XRP',
        },
      },
    };
    if (meta.destinationTag !== undefined) {
      payment.destination.tag = meta.destinationTag;
    }
    if (meta.invoiceId !== undefined) {
      payment.invoiceID = meta.invoiceId;
    }
    const fee = await this.#getMinerFee();
    const maxLedgerVersion = await this.#api.common.maxLedgerVersion();
    const instructions = {
      fee: this.#atomToUnit(fee),
      sequence: this.#sequence,
      maxLedgerVersion,
    };
    const secret = getSecretFromSeed(seed);
    return this.#sendTransaction({ address: this.#address, payment, instructions }, secret);
  }

  async #sendTransaction({ address, payment, instructions }, secret) {
    const prepared = await this.#ripple.preparePayment(address, payment, instructions);
    const signed = this.#ripple.sign(prepared.txJSON, secret);
    try {
      await this.#api.transactions.propagate(signed.signedTransaction);
      if (address === this.#address) {
        this.#sequence++;
        this.#balance = this.#balance
          - this.#unitToAtom(payment.source.maxAmount.value) - this.#unitToAtom(instructions.fee);
      } else {
        this.#balance = this.#balance + this.#unitToAtom(payment.source.maxAmount.value);
      }
      this.storage.set('balance', this.#balance.toString());
      await this.storage.save();
    } catch (err) {
      const resultCode = err.response && err.response.data && err.response.data.resultCode;
      if (resultCode === 'tecNO_DST_INSUF_XRP') {
        throw new errors.MinimumReserveDestinationError(
          new Amount(this.#minReserve, this.crypto.decimals), { cause: err });
      }
      if (resultCode === 'tecDST_TAG_NEEDED') {
        throw new DestinationTagNeededError(undefined, { cause: err });
      }
      // TODO node or network error
      throw err;
    }
  }

  async #prepareImport(secret) {
    const address = getAddressFromSecret(secret);
    if (address === this.#address) {
      throw new errors.InvalidSecretError('Private key equal wallet private key');
    }
    const info = await this.#getAccountInfo(address);
    const balance = this.#unitToAtom(info.balance);
    const fee = await this.#getMinerFee();
    const amount = balance - this.#minReserve;
    const sendable = amount - fee;
    return {
      address,
      amount,
      sendable,
      fee,
      sequence: info.sequence,
    };
  }

  async estimateImport({ privateKey }) {
    super.estimateImport();
    const { address, amount, fee, sendable } = await this.#prepareImport(privateKey);
    if (this.#isActive === false && sendable < this.#minReserve) {
      throw new errors.MinimumReserveDestinationError(new Amount(this.#minReserve, this.crypto.decimals));
    }
    if (sendable < this.#dustThreshold) {
      throw new errors.SmallAmountError(this.#dustThreshold, this.crypto.decimals);
    }
    return {
      address,
      amount: new Amount(amount > 0n ? amount : 0n, this.crypto.decimals),
      fee: new Amount(fee, this.crypto.decimals),
    };
  }

  async createImport({ privateKey }) {
    super.createImport();
    const { address, fee, sendable, sequence } = await this.#prepareImport(privateKey);
    const payment = {
      source: {
        address,
        maxAmount: {
          value: this.#atomToUnit(sendable),
          currency: 'XRP',
        },
      },
      destination: {
        address: this.#address,
        amount: {
          value: this.#atomToUnit(sendable),
          currency: 'XRP',
        },
      },
    };
    const maxLedgerVersion = await this.#api.common.maxLedgerVersion();
    const instructions = {
      fee: this.#atomToUnit(fee),
      sequence,
      maxLedgerVersion,
    };
    return this.#sendTransaction({ address, payment, instructions }, privateKey);
  }

  #atomToUnit(value) {
    //return Big(value).div(this.factor).toFixed(this.crypto.decimals);
    return this.#ripple.dropsToXrp(value.toString());
  }

  #unitToAtom(value) {
    //return Big(value).times(this.factor).toFixed(0);
    return BigInt(this.#ripple.xrpToDrops(value));
  }
}
