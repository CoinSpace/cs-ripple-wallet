export default class Accounts {
  #wallet;
  constructor(wallet) {
    this.#wallet = wallet;
  }
  async info(address) {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: `api/v1/account/${address}`,
    });
    return {
      sequence: data.sequence,
      balance: data.balance,
      isActive: data.isActive,
    };
  }
  async txs(address, start) {
    const data = await this.#wallet.requestNode({
      method: 'GET',
      url: `api/v1/account/${address}/txs`,
      params: {
        start,
      },
    });
    const transactions = data.txs.filter((tx) => {
      return tx.toCurrency === 'XRP';
    });
    const hasMore = data.txs.length === data.limit;
    return {
      transactions,
      hasMore,
      cursor: hasMore && data.txs[data.txs.length - 1].id,
    };
  }
}
