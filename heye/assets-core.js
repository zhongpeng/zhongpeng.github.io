/** Asset valuations are snapshots, separate from income/expense ledger transactions. */
const SCALE = 1_000_000n;
const MAX_DECIMAL = 999_999_999n * SCALE;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const ALLOWED_HOSTS = new Set(['fund.eastmoney.com', 'www.sge.com.cn']);
const TYPES = new Set(['fund', 'gold']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function requiredText(value, label, maximum = 80) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) throw new Error(`${label}格式不正确，最多 ${maximum} 个字符`);
  return value.trim();
}

function decimalParts(value, label) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,6})?$/.test(value.trim())) {
    throw new Error(`${label}请输入正数，最多 6 位小数，最大 999999999`);
  }
  const [integer, fraction = ''] = value.trim().split('.');
  const scaled = BigInt(integer) * SCALE + BigInt(fraction.padEnd(6, '0'));
  if (scaled <= 0n || scaled > MAX_DECIMAL) throw new Error(`${label}必须大于 0 且不超过 999999999`);
  const trimmed = fraction.replace(/0+$/, '');
  return { scaled, normalized: `${integer}${trimmed ? '.' + trimmed : ''}` };
}

/** Returns a canonical decimal string, never a binary floating-point quantity. */
export function parseQuantity(value) {
  return decimalParts(value, '持有数量').normalized;
}

function dateParts(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const maximum = [31, year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return month >= 1 && month <= 12 && day >= 1 && day <= maximum ? [year, month, day] : null;
}

function normalizeTimestamp(value) {
  if (typeof value !== 'string' || value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(value) ||
    !dateParts(value.slice(0, 10)) || !Number.isFinite(Date.parse(value))) throw new Error('报价获取时间格式不正确');
  return new Date(value).toISOString();
}

function assetCode(type, code) {
  if (!TYPES.has(type)) throw new Error('资产类型只能为基金或黄金');
  if (typeof code !== 'string' || (type === 'fund' ? !/^\d{6}$/.test(code) : code !== 'Au99.99')) {
    throw new Error(type === 'fund' ? '基金代码必须为 6 位数字' : '黄金品种仅支持 Au99.99');
  }
  return code;
}

function costValue(value) {
  if (value === undefined || value === null) return null;
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('剩余购入成本必须是非负整数分，未知时留空');
  return value;
}

function safeNumber(value, label) {
  if (value > MAX_SAFE || value < -MAX_SAFE) throw new Error(`${label}超出安全金额范围，请减少数量或拆分组合`);
  return Number(value);
}

function sourceURL(value, type) {
  if (typeof value !== 'string' || value.length > 500) throw new Error('报价来源网址格式不正确');
  let url;
  try { url = new URL(value); } catch { throw new Error('报价来源网址格式不正确'); }
  const expectedHost = type === 'fund' ? 'fund.eastmoney.com' : 'www.sge.com.cn';
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) || url.hostname !== expectedHost ||
    url.username || url.password || (url.port && url.port !== '443')) {
    throw new Error('报价来源仅允许对应资产的东方财富基金网或上海黄金交易所 HTTPS 页面');
  }
  return url.href;
}

function validateQuote(quote, key) {
  if (!isObject(quote)) throw new Error('报价记录格式不正确');
  const { type, code } = quote;
  assetCode(type, code);
  if (key !== `${type}:${code}`) throw new Error('报价索引与资产类型、代码不一致');
  if (quote.currency !== 'CNY') throw new Error('当前仅支持人民币报价');
  if (quote.unit !== (type === 'fund' ? 'share' : 'gram')) throw new Error('报价单位与资产类型不匹配');
  const quoteKind = quote.quoteKind ?? (type === 'fund' ? 'nav' : 'close');
  if (!['nav', 'delayed', 'close'].includes(quoteKind)) throw new Error('报价类型必须是净值、延时行情或收盘价');
  if (type === 'fund' ? quoteKind !== 'nav' : quoteKind === 'nav') throw new Error('报价类型与资产类型不匹配');
  if (!dateParts(quote.priceDate)) throw new Error('报价日期不是有效日期');
  return {
    type, code,
    name: requiredText(quote.name, '报价资产名称'),
    price: decimalParts(quote.price, '单位报价').normalized,
    currency: 'CNY', unit: quote.unit, quoteKind, priceDate: quote.priceDate,
    fetchedAt: normalizeTimestamp(quote.fetchedAt),
    sourceName: requiredText(quote.sourceName, '报价来源名称'),
    sourceUrl: sourceURL(quote.sourceUrl, type),
  };
}

