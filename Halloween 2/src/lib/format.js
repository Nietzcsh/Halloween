export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export function fmtTimestamp(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return '';
  return d.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Whole days from today until Oct 31 (local time). */
export function daysUntilParty() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const party = new Date(2026, 9, 31);
  return Math.round((party - today) / 86400000);
}

export function friendlyError(e) {
  const code = e?.code || '';
  if (code === 'permission-denied') return 'Not allowed. (If you are Rory: check the Firestore rules are published.)';
  if (code === 'unavailable') return 'You seem to be offline. Try again when you have signal.';
  if (code.includes('operation-not-allowed') || code.includes('admin-restricted-operation'))
    return 'Anonymous sign-in is not enabled yet in Firebase Authentication.';
  return e?.message || 'Something went wrong. Try again.';
}
