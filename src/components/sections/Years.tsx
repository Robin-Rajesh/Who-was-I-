import { useEffect, useState } from 'react';
import type { Report, YearSummary } from '../../lib/types';
import { topicDef } from '../../lib/topics';
import { MONTHS_LONG, date, hourLabel, num, pct, videoUrl } from '../../lib/format';
import { renderShareCard, shareOrDownload } from '../../lib/shareCard';
import { Icon, MaybeLink, Reveal, SectionHead, TopicChip, topicColor } from '../ui';

export function Years({ report, year, setYear }: { report: Report; year: number; setYear: (y: number) => void }) {
  const y = report.years.find((s) => s.year === year) ?? report.years[report.years.length - 1];
  return (
    <section className="section wrap" id="years">
      <SectionHead eyebrow="Year by year" title="Letters from past you">
        Every year gets a persona, its signature words and a short letter written from what that version of you watched.
        Pick a year.
      </SectionHead>
      <Reveal className="year-picker" >
        <div className="year-pills" role="tablist" aria-label="Choose a year">
          {report.years.map((s) => (
            <button
              key={s.year}
              role="tab"
              aria-selected={s.year === y.year}
              className="year-pill"
              onClick={() => setYear(s.year)}
              disabled={!s.count}
            >
              {s.year}
            </button>
          ))}
        </div>
      </Reveal>
      {y.count > 0 ? <YearCard key={y.year} report={report} y={y} /> : <p className="muted">No watch history in {y.year}.</p>}
    </section>
  );
}

function YearCard({ report, y }: { report: Report; y: YearSummary }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(id);
  }, [copied]);
  const maxCh = y.topChannels[0]?.count ?? 1;

  const share = async () => {
    setBusy(true);
    try {
      const blob = await renderShareCard({
        kicker: 'my year on YouTube',
        title: String(y.year),
        emoji: y.persona.emoji,
        persona: y.persona.title,
        blurb: y.persona.blurb,
        stats: [
          { value: num(y.count), label: 'videos' },
          { value: num(y.uniqueChannels), label: 'channels' },
          { value: num(y.newChannels), label: 'new discoveries' },
        ],
        channels: y.topChannels,
        words: y.signatureWords,
        topics: y.topTopics.slice(0, 5).map((t) => ({ label: topicDef(t.id).label, share: t.share, slot: report.topicSlots[t.id] ?? null })),
      });
      await shareOrDownload(blob, `who-was-i-${y.year}.png`, `Who was I in ${y.year}? ${y.persona.title}.`);
    } finally {
      setBusy(false);
    }
  };

  const copyLetter = async () => {
    const text = `Dear ${y.year} me,\n\n${y.letter.join(' ')}\n\n– from who you became`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="year-card">
      <Reveal className="year-main card">
        <div className="year-head">
          <span className="year-big gradient-text">{y.year}</span>
          {y.partial && <span className="badge">Partial year</span>}
        </div>
        <div className="year-persona">
          <span className="persona-emoji sm" aria-hidden>
            {y.persona.emoji}
          </span>
          <div>
            <h3>{y.persona.title}</h3>
            <p className="ink-2">{y.persona.blurb}</p>
          </div>
        </div>
        <div className="letter">
          <p className="letter-greeting">Dear {y.year} me,</p>
          {y.letter.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
          <p className="letter-sign">– from who you became</p>
        </div>
        <div className="year-actions">
          <button className="btn btn-primary btn-sm" onClick={share} disabled={busy}>
            <Icon name="share" size={16} /> {busy ? 'Drawing…' : 'Share card'}
          </button>
          <button className="btn btn-sm" onClick={copyLetter}>
            <Icon name={copied ? 'check' : 'copy'} size={16} /> {copied ? 'Copied' : 'Copy letter'}
          </button>
        </div>
      </Reveal>

      <div className="year-side">
        <Reveal className="card year-box" delay={60}>
          <h4 className="mini-head">Most watched channels</h4>
          <ol className="bar-list">
            {y.topChannels.slice(0, 7).map((c, i) => {
              const topic = report.channelTopics[c.name] ?? 'other';
              return (
                <li key={c.name}>
                  <span className="bar-rank muted tabular">{i + 1}</span>
                  <div className="bar-body">
                    <div className="bar-text">
                      <span className="rank-name">{c.name}</span>
                      <span className="muted tabular">{num(c.count)}</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(c.count / maxCh) * 100}%`, background: topicColor(report, topic) }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Reveal>

        <Reveal className="card year-box" delay={100}>
          <h4 className="mini-head">Topics</h4>
          <div className="era-chips">
            {y.topTopics.slice(0, 5).map((t) => (
              <TopicChip key={t.id} report={report} id={t.id} extra={pct(t.share)} />
            ))}
          </div>
          {y.signatureWords.length > 0 && (
            <>
              <h4 className="mini-head" style={{ marginTop: 18 }}>
                Signature words
              </h4>
              <div className="word-cloud">
                {y.signatureWords.slice(0, 8).map((w) => (
                  <span key={w} className="word-chip">
                    {w}
                  </span>
                ))}
              </div>
            </>
          )}
        </Reveal>

        <Reveal className="card year-box year-facts" delay={140}>
          <Fact label="Videos" value={num(y.count)} />
          <Fact label="Days you watched" value={num(y.activeDays)} />
          <Fact label="New channels" value={num(y.newChannels)} />
          <Fact label="Peak hour" value={hourLabel(y.peakHour)} />
          <Fact label="After 11pm" value={pct(y.nightShare)} />
          <Fact label="Busiest month" value={MONTHS_LONG[y.busiestMonth]} />
          {y.drift !== null && <Fact label={`Change vs ${y.year - 1}`} value={`${y.drift}%`} />}
          {y.firstVideo && (
            <div className="fact wide">
              <span className="fact-label">First video of the year · {date(y.firstVideo.t ?? 0, { month: 'short', day: 'numeric' })}</span>
              <MaybeLink className="fact-link" href={videoUrl(y.firstVideo.videoId, report.meta.source)}>
                {y.firstVideo.title || 'A video that’s no longer available'}
              </MaybeLink>
            </div>
          )}
        </Reveal>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="fact">
      <span className="fact-value">{value}</span>
      <span className="fact-label">{label}</span>
    </div>
  );
}
