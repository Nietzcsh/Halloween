import { useEffect, useRef } from 'react';

export function Loading({ label = 'Summoning data…' }) {
  return (
    <div className="loading">
      <span className="spin" aria-hidden>🎃</span>
      <span>{label}</span>
    </div>
  );
}

export function Empty({ icon = '🕸️', children }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>{icon}</div>
      <div>{children}</div>
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <p className="error" role="alert">{children}</p>;
}

export function Modal({ title, onClose, children, footer, wide = false, dismissable = true }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissable) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('no-scroll');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('no-scroll');
    };
  }, [dismissable]);

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        e.stopPropagation();
        if (dismissable && e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function StatusChip({ paid, children }) {
  return <span className={`chip ${paid ? 'chip-paid' : 'chip-unpaid'}`}>{children ?? (paid ? 'Paid' : 'Not yet paid')}</span>;
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, tone }) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
