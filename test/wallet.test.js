import { Amount } from 'cs-common';
import Wallet from '../index.js';
import assert from 'assert/strict';
import sinon from 'sinon';

// eslint-disable-next-line max-len
const RANDOM_SEED = Buffer.from('2b48a48a752f6c49772bf97205660411cd2163fe6ce2de19537e9c94d3648c85c0d7f405660c20253115aaf1799b1c41cdd62b4cfbb6845bc9475495fc64b874', 'hex');
const RANDOM_SEED_PUB_KEY = 'rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF';
const RANDOM_ADDRESS = 'rpJEDJy8pYSEmuKnqwQQEu2uGYcK5QRTjF';
const RANDOM_SECRET = 'ssJGzspgYMoCehAaJLX2a6xo4mCjX';
const SECOND_SECRET = 'ssx7eWhbSz2eSRRqbvR7cUnQ7nC2a';
const SECOND_ADDRESS = 'rfUJGPU24ZyxiyT9bPE4kaG3EhBviBjb63';
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
      await assert.rejects(async () => {
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
      await assert.rejects(async () => {
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
          url: `api/v1/account/${RANDOM_ADDRESS}`,
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
          url: `api/v1/account/${RANDOM_ADDRESS}`,
          baseURL: 'node',
        }).resolves({
          balance: 12.345,
          sequence: 1,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${SECOND_ADDRESS}`,
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
      const estimation = await wallet.estimateImport({ secret: SECOND_SECRET });
      assert.equal(estimation.address, SECOND_ADDRESS);
      assert.equal(estimation.amount.value, 100489999988n);
    });

    it('throw error on invalid private key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      await assert.rejects(async () => {
        await wallet.estimateImport({ secret: '123' });
      }, {
        name: 'InvalidSecretError',
        message: 'Invalid Secret',
      });
    });

    it('throw error on own private key', async () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      await assert.rejects(async () => {
        await wallet.estimateImport({ secret: RANDOM_SECRET });
      },
      {
        name: 'InvalidSecretError',
        message: 'Private key equal wallet private key',
      });
    });
  });

  describe('estimateMaxAmount', () => {
    it('should correct estimate max amount', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${RANDOM_ADDRESS}`,
          baseURL: 'node',
        }).resolves({
          balance: 12.345,
          sequence: 1,
          isActive: true,
        }).withArgs({
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
      const maxAmount = await wallet.estimateMaxAmount({ address: SECOND_ADDRESS });
      // 2345000n - 12n
      assert.equal(maxAmount.value, 2344988n);
    });

    it('should estimate max amount to be 0', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${RANDOM_ADDRESS}`,
          baseURL: 'node',
        }).resolves({
          balance: 10,
          sequence: 1,
          isActive: true,
        }).withArgs({
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
      const maxAmount = await wallet.estimateMaxAmount({ address: SECOND_ADDRESS });
      assert.equal(maxAmount.value, 0n);
    });
  });

  describe('estimateTransactionFee', () => {
    it('should estimate transaction fee', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${RANDOM_ADDRESS}`,
          baseURL: 'node',
        }).resolves({
          balance: 10,
          sequence: 1,
          isActive: true,
        }).withArgs({
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
      const fee = await wallet.estimateTransactionFee({
        address: SECOND_ADDRESS,
        amount: new Amount(1n, wallet.crypto.decimals),
      });
      assert.equal(fee.value, 12n);
    });
  });

  describe('validators', () => {
    describe('validateAddress', () => {
      let wallet;
      beforeEach(async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${RANDOM_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            sequence: 1,
            isActive: true,
          });
        wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: RANDOM_SEED_PUB_KEY });
        await wallet.load();
      });

      it('valid address', async () => {
        assert.ok(await wallet.validateAddress({ address: SECOND_ADDRESS }));
      });

      it('invalid address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: '123' });
        }, {
          name: 'InvalidAddressError',
          message: 'Invalid address "123"',
        });
      });

      it('own address', async () => {
        await assert.rejects(async () => {
          await wallet.validateAddress({ address: RANDOM_ADDRESS });
        }, {
          name: 'DestinationEqualsSourceError',
          message: 'Destination address equals source address',
        });
      });
    });

    describe('validateAmount', () => {
      it('should be valid amount', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${RANDOM_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 20,
            sequence: 1,
            isActive: true,
          }).withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${SECOND_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 10,
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

        const valid = await wallet.validateAmount({
          address: SECOND_ADDRESS,
          amount: new Amount(5_000000n, wallet.crypto.decimals),
        });
        assert.ok(valid);
      });

      it('throw on inactive account', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${RANDOM_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 0,
            sequence: 1,
            isActive: false,
          });
        const wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: RANDOM_SEED_PUB_KEY });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(123n, wallet.crypto.decimals),
          });
        }, {
          name: 'InactiveAccountError',
          message: 'Inactive Account',
        });
      });

      it('throw on small amount', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${RANDOM_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            sequence: 1,
            isActive: true,
          });
        const wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: RANDOM_SEED_PUB_KEY });
        await wallet.load();

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(0n, wallet.crypto.decimals),
          });
        }, {
          name: 'SmallAmountError',
          message: 'Small amount',
          amount: new Amount(1n, wallet.crypto.decimals),
        });
      });

      it('throw on big amount', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${RANDOM_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            sequence: 1,
            isActive: true,
          }).withArgs({
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

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(200_000000n, wallet.crypto.decimals),
          });
        }, {
          name: 'BigAmountError',
          message: 'Big amount',
          amount: new Amount(2344988n, wallet.crypto.decimals),
        });
      });

      it('throw on amount less then min reserve', async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${RANDOM_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            sequence: 1,
            isActive: true,
          })
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${SECOND_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 0,
            sequence: 1,
            isActive: false,
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

        await assert.rejects(async () => {
          await wallet.validateAmount({
            address: SECOND_ADDRESS,
            amount: new Amount(2_000000n, wallet.crypto.decimals),
          });
        }, {
          name: 'MinimumReserveDestinationError',
          message: 'Less than minimum reserve on destination address',
          amount: new Amount(10000000n, wallet.crypto.decimals),
        });
      });
    });

    describe('validateMeta', () => {
      let wallet;
      beforeEach(async () => {
        sinon.stub(defaultOptions.account, 'request')
          .withArgs({
            seed: 'device',
            method: 'GET',
            url: `api/v1/account/${RANDOM_ADDRESS}`,
            baseURL: 'node',
          }).resolves({
            balance: 12.345,
            sequence: 1,
            isActive: true,
          });
        wallet = new Wallet({
          ...defaultOptions,
        });
        await wallet.open({ data: RANDOM_SEED_PUB_KEY });
        await wallet.load();
      });

      it('should support meta', () => {
        assert.ok(wallet.isMetaSupported);
      });

      it('empty meta is valid', async () => {
        assert.ok(await wallet.validateMeta({
          address: SECOND_ADDRESS,
        }));
      });

      it('valid tag', async () => {
        assert.ok(await wallet.validateMeta({
          address: SECOND_ADDRESS,
          meta: {
            destinationTag: 12345,
          },
        }));
      });

      it('valid invoiceId', async () => {
        assert.ok(await wallet.validateMeta({
          address: SECOND_ADDRESS,
          meta: {
            invoiceId: '42'.repeat(32),
          },
        }));
      });

      it('should throw invalid tag', async () => {
        await assert.rejects(async () => {
          await wallet.validateMeta({
            address: SECOND_ADDRESS,
            meta: {
              destinationTag: 4294967296,
            },
          });
        }, {
          name: 'InvalidDestinationTagError',
          message: 'Invalid Destination Tag: "4294967296"',
          meta: 'destinationTag',
        });
      });

      it('should throw invoiceId', async () => {
        await assert.rejects(async () => {
          await wallet.validateMeta({
            address: SECOND_ADDRESS,
            meta: {
              invoiceId: 'foo',
            },
          });
        }, {
          name: 'InvalidInvoiceIDError',
          message: 'Invalid invoiceId: "foo"',
          meta: 'invoiceId',
        });
      });
    });
  });

  describe('createTransaction', () => {
    it('should create valid transaction', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${RANDOM_ADDRESS}`,
          baseURL: 'node',
        }).resolves({
          balance: 20,
          sequence: 1,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${SECOND_ADDRESS}`,
          baseURL: 'node',
        }).resolves({
          balance: 10,
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
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/ledgerVersion',
          baseURL: 'node',
        }).resolves({
          maxLedgerVersion: 1,
        }).withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/tx/send',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({
          txId: '123456',
        });
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      await wallet.load();

      await wallet.createTransaction({
        address: SECOND_ADDRESS,
        amount: new Amount(5_000000, wallet.crypto.decimals),
      }, RANDOM_SEED);
      assert.equal(wallet.balance.value, 14_999988n);
    });
  });

  describe('createImport', () => {
    it('should support import', () => {
      const wallet = new Wallet({
        ...defaultOptions,
      });
      assert.ok(wallet.isImportSupported);
    });

    it('should create import transaction', async () => {
      sinon.stub(defaultOptions.account, 'request')
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${RANDOM_ADDRESS}`,
          baseURL: 'node',
        }).resolves({
          balance: 20,
          sequence: 1,
          isActive: true,
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: `api/v1/account/${SECOND_ADDRESS}`,
          baseURL: 'node',
        }).resolves({
          balance: 30,
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
        })
        .withArgs({
          seed: 'device',
          method: 'GET',
          url: 'api/v1/ledgerVersion',
          baseURL: 'node',
        }).resolves({
          maxLedgerVersion: 1,
        }).withArgs({
          seed: 'device',
          method: 'POST',
          url: 'api/v1/tx/send',
          data: sinon.match.any,
          baseURL: 'node',
        }).resolves({
          txId: '123456',
        });
      const wallet = new Wallet({
        ...defaultOptions,
      });
      await wallet.open({ data: RANDOM_SEED_PUB_KEY });
      await wallet.load();

      await wallet.createImport({
        secret: SECOND_SECRET,
      });
      assert.equal(wallet.balance.value, 39_999988n);
    });
  });
});