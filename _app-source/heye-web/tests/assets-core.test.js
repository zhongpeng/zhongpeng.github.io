import test from 'node:test';
import assert from 'node:assert/strict';
import { parseQuantity, holdingValue, validatePortfolio, portfolioTotals, quoteStatus, demoPortfolio } from '../public/assets-core.js';

const sample = () => demoPortfolio('2026-11-02');

test('quantities retain six decimal precision and reject invalid, negative, zero or oversized values', () => {
  assert.equal(parseQuantity(' 1.230000 '), '1.23');
  assert.equal(parseQuantity('0.000001'), '0.000001');
  assert.equal(parseQuantity('999999999.000000'), '999999999');
  for (const value of ['0', '-1', '01', '.5', '1.', '1e2', '1,000', '0.0000001', '999999999.000001', '1000000000', 1, '', null]) {
    assert.throws(() => parseQuantity(value), undefined, String(value));
  }
});

test('market value rounds half up after precise multiplication and avoids floating-point loss', () => {
  const portfolio = sample(), holding = portfolio.holdings[0], quote = portfolio.quotes['fund:005827'];
  assert.deepEqual(holdingValue(holding, quote), { valueCents: 187740, costCents: 180000, profitCents: 7740, returnPct: 4.3 });
  assert.equal(holdingValue({ ...holding, quantity: '1' }, { ...quote, price: '1.005' }).valueCents, 101);
  assert.equal(holdingValue({ ...holding, quantity: '1' }, { ...quote, price: '1.004999' }).valueCents, 100);
  assert.equal(holdingValue({ ...holding, quantity: '0.000001' }, { ...quote, price: '5000' }).valueCents, 1);
  assert.equal(holdingValue({ ...holding, quantity: '123.456789' }, { ...quote, price: '1.234567' }).valueCents, 15242);
});

test('unknown and zero costs do not manufacture a return percentage; missing or mismatched quote has no value', () => {
  const portfolio = sample(), holding = portfolio.holdings[0], quote = portfolio.quotes['fund:005827'];
  assert.deepEqual(holdingValue({ ...holding, costCents: null }, quote), { valueCents: 187740, costCents: null, profitCents: null, returnPct: null });
  assert.deepEqual(holdingValue({ ...holding, costCents: 0 }, quote), { valueCents: 187740, costCents: 0, profitCents: 187740, returnPct: null });
  assert.deepEqual(holdingValue(holding, null), { valueCents: null, costCents: 180000, profitCents: null, returnPct: null });
  assert.equal(holdingValue(holding, portfolio.quotes['gold:Au99.99']).valueCents, null);
});

test('partial portfolios only report profit/return for holdings with both prices and costs', () => {
  const portfolio = sample();
  portfolio.holdings.push({ id: 'noquote', type: 'fund', code: '000001', name: '没有报价', quantity: '10', costCents: 100000 });
  portfolio.holdings[1].costCents = null;
  assert.deepEqual(portfolioTotals(portfolio), {
    knownValueCents: 6187740, knownCostCents: 280000, knownProfitCents: 7740,
    costKnownValueCents: 187740, matchedCostCents: 180000, missingQuotes: 1, unknownCosts: 1,
    matchedHoldings: 1, totalHoldings: 3, partial: true, returnPct: 4.3,
  });
  const empty = portfolioTotals({ version: 1, holdings: [], quotes: {} });
  assert.equal(empty.knownValueCents, 0);
  assert.equal(empty.returnPct, null);
  assert.equal(empty.partial, false);
});

test('portfolio normalization removes unknown fields and accepts omitted cost or quote cache', () => {
  const data = sample();
  data.arbitrary = true;
  data.holdings[0].extra = 'discard';
  delete data.holdings[0].costCents;
  data.holdings[0].quantity = '1500.000';
  const clean = validatePortfolio(data);
  assert.equal(clean.arbitrary, undefined);
  assert.equal(clean.holdings[0].extra, undefined);
  assert.equal(clean.holdings[0].costCents, null);
  assert.equal(clean.holdings[0].quantity, '1500');
  clean.holdings[0].name = 'new name';
  assert.notEqual(data.holdings[0].name, 'new name');
  delete data.quotes;
  assert.deepEqual(validatePortfolio(data).quotes, {});
  assert.deepEqual(validatePortfolio(sample()), sample());
});

