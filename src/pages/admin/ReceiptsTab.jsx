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

export default function ReceiptsTab() {
  const { members } = useMembers();
  const { expenses } = useExpenses();
  const nameOf = useNameOf(members);
  const receipts = useLive(() => collection(db, 'receipts'), []);

  const [memberKey, setMemberKey] = useState('');
  const [includeSettled, setIncludeSettled] = useState(false);
  const [note, setNote] = useState('Pay via GCash to Rory: 09XX XXX XXXX. Send a screenshot sa GC 🙏');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const ledger = useMemo(() => computeLedger(expenses || []), [expenses]);

  if (!members || !expenses || receipts.data === undefined) return <Loading />;

  const preview = memberKey ? buildReceipt(memberKey, expenses, nameOf, { includeSettled }) : null;
  const withBalance = members.filter((m) => (ledger.people[m.key]?.unpaid || 0) > 0);
  const list = [...(receipts.data || [])].sort((a, b) => millis(b.createdAt) - millis(a.createdAt));

  async function run(fn, message) {
    setBusy(true);
    setError('');
    setDone('');
    try {
      await fn();
      setDone(message);
    } catch (ex) {
      setError(friendlyError(ex));
    } finally {
      setBusy(false);
    }
  }

  const generateOne = () =>
    run(
      () =>
        createReceipt({
          memberKey,
          memberName: nameOf(memberKey),
          ...preview,
          note,
        }),
      `Receipt sent to ${nameOf(memberKey)}. They'll see it in their budget tracker.`,
    );

  const generateAll = () => {
    if (!window.confirm(`Create receipts for ${withBalance.length} friend(s) who still owe something?`)) return;
    run(async () => {
      for (const m of withBalance) {
        const r = buildReceipt(m.key, expenses, nameOf, { includeSettled });
        await createReceipt({ memberKey: m.key, memberName: m.name, ...r, note });
      }
    }, `Sent ${withBalance.length} receipt(s).`);
  };

  return (
    <div className="stack-lg">
      <h1 className="page-title">🧾 Receipts</h1>

      <section className="card stack">
        <h2 className="section-title">Generate a receipt</h2>
        <p className="muted small">
          A receipt is a snapshot of what someone owes right now. It shows up in their “Just me” budget view, and they
          can save it as an image.
        </p>
        <div className="grid-2">
          <label className="field">
            <span className="label">For</span>
            <select className="input" value={memberKey} onChange={(e) => setMemberKey(e.target.value)}>
              <option value="">Choose a friend…</option>
              {members.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.name} {ledger.people[m.key]?.unpaid ? `· owes ${peso(ledger.people[m.key].unpaid)}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label">Note on the receipt</span>
            <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          </label>
        </div>
        <label className="row gap small">
          <input type="checkbox" checked={includeSettled} onChange={(e) => setIncludeSettled(e.target.checked)} />
          Also list items they already paid
        </label>

        {preview && (
          <ReceiptCard
            preview
            receipt={{ code: 'PREVIEW', memberName: nameOf(memberKey), items: preview.items, totalDue: preview.totalDue, note }}
          />
        )}

        <ErrorNote>{error}</ErrorNote>
        {done && <p className="success">{done}</p>}
        <div className="row gap wrap">
          <button type="button" className="btn btn-primary" disabled={!memberKey || busy} onClick={generateOne}>
            Generate for {memberKey ? nameOf(memberKey) : '…'}
          </button>
          <button type="button" className="btn btn-ghost" disabled={!withBalance.length || busy} onClick={generateAll}>
            Generate for everyone who owes ({withBalance.length})
          </button>
        </div>
      </section>

      <section className="stack">
        <h2 className="section-title">Sent receipts ({list.length})</h2>
        {list.length === 0 ? (
          <Empty icon="📜">No receipts yet.</Empty>
        ) : (
          <div className="receipt-grid">
            {list.map((r) => (
              <ReceiptCard
                key={r.id}
                receipt={r}
                onDelete={() => window.confirm(`Delete receipt ${r.code} for ${r.memberName}?`) && deleteReceipt(r.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
