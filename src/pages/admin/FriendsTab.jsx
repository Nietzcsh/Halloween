import { useMemo, useState } from 'react';
import { addMember, NameTakenError, releaseMember, removeMember, renameMember } from '../../data';
import { useExpenses, useMembers } from '../../hooks';
import { computeLedger } from '../../lib/settle';
import { peso } from '../../lib/money';
import { friendlyError } from '../../lib/format';
import { nameKey } from '../../lib/names';
import { Avatar, Empty, ErrorNote, Group, Icon, Loading, Sheet, SheetAction } from '../../components/ui';
import { useDialog } from '../../components/pickers';

export default function FriendsTab({ flash }) {
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const dialog = useDialog();

  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);

  if (!members || !expenses) return <Loading />;

  const countFor = (key) => expenses.filter((e) => (e.participants || []).includes(key) || e.paidBy === key).length;
  const linked = members.filter((m) => m.uid).length;

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await addMember(name);
      flash?.(`Added ${name.trim()}`);
      setName('');
    } catch (ex) {
      setError(ex instanceof NameTakenError ? `${ex.message}.` : friendlyError(ex));
    } finally {
      setBusy(false);
    }
  }

  async function act(fn, confirmOpts, done) {
    setSelected(null);
    if (confirmOpts && !(await dialog.confirm(confirmOpts))) return;
    try {
      await fn();
      if (done) flash?.(done);
    } catch (ex) {
      dialog.notify({ title: 'That didn’t work', message: friendlyError(ex) });
    }
  }

  const m = selected;
  const mCount = m ? countFor(m.key) : 0;

  return (
    <div className="stack-lg">
      <div className="page-head">
        <h1 className="page-title">👯 Friends</h1>
        <span className="muted small">{members.length} total, {linked} on their phones</span>
      </div>

      <form className="inline-form" onSubmit={add}>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Add someone who hasn't joined"
          maxLength={30}
          enterKeyHint="done"
        />
        <button className="btn btn-primary" disabled={busy || !name.trim()}>Add</button>
      </form>
      <ErrorNote>{error}</ErrorNote>

      {members.length === 0 ? (
        <Empty icon="🧟" title="Nobody yet">Copy the invite link from the ••• menu and send it to the GC.</Empty>
      ) : (
        <Group title="Everyone" footer="Tap a friend to rename, reset their phone or remove them.">
          {members.map((f) => {
            const p = ledger.people[f.key];
            return (
              <button key={f.key} type="button" className="row row-link" onClick={() => setSelected(f)}>
                <Avatar name={f.name} />
                <span className="row-main">
                  <strong>{f.name}</strong>
                  <span>
                    {f.uid ? '' : 'Not joined yet, '}
                    {countFor(f.key)} expense{countFor(f.key) === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="row-amount">
                  {p?.unpaid ? <span className="num txt-pumpkin">{peso(p.unpaid)}</span> : <span className="muted small">No balance</span>}
                </span>
                <Icon name="chevron" size={18} className="muted" />
              </button>
            );
          })}
        </Group>
      )}

      {m && (
        <Sheet title={m.name} onClose={() => setSelected(null)}>
          <SheetAction
            icon="edit"
            onClick={async () => {
              setSelected(null);
              const next = await dialog.prompt({ title: `Rename ${m.name}`, defaultValue: m.name, maxLength: 30, confirmLabel: 'Save name' });
              if (!next || next === m.name) return;
              const clash = members.find((o) => o.key !== m.key && (o.key === nameKey(next) || nameKey(o.name) === nameKey(next)));
              if (clash) {
                dialog.notify({ title: 'Name taken', message: `“${clash.name}” already exists. Try adding a last initial.` });
                return;
              }
              act(() => renameMember(m, next), null, 'Name updated ✏️');
            }}
          >
            Rename
          </SheetAction>
          {m.uid && (
            <SheetAction
              icon="phone"
              onClick={() =>
                act(
                  () => releaseMember(m),
                  {
                    title: `Reset ${m.name}'s phone?`,
                    message: `They can join again as “${m.name}” from any phone and keep all their expenses.`,
                    confirmLabel: 'Reset phone',
                    emoji: '📱',
                  },
                  'Phone reset 📱',
                )
              }
            >
              Reset phone (new phone or cleared browser)
            </SheetAction>
          )}
          <SheetAction
            icon="trash"
            tone="blood"
            disabled={mCount > 0}
            onClick={() =>
              act(
                () => removeMember(m),
                { title: `Remove ${m.name}?`, message: 'They’ll disappear from the group list.', confirmLabel: 'Remove', danger: true },
                'Removed',
              )
            }
          >
            {mCount > 0 ? `Remove (take them out of ${mCount} expense${mCount === 1 ? '' : 's'} first)` : 'Remove from group'}
          </SheetAction>
        </Sheet>
      )}
    </div>
  );
}
