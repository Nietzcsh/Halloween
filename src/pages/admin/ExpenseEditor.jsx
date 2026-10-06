import { useMemo, useRef, useState } from 'react';
import { deleteExpense, saveExpense } from '../../data';
import { parsePeso, peso, splitEqual, sum, toInputValue } from '../../lib/money';
import { prepareReceiptPhoto } from '../../lib/images';
import { friendlyError, todayISO } from '../../lib/format';
import { ErrorNote, Modal, Segmented } from '../../components/ui';

/**
 * The "sheet" for one expense:
 *  title, amount, date, who paid (optional), who's in the hatian,
 *  equal or custom split, paid / not-yet-paid per person, notes, receipt photos.
 */
export default function ExpenseEditor({ expense, members, onClose }) {
  const isNew = !expense;

  const [title, setTitle] = useState(expense?.title || '');
  const [amountStr, setAmountStr] = useState(expense ? toInputValue(expense.amount) : '');
  const [date, setDate] = useState(expense?.date || todayISO());
  const [paidBy, setPaidBy] = useState(expense?.paidBy || '');
  const [participants, setParticipants] = useState(expense?.participants || []);
  const [splitMode, setSplitMode] = useState(expense?.splitMode || 'equal');
  const [custom, setCustom] = useState(() => {
    const o = {};
    if (expense?.splitMode === 'custom') {
      for (const [k, v] of Object.entries(expense.shares || {})) o[k] = toInputValue(v);
    }
    return o;
  });
  const [paid, setPaid] = useState(expense?.paid || {});
  const [notes, setNotes] = useState(expense?.notes || '');
  const [keptPhotos, setKeptPhotos] = useState(expense?.photos || []);
  const [removedPhotoIds, setRemovedPhotoIds] = useState([]);
  const [newPhotos, setNewPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const cameraRef = useRef(null);
  const uploadRef = useRef(null);

  const memberKeys = members.map((m) => m.key);
  const nameOf = (k) => members.find((m) => m.key === k)?.name || `${k} (removed)`;
  // Keep member-list order; anyone removed from the group stays at the end so their share isn't lost.
  const partKeys = [
    ...memberKeys.filter((k) => participants.includes(k)),
    ...participants.filter((k) => !memberKeys.includes(k)),
  ];

  // Amount is optional: blank = "not sure yet". Only typed-but-invalid input is an error.
  const amountBlank = amountStr.trim() === '';
  const amount = amountBlank ? 0 : parsePeso(amountStr);
  const amountInvalid = !amountBlank && !(Number.isFinite(amount) && amount > 0);
  const amountOk = !amountBlank && !amountInvalid;

  const shares = useMemo(() => {
    if (splitMode === 'equal') return splitEqual(amountOk ? amount : 0, partKeys);
    const o = {};
    for (const k of partKeys) {
      const v = parsePeso(custom[k] ?? '');
      o[k] = Number.isFinite(v) ? v : 0;
    }
    return o;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitMode, amount, amountOk, partKeys.join(','), custom]);

  const shareTotal = sum(Object.values(shares));
  const diff = amountOk ? amount - shareTotal : 0;

  function toggle(k) {
    setParticipants((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }

  function setAllStatus(value) {
    if (!value) return;
    const next = {};
    for (const k of partKeys) next[k] = value === 'paid';
    setPaid(next);
  }

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    setPhotoBusy(true);
    setError('');
    try {
      const prepared = [];
      for (const f of files) prepared.push({ tempId: `${Date.now()}-${Math.random()}`, ...(await prepareReceiptPhoto(f)) });
      setNewPhotos((cur) => [...cur, ...prepared]);
    } catch (ex) {
      setError(ex.message);
    } finally {
      setPhotoBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (uploadRef.current) uploadRef.current.value = '';
    }
  }

  async function save() {
    setError('');
    // Only the name is required. People and amount can be added later.
    if (!title.trim()) return setError('Give the expense a name (e.g. Airbnb).');
    if (amountInvalid) return setError('That amount looks off. Use numbers like 6000 or 1,250.50, or leave it blank for now.');
    if (splitMode === 'custom' && amountOk && partKeys.length && diff !== 0) {
      return setError(`Custom shares add up to ${peso(shareTotal)}, but the expense is ${peso(amount)}.`);
    }

    const paidMap = {};
    for (const k of partKeys) paidMap[k] = k === paidBy ? true : !!paid[k];

    setBusy(true);
    try {
      await saveExpense(
        expense?.id || null,
        {
          title: title.trim(),
          amount,
          date,
          paidBy: paidBy || null,
          participants: partKeys,
          splitMode,
          shares,
          paid: paidMap,
          notes: notes.trim(),
          ...(expense?.createdAt ? { createdAt: expense.createdAt } : {}),
        },
        { newPhotos, keptPhotos, removedPhotoIds },
      );
      onClose();
    } catch (ex) {
      setError(friendlyError(ex));
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${expense.title}”? This also deletes its receipt photos.`)) return;
    setBusy(true);
    try {
      await deleteExpense(expense);
      onClose();
    } catch (ex) {
      setError(friendlyError(ex));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={isNew ? 'New expense' : 'Edit expense'}
      onClose={onClose}
      wide
      dismissable={false}
      footer={
        <>
          {!isNew && (
            <button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>Delete</button>
          )}
          <span className="grow" />
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy || photoBusy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="stack">
        <div className="grid-2">
          <label className="field">
            <span className="label">What for?</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Airbnb" maxLength={60} />
          </label>
          <label className="field">
            <span className="label">Amount (₱) <span className="muted tiny">optional for now</span></span>
            <input
              className="input"
              inputMode="decimal"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="e.g. 6000 (or leave blank)"
            />
          </label>
          <label className="field">
            <span className="label">Date</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="field">
            <span className="label">Who paid for it? (optional)</span>
            <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              <option value="">Nobody yet / collect into group fund</option>
              {members.map((m) => <option key={m.key} value={m.key}>{m.name}</option>)}
            </select>
          </label>
        </div>

        <div className="field">
          <div className="row between wrap gap">
            <span className="label">Kasama sa hatian ({partKeys.length}) <span className="muted tiny">optional for now</span></span>
            <div className="row gap">
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setParticipants(memberKeys)}>Select all</button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setParticipants([])}>Clear</button>
            </div>
          </div>
          <div className="pick-grid">
            {members.length === 0 && <span className="muted small">No friends have joined yet. Add people later.</span>}
            {members.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`pick ${participants.includes(m.key) ? 'on' : ''}`}
                onClick={() => toggle(m.key)}
                aria-pressed={participants.includes(m.key)}
              >
                {participants.includes(m.key) ? '✓ ' : ''}{m.name}
              </button>
            ))}
          </div>
        </div>

        {partKeys.length === 0 && (
          <p className="hint">
            💡 You can save this now with just the name, then open it again later to add who's in the hatian.
            Once you pick people, the amount splits equally automatically, or switch to custom amounts.
          </p>
        )}

        {partKeys.length > 0 && !amountOk && (
          <p className="hint">💡 Add the amount whenever you know it. The split will fill in by itself.</p>
        )}

        {partKeys.length > 0 && (
          <div className="field">
            <div className="row between wrap gap">
              <Segmented
                value={splitMode}
                onChange={(v) => {
                  if (v === 'custom' && splitMode === 'equal') {
                    const seeded = {};
                    for (const k of partKeys) seeded[k] = toInputValue(shares[k] || 0);
                    setCustom(seeded);
                  }
                  setSplitMode(v);
                }}
                options={[
                  { value: 'equal', label: '⚖️ Split equally' },
                  { value: 'custom', label: '✍️ Custom amounts' },
                ]}
              />
              <label className="row gap small">
                <span className="muted">Status for everyone:</span>
                <select className="input input-sm" value="" onChange={(e) => setAllStatus(e.target.value)}>
                  <option value="">Choose…</option>
                  <option value="paid">Paid</option>
                  <option value="unpaid">Not yet paid</option>
                </select>
              </label>
            </div>

            <div className="split-table">
              {partKeys.map((k) => (
                <div key={k} className="split-row">
                  <span className="split-name">{nameOf(k)}</span>
                  {splitMode === 'equal' ? (
                    <span className="num">{peso(shares[k])}</span>
                  ) : (
                    <input
                      className="input input-sm num"
                      inputMode="decimal"
                      value={custom[k] ?? ''}
                      onChange={(e) => setCustom((c) => ({ ...c, [k]: e.target.value }))}
                      placeholder="0.00"
                      aria-label={`${nameOf(k)}'s share`}
                    />
                  )}
                  {k === paidBy ? (
                    <span className="chip chip-paid">💳 Paid it</span>
                  ) : (
                    <select
                      className={`input input-sm status-select ${paid[k] ? 'is-paid' : 'is-unpaid'}`}
                      value={paid[k] ? 'paid' : 'unpaid'}
                      onChange={(e) => setPaid((p) => ({ ...p, [k]: e.target.value === 'paid' }))}
                      aria-label={`${nameOf(k)} status`}
                    >
                      <option value="unpaid">Not yet paid</option>
                      <option value="paid">Paid</option>
                    </select>
                  )}
                </div>
              ))}
            </div>
            {splitMode === 'custom' && amountOk && (
              <p className={`small ${diff === 0 ? 'txt-green' : 'txt-orange'}`}>
                {diff === 0
                  ? '✓ Shares add up to the total'
                  : diff > 0
                    ? `${peso(diff)} left to assign`
                    : `${peso(-diff)} over the total`}
              </p>
            )}
          </div>
        )}

        <label className="field">
          <span className="label">Notes</span>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="sa friday pa" maxLength={200} />
        </label>

        <div className="field">
          <span className="label">Receipt photos (for transparency)</span>
          <div className="row gap wrap">
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => cameraRef.current?.click()} disabled={photoBusy}>
              📷 Take photo
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => uploadRef.current?.click()} disabled={photoBusy}>
              🖼️ Upload image
            </button>
            {photoBusy && <span className="muted small">Shrinking photo…</span>}
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
          <input ref={uploadRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />

          {(keptPhotos.length > 0 || newPhotos.length > 0) && (
            <div className="thumbs">
              {keptPhotos.map((p) => (
                <div key={p.id} className="thumb editable">
                  <img src={p.thumb} alt="Receipt" />
                  <button
                    type="button"
                    className="thumb-x"
                    aria-label="Remove photo"
                    onClick={() => {
                      setKeptPhotos((c) => c.filter((x) => x.id !== p.id));
                      setRemovedPhotoIds((c) => [...c, p.id]);
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {newPhotos.map((p) => (
                <div key={p.tempId} className="thumb editable new">
                  <img src={p.thumb} alt="New receipt" />
                  <button
                    type="button"
                    className="thumb-x"
                    aria-label="Remove photo"
                    onClick={() => setNewPhotos((c) => c.filter((x) => x.tempId !== p.tempId))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <ErrorNote>{error}</ErrorNote>
      </div>
    </Modal>
  );
}
