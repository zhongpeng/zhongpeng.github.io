import test from 'node:test';
import assert from 'node:assert/strict';
import { CATEGORIES, toCents, defaultData, validateData, filterTransactions, summarize, monthSeries, dailySeries, formatMoney, escapeHTML, demoData, categoriesFor } from '../public/core.js';

function example(overrides = {}) {
  return { id: 't1', type: 'expense', amountCents: 1234, date: '2026-11-02',
    category: CATEGORIES.expense[0].name, bookId: 'daily', note: '', createdAt: '2026-11-02T01:23:45.000Z', ...overrides };
}
function withTransaction(overrides = {}) {
  const data = defaultData();
  data.transactions.push(example(overrides));
  return data;
}

test('amounts are exact integer cents, including decimal precision and maximum', () => {
  assert.equal(toCents('0.01'), 1);
  assert.equal(toCents('0.29'), 29);
  assert.equal(toCents('12.3'), 1230);
  assert.equal(toCents(' 120 '), 12000);
  assert.equal(toCents('999999999.99'), 99_999_999_999);
  for (const value of ['', '0', '0.00', '-2', '+1', '1e3', 'Infinity', 'NaN', '1.001', '.5', '1.', '01', '1,000', '1000000000', '2 3', null, 12]) {
    assert.throws(() => toCents(value), undefined, `must reject ${value}`);
  }
});

test('a backup is cloned and unknown fields are removed', () => {
  const data = withTransaction();
  data.hidden = 'discard';
  data.books[0].extra = 'discard';
  data.transactions[0].note = '  买菜  ';
  const normalized = validateData(data);
  assert.equal(normalized.hidden, undefined);
  assert.equal(normalized.books[0].extra, undefined);
  assert.equal(normalized.transactions[0].note, '买菜');
  normalized.books[0].name = 'changed';
  assert.equal(data.books[0].name, '日常生活');
});

test('backup rejects invalid real dates, allows leap dates, and validates timestamps', () => {
  for (const date of ['2026-02-29', '2024-02-30', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-1-1', '0000-01-01']) {
    assert.throws(() => validateData(withTransaction({ date })), /日期/);
  }
  assert.equal(validateData(withTransaction({ date: '2024-02-29' })).transactions[0].date, '2024-02-29');
  for (const createdAt of ['2026-02-30T01:00:00Z', '2026-11-02', 'yesterday', '2026-11-02T25:00:00Z', '2026-11-02T24:00:00Z']) {
    assert.throws(() => validateData(withTransaction({ createdAt })), /创建时间/);
  }
});

test('backup rejects duplicates, orphan references, invalid amounts and category mismatch', () => {
  assert.throws(() => validateData(withTransaction({ category: '工资薪酬' })), /分类/);
  assert.throws(() => validateData(withTransaction({ bookId: 'absent' })), /不存在/);
  for (const amountCents of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => validateData(withTransaction({ amountCents })), /金额/);
  }
  const duplicateBook = defaultData(); duplicateBook.books.push({ ...duplicateBook.books[0] });
  assert.throws(() => validateData(duplicateBook), /重复的账本/);
  const duplicateTx = withTransaction(); duplicateTx.transactions.push({ ...duplicateTx.transactions[0] });
  assert.throws(() => validateData(duplicateTx), /重复的流水/);
  const unsafeColor = defaultData(); unsafeColor.books[0].color = 'red';
  assert.throws(() => validateData(unsafeColor), /颜色/);
  const tooLong = defaultData(); tooLong.books[0].name = '名'.repeat(31);
  assert.throws(() => validateData(tooLong), /账本名称/);
  assert.throws(() => validateData({ ...defaultData(), version: 2 }), /版本/);
  assert.throws(() => validateData({ ...defaultData(), books: [] }), /账本/);
});

test('month, year, book, type and query filters compose without mutating source', () => {
  const data = defaultData();
  data.books.push({ ...data.books[0], id: 'travel', name: '旅游' });
  data.transactions = [
    example({ id: 'a', amountCents: 100, date: '2026-11-01', note: 'coffee' }),
    example({ id: 'b', amountCents: 200, date: '2026-11-02', bookId: 'travel' }),
    example({ id: 'c', amountCents: 300, date: '2026-10-31' }),
    example({ id: 'd', amountCents: 400, date: '2025-11-01' }),
    example({ id: 'e', type: 'income', category: '工资薪酬', amountCents: 500, date: '2026-11-02' }),
  ];
  assert.deepEqual(filterTransactions(data, { month: '2026-11', bookId: 'daily', type: 'expense' }).map(t => t.id), ['a']);
  assert.equal(filterTransactions(data, { year: 2026 }).length, 4);
  assert.deepEqual(filterTransactions(data, { query: 'COFFEE' }).map(t => t.id), ['a']);
  assert.deepEqual(filterTransactions(data, { query: '旅游' }).map(t => t.id), ['b']);
  assert.deepEqual(data.transactions.map(t => t.id), ['a', 'b', 'c', 'd', 'e']);
});

