import { useState } from 'react';
import { peso } from '../lib/money';
import { fmtDate, fmtTimestamp } from '../lib/format';
import { renderReceiptPng } from '../lib/receiptImage';
import { shareOrDownload } from '../lib/share';
import { Icon } from './ui';
import { useDialog } from './pickers';

/** Ticket-style receipt. "Save image" draws the same design on a canvas (see lib/receiptImage.js). */
export function ReceiptCard({ receipt: r, onDelete, preview = false }) {
  const [busy, setBusy] = useState(false);
  const dialog = useDialog();

  async function save() {
    setBusy(true);
    try {
      const blob = await renderReceiptPng(r);
      await shareOrDownload(blob, `Kemerut-${r.memberName}-${r.code}.png`);
    } catch (e) {
      dialog.notify({ title: 'Couldn’t save the image', message: e.message || 'Try again in a moment.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="ticket receipt">
      <header className="ticket-band">
        <p className="ticket-brand">Rory's Halloween Kemerut</p>
        <h3 className="receipt-for">Receipt for {r.memberName}</h3>
        <p className="receipt-meta">
          {r.code}
          {r.createdAt ? <span>{fmtTimestamp(r.createdAt)}</span> : null}
        </p>
      </header>
      <div className="ticket-perf" aria-hidden />
      <div className="ticket-paper">
        {r.items.length === 0 ? (
          <p className="receipt-empty">Nothing to pay. Ayos! 🎉</p>
        ) : (
          <ul className="receipt-items">
            {r.items.map((it, i) => (
              <li key={`${it.expenseId}-${i}`} className={it.status === 'paid' ? 'is-paid' : ''}>
                <div className="ri-main">
                  <span className="ri-title">{it.title}</span>
                  <span className="ri-sub">
                    {it.date ? `${fmtDate(it.date)}, ` : ''}
                    {it.isPayer ? 'You paid this one' : `Pay to ${it.payTo}`}
                  </span>
                </div>
                <div className="ri-amount">
                  <span className="num">{peso(it.amount)}</span>
                  <span className={`ri-status ${it.status === 'paid' ? 'paid' : 'unpaid'}`}>
                    {it.status === 'paid' ? 'Paid ✓' : 'Unpaid'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="receipt-total">
          <span>Total due</span>
          <strong className={`num ${r.totalDue > 0 ? 'due' : 'clear'}`}>{peso(r.totalDue)}</strong>
        </div>
        {r.note && <p className="receipt-note">{r.note}</p>}
      </div>

      {!preview && (
        <footer className="receipt-actions">
          <button type="button" className="btn btn-quiet btn-sm" onClick={save} disabled={busy}>
            <Icon name="share" size={18} />
            {busy ? 'Making image…' : 'Save image'}
          </button>
          {onDelete && (
            <button type="button" className="btn btn-quiet btn-sm tone-blood" onClick={onDelete}>
              <Icon name="trash" size={18} />
              Delete
            </button>
          )}
        </footer>
      )}
    </article>
  );
}
