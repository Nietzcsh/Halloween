import { useMemo, useState } from 'react';
import { addMember, NameTakenError, releaseMember, removeMember, renameMember } from '../../data';
import { useExpenses, useMembers } from '../../hooks';
import { computeLedger } from '../../lib/settle';
import { peso } from '../../lib/money';
import { friendlyError } from '../../lib/format';
import { nameKey } from '../../lib/names';
import { Empty, ErrorNote, Loading } from '../../components/ui';

export default function FriendsTab() {
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);

  if (!members || !expenses) return <Loading />;

  const inExpenses = (key) => expenses.filter((e) => (e.participants || []).includes(key) || e.paidBy === key).length;

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await addMember(name);
      setName('');
    } catch (ex) {
      setError(ex instanceof NameTakenError ? `${ex.message}.` : friendlyError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function act(fn, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await fn();
    } catch (ex) {
      alert(friendlyError(ex));
    }
  }

  return (
    <div className="stack-lg">
      <div className="row between wrap gap">
        <h1 className="page-title">👯 Friends <span className="muted">({members.length})</span></h1>
      </div>

      <form className="card row gap wrap" onSubmit={add}>
        <input
          className="input grow"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add a friend who hasn't joined yet (they can claim the name later)"
          maxLength={30}
        />
        <button className="btn btn-primary" disabled={busy || !name.trim()}>Add</button>
        <ErrorNote>{error}</ErrorNote>
      </form>

      {members.length === 0 ? (
        <Empty icon="🧟">No one yet. Share the invite link from the top bar.</Empty>
      ) : (
        <div className="card">
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th className="num">Owes</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const p = ledger.people[m.key];
                  const count = inExpenses(m.key);
                  return (
                    <tr key={m.key}>
                      <td>
                        <b>{m.name}</b>
                        <div className="muted tiny">in {count} expense{count === 1 ? '' : 's'}</div>
                      </td>
                      <td>
                        {m.uid ? <span className="chip chip-paid">📱 Joined</span> : <span className="chip">Not linked yet</span>}
                      </td>
                      <td className="num">{p?.unpaid ? <b className="txt-orange">{peso(p.unpaid)}</b> : '—'}</td>
                      <td className="num">
                        <div className="row gap end wrap">
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                              const next = window.prompt('New display name', m.name);
                              if (!next || !next.trim() || next.trim() === m.name) return;
                              const clash = members.find((o) => o.key !== m.key && (o.key === nameKey(next) || nameKey(o.name) === nameKey(next)));
                              if (clash) return alert(`“${clash.name}” already exists.`);
                              act(() => renameMember(m, next));
                            }}
                          >
                            Rename
                          </button>
                          {m.uid && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() =>
                                act(
                                  () => releaseMember(m),
                                  `Reset ${m.name}'s phone? They can join again as "${m.name}" from any phone. Their expenses stay.`,
                                )
                              }
                            >
                              Reset phone
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-danger btn-xs"
                            disabled={count > 0}
                            title={count > 0 ? 'Remove them from expenses first' : 'Remove'}
                            onClick={() => act(() => removeMember(m), `Remove ${m.name} from the group?`)}
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted tiny">
            “Reset phone” is for someone who changed phones or cleared their browser: it frees their name so they can
            join again and keep their expenses. You can only remove a friend once they're not in any expense.
          </p>
        </div>
      )}
    </div>
  );
}
