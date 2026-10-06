// Run with: npm test   (uses Node's built-in test runner, no extra packages)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePeso, splitEqual, peso } from './money.js';
import { nameKey, cleanName } from './names.js';
import { computeLedger, pairwise, simplify, buildReceipt, expenseStatus, FUND } from './settle.js';

test('parsePeso handles common inputs', () => {
  assert.equal(parsePeso('1,234.50'), 123450);
  assert.equal(parsePeso('₱ 6000'), 600000);
  assert.equal(parsePeso('99.9'), 9990);
  assert.ok(Number.isNaN(parsePeso('abc')));
  assert.ok(Number.isNaN(parsePeso('1.234')));
  assert.ok(Number.isNaN(parsePeso('')));
});

test('splitEqual always adds up to the total', () => {
  const s = splitEqual(1000, ['a', 'b', 'c']);
  assert.deepEqual(s, { a: 334, b: 333, c: 333 });
  const keys = Array.from({ length: 13 }, (_, i) => `p${i}`);
  const big = splitEqual(1234567, keys);
  assert.equal(Object.values(big).reduce((x, y) => x + y, 0), 1234567);
});

test('names are normalized for uniqueness', () => {
  assert.equal(nameKey('  Ana  '), 'ana');
  assert.equal(nameKey('ANA'), 'ana');
  assert.equal(nameKey('Aña'), 'ana');
  assert.equal(nameKey('Jo Ann B.'), 'jo-ann-b');
  assert.equal(cleanName('  Jo    Ann '), 'Jo Ann');
  assert.equal(nameKey('🎃🎃'), '');
});

const expenses = [
  {
    id: 'airbnb', title: 'Airbnb', amount: 600000, paidBy: 'rory',
    participants: ['rory', 'ana', 'ben'],
    shares: { rory: 200000, ana: 200000, ben: 200000 },
    paid: { ben: true },
  },
  {
    id: 'drinks', title: 'Pre-game drinks', amount: 90000, paidBy: 'ana',
    participants: ['ana', 'ben', 'rory'],
    shares: { ana: 30000, ben: 30000, rory: 30000 },
    paid: {},
  },
  {
    id: 'tix', title: 'Club entrance', amount: 150000, paidBy: null,
    participants: ['ana', 'ben', 'cy'],
    shares: { ana: 50000, ben: 50000, cy: 50000 },
    paid: { cy: true },
  },
];

test('ledger totals per person', () => {
  const { people, debts } = computeLedger(expenses);
  assert.equal(people.ana.share, 280000);
  assert.equal(people.ana.unpaid, 250000); // 2000 airbnb + 500 entrance
  assert.equal(people.ana.owedToMe, 60000); // ben + rory for drinks
  assert.equal(people.rory.owedToMe, 200000);
  assert.equal(people.cy.unpaid, 0);
  assert.equal(debts.length, 5);
});

test('pairwise nets out mutual debts', () => {
  const { debts } = computeLedger(expenses);
  const pw = pairwise(debts);
  const find = (f, t) => pw.find((d) => d.from === f && d.to === t)?.amount;
  assert.equal(find('ana', 'rory'), 170000); // 2000 - 300
  assert.equal(find('ben', 'ana'), 30000);
  assert.equal(find('ana', FUND), 50000);
  assert.equal(find('ben', FUND), 50000);
});

test('simplify keeps everyone whole with fewer payments', () => {
  const { debts, people } = computeLedger(expenses);
  const s = simplify(debts);
  const net = {};
  for (const d of s) {
    if (d.to === FUND) continue;
    net[d.from] = (net[d.from] || 0) - d.amount;
    net[d.to] = (net[d.to] || 0) + d.amount;
  }
  // rory is owed 2000 by ana, owes 300 to ana → net +1700
  assert.equal(net.rory, 170000);
  assert.equal(net.ana, -140000);
  assert.equal(net.ben, -30000);
  assert.ok(people);
});

test('receipt lists only unpaid items by default', () => {
  const r = buildReceipt('ana', expenses, (k) => k.toUpperCase());
  assert.equal(r.items.length, 2);
  assert.equal(r.totalDue, 250000);
  const all = buildReceipt('ana', expenses, (k) => k, { includeSettled: true });
  assert.equal(all.items.length, 3);
  assert.equal(all.totalDue, 250000);
  assert.equal(peso(r.totalDue).replace(/\s/g, ''), '₱2,500.00');
});

test('expense status ignores the payer', () => {
  assert.deepEqual(expenseStatus(expenses[0]), { paidCount: 1, total: 2, done: false });
});
