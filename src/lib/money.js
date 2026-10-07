// All money is stored as whole CENTAVOS (integers) so splits never drift.
// ₱1,234.50 is stored as 123450.

const fmt = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function peso(centavos) {
  return fmt.format((centavos || 0) / 100);
}

/** "1,234.5" / "₱ 1234.50" / "1234" → 123450. Returns NaN if invalid. */
export function parsePeso(input) {
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) : NaN;
  const s = String(input ?? '').replace(/[₱,\s]/g, '');
  if (s === '' || s === '.' || !/^\d*(\.\d{0,2})?$/.test(s)) return NaN;
  const [whole, frac = ''] = s.split('.');
  return Number(whole || 0) * 100 + Number((frac + '00').slice(0, 2));
}

/** 123450 → "1234.50" (for putting back into an input box) */
export function toInputValue(centavos) {
  return ((centavos || 0) / 100).toFixed(2);
}

/**
 * Split a total equally across keys. Leftover centavos go to the first people
 * in the list one by one, so the shares always add up exactly to the total.
 * splitEqual(1000, ['a','b','c']) → { a: 334, b: 333, c: 333 }
 */
export function splitEqual(total, keys) {
  const out = {};
  const n = keys.length;
  if (!n || !Number.isFinite(total) || total <= 0) {
    keys.forEach((k) => { out[k] = 0; });
    return out;
  }
  const base = Math.floor(total / n);
  let remainder = total - base * n;
  for (const k of keys) {
    out[k] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  }
  return out;
}

export function sum(values) {
  return values.reduce((a, b) => a + (b || 0), 0);
}
