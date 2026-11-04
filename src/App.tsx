import { useCallback, useEffect, useRef, useState } from 'react';
import type { LoadOptions, Report, WatchEntry, WorkerRequest, WorkerResponse } from './lib/types';
import { sourceDef, type SourceId } from './lib/sources';
import { forgetHistory, loadHistory, peekHistory, saveHistory } from './lib/storage';
import { Landing } from './components/Landing';
import { Loading } from './components/Loading';
import { ProfileChooser } from './components/ProfileChooser';
import { ReportView } from './components/Report';
import { TooltipProvider } from './components/ui';

type Phase =
  | { kind: 'landing'; error?: string }
  | { kind: 'loading'; stage: string; pct: number }
  | { kind: 'choose-profile'; profiles: { name: string; count: number }[] }
  | { kind: 'report' };

export type Theme = 'system' | 'light' | 'dark';
export type Filter = SourceId | 'all';

export interface Loaded {
  /** Everything loaded, across all platforms. */
  all: WatchEntry[];
  /** The entries the current report was built from (all, or one platform). */
  entries: WatchEntry[];
  report: Report;
  sample: boolean;
  filter: Filter;
}

function readPref<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function writePref(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

export default function App() {
  const [phase, setPhase] = useState<Phase>({ kind: 'landing' });
  const [data, setData] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>(() => readPref<Theme>('wwi-theme', 'system'));
  const [remember, setRemember] = useState(() => readPref('wwi-remember', 'yes') === 'yes');
  const [saved, setSaved] = useState<{ count: number; savedAt: number } | null>(null);
  const [savedOnDevice, setSavedOnDevice] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  /** The last file request, so a Netflix profile choice can re-run it. */
  const lastFiles = useRef<{ files: File[]; base: WatchEntry[]; sample: boolean; returnTo: Phase['kind'] } | null>(null);
  /** The `all` array that is currently persisted, to avoid redundant saves. */
  const persisted = useRef<WatchEntry[] | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    writePref('wwi-theme', theme);
  }, [theme]);

  useEffect(() => writePref('wwi-remember', remember ? 'yes' : 'no'), [remember]);
  useEffect(() => void peekHistory().then(setSaved), []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  /**
   * Runs one worker job.
   * @param inline keep the report on screen (filtering) instead of the full loading screen
   */
  const run = useCallback(
    (req: WorkerRequest, opts: { inline?: boolean; onDone: (msg: Extract<WorkerResponse, { type: 'done' }>) => void; onFail: (message: string) => void }) => {
      workerRef.current?.terminate();
      const worker = new Worker(new URL('./worker/analyzer.worker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;
      if (opts.inline) setBusy('Recalculating…');
      else setPhase({ kind: 'loading', stage: 'Getting ready', pct: 0 });
      worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
        const msg = ev.data;
        if (msg.type === 'progress') {
          if (!opts.inline) setPhase({ kind: 'loading', stage: msg.stage, pct: msg.pct });
          return;
        }
        worker.terminate();
        setBusy(null);
        if (msg.type === 'error') opts.onFail(msg.message);
        else if (msg.type === 'choose-profile') setPhase({ kind: 'choose-profile', profiles: msg.profiles });
        else opts.onDone(msg);
      };
      worker.onerror = (e) => {
        worker.terminate();
        setBusy(null);
        opts.onFail(e.message || 'Something went wrong while reading your files.');
      };
      worker.postMessage(req);
    },
    [],
  );

  const showReport = useCallback((next: Loaded, scroll: boolean) => {
    setData(next);
    // Give the progress bar a beat to reach 100%.
    setTimeout(() => {
      setPhase({ kind: 'report' });
      if (scroll) window.scrollTo({ top: 0 });
    }, 300);
  }, []);

  const runFiles = useCallback(
    (files: File[], base: WatchEntry[], sample: boolean, options: LoadOptions, returnTo: Phase['kind']) => {
      lastFiles.current = { files, base, sample, returnTo };
      run(
        { type: 'files', files, base, sample, options },
        {
          onDone: (msg) => {
            const all = msg.entries ?? [];
            showReport({ all, entries: all, report: msg.report, sample: false, filter: 'all' }, true);
            if (returnTo === 'report') {
              const parts = msg.added.map((a) => `${a.count.toLocaleString('en-US')} from ${sourceDef(a.id).label}`);
              setToast(`Added ${parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]}.`);
            }
          },
          onFail: (message) => {
            if (returnTo === 'report' && data) {
              setPhase({ kind: 'report' });
              setToast(message);
            } else setPhase({ kind: 'landing', error: message });
          },
        },
      );
    },
    [run, showReport, data],
  );

  const onFiles = useCallback((files: File[]) => runFiles(files, [], false, {}, 'landing'), [runFiles]);
  const onAddFiles = useCallback(
    (files: File[]) => (data ? runFiles(files, data.all, data.sample, {}, 'report') : onFiles(files)),
    [data, runFiles, onFiles],
  );

  const onChooseProfile = useCallback(
    (profile: string) => {
      const last = lastFiles.current;
      if (!last) return;
      runFiles(last.files, last.base, last.sample, { netflixProfile: profile }, last.returnTo);
    },
    [runFiles],
  );

  const onSample = useCallback(() => {
    run(
      { type: 'sample' },
      {
        onDone: (msg) => {
          const all = msg.entries ?? [];
          showReport({ all, entries: all, report: msg.report, sample: true, filter: 'all' }, true);
        },
        onFail: (message) => setPhase({ kind: 'landing', error: message }),
      },
    );
  }, [run, showReport]);

  const onResume = useCallback(async () => {
    const h = await loadHistory();
    if (!h) {
      setSaved(null);
      return;
    }
    persisted.current = h.entries;
    run(
      { type: 'entries', entries: h.entries, sample: false },
      {
        onDone: (msg) => showReport({ all: h.entries, entries: h.entries, report: msg.report, sample: false, filter: 'all' }, true),
        onFail: (message) => setPhase({ kind: 'landing', error: message }),
      },
    );
  }, [run, showReport]);

  const onFilter = useCallback(
    (filter: Filter) => {
      if (!data || filter === data.filter) return;
      const entries = filter === 'all' ? data.all : data.all.filter((e) => e.source === filter);
      run(
        { type: 'entries', entries, sample: data.sample },
        {
          inline: true,
          onDone: (msg) => setData({ ...data, entries, report: msg.report, filter }),
          onFail: (message) => setToast(message),
        },
      );
    },
    [data, run],
  );

  const onRemoveSource = useCallback(
    (id: SourceId) => {
      if (!data) return;
      const all = data.all.filter((e) => e.source !== id);
      if (!all.length) {
        setPhase({ kind: 'landing' });
        setData(null);
        return;
      }
      run(
        { type: 'entries', entries: all, sample: data.sample },
        {
          inline: true,
          onDone: (msg) => {
            setData({ ...data, all, entries: all, report: msg.report, filter: 'all' });
            setToast(`Removed ${sourceDef(id).label}.`);
          },
          onFail: (message) => setToast(message),
        },
      );
    },
    [data, run],
  );

  const onForget = useCallback(async () => {
    // Turn "remember" off first so the save effect can't re-persist the data.
    setRemember(false);
    await forgetHistory();
    persisted.current = null;
    setSaved(null);
    setSavedOnDevice(false);
  }, []);

  const onReset = useCallback(() => {
    workerRef.current?.terminate();
    setPhase({ kind: 'landing' });
    setData(null);
    window.scrollTo({ top: 0 });
  }, []);

  // Single save path: whenever real data is loaded and "remember" is on, persist the full set locally.
  useEffect(() => {
    if (!data || data.sample || !remember) {
      setSavedOnDevice(!!data && !data.sample && persisted.current === data.all);
      return;
    }
    if (persisted.current === data.all) {
      setSavedOnDevice(true);
      return;
    }
    const all = data.all;
    saveHistory({ entries: all, savedAt: Date.now() }).then((ok) => {
      if (!ok) return;
      persisted.current = all;
      setSavedOnDevice(true);
      setSaved({ count: all.length, savedAt: Date.now() });
    });
  }, [data, remember]);

  return (
    <TooltipProvider>
      {phase.kind === 'landing' && (
        <Landing
          onFiles={onFiles}
          onSample={onSample}
          onResume={onResume}
          onForget={onForget}
          saved={saved}
          error={phase.error}
          remember={remember}
          setRemember={setRemember}
          theme={theme}
          setTheme={setTheme}
        />
      )}
      {phase.kind === 'loading' && <Loading stage={phase.stage} pct={phase.pct} />}
      {phase.kind === 'choose-profile' && (
        <ProfileChooser
          profiles={phase.profiles}
          onChoose={onChooseProfile}
          onCancel={() => (data ? setPhase({ kind: 'report' }) : setPhase({ kind: 'landing' }))}
        />
      )}
      {phase.kind === 'report' && data && (
        <ReportView
          data={data}
          theme={theme}
          setTheme={setTheme}
          onReset={onReset}
          onForget={onForget}
          onAddFiles={onAddFiles}
          onFilter={onFilter}
          onRemoveSource={onRemoveSource}
          savedOnDevice={savedOnDevice}
          busy={busy}
        />
      )}
      {toast && (
        <div className="toast" role="status" onClick={() => setToast(null)}>
          {toast}
        </div>
      )}
    </TooltipProvider>
  );
}
