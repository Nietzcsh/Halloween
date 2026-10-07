// Custom, on-theme replacements for the phone's built-in controls:
// dropdowns, date picker, number keyboard, checkboxes and browser pop-ups.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Avatar, Icon, Sheet } from './ui';

/* =====================================================================
   SelectField: tap → slide-up list of options
   options: [{ value, label, sub?, meta?, avatar?, emoji? }]
   ===================================================================== */
export function SelectField({ value, onChange, options, placeholder = 'Choose', title, label }) {
  const [open, setOpen] = useState(false);
  const sel = options.find((o) => o.value === value);

  return (
    <>
      <button
        type="button"
        className={`picker ${sel ? '' : 'is-empty'}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={label ? `${label}: ${sel ? sel.label : placeholder}` : undefined}
      >
        {sel?.avatar && <Avatar name={sel.avatar} size="xs" />}
        {sel?.emoji && <span className="picker-emoji" aria-hidden>{sel.emoji}</span>}
        <span className="picker-text">{sel ? sel.label : placeholder}</span>
        {sel?.meta && <span className="picker-meta num">{sel.meta}</span>}
        <Icon name="down" size={20} className="picker-chev" />
      </button>

      {open && (
        <Sheet title={title || label} onClose={() => setOpen(false)}>
          <ul className="opt-list" role="listbox" aria-label={title || label}>
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <li key={o.value || '__none'}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`opt ${selected ? 'is-selected' : ''}`}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    {o.avatar ? <Avatar name={o.avatar} /> : o.emoji ? <span className="opt-emoji" aria-hidden>{o.emoji}</span> : null}
                    <span className="opt-main">
                      <strong>{o.label}</strong>
                      {o.sub && <span>{o.sub}</span>}
                    </span>
                    {o.meta && <span className="opt-meta num">{o.meta}</span>}
                    <span className="opt-check" aria-hidden>{selected && <Icon name="check" size={18} strokeWidth={2.6} />}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Sheet>
      )}
    </>
  );
}

/* =====================================================================
   DateField: tap → spooky month calendar (Oct 31 gets a pumpkin)
   value: 'YYYY-MM-DD'
   ===================================================================== */
const PARTY = '2026-10-31';
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parseISO = (s) => {
  const [y, m, d] = String(s || '').split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
const todayISO = () => {
  const t = new Date();
  return iso(t.getFullYear(), t.getMonth(), t.getDate());
};

function prettyDate(s) {
  const d = parseISO(s);
  if (!d) return '';
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

export function DateField({ value, onChange, title = 'Pick a date', label }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={`picker ${value ? '' : 'is-empty'}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={label ? `${label}: ${value ? prettyDate(value) : 'none'}` : undefined}
      >
        <Icon name="calendar" size={20} className="picker-lead" />
        <span className="picker-text">{value ? prettyDate(value) : 'Pick a date'}</span>
        {value === PARTY && <span aria-hidden>🎃</span>}
      </button>
      {open && (
        <CalendarSheet
          title={title}
          value={value}
          onClose={() => setOpen(false)}
          onPick={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

function CalendarSheet({ title, value, onPick, onClose }) {
  const start = parseISO(value) || new Date();
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const today = todayISO();

  const first = new Date(view.y, view.m, 1);
  const lead = first.getDay();
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: count }, (_, i) => i + 1)];
  const monthName = first.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });

  const shift = (delta) =>
    setView(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <Sheet title={title} onClose={onClose}>
      <div className="cal">
        <div className="cal-head">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month"><Icon name="back" /></button>
          <span className="cal-month">{monthName}</span>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month"><Icon name="chevron" /></button>
        </div>
        <div className="cal-grid" role="grid" aria-label={monthName}>
          {WEEKDAYS.map((w, i) => <span key={`w${i}`} className="cal-dow" aria-hidden>{w}</span>)}
          {cells.map((d, i) => {
            if (!d) return <span key={`b${i}`} />;
            const key = iso(view.y, view.m, d);
            const isSel = key === value;
            const isParty = key === PARTY;
            return (
              <button
                key={key}
                type="button"
                className={`cal-day ${isSel ? 'is-sel' : ''} ${key === today ? 'is-today' : ''} ${isParty ? 'is-party' : ''}`}
                onClick={() => onPick(key)}
                aria-pressed={isSel}
                aria-label={`${prettyDate(key)}${isParty ? ', party night' : ''}`}
              >
                {d}
                {isParty && <span className="cal-pumpkin" aria-hidden>🎃</span>}
              </button>
            );
          })}
        </div>
        <div className="chip-row cal-quick">
          <button type="button" className="chip-btn" onClick={() => onPick(today)}>Today</button>
          <button type="button" className="chip-btn" onClick={() => onPick(PARTY)}>Party night 🎃</button>
        </div>
      </div>
    </Sheet>
  );
}

/* =====================================================================
   AmountField: tap → ₱ keypad sheet (no phone keyboard)
   value: plain string like "1250.5" (same as before, works with parsePeso)
   ===================================================================== */
function groupDigits(s) {
  if (!s) return '';
  const [int, dec] = s.split('.');
  const grouped = (int || '0').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

function normalize(v) {
  const s = String(v ?? '').replace(/[₱,\s]/g, '');
  if (!s || !/^\d*\.?\d{0,2}$/.test(s)) return '';
  const n = Number(s);
  if (!Number.isFinite(n) || n === 0) return '';
  return s.replace(/^0+(?=\d)/, '');
}

export function AmountField({ value, onChange, placeholder = 'Not sure yet', title = 'Amount', size, label }) {
  const [open, setOpen] = useState(false);
  const shown = normalize(value);
  return (
    <>
      <button
        type="button"
        className={`picker picker-amount ${size === 'sm' ? 'picker-sm' : ''} ${shown ? '' : 'is-empty'}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label={`${label || title}: ${shown ? `₱${groupDigits(shown)}` : placeholder}`}
      >
        <span className="picker-peso" aria-hidden>₱</span>
        <span className="picker-text num">{shown ? groupDigits(shown) : placeholder}</span>
      </button>
      {open && (
        <AmountPad
          title={title}
          initial={shown}
          onClose={() => setOpen(false)}
          onDone={(v) => {
            onChange(v);
            setOpen(false);
          }}
        />
      )}
    </>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'del'];
const QUICK = [100, 500, 1000];

function AmountPad({ title, initial, onDone, onClose }) {
  const [s, setS] = useState(initial || '');

  function press(k) {
    setS((cur) => {
      if (k === 'del') return cur.slice(0, -1);
      if (k === '.') return cur.includes('.') ? cur : `${cur || '0'}.`;
      const [int, dec] = cur.split('.');
      if (dec !== undefined && dec.length >= 2) return cur;
      if (dec === undefined && int.length >= 8) return cur;
      if (cur === '0') return k;
      return cur + k;
    });
  }

  function addQuick(n) {
    setS((cur) => {
      const total = Math.round(((Number(cur) || 0) + n) * 100) / 100;
      return String(total).replace(/\.0+$/, '');
    });
  }

  const finish = () => onDone(s.replace(/\.$/, ''));

  // On a laptop, typing works too.
  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === '.' || e.key === ',') press('.');
      else if (e.key === 'Backspace') press('del');
      else if (e.key === 'Enter') {
        e.preventDefault();
        finish();
      } else return;
      e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <Sheet
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-quiet" onClick={() => setS('')}>Clear</button>
          <button type="button" className="btn btn-primary" onClick={finish}>Done</button>
        </>
      }
    >
      <div className="pad">
        <div className={`pad-display num ${s ? '' : 'is-empty'}`} aria-live="polite">
          <span className="pad-peso">₱</span>
          {s ? groupDigits(s) : '0'}
        </div>
        <div className="chip-row pad-quick">
          {QUICK.map((n) => (
            <button key={n} type="button" className="chip-btn" onClick={() => addQuick(n)}>+{n.toLocaleString('en-PH')}</button>
          ))}
        </div>
        <div className="pad-keys">
          {KEYS.map((k) => (
            <button key={k} type="button" className="pad-key" onClick={() => press(k)} aria-label={k === 'del' ? 'Delete' : k === '.' ? 'Decimal point' : k}>
              {k === 'del' ? <Icon name="backspace" size={26} /> : k}
            </button>
          ))}
        </div>
      </div>
    </Sheet>
  );
}

/* =====================================================================
   Switch: on-theme toggle instead of a checkbox
   ===================================================================== */
export function Switch({ checked, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={checked} className="switch-row" onClick={() => onChange(!checked)}>
      <span className="switch-label">{label}</span>
      <span className={`switch ${checked ? 'on' : ''}`} aria-hidden><span /></span>
    </button>
  );
}

/* =====================================================================
   Dialogs: in-app confirm / rename / notice instead of browser pop-ups
   const dialog = useDialog();
   if (await dialog.confirm({ title, message, confirmLabel, danger: true })) …
   const name = await dialog.prompt({ title, defaultValue });
   await dialog.notify({ title, message });
   ===================================================================== */
const DialogCtx = createContext(null);
let dialogSeq = 0;

export function DialogProvider({ children }) {
  const [d, setD] = useState(null);
  const api = useMemo(
    () => ({
      confirm: (opts) => new Promise((resolve) => setD({ kind: 'confirm', ...opts, resolve, id: ++dialogSeq })),
      prompt: (opts) => new Promise((resolve) => setD({ kind: 'prompt', ...opts, resolve, id: ++dialogSeq })),
      notify: (opts) => new Promise((resolve) => setD({ kind: 'notify', ...(typeof opts === 'string' ? { message: opts } : opts), resolve, id: ++dialogSeq })),
    }),
    [],
  );
  const close = (val) => {
    d?.resolve(val);
    setD(null);
  };
  return (
    <DialogCtx.Provider value={api}>
      {children}
      {d && <DialogSheet key={d.id} d={d} close={close} />}
    </DialogCtx.Provider>
  );
}

export function useDialog() {
  return useContext(DialogCtx);
}

function DialogSheet({ d, close }) {
  const [text, setText] = useState(d.defaultValue || '');
  const cancelValue = d.kind === 'prompt' ? null : false;
  const emoji = d.emoji ?? (d.danger ? '🪦' : d.kind === 'notify' ? '👻' : d.kind === 'prompt' ? '✏️' : '🦇');
  const submit = () => close(d.kind === 'prompt' ? text.trim() : true);

  return (
    <Sheet
      onClose={() => close(cancelValue)}
      className="sheet-dialog"
      footer={
        d.kind === 'notify' ? (
          <button type="button" className="btn btn-primary btn-block" onClick={() => close(true)}>{d.confirmLabel || 'Okay'}</button>
        ) : (
          <>
            <button type="button" className="btn btn-quiet" onClick={() => close(cancelValue)}>{d.cancelLabel || 'Cancel'}</button>
            <button
              type="button"
              className={`btn ${d.danger ? 'btn-danger' : 'btn-primary'}`}
              onClick={submit}
              disabled={d.kind === 'prompt' && !text.trim()}
            >
              {d.confirmLabel || (d.kind === 'prompt' ? 'Save' : 'Yes')}
            </button>
          </>
        )
      }
    >
      <div className="dialog">
        <div className="dialog-emoji" aria-hidden>{emoji}</div>
        {d.title && <h2 className="dialog-title">{d.title}</h2>}
        {d.message && <p className="dialog-msg">{d.message}</p>}
        {d.kind === 'prompt' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) submit();
            }}
          >
            <input
              className="input input-lg"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={d.maxLength || 60}
              placeholder={d.placeholder}
              autoFocus
              enterKeyHint="done"
              aria-label={d.title}
            />
          </form>
        )}
      </div>
    </Sheet>
  );
}