test('malformed dates, currency, units and indexes are rejected', () => {
  for (const [field, value] of [['priceDate', '2026-02-29'], ['priceDate', '2026-04-31'], ['fetchedAt', '2026-02-30T00:00:00Z'], ['fetchedAt', '2026-11-02T24:00:00Z'], ['currency', 'USD'], ['unit', 'gram'], ['price', '0'], ['code', '12345']]) {
    const data = sample(); data.quotes['fund:005827'][field] = value;
    assert.throws(() => validatePortfolio(data), undefined, `${field}=${value}`);
  }
  const wrongIndex = sample();
  wrongIndex.quotes['fund:000001'] = wrongIndex.quotes['fund:005827'];
  delete wrongIndex.quotes['fund:005827'];
  assert.throws(() => validatePortfolio(wrongIndex), /索引/);
  const leap = sample(); leap.quotes['fund:005827'].priceDate = '2024-02-29';
  assert.equal(validatePortfolio(leap).quotes['fund:005827'].priceDate, '2024-02-29');
});

test('only the approved asset-specific HTTPS source hosts can appear in a quote', () => {
  for (const url of ['http://fund.eastmoney.com/005827.html', 'https://fund.eastmoney.com.evil.test/', 'https://evil.test/?fund.eastmoney.com', 'https://fund.eastmoney.com@evil.test/', 'https://user:pass@fund.eastmoney.com/', 'https://fund.eastmoney.com:8443/', 'javascript:alert(1)', 'https://www.sge.com.cn/']) {
    const data = sample(); data.quotes['fund:005827'].sourceUrl = url;
    assert.throws(() => validatePortfolio(data), /来源/, url);
  }
});

test('duplicate holdings and bad costs are rejected rather than double-counted', () => {
  const duplicateId = sample(); duplicateId.holdings[1].id = duplicateId.holdings[0].id;
  assert.throws(() => validatePortfolio(duplicateId), /重复/);
  const duplicateAsset = sample(); duplicateAsset.holdings.push({ ...duplicateAsset.holdings[0], id: 'another-id' });
  assert.throws(() => validatePortfolio(duplicateAsset), /同一资产/);
  for (const costCents of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1, '100']) {
    const data = sample(); data.holdings[0].costCents = costCents;
    assert.throws(() => validatePortfolio(data), /成本/);
  }
  const overflow = sample(); overflow.holdings[0].quantity = '999999999'; overflow.quotes['fund:005827'].price = '999999999';
  assert.throws(() => validatePortfolio(overflow), /安全金额/);
  const aggregate = sample(); aggregate.holdings.forEach(holding => { holding.costCents = Number.MAX_SAFE_INTEGER; });
  assert.throws(() => validatePortfolio(aggregate), /安全金额/);
});

test('quote freshness uses price date and calendar days, without assuming a trading calendar', () => {
  assert.deepEqual(quoteStatus(null, '2026-11-02'), { label: '未更新', stale: true, ageDays: null });
  assert.deepEqual(quoteStatus({ priceDate: '2026-11-02' }, '2026-11-02'), { label: '已获取', stale: false, ageDays: 0 });
  assert.deepEqual(quoteStatus({ priceDate: '2026-10-28' }, '2026-11-02'), { label: '已获取', stale: false, ageDays: 5 });
  assert.deepEqual(quoteStatus({ priceDate: '2026-10-27' }, '2026-11-02'), { label: '较旧', stale: true, ageDays: 6 });
  assert.deepEqual(quoteStatus({ priceDate: '2024-02-28' }, '2024-03-01'), { label: '已获取', stale: false, ageDays: 2 });
  assert.deepEqual(quoteStatus({ priceDate: '2026-02-29' }, '2026-11-02'), { label: '未更新', stale: true, ageDays: null });
});

test('quote kinds distinguish NAV, delayed gold and daily close; old cache defaults are compatible', () => {
  const data = sample();
  delete data.quotes['fund:005827'].quoteKind;
  delete data.quotes['gold:Au99.99'].quoteKind;
  let clean = validatePortfolio(data);
  assert.equal(clean.quotes['fund:005827'].quoteKind, 'nav');
  assert.equal(clean.quotes['gold:Au99.99'].quoteKind, 'close');
  data.quotes['gold:Au99.99'].quoteKind = 'delayed';
  data.quotes['gold:Au99.99'].sourceName = '上海黄金交易所（延时）';
  data.quotes['gold:Au99.99'].sourceUrl = 'https://www.sge.com.cn/h5_sjzx/yshq';
  clean = validatePortfolio(data);
  assert.equal(clean.quotes['gold:Au99.99'].quoteKind, 'delayed');
  assert.equal(clean.quotes['gold:Au99.99'].sourceName, '上海黄金交易所（延时）');
  data.quotes['fund:005827'].quoteKind = 'realtime';
  assert.throws(() => validatePortfolio(data), /报价类型/);
  data.quotes['fund:005827'].quoteKind = 'delayed';
  assert.throws(() => validatePortfolio(data), /报价类型与资产类型/);
});
