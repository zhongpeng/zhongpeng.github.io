import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as core from '../public/core.js';

// This is a state/storage test, not a substitute for a browser layout test.
const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/gm, '');
const KEY = 'shiguang-ledger-v1', MODE = 'shiguang-mode-v1';

function application(initial = {}) {
  const storage = new Map(Object.entries(initial)), elements = new Map(), callbacks = new Map(), downloads = [];
  let rejectWrite = false;
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      innerHTML: '', textContent: '', hidden: false, open: false, value: '', removed: false,
      setAttribute() {}, addEventListener() {}, remove() { this.removed = true; },
      showModal() { this.open = true; }, close() { this.open = false; }, click() {}, append() {},
    });
    return elements.get(selector);
  };
  const context = vm.createContext({
    ...core, createAssetUI: () => ({render:()=>'',onRender:()=>{}}), createAccountUI: () => ({open:()=>{}}), esc: core.escapeHTML, structuredClone, Blob, Date, console,
    crypto: { randomUUID: () => 'new-id' },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) { if (rejectWrite) throw new Error('Storage quota exceeded'); storage.set(key, value); },
    },
    document: { querySelector: element, createElement: element, addEventListener: (name, fn) => callbacks.set(name, fn), body: { append() {} } },
    window: { addEventListener() {}, scrollTo() {} },
    URL: { createObjectURL: blob => { downloads.push(blob); return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout: () => 1, clearTimeout() {},
  });
  vm.runInContext(source, context);
  return {
    run: expression => vm.runInContext(expression, context),
    state: () => JSON.parse(vm.runInContext('JSON.stringify({mode,data,damaged,stored,month,reviewYear,lastDeleted,query,txType,bookId})', context)),
    element, storage, callbacks, downloads,
    failWrites: () => { rejectWrite = true; },
    async restore(data) {
      context.file = { size: 100, text: async () => JSON.stringify(data) };
      await vm.runInContext('restore(file)', context);
    },
  };
}

test('unknown saved mode safely falls back to labelled demonstration mode', () => {
  const app = application({ [MODE]: 'invalid-mode' });
  assert.equal(app.state().mode, 'demo');
  assert.match(app.element('#main').innerHTML, /虚构账目/);
});

test('stale-window and quota errors never update the in-memory account or overwrite storage', () => {
  const original = JSON.stringify(core.defaultData());
  const stale = application({ [MODE]: 'real', [KEY]: original });
  stale.storage.set(KEY, 'another-window-wrote-this');
  assert.equal(stale.run("update(data=>data.books[0].name='changed')"), false);
  assert.equal(stale.state().data.books[0].name, '日常生活');
  assert.equal(stale.storage.get(KEY), 'another-window-wrote-this');
  assert.match(stale.element('#toast').textContent, /其他窗口/);
  const quota = application({ [MODE]: 'real', [KEY]: original });
  quota.failWrites();
  assert.equal(quota.run("update(data=>data.books[0].name='changed')"), false);
  assert.equal(quota.state().data.books[0].name, '日常生活');
  assert.equal(quota.storage.get(KEY), original);
});

test('switching into corrupt saved data does not change the saved mode preference', () => {
  const app = application({ [MODE]: 'demo', [KEY]: '{broken' });
  app.run('switchMode()');
  assert.equal(app.state().mode, 'demo');
  assert.equal(app.storage.get(MODE), 'demo');
  assert.equal(app.storage.get(KEY), '{broken');
  assert.match(app.element('#toast').textContent, /无法切换/);
});

test('corrupt local data is protected until confirmation, then backed up and recoverable', async () => {
  const app = application({ [MODE]: 'real', [KEY]: '{broken original' });
  assert.equal(app.state().damaged, true);
  const recovery = core.defaultData(); recovery.books[0].name = '已恢复账本';
  await app.restore(recovery);
  assert.equal(app.storage.get(KEY), '{broken original');
  assert.equal(app.state().damaged, true);
  app.element('#confirm-action').onclick();
  assert.equal(await app.downloads[0].text(), '{broken original');
  assert.deepEqual(JSON.parse(app.storage.get(KEY)), recovery);
  assert.equal(app.state().damaged, false);
  assert.equal(app.state().mode, 'real');
  assert.equal(app.state().data.books[0].name, '已恢复账本');
});

test('recovery rejects a concurrent write, and importing clears the old undo and filters', async () => {
  const corrupt = application({ [MODE]: 'real', [KEY]: '{broken' });
  await corrupt.restore(core.defaultData());
  corrupt.storage.set(KEY, 'newer-data');
  corrupt.element('#confirm-action').onclick();
  assert.equal(corrupt.storage.get(KEY), 'newer-data');
  assert.equal(corrupt.state().damaged, true);
  const normal = application({ [MODE]: 'real', [KEY]: JSON.stringify(core.defaultData()) });
  normal.run("lastDeleted={id:'old'};query='old search';txType='expense';bookId='old-book'");
  await normal.restore(core.defaultData());
  normal.element('#confirm-action').onclick();
  assert.equal(normal.state().lastDeleted, null);
  assert.equal(normal.state().query, '');
  assert.equal(normal.state().txType, 'all');
  assert.equal(normal.state().bookId, 'all');
  assert.equal(normal.element('.undo-button').removed, true);
});

test('invalid period entry cannot corrupt the chart or story state', () => {
  const app = application();
  const before = app.state();
  for (const value of ['0000-01', '2026-13', '2026-2']) app.callbacks.get('change')({ target: { id: 'month', value } });
  for (const value of ['2026.5', '2e3', '1800', '10000']) app.callbacks.get('change')({ target: { id: 'review-year', value } });
  assert.equal(app.state().month, before.month);
  assert.equal(app.state().reviewYear, before.reviewYear);
  app.callbacks.get('change')({ target: { id: 'review-year', value: '2024' } });
  assert.equal(app.state().reviewYear, '2024');
});

test('CSV prevents formula execution even with leading whitespace and control characters', async () => {
  const app = application();
  app.run("data.transactions=[{id:'t',date:month+'-01',type:'expense',bookId:'daily',category:'餐饮美食',amountCents:1234,note:'\\t=HYPERLINK(\"bad\")',createdAt:month+'-01T00:00:00Z'}];csv()");
  const csv = await app.downloads[0].text();
  assert.ok(csv.includes("\"'\t=HYPERLINK(\"\"bad\"\")\""));
  assert.ok(csv.includes('"12.34"'));
});
