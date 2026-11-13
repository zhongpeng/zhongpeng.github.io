import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as assets from '../public/assets-core.js';
import * as ledger from '../public/core.js';

const source = (await readFile(new URL('../public/assets-ui.js', import.meta.url), 'utf8'))
  .replace(/^import[^\n]+\n/gm, '').replace('export function createAssetUI', 'function createAssetUI');
const KEY = 'shiguang-portfolio-v1';
const TODAY = '2026-11-02';
const tick = () => new Promise(resolve => setImmediate(resolve));
function setup(startMode = 'real', initial = { version: 1, holdings: [], quotes: {} }, staticHosting = false) {
  let mode = startMode, failWrites = false, sequence = 0, ui;
  const storage = new Map([[KEY, JSON.stringify(initial)]]), elements = new Map(), events = new Map(), requests = [], writes = [], messages = [];
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, { value: '', innerHTML: '', textContent: '', hidden: true, isConnected: true, disabled: false, click() {} });
    return elements.get(selector);
  };
  function showModal(title, body) {
    if (elements.has('#asset-form')) element('#asset-form').isConnected = false;
    if (body.includes('id="asset-form"')) {
      const form = { elements: {}, isConnected: true };
      for (const input of body.matchAll(/<input\b[^>]*>/g)) {
        const name = input[0].match(/name="([^"]+)"/), id = input[0].match(/id="([^"]+)"/), value = input[0].match(/value="([^"]*)"/)?.[1] || '';
        if (name) form.elements[name[1]] = { value };
        if (id) element('#' + id[1]).value = value;
      }
      const types = ['fund', 'gold'].map(type => ({ dataset: { assetType: type } }));
      form.querySelectorAll = selector => selector === '[data-asset-type]' ? types : [];
      form.querySelector = () => body.includes('data-asset="search"') ? element('#search-button') : null;
      elements.set('#asset-form', form);
    }
    element('#modal-title').textContent = title;
  }
  const context = vm.createContext({
    ...assets, esc: ledger.escapeHTML, formatMoney: ledger.formatMoney, toCents: ledger.toCents,
    structuredClone, Blob, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    Date, Response, AbortSignal, location: { protocol: 'https:' }, crypto: { randomUUID: () => `new-${++sequence}` },
    document: { documentElement: {dataset: {hosting: staticHosting ? 'static' : 'worker'}}, querySelector: element, createElement: element, addEventListener: (name, fn) => events.set(name, fn), hidden: false },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) { if (failWrites) throw Error('quota exceeded'); writes.push({ key, value }); storage.set(key, value); },
    },
    fetch: url => new Promise(resolve => requests.push({ url, resolve })),
    queueMicrotask, setInterval() {}, setTimeout() {},
  });
  vm.runInContext(source, context);
  context.options = { getMode: () => mode, isActive: () => false, rerender: () => ui.render(), showModal,
    closeModal: () => { if (elements.has('#asset-form')) element('#asset-form').isConnected = false; }, toast: value => messages.push(value), today: TODAY };
  ui = vm.runInContext('createAssetUI(options)', context);
  ui.render();
  const click = dataset => events.get('click')({ target: { closest: () => ({ dataset }) } });
  return {
    ui, requests, writes, messages, element, click,
    portfolio: () => JSON.parse(storage.get(KEY)),
    switchMode(value) { mode = value; ui.onRender(); },
    failWrites() { failWrites = true; },
    respond(index, quote) { requests[index].resolve(new Response(JSON.stringify({ quote }), { headers: { 'content-type': 'application/json' } })); },
  };
}

