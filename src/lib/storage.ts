import type { WatchEntry } from './types';

/**
 * Optional "remember on this device" storage. Everything stays in this
 * browser's IndexedDB – nothing is ever uploaded anywhere.
 */

const DB = 'who-was-i';
const STORE = 'history';
const KEY = 'latest';

export interface SavedHistory {
  entries: WatchEntry[];
  savedAt: number;
}

/** Histories saved by the first (YouTube-only) version lacked source/kind/url. */
function migrate(entries: WatchEntry[]): WatchEntry[] {
  if (!entries.length || entries[0].source) return entries;
  return entries.map((e) => {
    const old = e as WatchEntry & { music?: boolean };
    return {
      ...e,
      source: 'youtube',
      kind: old.music ? 'music' : 'video',
      url: e.videoId ? `https://www.youtube.com/watch?v=${e.videoId}` : null,
    };
  });
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function saveHistory(h: SavedHistory): Promise<boolean> {
  try {
    await tx('readwrite', (s) => s.put(h, KEY));
    return true;
  } catch {
    return false;
  }
}

export async function loadHistory(): Promise<SavedHistory | null> {
  try {
    const h = ((await tx('readonly', (s) => s.get(KEY))) as SavedHistory | undefined) ?? null;
    return h ? { ...h, entries: migrate(h.entries) } : null;
  } catch {
    return null;
  }
}

export async function peekHistory(): Promise<{ count: number; savedAt: number } | null> {
  const h = await loadHistory();
  return h ? { count: h.entries.length, savedAt: h.savedAt } : null;
}

export async function forgetHistory(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(KEY));
  } catch {
    /* nothing stored */
  }
}
