import type { WatchEntry } from './types';
import type { SourceId } from './sources';
import { finalize, looksLikeYouTube, parseHtmlHistory, parseYouTubeItems } from './parse';

/**
 * Importers for every supported platform plus a dispatcher that recognises a
 * file by its contents (not just its name – exports get renamed and localised).
 */

export type Variant = 'spotify-extended' | 'spotify-account' | 'netflix-full' | 'netflix-quick';

export interface ParseResult {
  source: SourceId;
  entries: WatchEntry[];
  variant?: Variant;
  /** Netflix full export: profile name per entry (aligned with `entries`). */
  profileOf?: string[];
}

/* ---------------------------------------------------------------- helpers */

type Obj = Record<string, unknown>;
const isObj = (x: unknown): x is Obj => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x.trim() : null);
const num = (x: unknown): number | null => (typeof x === 'number' && Number.isFinite(x) ? x : typeof x === 'string' && x.trim() && !Number.isNaN(+x) ? +x : null);

/** "2023-01-05 16:45:32" or "2023-01-05 16:45" in UTC → epoch ms. */
export function parseUtc(s: string): number {
  const m = s.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
  return Date.parse(s);
}

/**
 * Meta exports encode UTF-8 bytes as individual \u00XX characters
 * ("cafÃ©" instead of "café"). Undo that when it is clearly the case.
 */
export function fixMojibake(s: string): string {
  if (!/[À-ÿ][\u0080-¿]/.test(s) || /[^\u0000-ÿ]/.test(s)) return s;
  try {
    const bytes = Uint8Array.from(s, (c) => c.charCodeAt(0));
    const out = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return out;
  } catch {
    return s;
  }
}

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, CRLF, BOM). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ---------------------------------------------------------------- Spotify */

const spotifyId = (uri: string | null) => uri?.match(/^spotify:(track|episode):([A-Za-z0-9]+)$/);

export function parseSpotifyExtended(items: unknown[]): WatchEntry[] {
  const out: WatchEntry[] = [];
  for (const it of items) {
    if (!isObj(it)) continue;
    const ms = num(it.ms_played) ?? 0;
    const ts = str(it.ts);
    if (!ts || ms < 30_000) continue;
    const t = Date.parse(ts);
    if (!Number.isFinite(t)) continue;
    const track = str(it.master_metadata_track_name);
    const episode = str(it.episode_name);
    if (track) {
      const uri = str(it.spotify_track_uri);
      const m = spotifyId(uri);
      out.push({
        t, title: track, videoId: uri ?? `${it.master_metadata_album_artist_name}::${track}`,
        channel: str(it.master_metadata_album_artist_name), channelUrl: null,
        url: m ? `https://open.spotify.com/track/${m[2]}` : null, source: 'spotify', kind: 'music', ms,
      });
    } else if (episode) {
      const uri = str(it.spotify_episode_uri);
      const m = spotifyId(uri);
      out.push({
        t, title: episode, videoId: uri ?? `${it.episode_show_name}::${episode}`,
        channel: str(it.episode_show_name), channelUrl: null,
        url: m ? `https://open.spotify.com/episode/${m[2]}` : null, source: 'spotify', kind: 'podcast', ms,
      });
    }
  }
  return out;
}

