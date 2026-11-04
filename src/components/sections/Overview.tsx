import type { Report } from '../../lib/types';
import { topicDef } from '../../lib/topics';
import { compact, date, duration, num, pct, videoUrl } from '../../lib/format';
import { MaybeLink, Reveal, topicColor, useTooltip } from '../ui';

export function Overview({ report }: { report: Report }) {
  const { meta, overallPersona, overallTopics, milestones } = report;
  const tt = useTooltip();
  const years = meta.years.length;
  const spanYears = meta.spanDays / 365.25;
  const top6 = overallTopics.slice(0, 6);
  const rest = overallTopics.slice(6).reduce((s, t) => s + t.count, 0);
  const segments = [...top6.map((t) => ({ id: t.id, count: t.count })), ...(rest ? [{ id: 'other' as const, count: rest, merged: true }] : [])];
  const mergedSegments = segments.reduce<{ id: (typeof segments)[number]['id']; count: number }[]>((acc, s) => {
    const existing = acc.find((a) => a.id === s.id);
    if (existing) existing.count += s.count;
    else acc.push({ ...s });
    return acc;
  }, []);

  return (
    <section className="section overview wrap" id="overview">
      <Reveal className="overview-hero">
        <span className="eyebrow">
          {date(meta.first, { month: 'long', year: 'numeric' })} – {date(meta.last, { month: 'long', year: 'numeric' })}
        </span>
        <h1>
          You pressed play <span className="gradient-text">{num(meta.total)}</span> times.
        </h1>
        <p className="lede">
          That’s {spanYears >= 1.5 ? `${spanYears.toFixed(1)} years` : duration(meta.spanDays)} of you, spread across{' '}
          {num(meta.uniqueChannels)} channels. Here’s who all those versions of you were.
        </p>
      </Reveal>

      <div className="overview-grid">
        <Reveal className="persona-card card" delay={80}>
          <span className="eyebrow">If your whole history were one person</span>
          <div className="persona-emoji" aria-hidden>
            {overallPersona.emoji}
          </div>
          <h2>{overallPersona.title}</h2>
          <p className="ink-2">{overallPersona.blurb}</p>
        </Reveal>

        <div className="stat-grid">
          {[
            { v: compact(meta.total), l: 'videos watched' },
            { v: String(years), l: years === 1 ? 'year of history' : 'years of history' },
            { v: compact(meta.uniqueChannels), l: 'channels' },
            { v: compact(meta.activeDays), l: 'days you pressed play' },
            { v: (meta.total / Math.max(1, meta.activeDays)).toFixed(1), l: 'videos per active day' },
            { v: meta.musicCount ? pct(meta.musicCount / meta.total) : `${report.eras.length}`, l: meta.musicCount ? 'from YouTube Music' : 'distinct eras' },
          ].map((s, i) => (
            <Reveal key={s.l} className="stat card" delay={100 + i * 40}>
              <span className="stat-value">{s.v}</span>
              <span className="stat-label">{s.l}</span>
            </Reveal>
          ))}
        </div>
      </div>

      <Reveal className="topic-mix card" delay={120}>
        <div className="topic-mix-head">
          <h3>What you watched, all time</h3>
          <span className="muted">Share of every video</span>
        </div>
        <div className="seg-bar" role="img" aria-label={mergedSegments.map((s) => `${topicDef(s.id).label} ${pct(s.count / meta.total)}`).join(', ')}>
          {mergedSegments.map((s) => (
            <div
              key={s.id}
              className="seg"
              style={{ flexGrow: s.count, background: topicColor(report, s.id) }}
              onPointerEnter={(e) => tt.show(<><b>{topicDef(s.id).emoji} {topicDef(s.id).label}</b> · {pct(s.count / meta.total)} ({num(s.count)})</>, e.clientX, e.clientY)}
              onPointerLeave={tt.hide}
            />
          ))}
        </div>
        <ul className="seg-legend">
          {mergedSegments.map((s) => (
            <li key={s.id}>
              <span className="dot" style={{ background: topicColor(report, s.id) }} />
              <span>
                {topicDef(s.id).emoji} {topicDef(s.id).label}
              </span>
              <b className="tabular">{pct(s.count / meta.total)}</b>
            </li>
          ))}
        </ul>
      </Reveal>

      {milestones.firstEver && (
        <Reveal className="first-ever card" delay={140}>
          <div className="first-ever-icon" aria-hidden>
            ⏮
          </div>
          <div>
            <span className="eyebrow">The very first video in your history · {date(milestones.firstEver.t ?? meta.first, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            <p className="first-ever-title">
              <MaybeLink href={videoUrl(milestones.firstEver.videoId, meta.source)}>“{milestones.firstEver.title}”</MaybeLink>
            </p>
            {milestones.firstEver.channel && <p className="muted">from {milestones.firstEver.channel}</p>}
          </div>
        </Reveal>
      )}
    </section>
  );
}
