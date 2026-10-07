// Builds what goes into a GC nudge: the preview card, the link preview text,
// and a ready-to-paste Taglish message. Pure functions, easy to test.
import { peso } from './money.js';
import { FUND, FUND_LABEL, computeLedger, isSettled } from './settle.js';

function nameList(names, max = 3) {
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} +${names.length - max}`;
}

/** Who hasn't paid one expense. Returns null if everyone has. */
export function expenseNudge(expense, nameOf) {
  if (!(expense.amount > 0)) return null;
  const unpaid = (expense.participants || []).filter((k) => !isSettled(expense, k) && (expense.shares?.[k] || 0) > 0);
  if (!unpaid.length) return null;

  const amounts = unpaid.map((k) => expense.shares[k]);
  const total = amounts.reduce((a, b) => a + b, 0);
  // Equal splits can differ by a centavo from rounding (₱923.08 vs ₱923.07): still "each".
  const same = Math.max(...amounts) - Math.min(...amounts) <= 1;
  const big = same ? `${peso(Math.max(...amounts))} each` : `${peso(total)} pa ang kulang`;
  const names = unpaid.map(nameOf);
  const payTo = expense.paidBy ? nameOf(expense.paidBy) : 'Rory (group fund)';

  const lines = unpaid.map((k) => `• ${nameOf(k)}: ${peso(expense.shares[k])}`);
  const message = [
    `📣 Paalala sa ${expense.title}!`,
    `Hindi pa bayad (${unpaid.length}):`,
    ...lines,
    '',
    `Bayad kay ${payTo}, tapos send ng screenshot para ma-mark as paid 🙏`,
    'Tingnan ang hatian dito 👇',
  ].join('\n');

  return {
    kind: 'nudge',
    heading: `Nudge for ${expense.title}`,
    path: '/budget',
    title: `📣 Paalala: ${expense.title}`,
    description: `Hindi pa bayad: ${nameList(names)}. ${big}.`,
    message,
    card: {
      style: 'info',
      emoji: '📣',
      title: expense.title,
      big,
      sub: `Hindi pa bayad: ${nameList(names, 4)}`,
      cta: 'Tap para makita ang hatian 👻',
    },
    count: unpaid.length,
  };
}

/** Everyone who still owes anything. Returns null if everyone is settled. */
export function everyoneNudge(expenses, nameOf) {
  const { people } = computeLedger(expenses);
  const owing = Object.entries(people)
    .filter(([k, p]) => k !== FUND && p.unpaid > 0)
    .sort((a, b) => b[1].unpaid - a[1].unpaid);
  if (!owing.length) return null;

  const total = owing.reduce((s, [, p]) => s + p.unpaid, 0);
  const message = [
    '💸 Bayaran time, mga besh!',
    `Kulang pa ang ${peso(total)}:`,
    ...owing.map(([k, p]) => `• ${nameOf(k)}: ${peso(p.unpaid)}`),
    '',
    'Check the app kung kanino ka magbabayad 👇',
  ].join('\n');

  return {
    kind: 'nudge-all',
    heading: 'Nudge everyone who owes',
    path: '/budget',
    title: '💸 Bayaran time!',
    description: `${owing.length} pa ang may balance: ${nameList(owing.map(([k]) => nameOf(k)))}. Tap to see how much.`,
    message,
    card: {
      style: 'info',
      emoji: '💸',
      title: 'Bayaran time!',
      big: `${peso(total)} pa ang kulang`,
      sub: `${owing.length} pa: ${nameList(owing.map(([k]) => nameOf(k)), 4)}`,
      cta: 'Tap para makita kung magkano ka 👻',
    },
    count: owing.length,
  };
}

export function pollShare(poll) {
  const options = poll.type === 'choice' ? (poll.options || []).join(' · ') : 'Type your answer';
  return {
    kind: 'poll',
    heading: `Share poll ${poll.number || ''}`.trim(),
    path: `/polls/${poll.id}`,
    title: `🗳️ ${poll.question}`,
    description: `${options}. Tap to answer!`,
    message: `🗳️ Poll time!\n${poll.question}\nSagot na kayo 👇`,
    card: { style: 'info', emoji: '🗳️', title: poll.question, sub: options, cta: 'Tap to answer 🗳️' },
  };
}

export function inviteShare() {
  return {
    kind: 'invite',
    heading: 'Invite link',
    path: '/',
    title: "🎃 Rory's Halloween Kemerut",
    description: 'Sat, Oct 31 · Club night 🦇 Budget, hatian and polls. Tap to join!',
    message: "🎃 Join na kayo sa Rory's Halloween Kemerut! Dito natin i-track ang hatian, bayaran at polls 👇",
    card: { style: 'invite', emoji: '🎃', title: "Rory's Halloween Kemerut", sub: 'Sat, Oct 31 · Club night 🦇', cta: 'Tap to join 👻' },
  };
}

export { FUND_LABEL };
