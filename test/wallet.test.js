import Wallet from '../index.js';
import assert from 'assert/strict';
import sinon from 'sinon';

// eslint-disable-next-line max-len
const RANDOM_SEED = Buffer.from('2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874', 'hex');
const RANDOM_SEED_PUB_KEY = 'rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF';
const RANDOM_ADDRESS = 'rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF';
const RANDOM_SECRET = 'ssJGzspgYMoCehAaJLX2a6xo4mCjX';
const xrpAtRipple = {
  _id: 'xrp@ripple',
  asset: 'xrp',
  platform: 'ripple',
  type: 'coin',
  decimals: 6,
};
const defaultOptions = {
  crypto: xrpAtRipple,
  platform: xrpAtRipple,
  cache: { get() {}, set() {} },
  settings: { get() {}, set() {} },
  account: {
    request(...args) { console.log(args); },
  },
  apiWeb: 'web',
  apiNode: 'node',
  storage: { get() {}, set() {}, save() {} },
};

describe('Ripple Wallet', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should have more tests', () => {
    assert.equal('hi', 'hi');
  });

  describe('constructor', () => {
    it('create wallet instance', () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      assert.equal(wallet.state, Wallet.STATE_CREATED);
    });
  });

  describe('create wallet', () => {
    it('should create new wallet with seed', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, RANDOM_ADDRESS);
    });

    it('should fails without seed', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await assert.rejects(
        async () => {
          await wallet.create();
        }, {
          name: 'TypeError',
          message: 'seed must be an instance of Buffer, undefined provided',
        });
    });
  });

  describe('open wallet', () => {
    it('should open wallet with public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, RANDOM_ADDRESS);
    });

    it('should open wallet with migrated public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open(RANDOM_SEED_PUB_KEY);
      assert.equal(wallet.state, Wallet.STATE_INITIALIZED);
      assert.equal(wallet.address, RANDOM_ADDRESS);
    });

    it('should fails without public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await assert.rejects(
        async () => {
          await wallet.open();
        }, {
          name: 'TypeError',
          message: 'publicKey must be an instance of Object with data property',
        });
    });
  });

  describe('storage', () => {
    it('should load initial balance from storage', async () => {
      sinon.stub(defaultOptions.storage, 'get')
        .withArgs('balance').returns('1234567890');
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      assert.equal(wallet.balance.value, 1234567890n);
    });
  });

  describe('load', () => {
    it('should load wallet', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/account/rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF',
          baseURL: 'node',
        }).resolves({
          balance: 12.345,
          sequence: 1,
          isActive: true,
        });
      const storage = sinon.mock(defaultOptions.storage);
      storage.expects('set').once().withArgs('balance', '12345000');
      storage.expects('save').once();
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      await wallet.load();
      assert.equal(wallet.state, Wallet.STATE_LOADED);
      assert.equal(wallet.balance.value, 12345000n);
      storage.verify();
    });
  });

  describe('getPublicKey', () => {
    it('should export public key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      const publicKey = wallet.getPublicKey();
      assert.deepEqual(publicKey, { data: RANDOM_SEED_PUB_KEY });
    });

    it('public key is valid', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      const publicKey = wallet.getPublicKey();
      const secondWalet = new Wallet({
        ...defaultOptions,
      });
      secondWalet.open(publicKey);
      assert.equal(wallet.address, secondWalet.address);
    });
  });

  describe('getPrivateKey', () => {
    it('should export private key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.create(RANDOM_SEED);
      const privateKey = wallet.getPrivateKey(RANDOM_SEED);
      assert.deepEqual(privateKey, [{
        address: RANDOM_ADDRESS,
        secret: RANDOM_SECRET,
      }]);
    });
  });

  describe('estimateImport', () => {
    it('works', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/account/rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF',
          baseURL: 'node',
        }).resolves({
          balance: 12.345,
          sequence: 1,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/account/rfUJGPU24ZyxiyT9bPE4kaG3EhBviBjb63',
          baseURL: 'node',
        }).resolves({
          balance: 100500,
          sequence: 1,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/fee',
          baseURL: 'node',
        }).resolves({
          fee: 0.000012,
        });
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      await wallet.load();
      const estimation = await wallet.estimateImport({ secret: 'ssx7eWhbSz2eSRRqbvR7cUnQ7nC2a' });
      assert.equal(estimation.address, 'rfUJGPU24ZyxiyT9bPE4kaG3EhBviBjb63');
      assert.equal(estimation.amount.value, 100489999988n);
    });

    it('throw error on invalid private key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      await assert.rejects(
        async () => {
          await wallet.estimateImport({ secret: '123' });
        },
        {
          name: 'InvalidSecretError',
          message: 'Invalid Secret',
        }
      );
    });

    it('throw error on own private key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      await assert.rejects(
        async () => {
          await wallet.estimateImport({ secret: RANDOM_SECRET });
        },
        {
          name: 'InvalidSecretError',
          message: 'Private key equal wallet private key',
        }
      );
    });
  });
});
