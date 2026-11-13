import { CloudClient } from './cloud-client.js';
import { toCents, formatMoney, escapeHTML as esc } from './core.js';
const $ = id => document.getElementById(id);
const today = new Date().toLocaleDateString('sv-SE');
const money = n => '¥' + formatMoney(n);
const clone = v => structuredClone(v);
let client, state, tab = 'ledger', page = 0, busy = false, needsRefresh = false;
$('month').value = today.slice(0, 7);
function notice(message, kind = 'warning') { $('notice').textContent = message; $('notice').hidden = !message; $('notice').dataset.kind = kind; }
function controls() {
  for (const id of ['refresh', 'disconnect', 'tab-ledger', 'tab-assets', 'month', 'close-editor']) $(id).disabled = busy;
  $('add').disabled = busy || needsRefresh;
  $('cloud-app').setAttribute('aria-busy', String(busy));
}
function showConnected() {
  $('connection').hidden = true; $('cloud-app').hidden = false; $('disconnect').hidden = false; $('backup').hidden = false;
}
function render() {
  if (!state) return;
  showConnected();
  $('device').textContent = `${state.grant.name} · 授权有效至 ${new Date(state.grant.expiresAt).toLocaleString('zh-CN')}`;
  $('add').textContent = tab === 'ledger' ? '记一笔' : '添加持仓';
  $('add').disabled = busy || needsRefresh;
  $('tab-ledger').setAttribute('aria-pressed', String(tab === 'ledger'));
  $('tab-assets').setAttribute('aria-pressed', String(tab === 'assets'));
  $('month').closest('label').hidden = tab !== 'ledger';
  if (tab === 'ledger') {
    const transactions = state.ledger.transactions.filter(t => t.date.slice(0, 7) === $('month').value);
    const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amountCents, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountCents, 0);
    $('metrics').innerHTML = [['本月收入', income], ['本月支出', expense], ['本月结余', income - expense]].map(([label, n]) => `<div class="metric"><small>${label}</small><strong>${money(n)}</strong></div>`).join('');
    const rows = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    const pages = Math.max(1, Math.ceil(rows.length / 50)); page = Math.min(page, pages - 1);
    $('list').innerHTML = rows.length ? rows.slice(page * 50, (page + 1) * 50).map(t => `<div class="row"><div class="info"><strong>${esc(t.note || t.category)}</strong><small>${esc(t.date)} · ${esc(state.ledger.books.find(b => b.id === t.bookId)?.name || '')} · ${esc(t.category)}</small></div><span class="amount ${t.type === 'income' ? 'income' : ''}">${t.type === 'income' ? '+' : '−'}${money(t.amountCents)}</span><button data-edit="${esc(t.id)}">编辑</button></div>`).join('') + (pages > 1 ? `<div class="pagination"><button id="prev-page" ${page === 0 ? 'disabled' : ''}>上一页</button><span>${page + 1} / ${pages}</span><button id="next-page" ${page + 1 === pages ? 'disabled' : ''}>下一页</button></div>` : '') : '<div class="empty">本月还没有云端记录，可以记下第一笔。</div>';
  } else {
    const holdings = state.portfolio.holdings;
    $('metrics').innerHTML = `<div class="metric"><small>云端投资持仓</small><strong>${holdings.length} 项</strong></div>`;
    $('list').innerHTML = holdings.length ? holdings.map(h => `<div class="row"><div class="info"><strong>${esc(h.name)}</strong><small>${esc(h.code)} · ${esc(h.quantity)} ${h.type === 'gold' ? '克' : '份'}</small></div><span class="amount">成本 ${h.costCents === null ? '未填写' : money(h.costCents)}</span><button data-holding="${esc(h.id)}">编辑</button></div>`).join('') : '<div class="empty">还没有基金或黄金持仓。</div>';
    $('list').innerHTML += '<p class="footnote">余额、负债、固定支出和其他财务计划继续保留在云端，本页不修改它们；本页暂不提供自动行情。</p>';
  }
}
async function load() {
  state = await client.refresh(); needsRefresh = false; notice(''); render();
  $('last-sync').textContent = '已读取最新云端记录 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
async function save(input, mutationId) {
  if (busy || needsRefresh) throw new Error('请先刷新云端状态。');
  busy = true; controls(); $('form-error').textContent = ''; $('edit-form').querySelectorAll('button').forEach(b => b.disabled = true);
  const saveButton = $('edit-form').querySelector('[type="submit"]'); saveButton.textContent = '正在保存…';
  try {
    await client.save({ ...input, mutationId });
    $('editor').close();
    try { await load(); notice('已保存到云账本。小程序刷新同步后可看到更新。', 'success'); } catch { needsRefresh = true; render(); notice('云端已确认保存，但暂时无法刷新。请先点「刷新云端」，不要重复录入。'); }
  } catch (e) {
    $('form-error').textContent = e.code === 'LEDGER_CONFLICT' ? e.message + '\n请先保存当前输入，再关闭窗口并刷新云端。' : e.message;
    throw e;
  } finally { busy = false; controls(); $('edit-form').querySelectorAll('button').forEach(b => b.disabled = false); saveButton.textContent = '保存到云端'; }
}
function editor(title, html, submit, remove) {
  if (needsRefresh || busy) return;
  $('editor-title').textContent = title; $('form-error').textContent = '';
  $('edit-form').innerHTML = html + `<div class="form-buttons">${remove ? '<button type="button" class="danger" id="remove">删除这条记录</button>' : '<span></span>'}<button class="primary" type="submit">保存到云端</button></div>`;
  const mutationId = crypto.randomUUID().replaceAll('-', '');
  $('edit-form').onsubmit = async event => { event.preventDefault(); try { await submit(new FormData(event.currentTarget), mutationId); } catch (e) { if (!$('form-error').textContent) $('form-error').textContent = e.message; } };
  if (remove) $('remove').onclick = async () => { if (!confirm('确定删除这条云端记录？小程序刷新后也会更新。')) return; try { await remove(crypto.randomUUID().replaceAll('-', '')); } catch (e) { $('form-error').textContent = e.message; } };
  $('editor').showModal();
}
function recordForm(id) {
  const old = state.ledger.transactions.find(t => t.id === id);
  const t = old || { type: 'expense', amountCents: 0, date: today, bookId: state.ledger.books[0].id, category: state.categories.expense[0].name, note: '' };
  const categories = type => [...state.categories[type], ...(state.ledger.customCategories?.[type] || [])].map(c => `<option ${c.name === t.category ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  editor(old ? '编辑云端账目' : '记下这一笔', `<label>收支类型<select name="type"><option value="expense" ${t.type === 'expense' ? 'selected' : ''}>支出</option><option value="income" ${t.type === 'income' ? 'selected' : ''}>收入</option></select></label><label>金额<input name="amount" inputmode="decimal" value="${old ? formatMoney(t.amountCents).replaceAll(',', '') : ''}" placeholder="0.00" required></label><label>日期<input name="date" type="date" max="${today}" value="${esc(t.date)}" required></label><label>账本<select name="bookId">${state.ledger.books.map(b => `<option value="${esc(b.id)}" ${b.id === t.bookId ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label><label>分类<select name="category">${categories(t.type)}</select></label><label>备注<input name="note" maxlength="200" value="${esc(t.note)}"></label>`, async (form, mutationId) => {
    const ledger = clone(state.ledger), row = { id: old ? old.id : 'web_' + mutationId, createdAt: old ? old.createdAt : new Date().toISOString(), type: form.get('type'), amountCents: toCents(form.get('amount')), date: form.get('date'), bookId: form.get('bookId'), category: form.get('category'), note: form.get('note').trim() };
    if (old) ledger.transactions[ledger.transactions.findIndex(x => x.id === id)] = row; else ledger.transactions.push(row);
    await save({ ledger }, mutationId);
  }, old ? async mutationId => { const ledger = clone(state.ledger); ledger.transactions = ledger.transactions.filter(t => t.id !== id); await save({ ledger }, mutationId); } : null);
  $('edit-form').elements.type.onchange = event => { $('edit-form').elements.category.innerHTML = categories(event.target.value); };
}
function holdingForm(id) {
  const old = state.portfolio.holdings.find(h => h.id === id);
  const h = old || { type: 'fund', code: '', name: '', quantity: '', costCents: null };
  editor(old ? '编辑云端持仓' : '添加云端持仓', `<label>类型<select name="type"><option value="fund" ${h.type === 'fund' ? 'selected' : ''}>基金</option><option value="gold" ${h.type === 'gold' ? 'selected' : ''}>黄金 Au99.99</option></select></label><label>代码<input name="code" maxlength="20" value="${esc(h.code)}" placeholder="基金六位代码，黄金填 Au99.99" required></label><label>名称<input name="name" maxlength="100" value="${esc(h.name)}" required></label><label>份额 / 克数<input name="quantity" inputmode="decimal" value="${esc(h.quantity)}" required></label><label>当前持仓总成本（选填）<input name="cost" inputmode="decimal" value="${h.costCents === null ? '' : formatMoney(h.costCents).replaceAll(',', '')}" placeholder="不知道可留空"></label>`, async (form, mutationId) => {
    const portfolio = clone(state.portfolio), cost = form.get('cost').trim();
    const holding = { id: old ? old.id : 'web_' + mutationId, type: form.get('type'), code: form.get('code').trim(), name: form.get('name').trim(), quantity: form.get('quantity').trim(), costCents: cost === '' ? null : /^0(?:\.0{1,2})?$/.test(cost) ? 0 : toCents(cost) };
    if (old) portfolio.holdings[portfolio.holdings.findIndex(x => x.id === id)] = { ...old, ...holding }; else portfolio.holdings.push(holding);
    await save({ portfolio }, mutationId);
  }, old ? async mutationId => { const portfolio = clone(state.portfolio); portfolio.holdings = portfolio.holdings.filter(h => h.id !== id); await save({ portfolio }, mutationId); } : null);
}
$('connect-form').onsubmit = async event => {
  event.preventDefault(); if (!client || busy) return;
  busy = true; $('connect').disabled = true; $('connect').textContent = '正在连接…';
  try { state = await client.connect($('token').value.trim()); $('token').value = ''; notice(''); render(); }
  catch (e) { notice(e.message); } finally { busy = false; $('connect').disabled = false; $('connect').textContent = '连接我的账本'; controls(); }
};
$('refresh').onclick = async () => {
  if (busy) return;
  if ($('editor').open) return notice('请先完成或关闭正在编辑的内容，再刷新。');
  busy = true; controls(); $('refresh').textContent = '正在刷新…';
  try { await load(); } catch (e) { notice(e.message); }
  finally { busy = false; controls(); $('refresh').textContent = '刷新云端'; }
};
$('disconnect').onclick = async () => {
  if (busy || !confirm('断开此网页连接？不会删除云端或本机账目。')) return;
  busy = true; controls();
  try { await client.disconnect(); location.reload(); } catch (e) { notice('未能在云端撤销：' + e.message + '。可在小程序的网页授权页撤销。'); }
  finally { busy = false; controls(); }
};
$('backup').onclick = () => { const blob = new Blob([JSON.stringify({ kind: 'heye-backup-v1', ledger: state.ledger, portfolio: state.portfolio }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `禾页云账本-${today}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
$('add').onclick = () => tab === 'ledger' ? recordForm() : holdingForm();
$('month').onchange = () => { page = 0; render(); };
$('tab-ledger').onclick = () => { tab = 'ledger'; page = 0; render(); };
$('tab-assets').onclick = () => { tab = 'assets'; page = 0; render(); };
$('close-editor').onclick = () => { if (!busy) $('editor').close(); };
$('editor').addEventListener('cancel', event => { if (busy) event.preventDefault(); });
$('list').onclick = event => { const b = event.target.closest('button'); if (!b) return; if (b.dataset.edit) recordForm(b.dataset.edit); else if (b.dataset.holding) holdingForm(b.dataset.holding); else { page += b.id === 'next-page' ? 1 : -1; render(); } };
try {
  const response = await fetch('./cloud-config.json', { cache: 'no-store' });
  const config = await response.json();
  if (!config.enabled || !config.endpoint) throw new Error('云同步接口尚未部署完成，目前不能连接。已保存的本机账目不受影响。');
  client = new CloudClient({ endpoint: config.endpoint }); $('setup-status').textContent = '连接码只保留在当前标签页会话，可在小程序随时撤销。'; $('connect').disabled = false;
  const restored = await client.restore(); if (restored) { state = restored; render(); }
} catch (e) { $('setup-status').textContent = e.message; }
