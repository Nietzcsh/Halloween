import { useMemo, useState } from 'react';
import { useExpenses, useMembers, useNameOf } from '../../hooks';
import { computeLedger, expenseStatus } from '../../lib/settle';
import { peso, sum } from '../../lib/money';
import { ExpenseCard } from '../../components/ExpenseCard';
import { Empty, Group, Icon, Loading, Progress } from '../../components/ui';
import ExpenseEditor from './ExpenseEditor';

export default function ExpensesTab({ flash }) {
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const nameOf = useNameOf(members);
  const [editing, setEditing] = useState(null); // null = closed, 'new', or an expense
  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);

  if (!members || !expenses) return <Loading />;

  const drafts = expenses.filter((e) => expenseStatus(e).draft);
  const ready = expenses.filter((e) => !expenseStatus(e).draft);
  const total = sum(ready.map((e) => e.amount));
  const unpaid = sum(ledger.debts.map((d) => d.amount));

  return (
    <div className="stack-lg">
      <div className="page-head">
        <h1 className="page-title">💸 Expenses</h1>
      </div>

      <section className="panel summary">
        <div className="summary-top">
          <span className="muted small">Total spending</span>
          <span className="summary-total num">{peso(total)}</span>
        </div>
        <Progress value={total - unpaid} max={total} label="Collected" />
        <div className="summary-split">
          <span><span className="dot dot-ecto" /> Paid {peso(total - unpaid)}</span>
          <span><span className="dot dot-pumpkin" /> Still out {peso(unpaid)}</span>
        </div>
      </section>

      {!members.length && (
        <p className="note note-haunt">No friends have joined yet. You can still list expenses now and add people later.</p>
      )}

      {expenses.length === 0 ? (
        <Empty
          icon="🪦"
          title="No expenses yet"
          action={
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              <Icon name="plus" size={20} /> Add the first one
            </button>
          }
        >
          Start with the big ones: Airbnb, tickets, drinks.
        </Empty>
      ) : (
        <>
          {drafts.length > 0 && (
            <Group title="✏️ Still filling in" footer="These don't count toward anyone's balance until they have people and an amount.">
              {drafts.map((e) => <ExpenseCard key={e.id} expense={e} nameOf={nameOf} onEdit={() => setEditing(e)} />)}
            </Group>
          )}
          {ready.length > 0 && (
            <Group title={`Expenses (${ready.length})`}>
              {ready.map((e) => <ExpenseCard key={e.id} expense={e} nameOf={nameOf} onEdit={() => setEditing(e)} />)}
            </Group>
          )}
        </>
      )}

      <button type="button" className="fab" onClick={() => setEditing('new')}>
        <Icon name="plus" size={22} strokeWidth={2.2} />
        New expense
      </button>

      {editing && (
        <ExpenseEditor
          key={editing === 'new' ? 'new' : editing.id}
          expense={editing === 'new' ? null : editing}
          members={members}
          onClose={() => setEditing(null)}
          flash={flash}
        />
      )}
    </div>
  );
}
