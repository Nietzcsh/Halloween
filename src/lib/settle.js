// "Who owes who" logic. Pure functions, no Firebase — easy to test.
//
// Expense shape (amounts in centavos):
// {
//   id, title, amount, date,
//   paidBy: 'ana' | null,          // who fronted the money; null = collected into Rory's group fund
//   participants: ['ana','ben'],   // who is included in the hatian
//   shares: { ana: 50000, ben: 50000 },
//   paid:   { ben: true },         // who has already paid their share
// }

export const FUND = '__fund__';
export const FUND_LABEL = 'Group fund (Rory)';

/** A person's share is settled if they marked it paid, or they are the one who paid the expense. */
export function isSettled(expense, key) {
  return key === expense.paidBy || !!expense.paid?.[key];
}

/**
 * How many of the people who need to pay have paid.
 * An expense with no people yet, or no amount yet, is a draft: Rory is still filling it in.
 */
export function expenseStatus(expense) {
  const participants = expense.participants || [];
  const noPeople = participants.length === 0;
  const noAmount = !(expense.amount > 0);
  const owing = participants.filter((k) => k !== expense.paidBy);
  const paidCount = owing.filter((k) => expense.paid?.[k]).length;
  const draft = noPeople || noAmount;
  return { paidCount, total: owing.length, done: !draft && paidCount === owing.length, draft, noPeople, noAmount };
}

/**
 * Walk every expense and produce:
 *  - people[key] = { share, settled, unpaid, fronted, owedToMe }
 *  - debts = one line per unpaid share: { from, to, amount, expenseId, title }
 */
export function computeLedger(expenses) {
  const people = {};
  const person = (k) => (people[k] ??= { share: 0, settled: 0, unpaid: 0, fronted: 0, owedToMe: 0 });
  const debts = [];

  for (const e of expenses || []) {
    if (!(e.amount > 0)) continue; // draft with no amount yet: nobody owes anything for it
    const to = e.paidBy || FUND;
    if (e.paidBy) person(e.paidBy).fronted += e.amount || 0;

    for (const k of e.participants || []) {
      const share = e.shares?.[k] || 0;
      const p = person(k);
      p.share += share;
      if (isSettled(e, k)) {
        p.settled += share;
      } else {
        p.unpaid += share;
        if (to !== FUND) person(to).owedToMe += share;
        if (share > 0) debts.push({ from: k, to, amount: share, expenseId: e.id, title: e.title });
      }
    }
  }
  return { people, debts };
}

/**
 * Net debts between each PAIR of people.
 * If Ana owes Ben ₱500 and Ben owes Ana ₱200 → Ana owes Ben ₱300.
 * Debts to the group fund stay as their own lines.
 */
export function pairwise(debts) {
  const net = new Map();
  for (const d of debts) {
    if (d.amount <= 0 || d.from === d.to) continue;
    const [a, b] = [d.from, d.to].sort();
    const key = `${a}|${b}`;
    net.set(key, (net.get(key) || 0) + (d.from === a ? d.amount : -d.amount));
  }
  const out = [];
  for (const [key, v] of net) {
    const [a, b] = key.split('|');
    if (v > 0) out.push({ from: a, to: b, amount: v });
    else if (v < 0) out.push({ from: b, to: a, amount: -v });
  }
  return out.sort((x, y) => y.amount - x.amount);
}

/**
 * Fewest payments to settle everything (like Splitwise "simplify debts").
 * Works on each person's NET balance, then matches the biggest debtor with
 * the biggest creditor. Money owed to the group fund is kept separate.
 */
export function simplify(debts) {
  const balance = {};
  const toFund = {};
  for (const d of debts) {
    if (d.amount <= 0 || d.from === d.to) continue;
    if (d.to === FUND) {
      toFund[d.from] = (toFund[d.from] || 0) + d.amount;
      continue;
    }
    balance[d.from] = (balance[d.from] || 0) - d.amount;
    balance[d.to] = (balance[d.to] || 0) + d.amount;
  }
  const debtors = Object.entries(balance).filter(([, v]) => v < 0).map(([k, v]) => ({ k, v: -v })).sort((a, b) => b.v - a.v);
  const creditors = Object.entries(balance).filter(([, v]) => v > 0).map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v);

  const out = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const x = Math.min(debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].k, to: creditors[j].k, amount: x });
    debtors[i].v -= x;
    creditors[j].v -= x;
    if (debtors[i].v === 0) i += 1;
    if (creditors[j].v === 0) j += 1;
  }
  for (const [k, v] of Object.entries(toFund)) out.push({ from: k, to: FUND, amount: v });
  return out;
}

/** Items for one friend's receipt. */
export function buildReceipt(memberKey, expenses, nameOf, { includeSettled = false } = {}) {
  const items = [];
  for (const e of expenses || []) {
    if (!(e.participants || []).includes(memberKey)) continue;
    if (expenseStatus(e).draft) continue; // no amount yet: nothing to bill
    const settled = isSettled(e, memberKey);
    if (settled && !includeSettled) continue;
    const isPayer = e.paidBy === memberKey;
    items.push({
      expenseId: e.id,
      title: e.title,
      date: e.date || '',
      amount: e.shares?.[memberKey] || 0,
      payTo: isPayer ? '' : e.paidBy ? nameOf(e.paidBy) : FUND_LABEL,
      isPayer,
      status: settled ? 'paid' : 'unpaid',
    });
  }
  const totalDue = items.filter((it) => it.status === 'unpaid').reduce((s, it) => s + it.amount, 0);
  return { items, totalDue };
}
