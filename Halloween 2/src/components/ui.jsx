import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/* ---------------- Icons (inline SVG, inherit text color) ---------------- */

const ICONS = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <path d="M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z" />
      <circle cx="16" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  poll: <path d="M6 20V11M12 20V5M18 20v-6" />,
  receipt: <path d="M6.5 3.5h11v17l-2.75-1.75L12 20.5l-2.75-1.75L6.5 20.5zM9.5 8.5h5M9.5 12h5" />,
  swap: <path d="M6 8h12l-3.5-3.5M18 16H6l3.5 3.5" />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0M15.5 5.5a3 3 0 0 1 0 6M20.5 19.5a5.5 5.5 0 0 0-3.5-5.1" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  more: (
    <>
      <circle cx="5.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  chevron: <path d="m9.5 6 6 6-6 6" />,
  back: <path d="m14.5 6-6 6 6 6" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  image: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="m4 16 4.5-4.5L13 16l2.5-2.5L20 18" />
      <circle cx="15.5" cy="9.5" r="1.3" />
    </>
  ),
  link: <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  trash: <path d="M5 7h14M10 7V5h4v2M7 7l1 12.5h8L17 7M10.5 10.5v6M13.5 10.5v6" />,
  edit: <path d="m14.5 5.5 4 4L8 20H4v-4zM12.5 7.5l4 4" />,
  share: <path d="M12 15V4M8 7.5 12 3.5l4 4M5 12.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6.5" />,
  phone: (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2.5" />
      <path d="M11 17.5h2" />
    </>
  ),
  ghost: <path d="M6 20V10a6 6 0 0 1 12 0v10l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM10 10.5h.01M14 10.5h.01" />,
  calendar: (
    <>
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" />
      <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
    </>
  ),
  down: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  chat: <path d="M4.5 6.5A2 2 0 0 1 6.5 4.5h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H11l-4.5 3.5v-3.5h0a2 2 0 0 1-2-2zM8.5 9.5h7M8.5 12.5h4.5" />,
  send: <path d="M4.5 12 19.5 5l-4 14-3.5-5.5zM12 13.5 19.5 5" />,
  pin: <path d="M9 4.5h6l-1 5 3 3v1.5H7V12.5l3-3zM12 15v4.5" />,
  backspace: <path d="M9 5.5h10a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 1-1.5 1.5H9L3.5 12zM11.5 9.5l5 5M16.5 9.5l-5 5" />,
  coins: (
    <>
      <ellipse cx="10" cy="7.5" rx="6" ry="2.75" />
      <path d="M4 7.5v4c0 1.5 2.7 2.75 6 2.75s6-1.25 6-2.75v-4M8 16.2c.6.1 1.3.15 2 .15 3.3 0 6-1.25 6-2.75M14 18.9c3.3 0 6-1.25 6-2.75v-4c0-1.2-1.6-2.2-4-2.6" />
    </>
  ),
};

export function Icon({ name, size = 22, className = '', strokeWidth = 1.8, label }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {ICONS[name]}
    </svg>
  );
}

/* ---------------- Avatar: initials on a themed color ---------------- */

const AVATAR_TONES = ['pumpkin', 'ecto', 'haunt', 'blood', 'bone'];

export function initials(name = '') {
  const parts = name
    .replace(/\(.*?\)/g, ' ') // "Group fund (Rory)" → "Group fund"
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean);
  if (!parts.length) return '?';
  const first = [...parts[0]][0] || '';
  const second = parts.length > 1 ? [...parts[parts.length - 1]][0] || '' : '';
  return (first + second).toUpperCase();
}

export function Avatar({ name, size = 'md', icon }) {
  let h = 0;
  for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const tone = icon ? 'pumpkin' : AVATAR_TONES[h % AVATAR_TONES.length];
  return (
    <span className={`avatar avatar-${size} tone-${tone}`} aria-hidden>
      {icon ? <Icon name={icon} size={20} /> : initials(name)}
    </span>
  );
}

/* ---------------- Feedback ---------------- */

export function Loading({ label = 'Summoning data…' }) {
  return (
    <div className="loading" role="status">
      <span className="spin" aria-hidden>🎃</span>
      <span>{label}</span>
    </div>
  );
}

export function Empty({ icon = '🕸️', title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden>{icon}</div>
      {title && <p className="empty-title">{title}</p>}
      {children && <p className="empty-text">{children}</p>}
      {action}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return <p className="note note-error" role="alert">{children}</p>;
}

export function SuccessNote({ children }) {
  if (!children) return null;
  return <p className="note note-success" role="status">{children}</p>;
}

/* ---------------- Status pill ---------------- */

export function StatusPill({ tone = 'neutral', children }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

/* ---------------- Progress bar ---------------- */

export function Progress({ value, max, tone = 'ecto', label }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <span className={`progress progress-${tone}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${pct}%` }} />
    </span>
  );
}

/* ---------------- Segmented control ---------------- */

export function Segmented({ value, onChange, options, full = false }) {
  return (
    <div className={`seg ${full ? 'seg-full' : ''}`} role="tablist">
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

/* ---------------- Sheets & full-screen modal ---------------- */

// Overlays can stack (a picker sheet on top of the full-screen editor), so the
// page stays locked until the last one closes, and Escape closes only the top one.
const overlayStack = [];

function useOverlay(onClose, dismissable) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const entry = { close: () => closeRef.current(), dismissable };
    overlayStack.push(entry);
    document.body.classList.add('no-scroll');
    const onKey = (e) => {
      if (e.key !== 'Escape' || overlayStack[overlayStack.length - 1] !== entry) return;
      if (entry.dismissable) {
        e.stopPropagation();
        entry.close();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      overlayStack.splice(overlayStack.indexOf(entry), 1);
      if (!overlayStack.length) document.body.classList.remove('no-scroll');
    };
  }, [dismissable]);
}

/** Bottom sheet that slides up (menus, pickers, photo viewer, confirmations). */
export function Sheet({ title, onClose, children, footer, className = '' }) {
  useOverlay(onClose, true);
  return createPortal(
    <div
      className="overlay"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`sheet ${className}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" aria-hidden />
        {title && <h2 className="sheet-title">{title}</h2>}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function SheetAction({ icon, tone, onClick, children, disabled }) {
  return (
    <button type="button" className={`sheet-action ${tone ? `tone-${tone}` : ''}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} />}
      <span>{children}</span>
    </button>
  );
}

/** Full-screen editor on phones, centered panel on bigger screens. Cancel / title / primary action on top. */
export function FullScreen({ title, onClose, primary, children }) {
  useOverlay(onClose, false);
  return (
    <div className="overlay overlay-full" onClick={(e) => e.stopPropagation()}>
      <div className="fullscreen" role="dialog" aria-modal="true" aria-label={title}>
        <header className="fs-bar">
          <button type="button" className="fs-cancel" onClick={onClose}>Cancel</button>
          <h2 className="fs-title">{title}</h2>
          {primary}
        </header>
        <div className="fs-body">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Grouped list (iOS-style inset group) ---------------- */

export function Group({ title, aside, children, footer }) {
  return (
    <section className="group">
      {(title || aside) && (
        <div className="group-head">
          {title && <h2 className="group-title">{title}</h2>}
          {aside}
        </div>
      )}
      <div className="group-body">{children}</div>
      {footer && <p className="group-foot">{footer}</p>}
    </section>
  );
}
