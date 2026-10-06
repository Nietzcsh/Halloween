import { useMemo, useState } from 'react';
import { useExpenses, useMembers, useNameOf } from '../../hooks';
import { computeLedger, expenseStatus } from '../../lib/settle';
import { peso, sum } from '../../lib/money';
import { ExpenseCard } from '../../components/ExpenseCard';
import { Empty, Loading, Stat } from '../../components/ui';
import ExpenseEditor from './ExpenseEditor';

export default function ExpensesTab() {
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const nameOf = useNameOf(members);
  const [editing, setEditing] = useState(null); // null = closed, 'new', or an expense
  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);

  if (!members || !expenses) return <Loading />;

  const total = sum(expenses.map((e) => e.amount));
  const unpaid = sum(ledger.debts.map((d) => d.amount));
  const drafts = expenses.filter((e) => expenseStatus(e).draft);

  return (
    <div className="stack-lg">
      <div className="row between wrap gap">
        <h1 className="page-title">💸 Expenses</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
          + New expense
        </button>
      </div>

      <div className="card">
        <div className="stats">
          <Stat label="Total spending" value={peso(total)} />
          <Stat label="Still unpaid" value={peso(unpaid)} tone="orange" />
          <Stat label="Expenses" value={expenses.length} />
        </div>
      </div>

      {drafts.length > 0 && (
        <p className="hint">
          ✏️ {drafts.length} expense{drafts.length > 1 ? 's' : ''} still need{drafts.length > 1 ? '' : 's'} people or an
          amount: {drafts.map((d) => d.title).join(', ')}. Tap one to finish it.
        </p>
      )}

      {!members.length && (
        <p className="muted small">
          No friends have joined yet. You can still list expenses now and add people to the hatian later.
        </p>
      )}

      {expenses.length === 0 && (
        <Empty icon="🪦">No expenses yet. Tap “New expense” to add the Airbnb, tickets, drinks…</Empty>
      )}

      {expenses.map((e) => (
        <ExpenseCard key={e.id} expense={e} nameOf={nameOf} onClick={() => setEditing(e)} />
      ))}

      {editing && (
        <ExpenseEditor
          key={editing === 'new' ? 'new' : editing.id}
          expense={editing === 'new' ? null : editing}
          members={members}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
