import { useState } from 'react';
import { peso } from '../lib/money';
import { expenseStatus, isSettled } from '../lib/settle';
import { fmtDate } from '../lib/format';
import { PhotoThumbs } from './Photos';
import { Icon, Progress, StatusPill } from './ui';

/**
 * One expense as a compact row.
 *  - Friends: tap to expand who's in the hatian, notes and photos.
 *  - Rory: pass onEdit, and tapping opens the editor.
 * `me` highlights the viewer's own share.
 */
export function ExpenseCard({ expense: e, nameOf, me, onEdit }) {
  const [open, setOpen] = useState(false);
  const st = expenseStatus(e);
  const myShare = me ? e.shares?.[me] : undefined;
  const inIt = me && (e.participants || []).includes(me);
  const payer = e.paidBy ? nameOf(e.paidBy) : null;
  const expanded = !onEdit && open;
  const hasDetails = (e.participants || []).length > 0 || e.notes || (e.photos || []).length > 0;

  const onTap = onEdit || (hasDetails ? () => setOpen((o) => !o) : undefined);

  return (
    <article className={`expense ${expanded ? 'is-open' : ''}`}>
      <button type="button" className="expense-head" onClick={onTap} aria-expanded={onEdit ? undefined : expanded}>
        <div className="expense-main">
          <span className="expense-title">{e.title}</span>
          <span className="expense-sub">
            {e.date ? fmtDate(e.date) : 'No date'}
            {', '}
            {payer ? `${payer} paid` : 'Rory collects'}
          </span>
        </div>
        <div className="expense-side">
          <span className={`expense-amount num ${st.noAmount ? 'muted' : ''}`}>
            {st.noAmount ? '—' : peso(e.amount)}
          </span>
          {st.draft ? (
            <StatusPill tone="haunt">{st.noPeople ? 'Hatian TBD' : 'Amount TBD'}</StatusPill>
          ) : st.done ? (
            <StatusPill tone="ecto">Settled</StatusPill>
          ) : (
            <StatusPill tone="pumpkin">{st.paidCount}/{st.total} paid</StatusPill>
          )}
        </div>
        {onEdit ? (
          <Icon name="chevron" size={18} className="expense-chev" />
        ) : hasDetails ? (
          <Icon name="chevron" size={18} className={`expense-chev ${expanded ? 'rot' : ''}`} />
        ) : (
          <span className="expense-chev" />
        )}
      </button>

      {inIt && !st.noAmount && (
        <div className="expense-mine">
          <span>
            Your share <strong className="num">{peso(myShare)}</strong>
          </span>
          {e.paidBy === me ? (
            <StatusPill tone="haunt">You paid this</StatusPill>
          ) : isSettled(e, me) ? (
            <StatusPill tone="ecto">Paid ✓</StatusPill>
          ) : (
            <StatusPill tone="pumpkin">Not yet paid</StatusPill>
          )}
        </div>
      )}

      {!st.draft && st.total > 0 && !expanded && (
        <Progress value={st.paidCount} max={st.total} label={`${st.paidCount} of ${st.total} paid`} />
      )}

      {onEdit && (e.notes || (e.photos || []).length > 0) && (
        <p className="expense-peek">
          {e.notes}
          {(e.photos || []).length > 0 && (
            <span className="peek-photos">
              <Icon name="image" size={15} /> {e.photos.length}
            </span>
          )}
        </p>
      )}

      {expanded && (
        <div className="expense-detail">
          {(e.participants || []).length > 0 ? (
            <ul className="share-list">
              {e.participants.map((k) => {
                const done = isSettled(e, k);
                return (
                  <li key={k} className={k === me ? 'is-me' : ''}>
                    <span className={`dot ${done ? 'dot-ecto' : 'dot-pumpkin'}`} aria-hidden />
                    <span className="share-name">
                      {nameOf(k)}
                      {k === me ? ' (you)' : ''}
                    </span>
                    <span className="num share-amt">{st.noAmount ? '' : peso(e.shares?.[k])}</span>
                    <span className={`share-state ${done ? 'txt-ecto' : 'txt-pumpkin'}`}>
                      {k === e.paidBy ? 'Paid it' : done ? 'Paid' : 'Not yet'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted small">Rory is still deciding who's in the hatian.</p>
          )}
          {e.notes && <p className="expense-notes">{e.notes}</p>}
          <PhotoThumbs photos={e.photos} />
        </div>
      )}
    </article>
  );
}
