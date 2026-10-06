import { peso } from '../lib/money';
import { expenseStatus, isSettled } from '../lib/settle';
import { fmtDate } from '../lib/format';
import { PhotoThumbs } from './Photos';
import { StatusChip } from './ui';

/**
 * One expense ("Airbnb ₱6,000"). Used by friends (read-only) and by Rory (tap to edit).
 * `me` highlights the viewer's own share.
 */
export function ExpenseCard({ expense: e, nameOf, me, onClick }) {
  const st = expenseStatus(e);
  const myShare = me ? e.shares?.[me] : undefined;
  const clickable = !!onClick;

  return (
    <article
      className={`card expense ${clickable ? 'clickable' : ''}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (ev) => (ev.key === 'Enter' || ev.key === ' ') && onClick() : undefined}
    >
      <div className="row between top">
        <div className="min0">
          <h3 className="expense-title">{e.title}</h3>
          <div className="muted small">
            {fmtDate(e.date)}
            {e.date ? ' · ' : ''}
            {e.paidBy ? <>Paid by <b>{nameOf(e.paidBy)}</b></> : 'Collected by Rory'}
          </div>
        </div>
        <div className="right">
          <div className="amount">{st.noAmount ? <span className="muted">Amount TBD</span> : peso(e.amount)}</div>
          {st.draft ? (
            <span className="chip chip-draft">✏️ {st.noPeople ? 'Hatian TBD' : 'Amount TBD'}</span>
          ) : (
            <StatusChip paid={st.done}>{st.done ? 'All settled' : `${st.paidCount}/${st.total} paid`}</StatusChip>
          )}
        </div>
      </div>

      {st.noPeople && (
        <p className="muted small draft-note">
          {clickable ? 'No one in the hatian yet. Tap to add people.' : 'Rory is still deciding who is in the hatian.'}
        </p>
      )}

      {me && myShare !== undefined && !st.noAmount && (
        <div className="my-share">
          <span>Your share: <b>{peso(myShare)}</b></span>
          <StatusChip paid={isSettled(e, me)}>{e.paidBy === me ? 'You paid this' : undefined}</StatusChip>
        </div>
      )}

      <div className={(e.participants || []).length ? 'chips' : ''}>
        {(e.participants || []).map((k) =>
          st.noAmount ? (
            <span key={k} className={`chip ${k === me ? 'chip-me' : ''}`}>{nameOf(k)}</span>
          ) : (
            <span
              key={k}
              className={`chip ${isSettled(e, k) ? 'chip-paid' : 'chip-unpaid'} ${k === me ? 'chip-me' : ''}`}
              title={isSettled(e, k) ? 'Paid' : 'Not yet paid'}
            >
              {isSettled(e, k) ? '✓ ' : ''}
              {nameOf(k)} · {peso(e.shares?.[k])}
            </span>
          ),
        )}
      </div>

      {e.notes && <p className="notes">📝 {e.notes}</p>}
      <PhotoThumbs photos={e.photos} />
    </article>
  );
}
