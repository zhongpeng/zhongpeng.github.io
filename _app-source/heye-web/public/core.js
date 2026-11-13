/** Money is stored as integer cents. This module has no browser dependencies. */
export const CATEGORIES = Object.freeze({
  expense: [
    { name: '餐饮美食', icon: '🍜', color: '#D79A57' },
    { name: '交通出行', icon: '🚇', color: '#7297B5' },
    { name: '购物消费', icon: '🛍️', color: '#739dc8' },
    { name: '生活日用', icon: '🧺', color: '#8BA98C' },
    { name: '居家住房', icon: '🏠', color: '#6C8C75' },
    { name: '休闲娱乐', icon: '🎬', color: '#D48C89' },
    { name: '旅行度假', icon: '🏖️', color: '#65A7A5' },
    { name: '医疗健康', icon: '💊', color: '#C3978A' },
    { name: '学习成长', icon: '📚', color: '#789dc7' },
    { name: '其他支出', icon: '🧾', color: '#A2A7A0' },
  ],
  income: [
    { name: '工资薪酬', icon: '💼', color: '#538A6F' },
    { name: '奖金红包', icon: '🧧', color: '#D39A64' },
    { name: '兼职副业', icon: '💡', color: '#7895B6' },
    { name: '投资收益', icon: '🌱', color: '#8EAE82' },
    { name: '其他收入', icon: '💰', color: '#8da0b9' },
  ],
});

export const BOOK_ICONS = ['🏠', '🌿', '✈️', '🏖️', '🛠️', '🚗', '📚', '🐱', '🎁', '💼', '☕', '🎨'];
const MAX_CENTS = 99_999_999_999;
const MAX_TRANSACTIONS = 50_000;
const pad = n => String(n).padStart(2, '0');
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function daysInMonth(year, month) {
  return [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  return year >= 1000 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function validMonth(value) {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) && Number(value.slice(0, 4)) >= 1000;
}

function textField(value, name, max, allowEmpty = false) {
  if (typeof value !== 'string' || value.length > max || (!allowEmpty && !value.trim())) {
    throw new Error(`${name}格式不正确（最多 ${max} 个字符）`);
  }
  return value.trim();
}

function idField(value, name) {
  const id = textField(value, name, 100);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`${name}只能包含英文字母、数字、短横线和下划线`);
  return id;
}

function centsField(value, name, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > MAX_CENTS) {
    throw new Error(`${name}必须为${allowZero ? '非负' : '正'}整数分，且不超过 999,999,999.99 元`);
  }
  return value;
}

export function toCents(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,8})(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new Error('请输入有效金额，最多两位小数，不超过 999,999,999.99 元');
  }
  const [whole, fraction = ''] = value.trim().split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (cents === 0) throw new Error('金额必须大于 0');
  return cents;
}

export function defaultData() {
  return {
    version: 1,
    books: [{ id: 'daily', name: '日常生活', icon: '🏠', color: '#4F7D69', budgetCents: 600000 }],
    transactions: [],
    customCategories: { expense: [], income: [] },
    budgets: { monthly: {}, yearly: {} },
  };
}

export function categoriesFor(data, type) {
  if (type !== 'expense' && type !== 'income') throw new Error('分类类型必须为收入或支出');
  return [...CATEGORIES[type], ...(data.customCategories?.[type] || [])];
}

function validateCustomCategories(value) {
  if (value === undefined) return { expense: [], income: [] };
  if (!isObject(value)) throw new Error('自定义分类格式不正确');
  const result = { expense: [], income: [] };
  for (const type of ['expense', 'income']) {
    if (!Array.isArray(value[type]) || value[type].length > 100) throw new Error('每种收支类型最多支持 100 个自定义分类');
    const names = new Set(CATEGORIES[type].map(category => category.name));
    result[type] = value[type].map(category => {
      if (!isObject(category)) throw new Error('自定义分类格式不正确');
      const name = textField(category.name, '分类名称', 20);
      if (names.has(name)) throw new Error('同一收支类型下不能包含重名分类');
      names.add(name);
      const color = textField(category.color, '分类颜色', 7);
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('分类颜色格式不正确');
      return { name, icon: textField(category.icon, '分类图标', 16), color };
    });
  }
  return result;
}

function validateBudgets(value) {
  if (value === undefined) return { monthly: {}, yearly: {} };
  if (!isObject(value) || !isObject(value.monthly) || !isObject(value.yearly)) throw new Error('预算格式不正确');
  const result = { monthly: {}, yearly: {} };
  for (const period of ['monthly', 'yearly']) {
    if (Object.keys(value[period]).length > 1200) throw new Error('预算条数超出限制');
    for (const [key, amount] of Object.entries(value[period])) {
      if (period === 'monthly' ? !validMonth(key) : !/^\d{4}$/.test(key) || Number(key) < 1000) throw new Error('预算周期格式不正确');
      result[period][key] = centsField(amount, '支出预算', true);
    }
  }
  return result;
}

