export default class Common {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }
  async fee() {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: 'api/v1/fee',
    });
    return data.fee;
  }
  async maxLedgerVersion() {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: 'api/v1/ledgerVersion',
    });
    return data.maxLedgerVersion;
  }
}
