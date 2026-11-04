import type { DataSource, WatchEntry } from './types';

/**
 * Optional "remember on this device" storage. Everything stays in this
 * browser's IndexedDB – nothing is ever uploaded anywhere.
 */

const DB = 'who-was-i';
const STORE = 'history';
const KEY = 'latest';

export interface SavedHistory {
  entries: WatchEntry[];
  source: DataSource;
  fileName: string | null;
  savedAt: number;
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
    return ((await tx('readonly', (s) => s.get(KEY))) as SavedHistory | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function peekHistory(): Promise<{ count: number; savedAt: number; source: DataSource } | null> {
  const h = await loadHistory();
  return h ? { count: h.entries.length, savedAt: h.savedAt, source: h.source } : null;
}

export async function forgetHistory(): Promise<void> {
  try {
    await tx('readwrite', (s) => s.delete(KEY));
  } catch {
    /* nothing stored */
  }
}
