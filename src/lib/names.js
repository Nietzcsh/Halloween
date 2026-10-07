// Name rules. The "key" is what makes names unique:
// "Ana", " ana ", "ANA" and "Aña" all become the key "ana", so they count as the same person.

export function cleanName(raw) {
  return String(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 30);
}

export function nameKey(raw) {
  return cleanName(raw)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents (ñ → n, é → e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    .replace(/^-+|-+$/g, '');
}
