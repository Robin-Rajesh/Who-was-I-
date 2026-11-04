import { useEffect, useState } from 'react';
import type { Loaded, Theme } from '../App';
import { topicDef } from '../lib/topics';
import { compact, num } from '../lib/format';
import { renderShareCard, shareOrDownload } from '../lib/shareCard';
import { Logo } from './Landing';
import { ThemeToggle } from './ThemeToggle';
import { Icon, Reveal } from './ui';
import { Overview } from './sections/Overview';
import { Eras } from './sections/Eras';
import { Drift, River } from './sections/Change';
import { Years } from './sections/Years';
import { Channels } from './sections/Channels';
import { Rhythm } from './sections/Rhythm';
import { Compare } from './sections/Compare';
import { TimeMachine } from './sections/TimeMachine';
import { Milestones } from './sections/Milestones';

const NAV = [
  { id: 'overview', label: 'You' },
  { id: 'eras', label: 'Eras' },
  { id: 'river', label: 'Taste' },
  { id: 'years', label: 'Years' },
  { id: 'drift', label: 'Drift' },
  { id: 'channels', label: 'Obsessions' },
  { id: 'rhythm', label: 'Rhythm' },
  { id: 'compare', label: 'Compare' },
  { id: 'time-machine', label: 'Time machine' },
  { id: 'milestones', label: 'Records' },
];

interface Props {
  data: Loaded;
  theme: Theme;
  setTheme: (t: Theme) => void;
  onReset: () => void;
  onForget: () => void;
  savedOnDevice: boolean;
}

export function ReportView({ data, theme, setTheme, onReset, onForget, savedOnDevice }: Props) {
  const { report, entries } = data;
  const [active, setActive] = useState('overview');
  const [year, setYear] = useState(() => {
    const full = report.years.filter((y) => !y.partial && y.count > 0);
    return (full[full.length - 1] ?? report.years[report.years.length - 1]).year;
  });
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-35% 0px -60% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    document.querySelector(`.nav-link[data-id="${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [active]);

  const pickYear = (y: number) => {
    setYear(y);
    document.getElementById('years')?.scrollIntoView({ behavior: 'smooth' });
  };

  const shareAllTime = async () => {
    setSharing(true);
    try {
      const { meta, overallPersona, overallTopics, eras } = report;
      const first = new Date(meta.first).getFullYear();
      const last = new Date(meta.last).getFullYear();
      const topChannels = [...new Map(report.years.flatMap((y) => y.topChannels).map((c) => [c.name, 0])).keys()]
        .map((name) => ({ name, count: report.years.reduce((s, y) => s + (y.topChannels.find((c) => c.name === name)?.count ?? 0), 0) }))
        .sort((a, b) => b.count - a.count);
      const blob = await renderShareCard({
        kicker: 'my life on YouTube',
        title: first === last ? String(first) : `${String(first).slice(2)}–${String(last).slice(2)}`,
        emoji: overallPersona.emoji,
        persona: overallPersona.title,
        blurb: eras.length > 1 ? `${eras.length} eras: ${eras.map((e) => e.name.replace(/^The /, '').replace(/ Era$/, '')).join(' → ')}` : overallPersona.blurb,
        stats: [
          { value: compact(meta.total), label: 'videos' },
          { value: compact(meta.uniqueChannels), label: 'channels' },
          { value: String(eras.length), label: eras.length === 1 ? 'era' : 'eras' },
        ],
        channels: topChannels,
        words: [...new Set([...report.eras.flatMap((e) => e.words.slice(0, 1)), ...report.years.flatMap((y) => y.signatureWords.slice(0, 2))])].slice(0, 8),
        topics: overallTopics.slice(0, 6).map((t) => ({ label: topicDef(t.id).label, share: t.share, slot: report.topicSlots[t.id] ?? null })),
      });
      await shareOrDownload(blob, 'who-was-i.png', `Who was I? ${overallPersona.title}, across ${eras.length} eras.`);
    } finally {
      setSharing(false);
    }
  };

  const isSample = report.meta.source === 'sample';

  return (
    <div className="report">
      <header className="report-nav">
        <div className="wrap report-nav-inner">
          <button className="brand as-btn" onClick={onReset} aria-label="Back to start">
            <Logo size={26} />
            <span className="hide-sm">Who Was I?</span>
          </button>
          <nav className="nav-links" aria-label="Report sections">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} data-id={n.id} className={`nav-link ${active === n.id ? 'active' : ''}`} aria-current={active === n.id ? 'true' : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <button className="btn btn-sm hide-sm" onClick={shareAllTime} disabled={sharing}>
              <Icon name="share" size={16} /> {sharing ? 'Drawing…' : 'Share'}
            </button>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </div>
      </header>

      {isSample && (
        <div className="sample-banner">
          <div className="wrap">
            <span>
              <Icon name="sparkle" size={16} /> You’re looking at a <b>made-up sample life</b>. Every channel here is fictional.
            </span>
            <button className="btn btn-primary btn-sm" onClick={onReset}>
              Use my own history <Icon name="arrow-right" size={16} />
            </button>
          </div>
        </div>
      )}

      <main>
        <Overview report={report} />
        <Eras report={report} />
        <River report={report} />
        <Years report={report} year={year} setYear={setYear} />
        <Drift report={report} onPick={pickYear} />
        <Channels report={report} />
        <Rhythm report={report} />
        <Compare report={report} entries={entries} />
        <TimeMachine report={report} entries={entries} />
        <Milestones report={report} />

        <section className="section wrap closing">
          <Reveal className="closing-card card">
            <span className="eyebrow">That’s you. All of you.</span>
            <h2>
              {report.eras.length} eras, {num(report.meta.total)} videos, <span className="gradient-text">one person</span>.
            </h2>
            <p className="ink-2">Make a card of your whole story to share, or come back next year and see who you’ve become.</p>
            <div className="closing-actions">
              <button className="btn btn-primary" onClick={shareAllTime} disabled={sharing}>
                <Icon name="download" size={18} /> {sharing ? 'Drawing your card…' : 'Get my share card'}
              </button>
              <button className="btn" onClick={onReset}>
                <Icon name="refresh" size={18} /> Start over
              </button>
            </div>
            {!isSample && (
              <p className="privacy-note muted">
                <Icon name="lock" size={14} />{' '}
                {savedOnDevice ? (
                  <>
                    Saved only in this browser so you can come back.{' '}
                    <button className="link-btn danger" onClick={onForget}>
                      Forget my data
                    </button>
                  </>
                ) : (
                  <>Nothing was saved. Close this tab and it’s gone.</>
                )}
              </p>
            )}
          </Reveal>
        </section>
      </main>

      <footer className="footer wrap">
        <span>
          <Logo size={20} /> Who Was I?
        </span>
        <span className="muted">
          {data.fileName ? `From ${data.fileName} · ` : ''}Analysed on your device. Topics are best guesses from titles.
        </span>
      </footer>
    </div>
  );
}
