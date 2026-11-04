/// <reference lib="webworker" />
import { Unzip, UnzipInflate, type UnzipFile } from 'fflate';
import { analyze } from '../lib/analyze';
import { detectFormat, parseHistoryText } from '../lib/parse';
import { generateSampleHistory } from '../lib/sample';
import type { DataSource, WatchEntry, WorkerRequest, WorkerResponse } from '../lib/types';

declare const self: DedicatedWorkerGlobalScope;

const post = (msg: WorkerResponse) => self.postMessage(msg);
const progress = (stage: string, pct: number) => post({ type: 'progress', stage, pct });

/** Scale analysis progress into the 0.35–1 band (reading/parsing uses 0–0.35). */
const analysisProgress = (stage: string, pct: number) => progress(stage, 0.35 + pct * 0.65);

interface Candidate {
  name: string;
  text: string;
}

const WATCH_RE = /watch-history\.(json|html?)$/i;
// Takeout localises file names in some languages; fall back to anything in a YouTube "history" folder.
const LOOSE_RE = /(youtube|history|verlauf|historial|historique|cronologia|histórico)[^/]*\/[^/]*\.(json|html?)$/i;
const SKIP_RE = /(search|comment|subscription|playlist|live chat|chat|channel|abonnement)/i;

async function readZip(file: File): Promise<Candidate[]> {
  const found: Candidate[] = [];
  const pending: Promise<void>[] = [];
  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  unzip.onfile = (f: UnzipFile) => {
    const name = f.name;
    const base = name.split('/').pop() ?? '';
    if (!(WATCH_RE.test(base) || (LOOSE_RE.test(name) && !SKIP_RE.test(base)))) return;
    pending.push(
      new Promise<void>((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        f.ondata = (err, chunk, final) => {
          if (err) return reject(err);
          chunks.push(chunk);
          if (final) {
            const total = chunks.reduce((s, c) => s + c.length, 0);
            const buf = new Uint8Array(total);
            let off = 0;
            for (const c of chunks) {
              buf.set(c, off);
              off += c.length;
            }
            found.push({ name, text: new TextDecoder().decode(buf) });
            resolve();
          }
        };
        f.start();
      }),
    );
  };
  const reader = file.stream().getReader();
  let read = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      unzip.push(new Uint8Array(0), true);
      break;
    }
    read += value.length;
    unzip.push(value);
    progress(`Unzipping ${file.name}`, Math.min(0.3, (read / file.size) * 0.3));
  }
  await Promise.all(pending);
  // Exact "watch-history" files first.
  found.sort((a, b) => Number(WATCH_RE.test(b.name)) - Number(WATCH_RE.test(a.name)));
  return found;
}

function parseCandidate(c: Candidate): { entries: WatchEntry[]; format: 'json' | 'html' } | null {
  const head = new TextEncoder().encode(c.text.slice(0, 600));
  const fmt = detectFormat(head);
  if (fmt !== 'json' && fmt !== 'html') return null;
  try {
    const entries = parseHistoryText(c.text, fmt);
    return entries.length ? { entries, format: fmt } : null;
  } catch {
    return null;
  }
}

async function loadFiles(files: File[]): Promise<{ entries: WatchEntry[]; source: DataSource; fileName: string }> {
  let lastError = '';
  for (const file of files) {
    progress(`Opening ${file.name}`, 0.02);
    const head = new Uint8Array(await file.slice(0, 600).arrayBuffer());
    const fmt = detectFormat(head);
    if (fmt === 'zip') {
      const candidates = await readZip(file);
      progress('Reading your history', 0.32);
      let best: { entries: WatchEntry[]; format: 'json' | 'html'; name: string } | null = null;
      for (const c of candidates) {
        const parsed = parseCandidate(c);
        if (parsed && (!best || parsed.entries.length > best.entries.length)) best = { ...parsed, name: c.name };
        if (best && WATCH_RE.test(c.name)) break;
      }
      if (best) return { entries: best.entries, source: best.format, fileName: best.name.split('/').pop() ?? file.name };
      lastError = `We looked inside ${file.name} but couldn't find a watch-history file. If Google split your export into several zips, try the others, or drop the watch-history file itself.`;
      continue;
    }
    if (fmt === 'json' || fmt === 'html') {
      progress('Reading your history', 0.15);
      const text = await file.text();
      progress('Parsing every video you ever watched', 0.25);
      const entries = parseHistoryText(text, fmt);
      if (entries.length) return { entries, source: fmt, fileName: file.name };
      lastError = `${file.name} didn't contain any watched videos. Is YouTube watch history turned on for your account?`;
      continue;
    }
    lastError = `${file.name} doesn't look like a Takeout export. Drop watch-history.json, watch-history.html or the Takeout .zip.`;
  }
  throw new Error(lastError || 'No files to read.');
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  try {
    let entries: WatchEntry[];
    let source: DataSource;
    let fileName: string | null = null;
    if (req.type === 'sample') {
      progress('Inventing a person', 0.1);
      entries = generateSampleHistory();
      source = 'sample';
    } else if (req.type === 'entries') {
      entries = req.entries;
      source = req.source;
    } else {
      const loaded = await loadFiles(req.files);
      entries = loaded.entries;
      source = loaded.source;
      fileName = loaded.fileName;
    }
    const report = analyze(entries, source, analysisProgress);
    post({ type: 'done', entries, report, source, fileName });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
