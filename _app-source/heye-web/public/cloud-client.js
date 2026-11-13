export class CloudClient {
  constructor({ endpoint, fetcher = fetch, storage = sessionStorage }) {
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('云接口必须是已配置的 HTTPS 地址。');
    this.endpoint = url.href; this.fetcher = fetcher; this.storage = storage; this.token = ''; this.snapshot = null;
  }
  async request(action, input = {}, token = this.token) {
    if (!/^hw_[a-f0-9]{64}_[a-f0-9]{64}$/.test(token)) throw new Error('请粘贴小程序生成的完整连接码。');
    const response = await this.fetcher(this.endpoint, { method: 'POST', credentials: 'omit', cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ ...input, action }), signal: AbortSignal.timeout(30000) });
    let body; try { body = await response.json(); } catch { throw new Error('云接口没有返回有效 JSON，请稍后重试。'); }
    if (!response.ok || body.error) { const e = new Error(body.error || '云服务暂不可用，本次没有确认保存成功。'); e.code = body.code; throw e; }
    return body;
  }
  async connect(token) {
    const body = await this.request('getState', {}, token);
    if (!body.ledger || body.ledger.version !== 1 || !Array.isArray(body.ledger.transactions) || !Number.isSafeInteger(body.ledgerRevision)) throw new Error('云端数据格式不正确，未修改本机账本。');
    this.token = token; this.snapshot = body;
    try { this.storage.setItem('heye-cloud-session', JSON.stringify({ endpoint: this.endpoint, token })); } catch { /* In-memory connection still works without browser session persistence. */ }
    return body;
  }
  async restore() {
    let saved; try { saved = JSON.parse(this.storage.getItem('heye-cloud-session') || 'null'); } catch { return null; }
    if (!saved || saved.endpoint !== this.endpoint) return null;
    return this.connect(saved.token);
  }
  async refresh() { return this.connect(this.token); }
  async save({ ledger, portfolio, mutationId }) {
    if (!this.snapshot) throw new Error('请先连接云端账本。');
    const result = await this.request('saveState', { ...(ledger ? { ledger } : {}), ...(portfolio ? { portfolio } : {}), ledgerRevision: this.snapshot.ledgerRevision, portfolioETag: this.snapshot.portfolioETag, mutationId });
    return result;
  }
  forget() { this.token = ''; this.snapshot = null; try { this.storage.removeItem('heye-cloud-session'); } catch {} }
  async disconnect() { await this.request('disconnect'); this.forget(); }
}
