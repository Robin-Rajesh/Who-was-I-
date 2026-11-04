import type { WatchEntry } from './types';

/**
 * Parsers for Google Takeout's YouTube watch history.
 *
 * Takeout can export the history as JSON (recommended) or HTML (the default).
 * Both are handled; HTML is parsed with regular expressions because it can be
 * well over 100 MB and DOMParser is not available inside a Web Worker.
 */

// Localised "Watched …" prefixes/suffixes seen in Takeout exports.
const PREFIXES = [
  'Watched ', 'Has visto ', 'Visto ', 'Assistiu a ', 'Assistiu ', 'Vous avez regardé ', 'A regardé ', 'Regardé ', 'Hai guardato ',
  'Guardato ', 'Angesehen: ', 'Bekeken: ', 'Je hebt ', 'Obejrzano: ', 'Obejrzałeś: ', 'Просмотрено: ', 'Вы посмотрели ', 'İzlendi: ',
  'Đã xem ', 'Telah menonton ', 'Menonton ', 'Sett ', 'Såg ', 'Katsottu: ', 'Viděno: ', 'Megtekintve: ',
];
const SUFFIXES = [' angesehen', ' bekeken', ' を視聴しました', ' 시청함', ' देखा गया', ' को देखा'];

export function cleanTitle(raw: string): string {
  let t = raw.trim();
  for (const p of PREFIXES) {
    if (t.startsWith(p)) {
      t = t.slice(p.length);
      break;
    }
  }
  for (const s of SUFFIXES) {
    if (t.endsWith(s)) {
      t = t.slice(0, -s.length);
      break;
    }
  }
  if (/^已观看\s*/.test(t)) t = t.replace(/^已观看\s*/, '');
  return t.trim();
}

export function videoIdFrom(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url.match(/[?&]v=([\w-]{6,})/) ?? url.match(/youtu\.be\/([\w-]{6,})/) ?? url.match(/\/shorts\/([\w-]{6,})/);
  return m ? m[1] : null;
}

export function cleanChannel(name: string | undefined | null): string | null {
  if (!name) return null;
  const n = name.trim();
  return n ? n : null;
}

function looksLikeUrl(s: string) {
  return /^https?:\/\//i.test(s);
}

interface RawJsonItem {
  header?: string;
  title?: string;
  titleUrl?: string;
  subtitles?: { name?: string; url?: string }[];
  time?: string;
  products?: string[];
  details?: { name?: string }[];
}

function isAd(details: { name?: string }[] | undefined): boolean {
  return !!details?.some((d) => d.name && /ads|anuncios|annonces|anzeigen|annunci|anúncios|реклам/i.test(d.name));
}

function toEntry(opts: {
  header: string | undefined;
  rawTitle: string;
  titleUrl: string | undefined;
  channel: string | undefined;
  channelUrl: string | undefined;
  t: number;
}): WatchEntry | null {
  if (!Number.isFinite(opts.t)) return null;
  // Only "watch" events (skip posts, stories, searches that sometimes sneak in).
  if (opts.titleUrl && !/watch\?v=|youtu\.be\/|\/shorts\//.test(opts.titleUrl)) return null;
  const music = /music/i.test(opts.header ?? '') || /music\.youtube\.com/.test(opts.titleUrl ?? '');
  let title = cleanTitle(opts.rawTitle);
  const videoId = videoIdFrom(opts.titleUrl);
  if (!title || looksLikeUrl(title)) title = '';
  let channel = cleanChannel(opts.channel);
  if (channel && music) channel = channel.replace(/\s-\sTopic$/, '');
  return {
    t: opts.t,
    title,
    videoId,
    channel,
    channelUrl: opts.channelUrl ?? null,
    url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : null,
    source: 'youtube',
    kind: music ? 'music' : 'video',
  };
}

export function parseJsonHistory(text: string): WatchEntry[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That JSON file could not be read. It may be incomplete — try extracting it from the Takeout zip again.');
  }
  if (!Array.isArray(data)) throw new Error('This JSON file is not a YouTube watch history (expected a list of entries).');
  return parseYouTubeItems(data);
}

/** True when a parsed JSON array looks like Takeout's watch history. */
export function looksLikeYouTube(items: unknown[]): boolean {
  const first = items.find((x) => x && typeof x === 'object') as RawJsonItem | undefined;
  return !!first && typeof first.time === 'string' && ('title' in first || 'header' in first);
}

