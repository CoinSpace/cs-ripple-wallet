export default class Transactions {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }
  async propagate(rawtx) {
    const data = await this.#wallet.requestNode({
      method: 'POST',
      url: 'api/v1/tx/send',
      data: {
        rawtx,
      },
    });
    return data.txId;
  }
}
