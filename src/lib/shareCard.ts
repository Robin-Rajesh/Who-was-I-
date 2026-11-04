/** Renders a 1080×1350 share image (Instagram portrait) entirely on a canvas. */

export interface ShareCardData {
  kicker: string;
  title: string;
  emoji: string;
  persona: string;
  blurb: string;
  stats: { value: string; label: string }[];
  channels: { name: string; count: number }[];
  words: string[];
  topics: { label: string; share: number; slot: number | null }[];
}

// Dark-mode categorical steps (validated order) – the card is always dark.
const SLOT_HEX = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9'];
const OTHER_HEX = '#55544f';

const DISPLAY = '"Fraunces Variable", Georgia, serif';
const SANS = '"Inter Variable", system-ui, -apple-system, "Segoe UI", sans-serif';

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(next).width > max && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else cur = next;
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && words.join(' ') !== lines.join(' ')) lines[maxLines - 1] = ellipsize(ctx, lines[maxLines - 1], max);
  return lines;
}

export async function renderShareCard(d: ShareCardData): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  try {
    await Promise.all([document.fonts.load(`600 80px ${DISPLAY}`), document.fonts.load(`500 30px ${SANS}`)]);
  } catch {
    /* fall back to system fonts */
  }

  // Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#16151f');
  bg.addColorStop(0.55, '#121211');
  bg.addColorStop(1, '#1f1410');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W * 0.85, 120, 20, W * 0.85, 120, 560);
  glow.addColorStop(0, 'rgba(144,133,233,0.28)');
  glow.addColorStop(1, 'rgba(144,133,233,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  const glow2 = ctx.createRadialGradient(80, H - 80, 20, 80, H - 80, 520);
  glow2.addColorStop(0, 'rgba(235,104,52,0.22)');
  glow2.addColorStop(1, 'rgba(235,104,52,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, W, H);

  const X = 84;
  const innerW = W - X * 2;

  // Header
  ctx.fillStyle = '#c3c2b7';
  ctx.font = `600 26px ${SANS}`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('WHO WAS I?', X, 120);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8f8d86';
  ctx.fillText(d.kicker.toUpperCase(), W - X, 120);
  ctx.textAlign = 'left';

  // Big title (year)
  const tg = ctx.createLinearGradient(X, 0, X + 620, 0);
  tg.addColorStop(0, '#9085e9');
  tg.addColorStop(0.6, '#eb6834');
  tg.addColorStop(1, '#f2b84b');
  ctx.fillStyle = tg;
  ctx.font = `600 190px ${DISPLAY}`;
  ctx.fillText(d.title, X - 6, 320);

  // Persona
  ctx.font = `86px ${SANS}`;
  ctx.fillText(d.emoji, X, 450);
  ctx.fillStyle = '#f0efec';
  ctx.font = `600 64px ${DISPLAY}`;
  const personaLines = wrap(ctx, d.persona, innerW - 120, 2);
  personaLines.forEach((l, i) => ctx.fillText(l, X + 118, 430 + i * 70));
  let y = 430 + personaLines.length * 70 + 18;
  ctx.fillStyle = '#c3c2b7';
  ctx.font = `400 30px ${SANS}`;
  for (const l of wrap(ctx, d.blurb, innerW, 2)) {
    ctx.fillText(l, X, y);
    y += 42;
  }

  // Topic bar
  y += 26;
  const barH = 22;
  let bx = X;
  const totalShare = d.topics.reduce((s, t) => s + t.share, 0) || 1;
  d.topics.forEach((t) => {
    const w = (t.share / totalShare) * innerW;
    ctx.fillStyle = t.slot ? SLOT_HEX[t.slot - 1] : OTHER_HEX;
    ctx.beginPath();
    ctx.roundRect(bx, y, Math.max(2, w - 4), barH, 6);
    ctx.fill();
    bx += w;
  });
  y += barH + 40;
  ctx.font = `500 26px ${SANS}`;
  let lx = X;
  for (const t of d.topics.slice(0, 4)) {
    const label = `${t.label} ${Math.round((t.share / totalShare) * 100)}%`;
    const w = ctx.measureText(label).width + 44;
    if (lx + w > W - X) break;
    ctx.fillStyle = t.slot ? SLOT_HEX[t.slot - 1] : OTHER_HEX;
    ctx.beginPath();
    ctx.arc(lx + 8, y - 9, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c3c2b7';
    ctx.fillText(label, lx + 24, y);
    lx += w;
  }

  // Two columns: channels + words
  y += 70;
  const colW = (innerW - 40) / 2;
  ctx.fillStyle = '#8f8d86';
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText('ON REPEAT', X, y);
  ctx.fillText('ON MY MIND', X + colW + 40, y);
  let cy = y + 52;
  d.channels.slice(0, 5).forEach((c, i) => {
    ctx.fillStyle = '#8f8d86';
    ctx.font = `600 28px ${SANS}`;
    ctx.fillText(String(i + 1), X, cy);
    ctx.fillStyle = '#f0efec';
    ctx.font = `500 30px ${SANS}`;
    ctx.fillText(ellipsize(ctx, c.name, colW - 50), X + 36, cy);
    cy += 52;
  });
  let wy = y + 52;
  let wx = X + colW + 40;
  ctx.font = `500 28px ${SANS}`;
  for (const w of d.words.slice(0, 8)) {
    const tw = ctx.measureText(w).width + 36;
    if (wx + tw > W - X) {
      wx = X + colW + 40;
      wy += 58;
      if (wy > y + 52 + 58 * 4) break;
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.roundRect(wx, wy - 34, tw, 46, 23);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#e6e5e0';
    ctx.fillText(w, wx + 18, wy - 2);
    wx += tw + 12;
  }

  // Stats row
  const sy = H - 230;
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X, sy - 60);
  ctx.lineTo(W - X, sy - 60);
  ctx.stroke();
  const sw = innerW / d.stats.length;
  d.stats.forEach((s, i) => {
    ctx.fillStyle = '#f0efec';
    ctx.font = `600 58px ${DISPLAY}`;
    ctx.fillText(s.value, X + i * sw, sy + 20);
    ctx.fillStyle = '#8f8d86';
    ctx.font = `500 24px ${SANS}`;
    ctx.fillText(s.label, X + i * sw, sy + 62);
  });

  ctx.fillStyle = '#8f8d86';
  ctx.font = `500 24px ${SANS}`;
  ctx.fillText('Made from my YouTube history · nothing was uploaded', X, H - 70);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not render image'))), 'image/png'));
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Uses the native share sheet when it can share files (mobile), else downloads. */
export async function shareOrDownload(blob: Blob, name: string, text: string) {
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try {
      await navigator.share({ files: [file], text });
      return 'shared' as const;
    } catch {
      /* cancelled – fall through to download */
    }
  }
  downloadBlob(blob, name);
  return 'downloaded' as const;
}
