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
    return data?.hash;
  }
  async get(id) {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: `api/v1/tx/${id}`,
    });
    return data;
  }
}
