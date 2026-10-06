import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useSession } from '../session';
import { millis, useExpenses, useLive, useMembers, useNameOf } from '../hooks';
import { computeLedger, FUND, pairwise } from '../lib/settle';
import { peso, sum } from '../lib/money';
import { ExpenseCard } from '../components/ExpenseCard';
import { ReceiptCard } from '../components/ReceiptCard';
import { Empty, Loading, Segmented, Stat, StatusChip } from '../components/ui';

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
      <div className="row between wrap gap">
        <h1 className="page-title">💸 Budget tracker</h1>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: 'me', label: '🙋 Just me' },
            { value: 'group', label: '👯 Whole group' },
          ]}
        />
      </div>

      {view === 'me' ? (
        <MyView
          memberKey={memberKey}
          expenses={expenses}
          ledger={ledger}
          pairs={pairs}
          nameOf={nameOf}
          receipts={receipts.data}
        />
      ) : (
        <GroupView members={members} expenses={expenses} ledger={ledger} pairs={pairs} nameOf={nameOf} me={memberKey} />
      )}

      <Link to="/" className="btn btn-ghost">← Back</Link>
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
      <section className={`card hero-card ${me.unpaid > 0 ? 'owe' : 'clear'}`}>
        <div className="muted small">You still owe</div>
        <div className="hero-amount">{peso(me.unpaid)}</div>
        <div className="stats">
          <Stat label="Your total share" value={peso(me.share)} />
          <Stat label="Already paid" value={peso(me.settled)} tone="green" />
          {me.owedToMe > 0 && <Stat label="Others owe you" value={peso(me.owedToMe)} tone="purple" />}
        </div>
        {me.unpaid === 0 && me.share > 0 && <p className="small">All settled. Salamat! 🎉</p>}
      </section>

      {(iPay.length > 0 || payMe.length > 0) && (
        <section className="card stack">
          <h2 className="section-title">Who to pay</h2>
          {iPay.map((d) => (
            <div key={`${d.from}-${d.to}`} className="debt-row">
              <span>Pay <b>{nameOf(d.to)}</b></span>
              <b className="txt-orange">{peso(d.amount)}</b>
            </div>
          ))}
          {payMe.map((d) => (
            <div key={`${d.from}-${d.to}`} className="debt-row">
              <span><b>{nameOf(d.from)}</b> owes you</span>
              <b className="txt-purple">{peso(d.amount)}</b>
            </div>
          ))}
          <p className="muted tiny">Already netted out: if you owe each other, only the difference is shown.</p>
        </section>
      )}

      {sortedReceipts.length > 0 && (
        <section className="stack">
          <h2 className="section-title">🧾 Receipts from Rory</h2>
          {sortedReceipts.map((r) => <ReceiptCard key={r.id} receipt={r} />)}
        </section>
      )}

      <section className="stack">
        <h2 className="section-title">Expenses you're part of ({myExpenses.length})</h2>
        {myExpenses.length === 0 ? (
          <Empty icon="🪦">No expenses yet. Rory will add them here.</Empty>
        ) : (
          myExpenses.map((e) => <ExpenseCard key={e.id} expense={e} nameOf={nameOf} me={memberKey} />)
        )}
      </section>
    </>
  );
}

function GroupView({ members, expenses, ledger, pairs, nameOf, me }) {
  const total = sum(expenses.map((e) => e.amount));
  const unpaid = sum(ledger.debts.map((d) => d.amount));
  const keys = [...new Set([...members.map((m) => m.key), ...Object.keys(ledger.people)])];

  return (
    <>
      <section className="card">
        <div className="stats">
          <Stat label="Group spending" value={peso(total)} />
          <Stat label="Still unpaid" value={peso(unpaid)} tone="orange" />
          <Stat label="Collected" value={peso(total - unpaid)} tone="green" />
        </div>
      </section>

      <section className="card">
        <h2 className="section-title">Everyone</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Share</th>
                <th className="num">Paid</th>
                <th className="num">Owes</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => {
                const p = ledger.people[k] || { share: 0, settled: 0, unpaid: 0 };
                return (
                  <tr key={k} className={k === me ? 'row-me' : ''}>
                    <td>{nameOf(k)}{k === me ? ' (you)' : ''}</td>
                    <td className="num">{peso(p.share)}</td>
                    <td className="num txt-green">{peso(p.settled)}</td>
                    <td className="num">
                      {p.unpaid > 0 ? <b className="txt-orange">{peso(p.unpaid)}</b> : <StatusChip paid>Settled</StatusChip>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {pairs.length > 0 && (
        <section className="card stack">
          <h2 className="section-title">Who owes who</h2>
          {pairs.map((d) => (
            <div key={`${d.from}-${d.to}`} className="debt-row">
              <span>
                <b>{nameOf(d.from)}</b> → {d.to === FUND ? nameOf(FUND) : <b>{nameOf(d.to)}</b>}
              </span>
              <b>{peso(d.amount)}</b>
            </div>
          ))}
        </section>
      )}

      <section className="stack">
        <h2 className="section-title">All expenses ({expenses.length})</h2>
        {expenses.length === 0 ? (
          <Empty icon="🪦">No expenses yet.</Empty>
        ) : (
          expenses.map((e) => <ExpenseCard key={e.id} expense={e} nameOf={nameOf} me={me} />)
        )}
      </section>
    </>
  );
}
