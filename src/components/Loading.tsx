import { useEffect, useState } from 'react';
import { Logo } from './Landing';

const QUIPS = [
  'Rewinding the tape…',
  'Dusting off 2am rabbit holes…',
  'Remembering who you subscribed to…',
  'Counting every “one more video”…',
  'Asking past you some questions…',
];

export function Loading({ stage, pct }: { stage: string; pct: number }) {
  const [quip, setQuip] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setQuip((q) => (q + 1) % QUIPS.length), 2200);
    return () => clearInterval(id);
  }, []);
  const p = Math.max(0.03, Math.min(1, pct));
  return (
    <main className="loading" aria-live="polite" aria-busy="true">
      <div className="loading-inner">
        <div className="loading-logo">
          <Logo size={64} />
        </div>
        <h1>{stage}…</h1>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
          <div className="progress-bar" style={{ transform: `scaleX(${p})` }} />
        </div>
        <p className="muted" key={quip}>
          {QUIPS[quip]}
        </p>
        <p className="loading-note">Everything is happening on your device. Nothing is being uploaded.</p>
      </div>
    </main>
  );
}
