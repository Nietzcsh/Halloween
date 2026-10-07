import { useMemo, useRef, useState } from 'react';
import { deleteExpense, saveExpense } from '../../data';
import { parsePeso, peso, splitEqual, sum, toInputValue } from '../../lib/money';
import { prepareReceiptPhoto } from '../../lib/images';
import { friendlyError, todayISO } from '../../lib/format';
import { ErrorNote, FullScreen, Icon, Segmented } from '../../components/ui';
import { AmountField, DateField, SelectField, useDialog } from '../../components/pickers';
import { ShareSheet } from '../../components/ShareSheet';
import { expenseNudge } from '../../lib/nudge';

/**
 * The "sheet" for one expense. Only the name is required; people, amount,
 * who paid, notes and photos can all be filled in later.
 */
export default function ExpenseEditor({ expense, members, onClose, flash }) {
  const isNew = !expense;

  const [title, setTitle] = useState(expense?.title || '');
  const [amountStr, setAmountStr] = useState(expense?.amount ? toInputValue(expense.amount) : '');
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

  const dialog = useDialog();
  const [nudging, setNudging] = useState(false);
  const cameraRef = useRef(null);
  const uploadRef = useRef(null);

  const memberKeys = members.map((m) => m.key);
  const nameOf = (k) => members.find((m) => m.key === k)?.name || `${k} (removed)`;
  // Nudges use the saved version of the expense (what friends actually see).
  const savedNudge = expense ? expenseNudge(expense, nameOf) : null;
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
  const paidCount = partKeys.filter((k) => k === paidBy || paid[k]).length;

  function toggle(k) {
    setParticipants((cur) => (cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k]));
  }

  function setAllPaid(value) {
    const next = {};
    for (const k of partKeys) next[k] = value;
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
    if (!title.trim()) return setError('Give the expense a name, like Airbnb.');
    if (amountInvalid) return setError('That amount looks off. Use numbers like 6000 or 1,250.50, or leave it blank for now.');
    if (splitMode === 'custom' && amountOk && partKeys.length && diff !== 0) {
      return setError(`The shares add up to ${peso(shareTotal)}, but the expense is ${peso(amount)}.`);
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
    const ok = await dialog.confirm({
      title: `Delete “${expense.title}”?`,
      message: 'Its receipt photos go too. This can’t be undone.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
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
    <FullScreen
      title={isNew ? 'New expense' : 'Edit expense'}
      onClose={onClose}
      primary={
        <button type="button" className="fs-save" onClick={save} disabled={busy || photoBusy}>
          {busy ? 'Saving…' : 'Save'}
        </button>
      }
    >
      <div className="form">
        <ErrorNote>{error}</ErrorNote>

        {/* ---- Basics ---- */}
        <div className="fieldset">
          <label className="field">
            <span className="field-label">What for</span>
            <input className="input input-lg" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Airbnb" maxLength={60} />
          </label>
          <div className="field-row">
            <div className="field">
              <span className="field-label">Amount <span className="field-hint">optional</span></span>
              <AmountField value={amountStr} onChange={setAmountStr} title={title.trim() ? `How much for ${title.trim()}?` : 'How much?'} label="Amount" />
            </div>
            <div className="field">
              <span className="field-label">Date</span>
              <DateField value={date} onChange={setDate} title="When was it?" label="Date" />
            </div>
          </div>
          <div className="field">
            <span className="field-label">Who paid for it <span className="field-hint">optional</span></span>
            <SelectField
              value={paidBy}
              onChange={setPaidBy}
              title="Who paid for it?"
              label="Who paid"
              options={[
                { value: '', label: 'Nobody yet', sub: "I'll collect it into the group fund", emoji: '🪙' },
                ...members.map((m) => ({ value: m.key, label: m.name, avatar: m.name })),
              ]}
            />
          </div>
        </div>

        {/* ---- Hatian ---- */}
        <div className="fieldset">
          <div className="fieldset-head">
            <span className="field-label">
              Kasama sa hatian <span className="field-hint">{partKeys.length ? `${partKeys.length} picked` : 'optional for now'}</span>
            </span>
            {members.length > 0 && (
              <button
                type="button"
                className="link-btn"
                onClick={() => setParticipants(partKeys.length === memberKeys.length ? [] : memberKeys)}
              >
                {partKeys.length === memberKeys.length ? 'Clear' : 'Select all'}
              </button>
            )}
          </div>
          {members.length === 0 ? (
            <p className="muted small">No friends have joined yet. Add people later.</p>
          ) : (
            <div className="pick-grid">
              {members.map((m) => {
                const on = participants.includes(m.key);
                return (
                  <button key={m.key} type="button" className={`pick ${on ? 'on' : ''}`} onClick={() => toggle(m.key)} aria-pressed={on}>
                    {on && <Icon name="check" size={15} strokeWidth={2.6} />}
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
          {partKeys.length === 0 && (
            <p className="note note-haunt">You can save with just the name and add people later. Once you pick people, the amount splits equally.</p>
          )}
          {partKeys.length > 0 && !amountOk && (
            <p className="note note-haunt">Add the amount whenever you know it. The split fills in by itself.</p>
          )}
        </div>

        {/* ---- Split & status ---- */}
        {partKeys.length > 0 && (
          <div className="fieldset">
            <Segmented
              full
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
                { value: 'equal', label: 'Split equally' },
                { value: 'custom', label: 'Custom' },
              ]}
            />

            <div className="fieldset-head">
              <span className="field-label">
                Who has paid <span className="field-hint">{paidCount} of {partKeys.length}</span>
              </span>
              <span className="row-gap">
                <button type="button" className="link-btn" onClick={() => setAllPaid(true)}>All paid</button>
                <button type="button" className="link-btn" onClick={() => setAllPaid(false)}>None</button>
              </span>
            </div>

            <ul className="split-list">
              {partKeys.map((k) => {
                const isPayer = k === paidBy;
                const isPaid = isPayer || !!paid[k];
                return (
                  <li key={k}>
                    <span className="split-name">{nameOf(k)}</span>
                    {splitMode === 'equal' ? (
                      <span className="split-amt num">{amountOk ? peso(shares[k]) : '—'}</span>
                    ) : (
                      <AmountField
                        size="sm"
                        value={custom[k] ?? ''}
                        onChange={(v) => setCustom((c) => ({ ...c, [k]: v }))}
                        placeholder="0"
                        title={`${nameOf(k)}'s share`}
                      />
                    )}
                    {isPayer ? (
                      <span className="toggle-pill is-payer">Paid it</span>
                    ) : (
                      <button
                        type="button"
                        className={`toggle-pill ${isPaid ? 'is-paid' : 'is-unpaid'}`}
                        onClick={() => setPaid((p) => ({ ...p, [k]: !p[k] }))}
                        aria-pressed={isPaid}
                        aria-label={`${nameOf(k)}: ${isPaid ? 'paid' : 'not yet paid'}. Tap to change.`}
                      >
                        {isPaid ? 'Paid' : 'Not yet'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
            {splitMode === 'custom' && amountOk && (
              <p className={`small ${diff === 0 ? 'txt-ecto' : 'txt-pumpkin'}`}>
                {diff === 0 ? 'Shares add up to the total.' : diff > 0 ? `${peso(diff)} left to assign.` : `${peso(-diff)} over the total.`}
              </p>
            )}
            {savedNudge && (
              <button type="button" className="btn btn-nudge btn-block" onClick={() => setNudging(true)}>
                📣 Nudge {savedNudge.count} who {savedNudge.count === 1 ? "hasn't" : "haven't"} paid
              </button>
            )}
          </div>
        )}

        {/* ---- Notes & photos ---- */}
        <div className="fieldset">
          <label className="field">
            <span className="field-label">Notes</span>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="sa friday pa" maxLength={200} />
          </label>

          <div className="field">
            <span className="field-label">Receipt photos <span className="field-hint">so everyone can see</span></span>
            <div className="photo-grid">
              {keptPhotos.map((p) => (
                <div key={p.id} className="photo-tile">
                  <img src={p.thumb} alt="" />
                  <button
                    type="button"
                    className="photo-x"
                    aria-label="Remove photo"
                    onClick={() => {
                      setKeptPhotos((c) => c.filter((x) => x.id !== p.id));
                      setRemovedPhotoIds((c) => [...c, p.id]);
                    }}
                  >
                    <Icon name="close" size={14} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
              {newPhotos.map((p) => (
                <div key={p.tempId} className="photo-tile is-new">
                  <img src={p.thumb} alt="" />
                  <button type="button" className="photo-x" aria-label="Remove photo" onClick={() => setNewPhotos((c) => c.filter((x) => x.tempId !== p.tempId))}>
                    <Icon name="close" size={14} strokeWidth={2.4} />
                  </button>
                </div>
              ))}
              <button type="button" className="photo-add" onClick={() => cameraRef.current?.click()} disabled={photoBusy}>
                <Icon name="camera" />
                <span>{photoBusy ? 'Shrinking…' : 'Camera'}</span>
              </button>
              <button type="button" className="photo-add" onClick={() => uploadRef.current?.click()} disabled={photoBusy}>
                <Icon name="image" />
                <span>Gallery</span>
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => addFiles(e.target.files)} />
            <input ref={uploadRef} type="file" accept="image/*" multiple hidden onChange={(e) => addFiles(e.target.files)} />
          </div>
        </div>

        {!isNew && (
          <button type="button" className="btn btn-quiet btn-block tone-blood" onClick={remove} disabled={busy}>
            <Icon name="trash" size={18} /> Delete expense
          </button>
        )}
      </div>
      {nudging && savedNudge && <ShareSheet spec={savedNudge} onClose={() => setNudging(false)} flash={flash} />}
    </FullScreen>
  );
}