test('a holding added during refresh is queued for its own quote without losing existing updates', async () => {
  const initial = assets.demoPortfolio(TODAY); initial.holdings = initial.holdings.slice(0, 1); initial.quotes = {};
  const app = setup('real', initial);
  app.click({ asset: 'refresh' });
  assert.equal(app.requests.length, 1);
  app.click({ asset: 'add' });
  app.element('#asset-form').querySelectorAll('[data-asset-type]')[1].onclick();
  let form = app.element('#asset-form'); form.elements.quantity.value = '20'; form.elements.cost.value = '12000';
  await form.onsubmit({ preventDefault() {} });
  assert.equal(app.portfolio().holdings.length, 2);
  const quotes = assets.demoPortfolio(TODAY).quotes;
  app.respond(0, quotes['fund:005827']); await tick();
  assert.equal(app.requests.length, 2, 'a follow-up refresh starts after the busy request finishes');
  app.respond(1, quotes['fund:005827']); await tick();
  assert.match(app.requests[2].url, /type=gold/);
  app.respond(2, quotes['gold:Au99.99']); await tick();
  assert.equal(app.portfolio().quotes['gold:Au99.99'].price, '600');
  assert.equal(app.portfolio().holdings.find(h => h.type === 'gold').quantity, '20');
  assert.equal(app.portfolio().holdings.find(h => h.type === 'gold').costCents, 1200000);
});

test('a late demo quote and a stale demo form cannot mutate a real portfolio after switching mode', async () => {
  const initial = assets.demoPortfolio(TODAY); initial.holdings[0].quantity = '777';
  const app = setup('demo', initial);
  app.click({ asset: 'refresh' });
  app.click({ asset: 'add' });
  const oldForm = app.element('#asset-form'); oldForm.elements.code.value = '000001'; oldForm.elements.quantity.value = '10';
  app.switchMode('real');
  app.respond(0, assets.demoPortfolio(TODAY).quotes['fund:005827']); await tick();
  await oldForm.onsubmit({ preventDefault() {} });
  assert.equal(app.portfolio().holdings[0].quantity, '777');
  assert.equal(app.writes.length, 0);
  assert.match(app.element('#asset-form-error').textContent, /模式已切换/);
});

test('cost input remains strict when changing asset type and decimal cents are preserved', async () => {
  const app = setup(); app.click({ asset: 'add' });
  let form = app.element('#asset-form');
  form.elements.cost.value = '1e3'; form.elements.quantity.value = '20';
  form.querySelectorAll('[data-asset-type]')[1].onclick();
  assert.equal(app.element('#asset-form'), form, 'invalid input stays in the original form');
  assert.match(app.element('#asset-form-error').textContent, /金额/);
  form.elements.cost.value = '0.29';
  form.querySelectorAll('[data-asset-type]')[1].onclick();
  form = app.element('#asset-form');
  assert.equal(form.elements.cost.value, '0.29');
  const submitted = form.onsubmit({ preventDefault() {} });
  assert.equal(app.portfolio().holdings[0].costCents, 29);
  app.respond(0, assets.demoPortfolio(TODAY).quotes['gold:Au99.99']);
  await submitted;
});

test('demo quotes are labelled, and zero-cost or missing-quote return rates are explained accurately', () => {
  const demo = setup('demo');
  assert.equal((demo.ui.render().match(/演示价格/g) || []).length, 2);
  const initial = assets.demoPortfolio(TODAY); initial.holdings[0].costCents = 0; delete initial.quotes['gold:Au99.99'];
  const real = setup('real', initial);
  assert.match(real.ui.render(), /成本为 0，不计算收益率/);
  assert.match(real.ui.render(), /取得报价后计算收益率/);
});

test('failed storage writes leave both persisted and displayed holdings unchanged', async () => {
  const app = setup(); app.click({ asset: 'add' });
  const form = app.element('#asset-form'); form.elements.code.value = '005827'; form.elements.quantity.value = '100';
  app.failWrites();
  await form.onsubmit({ preventDefault() {} });
  assert.equal(app.portfolio().holdings.length, 0);
  assert.match(app.ui.render(), /0 项持仓/);
  assert.match(app.element('#asset-form-error').textContent, /quota/);
  assert.equal(app.requests.length, 0);
});


test('static web preview explains unavailable quotes without issuing API requests or changing saved data', async () => {
  const initial = assets.demoPortfolio(TODAY); initial.quotes = {};
  const app = setup('real', initial, true);
  app.click({asset: 'refresh'});
  await tick();
  assert.equal(app.requests.length, 0);
  assert.equal(app.writes.length, 0);
  assert.match(app.ui.render(), /网页体验版未连接行情服务/);
});