export function validatePortfolio(input) {
  if (!isObject(input) || input.version !== 1) throw new Error('资产数据版本不受支持');
  if (!Array.isArray(input.holdings) || input.holdings.length > 1000) throw new Error('持仓数量不能超过 1000 条');
  if (input.quotes !== undefined && (!isObject(input.quotes) || Object.keys(input.quotes).length > 2000)) {
    throw new Error('报价数据格式不正确或数量超出限制');
  }
  const ids = new Set(), assets = new Set();
  const holdings = input.holdings.map(holding => {
    if (!isObject(holding)) throw new Error('持仓记录格式不正确');
    const id = requiredText(holding.id, '持仓 ID', 100);
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('持仓 ID 只能使用英文字母、数字、短横线和下划线');
    if (ids.has(id)) throw new Error('存在重复的持仓 ID');
    ids.add(id);
    const { type, code } = holding;
    assetCode(type, code);
    const key = `${type}:${code}`;
    if (assets.has(key)) throw new Error('同一资产请合并持有数量和剩余成本，不要重复建立持仓');
    assets.add(key);
    return {
      id, type, code, name: requiredText(holding.name, '资产名称'),
      quantity: parseQuantity(holding.quantity), costCents: costValue(holding.costCents),
    };
  });
  const quotes = {};
  for (const [key, quote] of Object.entries(input.quotes || {})) quotes[key] = validateQuote(quote, key);
  const portfolio = { version: 1, holdings, quotes };
  // Reject values whose individually rounded market value or aggregate cannot be represented in cents.
  portfolioTotals(portfolio);
  return portfolio;
}

/** Round half up once, after multiplication; a unit price can retain sub-cent precision. */
export function holdingValue(holding, quote) {
  assetCode(holding.type, holding.code);
  const costCents = costValue(holding.costCents);
  const quantity = decimalParts(holding.quantity, '持有数量').scaled;
  if (!quote || quote.type !== holding.type || quote.code !== holding.code) {
    return { valueCents: null, costCents, profitCents: null, returnPct: null };
  }
  if (quote.currency !== 'CNY' || quote.unit !== (holding.type === 'fund' ? 'share' : 'gram')) throw new Error('报价币种或单位与持仓不匹配');
  const price = decimalParts(quote.price, '单位报价').scaled;
  const divisor = SCALE * SCALE / 100n;
  const valueCents = safeNumber((quantity * price + divisor / 2n) / divisor, '持仓市值');
  const profitCents = costCents === null ? null : valueCents - costCents;
  return { valueCents, costCents, profitCents, returnPct: costCents ? profitCents / costCents * 100 : null };
}

export function portfolioTotals(portfolio) {
  let value = 0n, cost = 0n, matchedCost = 0n, matchedValue = 0n;
  let missingQuotes = 0, unknownCosts = 0, matchedHoldings = 0;
  for (const holding of portfolio.holdings) {
    const result = holdingValue(holding, portfolio.quotes?.[`${holding.type}:${holding.code}`]);
    if (result.valueCents === null) missingQuotes++; else value += BigInt(result.valueCents);
    if (result.costCents === null) unknownCosts++; else cost += BigInt(result.costCents);
    if (result.valueCents !== null && result.costCents !== null) {
      matchedValue += BigInt(result.valueCents);
      matchedCost += BigInt(result.costCents);
      matchedHoldings++;
    }
  }
  const knownValueCents = safeNumber(value, '组合市值');
  const knownCostCents = safeNumber(cost, '组合成本');
  const matchedCostCents = safeNumber(matchedCost, '已匹配成本');
  const costKnownValueCents = safeNumber(matchedValue, '已匹配市值');
  const knownProfitCents = safeNumber(matchedValue - matchedCost, '已知持仓盈亏');
  return {
    knownValueCents, knownCostCents, knownProfitCents, costKnownValueCents,
    matchedCostCents, missingQuotes, unknownCosts, matchedHoldings, totalHoldings: portfolio.holdings.length,
    partial: missingQuotes > 0 || unknownCosts > 0,
    returnPct: matchedCostCents ? knownProfitCents / matchedCostCents * 100 : null,
  };
}

export function quoteStatus(quote, today) {
  const now = dateParts(today);
  if (!now) throw new Error('当前日期格式不正确');
  if (!quote) return { label: '未更新', stale: true, ageDays: null };
  const date = dateParts(quote.priceDate);
  if (!date) return { label: '未更新', stale: true, ageDays: null };
  const ageDays = Math.max(0, Math.round((Date.UTC(now[0], now[1] - 1, now[2]) - Date.UTC(date[0], date[1] - 1, date[2])) / 86_400_000));
  return { label: ageDays > 5 ? '较旧' : '已获取', stale: ageDays > 5, ageDays };
}

/** Fixed fictional quotes for interaction previews; the UI must label the entire portfolio as example data. */
export function demoPortfolio(today) {
  if (!dateParts(today)) throw new Error('演示日期格式不正确');
  return {
    version: 1,
    holdings: [
      { id: 'demo-fund', type: 'fund', code: '005827', name: '示例基金持仓', quantity: '1500', costCents: 180000 },
      { id: 'demo-gold', type: 'gold', code: 'Au99.99', name: '示例黄金持仓', quantity: '100', costCents: 5500000 },
    ],
    quotes: {
      'fund:005827': { type: 'fund', code: '005827', name: '示例基金持仓', price: '1.2516', currency: 'CNY', unit: 'share', quoteKind: 'nav', priceDate: today, fetchedAt: `${today}T00:00:00.000Z`, sourceName: '虚构示例（非行情）', sourceUrl: 'https://fund.eastmoney.com/005827.html' },
      'gold:Au99.99': { type: 'gold', code: 'Au99.99', name: '示例黄金持仓', price: '600', currency: 'CNY', unit: 'gram', quoteKind: 'close', priceDate: today, fetchedAt: `${today}T00:00:00.000Z`, sourceName: '虚构示例（非行情）', sourceUrl: 'https://www.sge.com.cn/' },
    },
  };
}