/** Reject corrupt backups rather than silently dropping transactions. Unknown keys are discarded. */
export function validateData(input) {
  if (!isObject(input) || input.version !== 1) throw new Error('备份版本不受支持，请选择禾页账本导出的 JSON 文件');
  const customCategories = validateCustomCategories(input.customCategories);
  const budgets = validateBudgets(input.budgets);
  if (!Array.isArray(input.books) || input.books.length === 0 || input.books.length > 200) {
    throw new Error('备份必须包含 1 至 200 个账本');
  }
  if (!Array.isArray(input.transactions) || input.transactions.length > MAX_TRANSACTIONS) {
    throw new Error(`备份流水数量不能超过 ${MAX_TRANSACTIONS.toLocaleString('zh-CN')} 条`);
  }
  const bookIds = new Set();
  const books = input.books.map(book => {
    if (!isObject(book)) throw new Error('账本记录格式不正确');
    const id = idField(book.id, '账本 ID');
    if (bookIds.has(id)) throw new Error('备份包含重复的账本 ID');
    bookIds.add(id);
    const color = textField(book.color, '账本颜色', 7);
    if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('账本颜色格式不正确');
    return {
      id,
      name: textField(book.name, '账本名称', 30),
      icon: textField(book.icon, '账本图标', 16),
      color,
      budgetCents: centsField(book.budgetCents, '月度预算', true),
    };
  });
  const transactionIds = new Set();
  const transactions = input.transactions.map(transaction => {
    if (!isObject(transaction)) throw new Error('流水记录格式不正确');
    const id = idField(transaction.id, '流水 ID');
    if (transactionIds.has(id)) throw new Error('备份包含重复的流水 ID');
    transactionIds.add(id);
    const { type, date, category, bookId, createdAt } = transaction;
    if (type !== 'income' && type !== 'expense') throw new Error('流水类型必须为收入或支出');
    if (!validDate(date)) throw new Error('流水日期不是有效的日期（YYYY-MM-DD）');
    if (!categoriesFor({ customCategories }, type).some(item => item.name === category)) throw new Error('流水分类与收入或支出类型不匹配');
    if (!bookIds.has(bookId)) throw new Error('流水引用了不存在的账本');
    if (typeof createdAt !== 'string' || createdAt.length > 40 ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt) ||
      !validDate(createdAt.slice(0, 10)) || Number(createdAt.slice(11, 13)) > 23 ||
      Number(createdAt.slice(14, 16)) > 59 || Number(createdAt.slice(17, 19)) > 59 ||
      !Number.isFinite(Date.parse(createdAt))) {
      throw new Error('流水创建时间格式不正确');
    }
    return {
      id, type, amountCents: centsField(transaction.amountCents, '流水金额'), date,
      category, bookId, note: textField(transaction.note, '备注', 200, true), createdAt,
    };
  });
  return { version: 1, books, transactions, customCategories, budgets };
}

export function filterTransactions(data, options = {}) {
  const { month, year, bookId = 'all', type = 'all', query = '' } = options;
  const term = String(query).trim().toLocaleLowerCase('zh-CN');
  const bookNames = new Map(data.books.map(book => [book.id, book.name]));
  return data.transactions.filter(transaction =>
    (!month || transaction.date.slice(0, 7) === String(month)) &&
    (!year || transaction.date.slice(0, 4) === String(year)) &&
    (bookId === 'all' || transaction.bookId === bookId) &&
    (type === 'all' || transaction.type === type) &&
    (!term || `${transaction.note} ${transaction.category} ${bookNames.get(transaction.bookId) || ''} ${formatMoney(transaction.amountCents)} ${transaction.date}`
      .toLocaleLowerCase('zh-CN').includes(term))
  ).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}

export function summarize(transactions) {
  let income = 0, expense = 0, topExpense = null;
  const categories = new Map();
  const days = new Set();
  let firstDate = null, lastDate = null;
  for (const transaction of transactions) {
    days.add(transaction.date);
    if (!firstDate || transaction.date < firstDate) firstDate = transaction.date;
    if (!lastDate || transaction.date > lastDate) lastDate = transaction.date;
    if (transaction.type === 'income') {
      income += transaction.amountCents;
    } else {
      expense += transaction.amountCents;
      if (!topExpense || transaction.amountCents > topExpense.amountCents) topExpense = transaction;
      const category = categories.get(transaction.category) || { name: transaction.category, amount: 0, count: 0 };
      category.amount += transaction.amountCents;
      category.count += 1;
      categories.set(category.name, category);
    }
  }
  const ranked = [...categories.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'zh-CN'));
  return {
    income, expense, balance: income - expense, count: transactions.length, days: days.size,
    topCategory: ranked.length ? { name: ranked[0].name, amount: ranked[0].amount } : null,
    categories: ranked, topExpense, firstDate, lastDate,
  };
}

