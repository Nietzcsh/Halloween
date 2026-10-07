import { useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from '../session';
import { millis, useExpenses, useLive, useMembers, useNameOf } from '../hooks';
import { computeLedger, expenseStatus, FUND, pairwise } from '../lib/settle';
import { peso, sum } from '../lib/money';
import { ExpenseCard } from '../components/ExpenseCard';
import { ReceiptCard } from '../components/ReceiptCard';
import { BalanceTicket } from '../components/BalanceTicket';
import { Avatar, Empty, Group, Loading, Progress, Segmented } from '../components/ui';

export default function Budget() {
  const { memberKey } = useSession();
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const nameOf = useNameOf(members);
  const [view, setView] = useState('me');

  const receipts = useLive(
    () => (memberKey ? query(collection(db, 'receipts'), where('memberKey', '==', memberKey)) : null),
    [memberKey],
  );

  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);
  const pairs = useMemo(() => pairwise(ledger.debts), [ledger]);

  if (!members || !expenses) return <Loading />;

  return (
    <div className="stack-lg">
      <div className="page-head">
        <h1 className="page-title">💸 Budget tracker</h1>
      </div>
      <div className="sticky-seg">
        <Segmented
          full
          value={view}
          onChange={setView}
          options={[
            { value: 'me', label: 'Just me' },
            { value: 'group', label: 'Whole group' },
          ]}
        />
      </div>

      {view === 'me' ? (
        <MyView memberKey={memberKey} expenses={expenses} ledger={ledger} pairs={pairs} nameOf={nameOf} receipts={receipts.data} />
      ) : (
        <GroupView members={members} expenses={expenses} ledger={ledger} pairs={pairs} nameOf={nameOf} me={memberKey} />
      )}
    </div>
  );
}

function MyView({ memberKey, expenses, ledger, pairs, nameOf, receipts }) {
  const me = ledger.people[memberKey] || { share: 0, settled: 0, unpaid: 0, owedToMe: 0 };
  const myExpenses = expenses.filter((e) => (e.participants || []).includes(memberKey));
  const iPay = pairs.filter((d) => d.from === memberKey);
  const payMe = pairs.filter((d) => d.to === memberKey);
  const sortedReceipts = [...(receipts || [])].sort((a, b) => millis(b.createdAt) - millis(a.createdAt));

  return (
    <>
      <BalanceTicket owe={me.unpaid} share={me.share} owedToMe={me.owedToMe} creditors={iPay.length} />

      {(iPay.length > 0 || payMe.length > 0) && (
        <Group title="💸 Who to pay" footer="Already netted out. If you owe each other, only the difference shows.">
          {iPay.map((d) => (
            <div key={`${d.from}-${d.to}`} className="row">
              <Avatar name={nameOf(d.to)} icon={d.to === FUND ? 'wallet' : undefined} />
              <span className="row-main">
                <strong>{nameOf(d.to)}</strong>
                <span>{d.to === FUND ? 'Hand it to Rory' : 'You pay them'}</span>
              </span>
              <span className="row-amount num txt-pumpkin">{peso(d.amount)}</span>
            </div>
          ))}
          {payMe.map((d) => (
            <div key={`${d.from}-${d.to}`} className="row">
              <Avatar name={nameOf(d.from)} />
              <span className="row-main">
                <strong>{nameOf(d.from)}</strong>
                <span>Owes you</span>
              </span>
              <span className="row-amount num txt-haunt">{peso(d.amount)}</span>
            </div>
          ))}
        </Group>
      )}

      {sortedReceipts.length > 0 && (
        <section className="stack">
          <h2 className="section-title">🧾 Receipts from Rory</h2>
          {sortedReceipts.map((r) => <ReceiptCard key={r.id} receipt={r} />)}
        </section>
      )}

      <Group title={`Your expenses (${myExpenses.length})`}>
        {myExpenses.length === 0 ? (
          <Empty icon="🪦">You're not in any hatian yet. Rory will add you.</Empty>
        ) : (
          myExpenses.map((e) => <ExpenseCard key={e.id} expense={e} nameOf={nameOf} me={memberKey} />)
        )}
      </Group>
    </>
  );
}

function GroupView({ members, expenses, ledger, pairs, nameOf, me }) {
  const total = sum(expenses.filter((e) => !expenseStatus(e).draft).map((e) => e.amount));
  const unpaid = sum(ledger.debts.map((d) => d.amount));
  const collected = total - unpaid;
  const keys = [...new Set([...members.map((m) => m.key), ...Object.keys(ledger.people)])].sort((a, b) => {
    if (a === me) return -1;
    if (b === me) return 1;
    return (ledger.people[b]?.unpaid || 0) - (ledger.people[a]?.unpaid || 0);
  });

  return (
    <>
      <section className="panel summary">
        <div className="summary-top">
          <span className="muted small">Group spending</span>
          <span className="summary-total num">{peso(total)}</span>
        </div>
        <Progress value={collected} max={total} label="Collected so far" />
        <div className="summary-split">
          <span><span className="dot dot-ecto" /> Paid {peso(collected)}</span>
          <span><span className="dot dot-pumpkin" /> Still out {peso(unpaid)}</span>
        </div>
      </section>

      <Group title="👯 Everyone">
        {keys.map((k) => {
          const p = ledger.people[k] || { share: 0, settled: 0, unpaid: 0 };
          return (
            <div key={k} className={`row ${k === me ? 'is-me' : ''}`}>
              <Avatar name={nameOf(k)} />
              <span className="row-main">
                <strong>
                  {nameOf(k)}
                  {k === me ? ' (you)' : ''}
                </strong>
                <Progress value={p.settled} max={p.share} label={`${nameOf(k)} paid`} />
              </span>
              <span className="row-amount">
                {p.unpaid > 0 ? (
                  <span className="num txt-pumpkin">{peso(p.unpaid)}</span>
                ) : p.share > 0 ? (
                  <span className="txt-ecto">Settled</span>
                ) : (
                  <span className="muted">No share</span>
                )}
              </span>
            </div>
          );
        })}
      </Group>

      {pairs.length > 0 && (
        <Group title="🔁 Who owes who">
          {pairs.map((d) => (
            <div key={`${d.from}-${d.to}`} className="row row-flow">
              <span className="flow">
                <strong>{nameOf(d.from)}</strong>
                <span className="flow-arrow" aria-label="pays">pays</span>
                <strong>{nameOf(d.to)}</strong>
              </span>
              <span className="row-amount num">{peso(d.amount)}</span>
            </div>
          ))}
        </Group>
      )}

      <Group title={`All expenses (${expenses.length})`}>
        {expenses.length === 0 ? (
          <Empty icon="🪦">No expenses yet.</Empty>
        ) : (
          expenses.map((e) => <ExpenseCard key={e.id} expense={e} nameOf={nameOf} me={me} />)
        )}
      </Group>
    </>
  );
}
