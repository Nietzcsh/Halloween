// Draws a receipt as a PNG on a fixed 1080px-wide canvas.
// The old version screenshotted the page, which broke on phones (missing fonts,
// squished widths, cut-off emoji). Drawing it directly gives the same image on every device.

import { peso } from './money';
import { fmtDate, fmtTimestamp } from './format';

const W = 1080;
const PAD = 56; // night border around the ticket
const IN = 64; // inner padding of the ticket
const BODY = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const BRAND = 'Creepster, Inter, system-ui, sans-serif';

const C = {
  night: '#0E0B14',
  band: '#2A1F38',
  paper: '#F4EADB',
  paperDeep: '#EADCC6',
  ink: '#22182C',
  inkMuted: '#6F6079',
  rule: '#D3C2A9',
  pumpkin: '#FF8A3D',
  pumpkinInk: '#B8501A',
  ectoInk: '#3E7A1F',
  bone: '#F2E8DA',
  boneMuted: '#B9A9C6',
};

function font(weight, size, family = BODY) {
  return `${weight} ${size}px ${family}`;
}

function wrap(ctx, text, maxWidth) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= maxWidth || !line) {
      line = test;
    } else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
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

/** Runs the layout. With draw=false it only measures and returns the total height. */
function layout(ctx, r, draw) {
  const left = PAD + IN;
  const right = W - PAD - IN;
  const contentW = right - left;
  const amountColW = 250;
  let y = PAD;

  // ---------- Header band ----------
  const bandTop = y;
  y += 96;
  if (draw) {
    ctx.fillStyle = C.pumpkin;
    ctx.font = font(400, 64, BRAND);
    ctx.textBaseline = 'alphabetic';
    ctx.fillText("Rory's Halloween Kemerut", left, y);
  }
  y += 62;
  ctx.font = font(700, 46);
  const forLines = wrap(ctx, `Receipt for ${r.memberName}`, contentW);
  for (const l of forLines) {
    if (draw) {
      ctx.fillStyle = C.bone;
      ctx.fillText(l, left, y);
    }
    y += 54;
  }
  const meta = [r.code, r.createdAt ? fmtTimestamp(r.createdAt) : ''].filter(Boolean).join('   ');
  if (draw) {
    ctx.font = font(500, 28);
    ctx.fillStyle = C.boneMuted;
    ctx.fillText(meta, left, y);
  }
  y += 50;
  const bandBottom = y;

  // ---------- Items ----------
  y += 56;
  const itemsTop = y;
  if (!r.items.length) {
    if (draw) {
      ctx.font = font(600, 34);
      ctx.fillStyle = C.inkMuted;
      ctx.fillText('Nothing to pay. Ayos! 🎉', left, y + 10);
    }
    y += 60;
  }
  r.items.forEach((it, i) => {
    const paid = it.status === 'paid';
    ctx.font = font(650, 36);
    const titleLines = wrap(ctx, it.title, contentW - amountColW - 24);
    const rowTop = y;
    titleLines.forEach((l, li) => {
      if (draw) {
        ctx.font = font(650, 36);
        ctx.fillStyle = paid ? C.inkMuted : C.ink;
        ctx.fillText(l, left, y);
        if (paid) {
          const tw = ctx.measureText(l).width;
          ctx.fillRect(left, y - 12, tw, 3);
        }
      }
      if (li < titleLines.length - 1) y += 44;
    });
    y += 40;
    const sub = [it.date ? fmtDate(it.date) : '', it.isPayer ? 'You paid this one' : `Pay to ${it.payTo}`]
      .filter(Boolean)
      .join(', ');
    if (draw) {
      ctx.font = font(500, 28);
      ctx.fillStyle = C.inkMuted;
      ctx.fillText(sub, left, y);

      ctx.textAlign = 'right';
      ctx.font = font(700, 38);
      ctx.fillStyle = paid ? C.inkMuted : C.ink;
      ctx.fillText(peso(it.amount), right, rowTop);
      ctx.font = font(700, 26);
      ctx.fillStyle = paid ? C.ectoInk : C.pumpkinInk;
      ctx.fillText(paid ? 'Paid ✓' : 'Unpaid', right, rowTop + 40);
      ctx.textAlign = 'left';
    }
    y += 34;
    if (i < r.items.length - 1) {
      if (draw) {
        ctx.strokeStyle = C.rule;
        ctx.lineWidth = 2;
        ctx.setLineDash([2, 10]);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      y += 54;
    }
  });
  void itemsTop;

  // ---------- Total ----------
  y += 44;
  const totalTop = y;
  if (draw) {
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(left, totalTop);
    ctx.lineTo(right, totalTop);
    ctx.stroke();
  }
  y += 82;
  if (draw) {
    ctx.font = font(600, 36);
    ctx.fillStyle = C.ink;
    ctx.fillText('Total due', left, y - 12);
    ctx.textAlign = 'right';
    ctx.font = font(800, 72);
    ctx.fillStyle = r.totalDue > 0 ? C.pumpkinInk : C.ectoInk;
    ctx.fillText(peso(r.totalDue), right, y);
    ctx.textAlign = 'left';
  }

  // ---------- Note ----------
  if (r.note) {
    y += 48;
    ctx.font = font(500, 30);
    const noteLines = wrap(ctx, r.note, contentW - 56);
    const boxH = noteLines.length * 42 + 48;
    if (draw) {
      ctx.fillStyle = C.paperDeep;
      roundRect(ctx, left, y, contentW, boxH, 22);
      ctx.fill();
      ctx.fillStyle = C.ink;
      ctx.font = font(500, 30);
      noteLines.forEach((l, i) => ctx.fillText(l, left + 28, y + 56 + i * 42 - 6));
    }
    y += boxH;
  }

  // ---------- Footer ----------
  y += 64;
  if (draw) {
    ctx.font = font(500, 26);
    ctx.fillStyle = C.inkMuted;
    ctx.textAlign = 'center';
    ctx.fillText('Sat, Oct 31. See you sa kemerut 🦇', W / 2, y);
    ctx.textAlign = 'left';
  }
  y += 56;
  const ticketBottom = y;

  return { height: ticketBottom + PAD, bandTop, bandBottom, ticketBottom };
}

function paintTicket(ctx, geo) {
  const x = PAD;
  const w = W - PAD * 2;
  const top = geo.bandTop;
  const h = geo.ticketBottom - top;

  ctx.fillStyle = C.night;
  ctx.fillRect(0, 0, W, geo.height);

  // paper
  ctx.fillStyle = C.paper;
  roundRect(ctx, x, top, w, h, 36);
  ctx.fill();

  // header band (top part of the ticket)
  ctx.save();
  roundRect(ctx, x, top, w, h, 36);
  ctx.clip();
  ctx.fillStyle = C.band;
  ctx.fillRect(x, top, w, geo.bandBottom - top);
  ctx.restore();

  // notches + perforation where the band meets the paper
  const py = geo.bandBottom;
  ctx.fillStyle = C.night;
  ctx.beginPath();
  ctx.arc(x, py, 26, 0, Math.PI * 2);
  ctx.arc(x + w, py, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.night;
  ctx.lineWidth = 4;
  ctx.setLineDash([4, 14]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 40, py);
  ctx.lineTo(x + w - 40, py);
  ctx.stroke();
  ctx.setLineDash([]);
}

async function ensureFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(font(400, 64, 'Creepster')),
      document.fonts.load(font(700, 40, 'Inter')),
      document.fonts.load(font(500, 30, 'Inter')),
      document.fonts.load(font(800, 72, 'Inter')),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

/** Returns a PNG Blob of the receipt. */
export async function renderReceiptPng(receipt) {
  await ensureFonts();
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = W;
  canvas.height = 10;
  const geo = layout(ctx, receipt, false);
  canvas.height = Math.ceil(geo.height);
  const ctx2 = canvas.getContext('2d');
  paintTicket(ctx2, geo);
  layout(ctx2, receipt, true);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create the image'))), 'image/png'),
  );
}