test('summary correctly handles net loss, ranked expense categories, distinct days and top expense', () => {
  const summary = summarize([
    example({ id: 'a', amountCents: 100, date: '2026-11-01' }),
    example({ id: 'b', amountCents: 200, date: '2026-11-02' }),
    example({ id: 'c', amountCents: 400, category: '交通出行', date: '2026-11-02' }),
    example({ id: 'd', amountCents: 500, type: 'income', category: '工资薪酬', date: '2026-11-03' }),
  ]);
  assert.equal(summary.income, 500);
  assert.equal(summary.expense, 700);
  assert.equal(summary.balance, -200);
  assert.equal(summary.days, 3);
  assert.equal(summary.count, 4);
  assert.deepEqual(summary.topCategory, { name: '交通出行', amount: 400 });
  assert.deepEqual(summary.categories, [{ name: '交通出行', amount: 400, count: 1 }, { name: '餐饮美食', amount: 300, count: 2 }]);
  assert.equal(summary.topExpense.id, 'c');
  assert.equal(summary.firstDate, '2026-11-01');
  assert.equal(summary.lastDate, '2026-11-03');
});

test('empty and income-only summaries have no invented expense insights', () => {
  const summary = summarize([]);
  assert.deepEqual(summary, { income: 0, expense: 0, balance: 0, count: 0, days: 0,
    topCategory: null, categories: [], topExpense: null, firstDate: null, lastDate: null });
  const incomeOnly = summarize([example({ type: 'income', category: '工资薪酬' })]);
  assert.equal(incomeOnly.topCategory, null);
  assert.equal(incomeOnly.expense, 0);
});

test('series include zero days/months, respect leap years and selected book/year', () => {
  const data = withTransaction({ date: '2024-02-29', amountCents: 2900 });
  data.books.push({ ...data.books[0], id: 'travel', name: '旅行' });
  data.transactions.push(example({ id: 'other', bookId: 'travel', date: '2024-02-29', amountCents: 8000 }));
  data.transactions.push(example({ id: 'old', date: '2023-02-28', amountCents: 7777 }));
  const months = monthSeries(data, { year: 2024, bookId: 'daily' });
  assert.equal(months.length, 12);
  assert.deepEqual(months[1], { month: '02', income: 0, expense: 2900 });
  assert.deepEqual(months[0], { month: '01', income: 0, expense: 0 });
  const days = dailySeries(data.transactions, '2024-02');
  assert.equal(days.length, 29);
  assert.deepEqual(days[28], { day: 29, income: 0, expense: 10900 });
  assert.equal(dailySeries(data.transactions, '2023-02').length, 28);
  assert.throws(() => dailySeries([], '2026-13'), /月份/);
});

test('demo data is deterministic, valid and never future-dated', () => {
  for (const today of ['2026-01-01', '2026-11-02', '2024-02-29', '2026-12-31']) {
    const data = demoData(today);
    assert.deepEqual(data, demoData(today));
    assert.deepEqual(validateData(data), data);
    assert.ok(data.transactions.every(t => t.date <= today && t.date.startsWith(today.slice(0, 4))));
    assert.equal(data.books.length, 3);
  }
  assert.equal(defaultData().transactions.length, 0);
  const first = defaultData(); first.books[0].name = 'changed';
  assert.equal(defaultData().books[0].name, '日常生活');
});

test('display formatting escapes untrusted labels and preserves negative currency', () => {
  assert.equal(formatMoney(123456), '1,234.56');
  assert.equal(formatMoney(-123456), '-1,234.56');
  assert.equal(formatMoney(1), '0.01');
  assert.equal(escapeHTML('<img src="x" onerror=\'bad\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;bad&#39;&gt;&amp;');
  assert.equal(escapeHTML(null), '');
});

test('custom categories extend builtins and survive backup with their transactions', () => {
  const data = withTransaction({ category: '宠物用品' });
  data.customCategories.expense.push({ name: '宠物用品', icon: '🐱', color: '#739978' });
  assert.equal(categoriesFor(data, 'expense').length, CATEGORIES.expense.length + 1);
  assert.equal(categoriesFor(data, 'income').length, CATEGORIES.income.length);
  assert.deepEqual(validateData(data), data);
  data.customCategories.expense.push({ name: '宠物用品', icon: '🐱', color: '#739978' });
  assert.throws(() => validateData(data), /重名分类/);
  data.customCategories.expense = [{ ...CATEGORIES.expense[0] }];
  assert.throws(() => validateData(data), /重名分类/);
  data.customCategories.expense = [];
  data.customCategories.income.push({ name: '宠物用品', icon: '🐱', color: '#739978' });
  assert.throws(() => validateData(data), /分类.*不匹配/);
});

test('monthly and annual budgets preserve exact values and reject invalid periods and amounts', () => {
  const data = defaultData();
  data.budgets = { monthly: { '2026-11': 1800000, '2026-12': 0 }, yearly: { '2026': 18000000 } };
  assert.deepEqual(validateData(data).budgets, data.budgets);
  data.budgets.monthly['2026-13'] = 20000;
  assert.throws(() => validateData(data), /周期/);
  delete data.budgets.monthly['2026-13'];
  data.budgets.yearly['26'] = 20000;
  assert.throws(() => validateData(data), /周期/);
  delete data.budgets.yearly['26'];
  data.budgets.monthly['2026-11'] = -1;
  assert.throws(() => validateData(data), /预算/);
});

test('earlier version 1 backups without optional category and budget fields remain importable', () => {
  const data = withTransaction();
  delete data.customCategories;
  delete data.budgets;
  const normalized = validateData(data);
  assert.deepEqual(normalized.customCategories, { expense: [], income: [] });
  assert.deepEqual(normalized.budgets, { monthly: {}, yearly: {} });
});
