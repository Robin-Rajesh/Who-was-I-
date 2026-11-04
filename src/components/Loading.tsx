import { useEffect, useState } from 'react';

const QUIPS = [
  'Dusting off the 2am rabbit holes',
  'Remembering who you used to follow',
  'Counting every “one more”',
  'Finding the bit where everything changed',
  'Asking past you a few questions',
];

export function Loading({ stage, pct }: { stage: string; pct: number }) {
  const [quip, setQuip] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setQuip((q) => (q + 1) % QUIPS.length), 2200);
    return () => clearInterval(id);
  }, []);
  const p = Math.max(0.03, Math.min(1, pct));
  const counter = String(Math.round(p * 999)).padStart(3, '0');
  return (
    <main className="loading" aria-live="polite" aria-busy="true">
      <div className="loading-inner">
        <div className="deck" aria-hidden>
          <span className="reel spin" />
          <span className="deck-counter mono">{counter}</span>
          <span className="reel spin" />
        </div>
        <h1>Rewinding</h1>
        <p className="loading-stage mono">{stage}</p>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
          <div className="progress-bar" style={{ transform: `scaleX(${p})` }} />
        </div>
        <p className="muted loading-quip" key={quip}>
          {QUIPS[quip]}…
        </p>
        <p className="loading-note mono">Everything happens on your device. Nothing is uploaded.</p>
      </div>
    </main>
  );
}
