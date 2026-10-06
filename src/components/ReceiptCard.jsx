import { useRef, useState } from 'react';
import { peso } from '../lib/money';
import { fmtDate, fmtTimestamp } from '../lib/format';
import { saveNodeAsImage } from '../lib/share';

/** A per-friend receipt Rory generated. Friends can save it as an image to send in the GC. */
export function ReceiptCard({ receipt: r, onDelete, preview = false }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await saveNodeAsImage(ref.current, `${r.code}-${r.memberName}.png`);
    } catch (e) {
      alert(e.message || 'Could not save the image');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="receipt-wrap">
      <div className="receipt" ref={ref}>
        <div className="receipt-head">
          <div className="receipt-brand">🎃 Kemerut Receipt</div>
          <div className="muted tiny">{r.code}{r.createdAt ? ` · ${fmtTimestamp(r.createdAt)}` : ''}</div>
        </div>
        <div className="receipt-to">For <b>{r.memberName}</b></div>

        {r.items.length === 0 ? (
          <p className="muted small">Nothing to pay. Ayos! 🎉</p>
        ) : (
          <table className="receipt-table">
            <tbody>
              {r.items.map((it, i) => (
                <tr key={`${it.expenseId}-${i}`} className={it.status === 'paid' ? 'is-paid' : ''}>
                  <td>
                    <div>{it.title}</div>
                    <div className="muted tiny">
                      {it.date ? `${fmtDate(it.date)} · ` : ''}
                      {it.isPayer ? 'You paid this one' : `Pay to ${it.payTo}`}
                    </div>
                  </td>
                  <td className="num">
                    {peso(it.amount)}
                    <div className={`tiny ${it.status === 'paid' ? 'txt-green' : 'txt-orange'}`}>
                      {it.status === 'paid' ? '✓ paid' : 'unpaid'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="receipt-total">
          <span>Total due</span>
          <b>{peso(r.totalDue)}</b>
        </div>
        {r.note && <p className="receipt-note">{r.note}</p>}
        <div className="receipt-foot tiny muted">Rory's Halloween Kemerut · Oct 31 🦇</div>
      </div>

      {!preview && (
        <div className="row gap wrap">
          <button type="button" className="btn btn-ghost btn-sm" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : '📸 Save as image'}
          </button>
          {onDelete && (
            <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
          )}
        </div>
      )}
    </div>
  );
}
