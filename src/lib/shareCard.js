// Draws the 1200×630 preview image that Messenger shows when you paste a /s/<id> link.
// Rendered in the browser (like the receipt image), saved as a JPEG in Firestore.

const W = 1200;
const H = 630;
const INTER = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const CREEP = 'Creepster, Inter, system-ui, sans-serif';
const C = {
  night: '#0E0B14',
  bone: '#F2E8DA',
  dust: '#B9A9C6',
  pumpkin: '#FF8A3D',
  haunt: '#C6B2FF',
  ink: '#1A0D00',
};

const font = (w, s, f = INTER) => `${w} ${s}px ${f}`;

function wrap(ctx, text, maxW, maxLines = 2) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width <= maxW || !line) line = t;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxW && last.length) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

/** Shrinks the font until the text fits in maxLines. Returns { size, lines }. */
function fit(ctx, text, weight, family, maxW, start, min, maxLines) {
  for (let s = start; s >= min; s -= 4) {
    ctx.font = font(weight, s, family);
    const words = String(text || '').split(/\s+/);
    if (words.some((w) => ctx.measureText(w).width > maxW)) continue;
    const lines = wrap(ctx, text, maxW, 99);
    if (lines.length <= maxLines) return { size: s, lines };
  }
  ctx.font = font(weight, min, family);
  return { size: min, lines: wrap(ctx, text, maxW, maxLines) };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function background(ctx) {
  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  };
  glow(W + 40, -60, 720, 'rgba(255,122,26,0.30)');
  glow(-120, 140, 620, 'rgba(155,92,255,0.26)');
  glow(W / 2, H + 120, 520, 'rgba(255,122,26,0.10)');
}

function glowText(ctx, text, x, y, size, family, color, align = 'left', blur = 26) {
  ctx.save();
  ctx.textAlign = align;
  ctx.font = font(400, size, family);
  ctx.shadowColor = 'rgba(255,122,26,0.65)';
  ctx.shadowBlur = blur;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function pill(ctx, text, x, y, align = 'left') {
  ctx.font = font(700, 34);
  const w = ctx.measureText(text).width + 64;
  const h = 72;
  const left = align === 'center' ? x - w / 2 : x;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, '#FF9A52');
  g.addColorStop(1, '#FF7A1A');
  ctx.fillStyle = g;
  roundRect(ctx, left, y, w, h, 36);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.textAlign = 'left';
  ctx.fillText(text, left + 32, y + 48);
}

function decoEmoji(ctx, emoji) {
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.translate(W - 170, 200);
  ctx.rotate(0.22);
  ctx.font = `230px ${INTER}`;
  ctx.textAlign = 'center';
  ctx.fillText(emoji, 0, 70);
  ctx.restore();
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(font(400, 64, 'Creepster')),
      document.fonts.load(font(800, 64, 'Inter')),
      document.fonts.load(font(600, 40, 'Inter')),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

/**
 * card: {
 *   style: 'invite' | 'info',
 *   emoji, title, big?, sub?, cta
 * }
 * Returns a JPEG data URL.
 */
export async function renderShareCard(card) {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'alphabetic';
  background(ctx);

  if (card.style === 'invite') {
    ctx.font = `120px ${INTER}`;
    ctx.textAlign = 'center';
    ctx.fillText(card.emoji || '🎃', W / 2, 150);
    const t = fit(ctx, card.title, 400, CREEP, W - 160, 100, 56, 2);
    let y = t.lines.length === 1 ? 290 : 255;
    t.lines.forEach((l) => {
      glowText(ctx, l, W / 2, y, t.size, CREEP, C.pumpkin, 'center', 34);
      y += t.size;
    });
    if (card.sub) {
      y += 6;
      ctx.font = font(500, 38);
      ctx.fillStyle = C.dust;
      ctx.textAlign = 'center';
      ctx.fillText(card.sub, W / 2, y);
    }
    pill(ctx, card.cta || 'Tap to join 👻', W / 2, Math.min(y + 40, H - 92), 'center');
    return canvas.toDataURL('image/jpeg', 0.86);
  }

  // 'info' style: brand on top, big title, money line, sub line, call to action
  const left = 72;
  const maxW = W - left - 300;
  decoEmoji(ctx, card.emoji || '🎃');
  glowText(ctx, "Rory's Halloween Kemerut", left, 104, 46, CREEP, C.pumpkin, 'left', 20);

  let y = 196;
  const t = fit(ctx, card.title, 800, INTER, maxW, 68, 44, 2);
  ctx.fillStyle = C.bone;
  ctx.textAlign = 'left';
  t.lines.forEach((l) => {
    ctx.font = font(800, t.size);
    ctx.fillText(l, left, y);
    y += t.size * 1.12;
  });

  if (card.big) {
    y += 34;
    const b = fit(ctx, card.big, 800, INTER, maxW, 92, 48, 1);
    ctx.font = font(800, b.size);
    ctx.fillStyle = C.pumpkin;
    ctx.fillText(b.lines[0], left, y + b.size * 0.42);
    y += b.size * 0.42 + 20;
  }

  if (card.sub) {
    y += 52;
    ctx.font = font(500, 34);
    ctx.fillStyle = C.dust;
    wrap(ctx, card.sub, W - left * 2, 2).forEach((l) => {
      ctx.fillText(l, left, y);
      y += 44;
    });
  }

  pill(ctx, card.cta || 'Tap to open 👻', left, H - 116);
  return canvas.toDataURL('image/jpeg', 0.86);
}
