import { useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { millis, useExpenses, useLive, useMembers, useNameOf } from '../../hooks';
import { buildReceipt, computeLedger } from '../../lib/settle';
import { createReceipt, deleteReceipt } from '../../data';
import { peso } from '../../lib/money';
import { friendlyError } from '../../lib/format';
import { ReceiptCard } from '../../components/ReceiptCard';
import { Empty, ErrorNote, Loading } from '../../components/ui';
import { SelectField, Switch, useDialog } from '../../components/pickers';

export default function ReceiptsTab({ flash }) {
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const nameOf = useNameOf(members);
  const receipts = useLive(() => collection(db, 'receipts'), []);
  const dialog = useDialog();

  const [memberKey, setMemberKey] = useState('');
  const [includeSettled, setIncludeSettled] = useState(false);
  const [note, setNote] = useState('GCash to Rory: 09XX XXX XXXX. Send a screenshot sa GC.');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);

  if (!members || !expenses || receipts.data === undefined) return <Loading />;

  const preview = memberKey ? buildReceipt(memberKey, expenses, nameOf, { includeSettled }) : null;
  const withBalance = members.filter((m) => (ledger.people[m.key]?.unpaid || 0) > 0);
  const list = [...(receipts.data || [])].sort((a, b) => millis(b.createdAt) - millis(a.createdAt));

  async function run(fn, message) {
    setBusy(true);
    setError('');
    try {
      await fn();
      flash?.(message);
    } catch (ex) {
      if (!ex.cancelled) setError(friendlyError(ex));
    } finally {
      setBusy(false);
    }
  }

  const sendOne = () =>
    run(
      () => createReceipt({ memberKey, memberName: nameOf(memberKey), ...preview, note }),
      `Receipt sent to ${nameOf(memberKey)}`,
    );

  const sendAll = () => {
    run(async () => {
      const ok = await dialog.confirm({
        title: `Send ${withBalance.length} receipt${withBalance.length === 1 ? '' : 's'}?`,
        message: `Everyone who still owes something gets one: ${withBalance.map((m) => m.name).join(', ')}.`,
        confirmLabel: 'Send all',
        emoji: '🧾',
      });
      if (!ok) throw Object.assign(new Error(''), { cancelled: true });
      for (const m of withBalance) {
        const r = buildReceipt(m.key, expenses, nameOf, { includeSettled });
        await createReceipt({ memberKey: m.key, memberName: m.name, ...r, note });
      }
    }, `Sent ${withBalance.length} receipt(s)`);
  };

  return (
    <div className="stack-lg">
      <div className="page-head">
        <h1 className="page-title">🧾 Receipts</h1>
      </div>
      <p className="muted small">A receipt is a snapshot of what someone owes right now. It shows up in their budget, and they can save it as an image.</p>

      <section className="panel stack">
        <div className="field">
          <span className="field-label">Send a receipt to</span>
          <SelectField
            value={memberKey}
            onChange={setMemberKey}
            placeholder="Choose a friend"
            title="Who gets a receipt?"
            label="Send a receipt to"
            options={members.map((m) => {
              const owe = ledger.people[m.key]?.unpaid || 0;
              return { value: m.key, label: m.name, avatar: m.name, sub: owe ? 'Still owes' : 'Settled 🎉', meta: owe ? peso(owe) : undefined };
            })}
          />
        </div>
        <label className="field">
          <span className="field-label">Note on the receipt</span>
          <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
        </label>
        <Switch checked={includeSettled} onChange={setIncludeSettled} label="Also list items they already paid" />

        {preview && (
          <div className="stack">
            <span className="field-label">Preview</span>
            <ReceiptCard preview receipt={{ code: 'Preview', memberName: nameOf(memberKey), items: preview.items, totalDue: preview.totalDue, note }} />
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>
        <button type="button" className="btn btn-primary btn-block" disabled={!memberKey || busy} onClick={sendOne}>
          {memberKey ? `Send to ${nameOf(memberKey)}` : 'Choose a friend first'}
        </button>
        <button type="button" className="btn btn-quiet btn-block" disabled={!withBalance.length || busy} onClick={sendAll}>
          Send to everyone who owes ({withBalance.length})
        </button>
      </section>

      <section className="stack">
        <h2 className="section-title">Sent ({list.length})</h2>
        {list.length === 0 ? (
          <Empty icon="📜">No receipts sent yet.</Empty>
        ) : (
          list.map((r) => (
            <ReceiptCard
              key={r.id}
              receipt={r}
              onDelete={async () => {
                const ok = await dialog.confirm({
                  title: `Delete ${r.memberName}'s receipt?`,
                  message: `Receipt ${r.code} disappears from their budget too.`,
                  confirmLabel: 'Delete',
                  danger: true,
                });
                if (ok) {
                  await deleteReceipt(r.id);
                  flash?.('Receipt deleted');
                }
              }}
            />
          ))
        )}
      </section>
    </div>
  );
}
