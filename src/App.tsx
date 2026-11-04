import { useCallback, useEffect, useRef, useState } from 'react';
import type { DataSource, Report, WatchEntry, WorkerRequest, WorkerResponse } from './lib/types';
import { forgetHistory, loadHistory, peekHistory, saveHistory } from './lib/storage';
import { Landing } from './components/Landing';
import { Loading } from './components/Loading';
import { ReportView } from './components/Report';
import { TooltipProvider } from './components/ui';

type Phase =
  | { kind: 'landing'; error?: string }
  | { kind: 'loading'; stage: string; pct: number }
  | { kind: 'report' };

export type Theme = 'system' | 'light' | 'dark';

export interface Loaded {
  entries: WatchEntry[];
  report: Report;
  source: DataSource;
  fileName: string | null;
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
  const [theme, setTheme] = useState<Theme>(() => readPref<Theme>('wwi-theme', 'system'));
  const [remember, setRemember] = useState(() => readPref('wwi-remember', 'yes') === 'yes');
  const [saved, setSaved] = useState<{ count: number; savedAt: number; source: DataSource } | null>(null);
  const [savedOnDevice, setSavedOnDevice] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    writePref('wwi-theme', theme);
  }, [theme]);

  useEffect(() => {
    writePref('wwi-remember', remember ? 'yes' : 'no');
  }, [remember]);

  useEffect(() => {
    peekHistory().then(setSaved);
  }, []);

  /** @param alreadySaved true when the entries came from this device's storage. */
  const run = useCallback((req: WorkerRequest, alreadySaved: boolean) => {
    workerRef.current?.terminate();
    const worker = new Worker(new URL('./worker/analyzer.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setSavedOnDevice(alreadySaved);
    setPhase({ kind: 'loading', stage: 'Getting ready', pct: 0 });
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const msg = ev.data;
      if (msg.type === 'progress') {
        setPhase({ kind: 'loading', stage: msg.stage, pct: msg.pct });
      } else if (msg.type === 'error') {
        setPhase({ kind: 'landing', error: msg.message });
        worker.terminate();
      } else {
        const loaded: Loaded = { entries: msg.entries, report: msg.report, source: msg.source, fileName: msg.fileName };
        setData(loaded);
        // Give the progress bar a beat to reach 100%.
        setTimeout(() => {
          setPhase({ kind: 'report' });
          window.scrollTo({ top: 0 });
        }, 350);
        worker.terminate();
      }
    };
    worker.onerror = (e) => {
      setPhase({ kind: 'landing', error: e.message || 'Something went wrong while reading your file.' });
      worker.terminate();
    };
    worker.postMessage(req);
  }, []);

  const onFiles = useCallback((files: File[]) => run({ type: 'files', files }, false), [run]);
  const onSample = useCallback(() => run({ type: 'sample' }, false), [run]);
  const onResume = useCallback(async () => {
    const h = await loadHistory();
    if (!h) {
      setSaved(null);
      return;
    }
    run({ type: 'entries', entries: h.entries, source: h.source }, true);
  }, [run]);
  const onForget = useCallback(async () => {
    await forgetHistory();
    setSaved(null);
    setSavedOnDevice(false);
  }, []);
  const onReset = useCallback(() => {
    setPhase({ kind: 'landing' });
    setData(null);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    // Single save path: whenever a real report is showing and "remember" is on, persist it locally.
    if (phase.kind !== 'report' || !data || data.source === 'sample') return;
    if (remember && !savedOnDevice) {
      saveHistory({ entries: data.entries, source: data.source, fileName: data.fileName, savedAt: Date.now() }).then((ok) => {
        setSavedOnDevice(ok);
        if (ok) setSaved({ count: data.entries.length, savedAt: Date.now(), source: data.source });
      });
    }
  }, [remember, savedOnDevice, data, phase.kind]);

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
      {phase.kind === 'report' && data && (
        <ReportView
          data={data}
          theme={theme}
          setTheme={setTheme}
          onReset={onReset}
          savedOnDevice={savedOnDevice}
          onForget={async () => {
            // Turn "remember" off first so the save effect can't re-persist the data.
            setRemember(false);
            await onForget();
          }}
        />
      )}
    </TooltipProvider>
  );
}
