/** Renders a 1080×1350 share image (Instagram portrait) entirely on a canvas, in the app's tape-archive style. */

export interface ShareCardData {
  kicker: string;
  title: string;
  persona: string;
  blurb: string;
  stats: { value: string; label: string }[];
  channels: { name: string; count: number }[];
  words: string[];
  topics: { label: string; share: number; slot: number | null }[];
}

// Light-mode categorical steps (validated order) – the card is printed on paper.
const SLOT_HEX = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6'];
const OTHER_HEX = '#b4ad9e';
const PAPER = '#efe9dc';
const INK = '#15120e';
const INK2 = '#4a443a';
const MUTED = '#736c5f';
const ACCENT = '#ec4a12';

const DISPLAY = '"Archivo Variable", "Arial Narrow", Arial, sans-serif';
const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';

type Ctx = CanvasRenderingContext2D;
type Stretch = 'normal' | 'semi-condensed' | 'condensed' | 'extra-condensed';

/** Sets the font; canvas width-axis support (fontStretch) is used where the browser has it. */
function setFont(ctx: Ctx, font: string, stretch: Stretch = 'normal') {
  ctx.font = font;
  if ('fontStretch' in ctx) ctx.fontStretch = stretch;
}

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

/** Biggest font size (≤ max) at which `text` fits in `width`. */
function fitSize(ctx: Ctx, text: string, width: number, max: number, weight: number, stretch: Stretch): number {
  let size = max;
  for (; size > 24; size -= 4) {
    setFont(ctx, `${weight} ${size}px ${DISPLAY}`, stretch);
    if (ctx.measureText(text).width <= width) break;
  }
  return size;
}

export async function renderShareCard(d: ShareCardData): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')! as Ctx;
  try {
    await Promise.all([document.fonts.load(`900 120px ${DISPLAY}`), document.fonts.load(`500 28px ${MONO}`), document.fonts.load(`600 28px ${MONO}`)]);
  } catch {
    /* fall back to system fonts */
  }
  const X = 72;
  const innerW = W - X * 2;
  ctx.textBaseline = 'alphabetic';

  // Paper
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  // Header strip
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(X + 10, 48, 11, 0, Math.PI * 2);
  ctx.fill();
  setFont(ctx, `600 26px ${MONO}`);
  ctx.fillStyle = PAPER;
  ctx.fillText('REC  WHO WAS I?', X + 36, 57);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#bdb5a4';
  ctx.fillText(d.kicker.toUpperCase(), W - X, 57);
  ctx.textAlign = 'left';

  // Title (year or range), condensed poster numerals
  const titleSize = fitSize(ctx, d.title, innerW, 270, 900, 'extra-condensed');
  setFont(ctx, `900 ${titleSize}px ${DISPLAY}`, 'extra-condensed');
  ctx.fillStyle = INK;
  ctx.fillText(d.title, X - 6, 96 + 40 + titleSize * 0.78);
  let y = 96 + 40 + titleSize * 0.78 + 36;

  // Persona on an accent block
  const persona = d.persona.toUpperCase();
  setFont(ctx, `900 92px ${DISPLAY}`, 'extra-condensed');
  const pLines = wrap(ctx, persona, innerW - 56, 2);
  const blockH = 40 + pLines.length * 84;
  ctx.fillStyle = ACCENT;
  ctx.fillRect(X, y, innerW, blockH);
  ctx.fillStyle = '#fff8f0';
  pLines.forEach((l, i) => ctx.fillText(l, X + 28, y + 100 + i * 84 - 6));
  y += blockH + 40;

  // Blurb, typewriter style
  setFont(ctx, `500 25px ${MONO}`);
  ctx.fillStyle = INK2;
  for (const l of wrap(ctx, d.blurb, innerW, 3)) {
    ctx.fillText(l, X, y);
    y += 38;
  }

  // Topic bar
  y += 18;
  let bx = X;
  const totalShare = d.topics.reduce((s, t) => s + t.share, 0) || 1;
  d.topics.forEach((t) => {
    const w = (t.share / totalShare) * innerW;
    ctx.fillStyle = t.slot ? SLOT_HEX[t.slot - 1] : OTHER_HEX;
    ctx.fillRect(bx, y, Math.max(2, w - 3), 26);
    bx += w;
  });
  y += 26 + 40;
  setFont(ctx, `500 22px ${MONO}`);
  let lx = X;
  for (const t of d.topics.slice(0, 4)) {
    const label = `${t.label.toUpperCase()} ${Math.round((t.share / totalShare) * 100)}%`;
    const w = ctx.measureText(label).width + 44;
    if (lx + w > W - X) break;
    ctx.fillStyle = t.slot ? SLOT_HEX[t.slot - 1] : OTHER_HEX;
    ctx.fillRect(lx, y - 16, 14, 14);
    ctx.fillStyle = INK2;
    ctx.fillText(label, lx + 22, y - 2);
    lx += w;
  }

  // Two columns: on repeat / on my mind – sized to the space left above the stats.
  const sy = H - 200;
  y += 56;
  const rows = Math.max(1, Math.min(5, Math.floor((sy - 74 - 24 - (y + 56)) / 50) + 1));
  const colW = (innerW - 40) / 2;
  ctx.fillStyle = INK;
  ctx.fillRect(X, y - 30, innerW, 3);
  setFont(ctx, `600 21px ${MONO}`);
  ctx.fillStyle = MUTED;
  ctx.fillText('ON REPEAT', X, y + 4);
  ctx.fillText('ON MY MIND', X + colW + 40, y + 4);
  let cy = y + 56;
  d.channels.slice(0, rows).forEach((c, i) => {
    setFont(ctx, `500 22px ${MONO}`);
    ctx.fillStyle = MUTED;
    ctx.fillText(String(i + 1).padStart(2, '0'), X, cy);
    setFont(ctx, `700 34px ${DISPLAY}`, 'semi-condensed');
    ctx.fillStyle = INK;
    ctx.fillText(ellipsize(ctx, c.name, colW - 50), X + 44, cy);
    cy += 50;
  });
  let wy = y + 56;
  let wx = X + colW + 40;
  setFont(ctx, `500 24px ${MONO}`);
  for (const w of d.words.slice(0, 8)) {
    const tw = ctx.measureText(w).width + 28;
    if (wx + tw > W - X) {
      wx = X + colW + 40;
      wy += 54;
      if (wy > y + 56 + 50 * (rows - 1)) break;
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.strokeRect(wx, wy - 32, tw, 44);
    ctx.fillStyle = INK;
    ctx.fillText(w, wx + 14, wy - 2);
    wx += tw + 10;
  }

  // Stats
  ctx.fillStyle = INK;
  ctx.fillRect(X, sy - 74, innerW, 3);
  const sw = innerW / d.stats.length;
  d.stats.forEach((s, i) => {
    setFont(ctx, `900 78px ${DISPLAY}`, 'extra-condensed');
    ctx.fillStyle = INK;
    ctx.fillText(s.value, X + i * sw, sy + 20);
    setFont(ctx, `500 20px ${MONO}`);
    ctx.fillStyle = MUTED;
    ctx.fillText(s.label.toUpperCase(), X + i * sw, sy + 56);
  });

  setFont(ctx, `500 20px ${MONO}`);
  ctx.fillStyle = MUTED;
  ctx.fillText('MADE FROM MY OWN DATA · NOTHING WAS UPLOADED', X, H - 64);

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
