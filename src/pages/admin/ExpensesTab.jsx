import { useMemo, useState } from 'react';
import { useExpenses, useMembers, useNameOf } from '../../hooks';
import { computeLedger } from '../../lib/settle';
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

  return (
    <div className="stack-lg">
      <div className="row between wrap gap">
        <h1 className="page-title">💸 Expenses</h1>
        <button type="button" className="btn btn-primary" onClick={() => setEditing('new')} disabled={!members.length}>
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

      {!members.length && <Empty icon="🧟">Add friends first (or share the invite link) so you can split expenses.</Empty>}

      {members.length > 0 && expenses.length === 0 && (
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
