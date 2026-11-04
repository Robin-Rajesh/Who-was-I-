import type { Report } from '../../lib/types';
import { date, duration, link, num } from '../../lib/format';
import { MaybeLink, Reveal, SectionHead } from '../ui';

export function Milestones({ report }: { report: Report }) {
  const { milestones: m, meta } = report;
  return (
    <section className="section wrap" id="milestones">
      <SectionHead eyebrow="Records" title="Personal bests (and worsts)" />
      <div className="milestone-grid">
        {m.busiestDay && (
          <Reveal className="card milestone">
            <span className="eyebrow">Busiest day ever</span>
            <strong className="callout-big">{num(m.busiestDay.count)} {report.vocab.items}</strong>
            <p className="ink-2">{date(m.busiestDay.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            {m.busiestDay.titles.length > 0 && (
              <ul className="mini-titles">
                {m.busiestDay.titles.map((t) => (
                  <li key={t}>“{t}”</li>
                ))}
              </ul>
            )}
          </Reveal>
        )}
        {m.longestStreak && (
          <Reveal className="card milestone" delay={50}>
            <span className="eyebrow">Longest daily streak</span>
            <strong className="callout-big">{num(m.longestStreak.days)} days</strong>
            <p className="ink-2">
              {date(m.longestStreak.start)} – {date(m.longestStreak.end)}, without missing a single day.
            </p>
          </Reveal>
        )}
        {m.longestBreak && (
          <Reveal className="card milestone" delay={100}>
            <span className="eyebrow">Longest break</span>
            <strong className="callout-big">{duration(m.longestBreak.days)}</strong>
            <p className="ink-2">
              {date(m.longestBreak.start)} – {date(m.longestBreak.end)}. Touching grass, presumably.
            </p>
          </Reveal>
        )}
        {meta.removedCount > 0 ? (
          <Reveal className="card milestone" delay={150}>
            <span className="eyebrow">Gone but not forgotten</span>
            <strong className="callout-big">{num(meta.removedCount)}</strong>
            <p className="ink-2">YouTube videos you watched that have since been deleted or made private.</p>
          </Reveal>
        ) : (
          <Reveal className="card milestone" delay={150}>
            <span className="eyebrow">Days you showed up</span>
            <strong className="callout-big">{num(meta.activeDays)}</strong>
            <p className="ink-2">out of {num(meta.spanDays)} days in your history ({Math.round((meta.activeDays / Math.max(1, meta.spanDays)) * 100)}%).</p>
          </Reveal>
        )}
      </div>

      {m.mostRewatched.length > 0 && (
        <Reveal className="card rewatch" delay={80}>
          <h3 className="chart-title">On repeat, all time</h3>
          <ol className="rewatch-list">
            {m.mostRewatched.map((v, i) => (
              <li key={i}>
                <span className="rewatch-count tabular">{num(v.count)}×</span>
                <div className="video-text">
                  <MaybeLink className="video-title" href={link(v.url, meta.sample)}>
                    {v.title}
                  </MaybeLink>
                  {v.channel && <span className="muted video-channel">{v.channel}</span>}
                </div>
              </li>
            ))}
          </ol>
        </Reveal>
      )}
    </section>
  );
}
