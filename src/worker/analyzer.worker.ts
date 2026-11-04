/// <reference lib="webworker" />
import { Unzip, UnzipInflate, type UnzipFile } from 'fflate';
import { analyze } from '../lib/analyze';
import { finalize } from '../lib/parse';
import { UnsupportedFormat, isCandidatePath, parseAnyFile, type ParseResult } from '../lib/importers';
import { generateSampleHistory } from '../lib/sample';
import type { LoadOptions, SourceCount, WatchEntry, WorkerRequest, WorkerResponse } from '../lib/types';
import { sourceDef, type SourceId } from '../lib/sources';

declare const self: DedicatedWorkerGlobalScope;

const post = (msg: WorkerResponse) => self.postMessage(msg);
const progress = (stage: string, pct: number) => post({ type: 'progress', stage, pct });
/** Analysis gets the 0.35–1 band of the progress bar (reading/parsing uses 0–0.35). */
const analysisProgress = (stage: string, pct: number) => progress(stage, 0.35 + pct * 0.65);

interface InnerFile {
  name: string;
  text: string;
}

const MAX_INNER = 400 * 1024 * 1024; // don't try to inflate absurdly large single files

async function readZip(file: File, from: number, span: number): Promise<InnerFile[]> {
  const found: InnerFile[] = [];
  const pending: Promise<void>[] = [];
  const unzip = new Unzip();
  unzip.register(UnzipInflate);
  unzip.onfile = (f: UnzipFile) => {
    if (!isCandidatePath(f.name) || (f.originalSize ?? 0) > MAX_INNER) return;
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
            found.push({ name: f.name, text: new TextDecoder().decode(buf) });
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
    progress(`Unzipping ${file.name}`, from + (read / file.size) * span);
  }
  await Promise.all(pending);
  return found;
}

const isZip = async (file: File) => {
  const head = new Uint8Array(await file.slice(0, 4).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b;
};

async function loadFiles(files: File[], options: LoadOptions): Promise<{ results: ParseResult[]; profiles?: { name: string; count: number }[] }> {
  const results: ParseResult[] = [];
  const hints: string[] = [];
  const tryParse = (name: string, text: string) => {
    try {
      const r = parseAnyFile(name, text);
      if (r && r.entries.length) results.push(r);
    } catch (e) {
      if (e instanceof UnsupportedFormat) hints.push(e.message);
    }
  };
  for (let k = 0; k < files.length; k++) {
    const file = files[k];
    const from = (k / files.length) * 0.3;
    const span = 0.3 / files.length;
    progress(`Opening ${file.name}`, from);
    if (await isZip(file)) {
      const inner = await readZip(file, from, span);
      progress(`Reading ${file.name}`, from + span);
      for (const f of inner) tryParse(f.name, f.text);
    } else {
      tryParse(file.name, await file.text());
    }
  }

  // Extended Spotify history supersedes the one-year "account data" files.
  if (results.some((r) => r.variant === 'spotify-extended')) {
    for (let i = results.length - 1; i >= 0; i--) if (results[i].variant === 'spotify-account') results.splice(i, 1);
  }
  // A full Netflix export supersedes the quick "Download all" CSV.
  if (results.some((r) => r.variant === 'netflix-full')) {
    for (let i = results.length - 1; i >= 0; i--) if (results[i].variant === 'netflix-quick') results.splice(i, 1);
  }

  // Several Netflix profiles? Ask which one is you (unless already chosen).
  const counts = new Map<string, number>();
  for (const r of results) r.profileOf?.forEach((p) => counts.set(p, (counts.get(p) ?? 0) + 1));
  if (counts.size > 1) {
    if (!options.netflixProfile) {
      return { results, profiles: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count })) };
    }
    if (options.netflixProfile !== '*') {
      for (const r of results) {
        if (!r.profileOf) continue;
        const keep = r.profileOf.map((p) => p === options.netflixProfile);
        r.entries = r.entries.filter((_, i) => keep[i]);
      }
    }
  }

  if (!results.some((r) => r.entries.length)) {
    const names = files.map((f) => f.name).join(', ');
    throw new Error(
      hints[0] ??
        `We couldn’t find any history in ${names}. Drop a YouTube, Spotify, Netflix, Instagram or TikTok export (the .zip is fine). If your export came in several zips, drop them all together.`,
    );
  }
  return { results };
}

function countBySource(entries: WatchEntry[]): SourceCount[] {
  const m = new Map<SourceId, number>();
  for (const e of entries) m.set(e.source, (m.get(e.source) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count }));
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  try {
    if (req.type === 'sample') {
      progress('Inventing a person', 0.1);
      const entries = generateSampleHistory();
      const report = analyze(entries, { sample: true }, analysisProgress);
      post({ type: 'done', entries, report, sample: true, added: countBySource(entries) });
      return;
    }
    if (req.type === 'entries') {
      // Re-analysis of an already-loaded set (filters, remove source, resume).
      const report = analyze(req.entries, { sample: req.sample }, analysisProgress);
      post({ type: 'done', entries: null, report, sample: req.sample, added: [] });
      return;
    }
    const loaded = await loadFiles(req.files, req.options);
    if (loaded.profiles) {
      post({ type: 'choose-profile', profiles: loaded.profiles });
      return;
    }
    const fresh = loaded.results.flatMap((r) => r.entries);
    // Adding real data to the made-up sample makes no sense – start clean.
    const base = req.sample ? [] : req.base;
    const entries = finalize([...base, ...fresh]);
    const added = countBySource(fresh);
    progress(`Found ${added.map((a) => `${a.count.toLocaleString('en-US')} from ${sourceDef(a.id).label}`).join(', ')}`, 0.34);
    const report = analyze(entries, { sample: false }, analysisProgress);
    post({ type: 'done', entries, report, sample: false, added });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