export function parseSpotifyAccount(items: unknown[]): WatchEntry[] {
  const out: WatchEntry[] = [];
  for (const it of items) {
    if (!isObj(it)) continue;
    const ms = num(it.msPlayed) ?? 0;
    const end = str(it.endTime);
    if (!end || ms < 30_000) continue;
    const t = parseUtc(end);
    if (!Number.isFinite(t)) continue;
    const artist = str(it.artistName);
    const track = str(it.trackName);
    const show = str(it.podcastName);
    const ep = str(it.episodeName);
    if (track && !(artist === 'Unknown Artist' && track === 'Unknown Track')) {
      out.push({ t, title: track, videoId: `${artist}::${track}`, channel: artist, channelUrl: null, url: null, source: 'spotify', kind: 'music', ms });
    } else if (ep) {
      out.push({ t, title: ep, videoId: `${show}::${ep}`, channel: show, channelUrl: null, url: null, source: 'spotify', kind: 'podcast', ms });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- Netflix */

/** "Stranger Things: Season 1: Chapter One" → "Stranger Things"; films stay whole. */
export function netflixShow(title: string): string {
  const parts = title.split(': ');
  if (parts.length >= 3) return parts[0];
  if (parts.length === 2 && /\b(season|series|part|volume|vol\.|chapter|episode|book|collection|temporada|staffel|saison)\b/i.test(parts[1])) return parts[0];
  return title;
}

function durationMs(s: string): number {
  const m = s.trim().match(/^(\d+):(\d{2}):(\d{2})$/);
  return m ? ((+m[1] * 60 + +m[2]) * 60 + +m[3]) * 1000 : 0;
}

export function parseNetflixCsv(text: string): ParseResult | null {
  const rows = parseCsv(text);
  if (rows.length < 2) return null;
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => head.indexOf(name);
  if (col('profile name') >= 0 && col('start time') >= 0 && col('title') >= 0) {
    const iP = col('profile name'), iS = col('start time'), iD = col('duration'), iT = col('title'), iSup = col('supplemental video type');
    const entries: WatchEntry[] = [];
    const profileOf: string[] = [];
    for (const r of rows.slice(1)) {
      const title = r[iT]?.trim();
      if (!title) continue;
      if (iSup >= 0 && r[iSup]?.trim()) continue; // trailers, hooks, previews
      const ms = iD >= 0 ? durationMs(r[iD] ?? '') : 0;
      if (iD >= 0 && ms < 120_000) continue;
      const t = parseUtc(r[iS] ?? '');
      if (!Number.isFinite(t)) continue;
      const show = netflixShow(title);
      entries.push({ t, title, videoId: title, channel: show, channelUrl: null, url: null, source: 'netflix', kind: 'show', ms });
      profileOf.push(r[iP]?.trim() || 'Profile');
    }
    return { source: 'netflix', entries, variant: 'netflix-full', profileOf };
  }
  if (head.length === 2 && head[0] === 'title' && head[1] === 'date') {
    const data = rows.slice(1).filter((r) => r[0]?.trim() && r[1]?.trim());
    const parts = data.map((r) => r[1].trim().split(/[/.\-]/).map(Number));
    // Decide the date order from the whole file: d/m/y vs m/d/y vs y-m-d.
    const ymd = parts.some((p) => p[0] > 31);
    const dayFirst = !ymd && parts.some((p) => p[0] > 12);
    const entries: WatchEntry[] = [];
    data.forEach((r, k) => {
      const p = parts[k];
      if (p.length !== 3 || p.some((x) => !Number.isFinite(x))) return;
      const [a, b, c] = p;
      let y: number, mo: number, d: number;
      if (ymd) [y, mo, d] = [a, b, c];
      else if (dayFirst) [d, mo, y] = [a, b, c];
      else [mo, d, y] = [a, b, c];
      if (y < 100) y += 2000;
      const title = r[0].trim();
      entries.push({
        t: new Date(y, mo - 1, d, 12).getTime(), title, videoId: title, channel: netflixShow(title), channelUrl: null,
        url: null, source: 'netflix', kind: 'show', approx: true,
      });
    });
    return { source: 'netflix', entries, variant: 'netflix-quick' };
  }
  return null;
}

/* ---------------------------------------------------------------- Instagram */

const IG_ACTIONS: [RegExp, string][] = [
  [/likes_media_likes|liked_posts/, 'Liked a post'],
  [/likes_comment_likes|liked_comments/, 'Liked a comment'],
  [/saved_saved_media|saved_posts/, 'Saved a post'],
  [/saved_saved_collections|saved_collections/, 'Saved to a collection'],
  [/relationships_following|following\.json|^following/, 'Followed'],
  [/comments_media_comments|post_comments|reels_comments|comments_reels_comments/, 'Commented'],
  [/story_activities_story_likes|story_likes/, 'Liked a story'],
  [/impressions_history_videos_watched|videos_watched/, 'Watched a video'],
  [/impressions_history_posts_seen|posts_viewed/, 'Viewed a post'],
  [/impressions_history_reels|reels_viewed/, 'Watched a reel'],
];

function igAction(key: string): string | null {
  for (const [re, label] of IG_ACTIONS) if (re.test(key)) return label;
  return null;
}

const IG_ACTOR_LABELS = /^(author|media owner|owner|username|user ?name|account|name)$/i;

function igItem(it: unknown, action: string): WatchEntry | null {
  if (!isObj(it)) return null;
  let ts: number | null = num(it.timestamp);
  let actor = str(it.title);
  let href: string | null = null;
  let comment: string | null = null;
  const sld = Array.isArray(it.string_list_data) ? (it.string_list_data as unknown[]).filter(isObj) : [];
  if (sld[0]) {
    ts ??= num(sld[0].timestamp);
    href = str(sld[0].href);
    const v = str(sld[0].value);
    if (!actor && v && /^[\w.]{1,30}$/.test(v)) actor = v; // following.json puts the username in value
  }
  const smd = isObj(it.string_map_data) ? it.string_map_data : null;
  if (smd) {
    for (const [k, v] of Object.entries(smd)) {
      if (!isObj(v)) continue;
      ts ??= num(v.timestamp) || null;
      href ??= str(v.href);
      if (!actor && IG_ACTOR_LABELS.test(k)) actor = str(v.value);
      if (/^comment$/i.test(k)) comment = str(v.value);
    }
  }
  if (Array.isArray(it.label_values)) {
    for (const lv of it.label_values as unknown[]) {
      if (!isObj(lv)) continue;
      const label = str(lv.label) ?? '';
      if (!actor && IG_ACTOR_LABELS.test(label)) actor = str(lv.value);
      if (/url/i.test(label)) href ??= str(lv.value) ?? str(lv.href);
    }
  }
  if (!ts) return null;
  const t = ts < 1e12 ? ts * 1000 : ts;
  if (actor) actor = fixMojibake(actor).replace(/^@/, '');
  if (comment) comment = fixMojibake(comment);
  const title = comment ? `Commented: “${comment.length > 90 ? `${comment.slice(0, 88)}…` : comment}”` : action;
  return {
    t, title, videoId: href ?? `${action}|${actor}|${t}`, channel: actor,
    channelUrl: actor ? `https://www.instagram.com/${actor}/` : null, url: href, source: 'instagram', kind: 'social',
  };
}

export function parseInstagram(name: string, data: unknown): WatchEntry[] {
  const out: WatchEntry[] = [];
  const base = name.split('/').pop()?.toLowerCase() ?? '';
  if (Array.isArray(data)) {
    const action = igAction(base);
    if (!action) return [];
    for (const it of data) {
      const e = igItem(it, action);
      if (e) out.push(e);
    }
    return out;
  }
  if (!isObj(data)) return [];
  for (const [key, val] of Object.entries(data)) {
    const action = igAction(key) ?? igAction(base);
    if (!action || !Array.isArray(val)) continue;
    for (const it of val) {
      const e = igItem(it, action);
      if (e) out.push(e);
    }
  }
  return out;
}

const IG_KEY_RE = /^(likes_|saved_saved|relationships_following|impressions_history_|comments_|story_activities_)/;

function looksLikeInstagram(name: string, data: unknown): boolean {
  if (isObj(data)) return Object.keys(data).some((k) => IG_KEY_RE.test(k));
  if (Array.isArray(data)) {
    const first = data.find(isObj);
    return !!first && ('string_map_data' in first || 'string_list_data' in first || 'label_values' in first) && !!igAction(name.split('/').pop()?.toLowerCase() ?? '');
  }
  return false;
}

/* ---------------------------------------------------------------- TikTok */

function tiktokAction(path: string): string {
  if (/like/i.test(path)) return 'Liked a TikTok';
  if (/favou?rite|saved/i.test(path)) return 'Saved a TikTok';
  return 'Watched a TikTok';
}

export function parseTikTok(data: unknown): WatchEntry[] {
  const out: WatchEntry[] = [];
  const walk = (node: unknown, path: string, depth: number) => {
    if (depth > 6 || !node) return;
    if (Array.isArray(node)) {
      if (!/videolist|itemfavoritelist|favoritevideolist|likelist|watchhistory/i.test(path.replace(/\s/g, ''))) return;
      const action = tiktokAction(path);
      for (const it of node) {
        if (!isObj(it)) continue;
        const date = str(it.Date) ?? str(it.date);
        const link = str(it.Link) ?? str(it.link) ?? str(it.VideoLink) ?? str(it.videoLink);
        if (!date) continue;
        const t = parseUtc(date);
        if (!Number.isFinite(t)) continue;
        const id = link?.match(/(\d{8,})/)?.[1] ?? null;
        out.push({ t, title: action, videoId: id ?? link, channel: null, channelUrl: null, url: link, source: 'tiktok', kind: 'social' });
      }
      return;
    }
    if (isObj(node)) for (const [k, v] of Object.entries(node)) walk(v, `${path}/${k}`, depth + 1);
  };
  walk(data, '', 0);
  return out;
}

function looksLikeTikTok(data: unknown): boolean {
  return isObj(data) && ['Activity', 'Your Activity', 'Video', 'Profile', 'Likes and Favorites'].some((k) => k in data) && JSON.stringify(Object.keys(data)).length < 2000;
}

/* ---------------------------------------------------------------- dispatcher */

export class UnsupportedFormat extends Error {}

/**
 * Recognise and parse one file. Returns null when the file is not something
 * we understand (e.g. other files inside an export zip).
 */
export function parseAnyFile(name: string, text: string): ParseResult | null {
  const body = text.replace(/^﻿/, '');
  const head = body.slice(0, 2000).trimStart();
  const lower = name.toLowerCase();

  if (head.startsWith('<')) {
    if (/outer-cell|mdl-typography/.test(head + body.slice(2000, 20000)) && /watch|youtube|verlauf|historial|historique/i.test(lower + head)) {
      const entries = parseHtmlHistory(body);
      return entries.length ? { source: 'youtube', entries } : null;
    }
    if (/instagram|your_instagram_activity|likes|saved/i.test(lower) && /<html/i.test(head)) {
      throw new UnsupportedFormat('This looks like an Instagram export in HTML format. Request it again with Format set to JSON.');
    }
    return null;
  }

  if (head.startsWith('[') || head.startsWith('{')) {
    let data: unknown;
    try {
      data = JSON.parse(body);
    } catch {
      return null;
    }
    if (Array.isArray(data)) {
      const first = data.find(isObj);
      if (!first) return null;
      if ('ts' in first && 'ms_played' in first) return { source: 'spotify', entries: finalize(parseSpotifyExtended(data)), variant: 'spotify-extended' };
      if ('endTime' in first && 'msPlayed' in first) return { source: 'spotify', entries: finalize(parseSpotifyAccount(data)), variant: 'spotify-account' };
      if (looksLikeYouTube(data)) {
        const entries = parseYouTubeItems(data);
        return entries.length ? { source: 'youtube', entries } : null;
      }
      if (looksLikeInstagram(name, data)) return { source: 'instagram', entries: finalize(parseInstagram(name, data)) };
      return null;
    }
    if (looksLikeInstagram(name, data)) return { source: 'instagram', entries: finalize(parseInstagram(name, data)) };
    if (looksLikeTikTok(data)) {
      const entries = finalize(parseTikTok(data));
      return entries.length ? { source: 'tiktok', entries } : null;
    }
    return null;
  }

  if (lower.endsWith('.csv') || /^"?title"?,|profile name/i.test(head)) {
    const r = parseNetflixCsv(body);
    if (r && r.entries.length) {
      r.entries = finalize(r.entries);
      return r;
    }
  }
  return null;
}

/** Files inside an export zip that are worth reading at all. */
export function isCandidatePath(path: string): boolean {
  const p = path.toLowerCase();
  const base = p.split('/').pop() ?? '';
  if (!/\.(json|html?|csv)$/.test(base)) return false;
  // Skip obviously irrelevant big files.
  if (/(search-history|subscriptions|playlists?|comments?\.csv|live chats?|chat|messages\/|inbox|media\/|payments|devices|ip_address|login|account_activity|ads_clicked|searches|followers_\d|close_friends|blocked)/.test(p)) {
    return /post_comments|reels_comments/.test(p);
  }
  return true;
}