export function monthSeries(data, { year = new Date().getFullYear(), bookId = 'all' } = {}) {
  const months = Array.from({ length: 12 }, (_, index) => ({ month: pad(index + 1), income: 0, expense: 0 }));
  for (const transaction of filterTransactions(data, { year, bookId })) {
    months[Number(transaction.date.slice(5, 7)) - 1][transaction.type] += transaction.amountCents;
  }
  return months;
}

export function dailySeries(transactions, month) {
  if (!validMonth(month)) throw new Error('请选择有效的月份（YYYY-MM）');
  const [year, monthNumber] = month.split('-').map(Number);
  const days = Array.from({ length: daysInMonth(year, monthNumber) }, (_, index) => ({ day: index + 1, income: 0, expense: 0 }));
  for (const transaction of transactions) {
    if (transaction.date.slice(0, 7) === month) days[Number(transaction.date.slice(8, 10)) - 1][transaction.type] += transaction.amountCents;
  }
  return days;
}

export function formatMoney(cents) {
  if (!Number.isSafeInteger(cents)) throw new Error('金额必须使用整数分');
  return (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

/** Separate, explicitly fictional data. Nothing is read from the user's accounts. */
export function demoData(today = localToday()) {
  if (!validDate(today)) throw new Error('演示日期格式不正确');
  const year = Number(today.slice(0, 4));
  const data = defaultData();
  data.budgets.monthly[today.slice(0, 7)] = 1800000;
  data.budgets.yearly[String(year)] = 18000000;
  data.books.push(
    { id: 'travel', name: '旅行计划', icon: '✈️', color: '#6B8EAD', budgetCents: 250000 },
    { id: 'home', name: '理想的家', icon: '🛠️', color: '#CB8961', budgetCents: 300000 },
  );
  let sequence = 0;
  const add = (month, day, type, amount, category, bookId, note) => {
    const date = `${year}-${pad(month)}-${pad(day)}`;
    if (date > today) return;
    data.transactions.push({
      id: `demo-${++sequence}`, type, amountCents: toCents(Number(amount).toFixed(2)), date, category, bookId, note,
      createdAt: `${date}T12:00:00.000Z`,
    });
  };
  for (let month = 1; month <= Number(today.slice(5, 7)); month++) {
    add(month, 1, 'income', 18500, '工资薪酬', 'daily', '这个月的努力，到账了');
    add(month, 1, 'expense', 3200, '居家住房', 'daily', '房租，安心生活的小窝');
    add(month, 1, 'expense', 28.5, '餐饮美食', 'daily', '一碗热腾腾的牛肉面');
    add(month, 1, 'expense', 25, '休闲娱乐', 'daily', '音乐会员');
    add(month, 1, 'expense', 36, '交通出行', 'daily', '周末出门打车');
    add(month, 2, 'expense', 168 + month * 2.5, '生活日用', 'daily', '超市补给，装满冰箱');
    add(month, 2, 'expense', 22, '餐饮美食', 'daily', '街角的拿铁');
    add(month, 2, 'expense', 6, '交通出行', 'daily', '地铁通勤');
    add(month, 2, 'expense', 399 + month * 10, '旅行度假', 'travel', '下一次出发的车票');
    add(month, 2, 'expense', 680 + (month % 3) * 200, '居家住房', 'home', '给家添一件喜欢的家具');
    if (month % 3 === 0) add(month, 5, 'income', 1800, '奖金红包', 'daily', '季度项目奖金');
    if (month % 2 === 0) add(month, 9, 'income', 650, '兼职副业', 'daily', '周末设计小项目');
    for (let day = 4; day <= daysInMonth(year, month); day += 3) {
      add(month, day, 'expense', 23 + ((day * month) % 68) + 0.5, '餐饮美食', 'daily', day % 2 ? '和朋友吃顿好饭' : '工作日午餐');
      if (day % 2 === 0) add(month, day, 'expense', 6, '交通出行', 'daily', '地铁通勤');
    }
    add(month, 8, 'expense', 239 + (month % 4) * 80, '购物消费', 'daily', '买一件会常用的好物');
    add(month, 12, 'expense', 69, '学习成长', 'daily', '一本一直想读的书');
    add(month, 16, 'expense', 98, '休闲娱乐', 'daily', '周末看场电影');
    add(month, 20, 'expense', 159 + month, '生活日用', 'daily', '新鲜水果和日常用品');
    add(month, 23, 'expense', 268, '医疗健康', 'daily', '认真照顾自己');
    if ([4, 7, 10].includes(month)) {
      add(month, 18, 'expense', 1580 + month * 50, '旅行度假', 'travel', '住进山海之间');
      add(month, 19, 'expense', 286, '餐饮美食', 'travel', '旅行中的当地味道');
    }
    add(month, 28, 'income', 58.26 + month, '投资收益', 'daily', '本月利息收入');
  }
  return data;
}