export function parseYouTubeItems(data: unknown[]): WatchEntry[] {
  const out: WatchEntry[] = [];
  for (const item of data as RawJsonItem[]) {
    if (!item || typeof item !== 'object' || !item.time) continue;
    if (isAd(item.details)) continue;
    const sub = item.subtitles?.[0];
    const e = toEntry({
      header: item.header,
      rawTitle: item.title ?? '',
      titleUrl: item.titleUrl,
      channel: sub?.name,
      channelUrl: sub?.url,
      t: Date.parse(item.time),
    });
    if (e) out.push(e);
  }
  return finalize(out);
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', emsp: ' ', ensp: ' ', thinsp: ' ' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * Parse the human date Takeout writes into the HTML export, e.g.
 * "Jan 5, 2023, 10:15:32 PM IST", "5 Jan 2023, 22:15:32 GMT" or "2023-01-05 22:15:32".
 * Interpreted in the viewer's local time zone (the zone suffix is ignored).
 */
export function parseTakeoutDate(raw: string): number {
  const s = raw.replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim();
  const time = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp]\.?\s?[Mm]\.?)?/);
  let h = 0, mi = 0, se = 0;
  if (time) {
    h = +time[1];
    mi = +time[2];
    se = time[3] ? +time[3] : 0;
    const ap = time[4]?.toLowerCase().replace(/[.\s]/g, '');
    if (ap === 'pm' && h < 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
  }
  let y: number | null = null, mo: number | null = null, d: number | null = null;
  let m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    y = +m[1]; mo = +m[2] - 1; d = +m[3];
  } else if ((m = s.match(/([A-Za-z]{3,})\.? (\d{1,2}),? (\d{4})/)) && MONTHS[m[1].slice(0, 3).toLowerCase()] !== undefined) {
    mo = MONTHS[m[1].slice(0, 3).toLowerCase()]; d = +m[2]; y = +m[3];
  } else if ((m = s.match(/(\d{1,2}) ([A-Za-z]{3,})\.?,? (\d{4})/)) && MONTHS[m[2].slice(0, 3).toLowerCase()] !== undefined) {
    d = +m[1]; mo = MONTHS[m[2].slice(0, 3).toLowerCase()]; y = +m[3];
  } else if ((m = s.match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/))) {
    // Ambiguous numeric date: assume day-first unless impossible.
    const a = +m[1], b = +m[2];
    if (a > 12) { d = a; mo = b - 1; } else if (b > 12) { mo = a - 1; d = b; } else { d = a; mo = b - 1; }
    y = +m[3];
  }
  if (y !== null && mo !== null && d !== null) return new Date(y, mo, d, h, mi, se).getTime();
  const fallback = Date.parse(s.replace(/\s[A-Z]{2,5}([+-]\d{1,2}(:\d{2})?)?$/, ''));
  return Number.isFinite(fallback) ? fallback : NaN;
}

export function parseHtmlHistory(html: string): WatchEntry[] {
  const out: WatchEntry[] = [];
  const blocks = html.split(/<div class="outer-cell/);
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (/From Google Ads|Google Ads|Google-Anzeigen|Anuncios de Google|Annonces Google/.test(b)) continue;
    const header = b.match(/mdl-typography--title">([^<]*)</)?.[1];
    const cell = b.match(/content-cell[^"]*mdl-typography--body-1">([\s\S]*?)<\/div>/);
    if (!cell) continue;
    const content = cell[1];
    const links = [...content.matchAll(/<a href="([^"]+)">([\s\S]*?)<\/a>/g)];
    const parts = content.split(/<br\s*\/?>/).map((p) => decodeEntities(p.replace(/<[^>]+>/g, '')).trim()).filter(Boolean);
    const dateText = parts[parts.length - 1] ?? '';
    const t = parseTakeoutDate(dateText);
    const titleLink = links[0];
    const channelLink = links[1];
    let rawTitle = titleLink ? decodeEntities(titleLink[2]) : '';
    if (titleLink) {
      // Keep the localised prefix so cleanTitle can strip it consistently.
      const before = decodeEntities(content.slice(0, content.indexOf('<a')).replace(/<[^>]+>/g, '')).trim();
      if (before) rawTitle = `${before} ${rawTitle}`;
    }
    const e = toEntry({
      header,
      rawTitle,
      titleUrl: titleLink ? decodeEntities(titleLink[1]) : undefined,
      channel: channelLink ? decodeEntities(channelLink[2]) : undefined,
      channelUrl: channelLink ? decodeEntities(channelLink[1]) : undefined,
      t,
    });
    if (e) out.push(e);
  }
  return finalize(out);
}

/** Sort ascending by time and drop exact duplicates (same item, same moment, same platform). */
export function finalize(list: WatchEntry[]): WatchEntry[] {
  list.sort((a, b) => a.t - b.t);
  const out: WatchEntry[] = [];
  const seen = new Set<string>();
  let lastT = Number.NaN;
  for (const e of list) {
    if (e.t !== lastT) {
      seen.clear();
      lastT = e.t;
    }
    const key = `${e.source}|${e.videoId}|${e.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export type DetectedFormat = 'json' | 'html' | 'zip' | 'unknown';

export function detectFormat(head: Uint8Array): DetectedFormat {
  if (head[0] === 0x50 && head[1] === 0x4b) return 'zip';
  const text = new TextDecoder().decode(head.slice(0, 512)).replace(/^﻿/, '').trimStart();
  if (text.startsWith('[') || text.startsWith('{')) return 'json';
  if (/^<(!doctype|html|meta|head|body|div)/i.test(text)) return 'html';
  return 'unknown';
}

export function parseHistoryText(text: string, format: 'json' | 'html'): WatchEntry[] {
  return format === 'json' ? parseJsonHistory(text.replace(/^﻿/, '')) : parseHtmlHistory(text);
}
