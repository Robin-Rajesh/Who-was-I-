import type { Report } from '../../lib/types';
import { lowerLabel, topicDef } from '../../lib/topics';
import { TopicRiver } from '../charts/TopicRiver';
import { DriftChart } from '../charts/DriftChart';
import { Reveal, SectionHead } from '../ui';

export function River({ report }: { report: Report }) {
  return (
    <section className="section wrap" id="river">
      <SectionHead eyebrow="Month by month" title="The river of your taste">
        Every band is a topic and its thickness is how much of your {report.vocab.doing} it took up that month. Hover or tap to
        look closer. Your eras are marked underneath.
      </SectionHead>
      <Reveal className="card chart-card">
        <TopicRiver report={report} />
      </Reveal>
    </section>
  );
}

export function Drift({ report, onPick }: { report: Report; onPick: (y: number) => void }) {
  const withDrift = report.years.filter((y) => y.drift !== null && y.count >= 50);
  if (withDrift.length < 2) return null;
  const biggest = withDrift.reduce((a, b) => ((b.drift ?? 0) > (a.drift ?? 0) ? b : a));
  const calmest = withDrift.reduce((a, b) => ((b.drift ?? 100) < (a.drift ?? 100) ? b : a));
  const avg = Math.round(withDrift.reduce((s, y) => s + (y.drift ?? 0), 0) / withDrift.length);
  const desc = (ids: { id: Parameters<typeof topicDef>[0] }[]) => ids.map((g) => `${topicDef(g.id).emoji} ${lowerLabel(topicDef(g.id).label)}`).join(' and ');
  return (
    <section className="section wrap" id="drift">
      <SectionHead eyebrow="Drift" title="How much you changed, year to year">
        We compared each year’s {report.vocab.creators}, topics and words with the year before. 0% means the same person; 100% means
        a complete stranger.
      </SectionHead>
      <div className="drift-layout">
        <Reveal className="card chart-card">
          <DriftChart report={report} onPick={onPick} />
        </Reveal>
        <div className="drift-callouts">
          <Reveal className="card callout" delay={60}>
            <span className="eyebrow">Biggest reinvention</span>
            <strong className="callout-big">{biggest.year}</strong>
            <p className="ink-2">
              {biggest.drift}% different from {biggest.year - 1}.
              {biggest.gained.length > 0 && <> You leaned into {desc(biggest.gained)}</>}
              {biggest.lost.length > 0 && <>{biggest.gained.length ? ' and' : ' You'} let go of {desc(biggest.lost)}</>}
              {(biggest.gained.length > 0 || biggest.lost.length > 0) && '.'}
            </p>
          </Reveal>
          <Reveal className="card callout" delay={120}>
            <span className="eyebrow">Most settled year</span>
            <strong className="callout-big">{calmest.year}</strong>
            <p className="ink-2">
              {(calmest.drift ?? 0) <= 2 ? 'Practically identical to the year before.' : `Only ${calmest.drift}% different from the year before.`} You knew what you liked.
            </p>
          </Reveal>
          <Reveal className="card callout" delay={180}>
            <span className="eyebrow">Average change</span>
            <strong className="callout-big">{avg}%</strong>
            <p className="ink-2">{avg >= 45 ? 'You reinvent yourself a lot.' : avg >= 25 ? 'Steady, with real turns.' : 'Remarkably consistent.'}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
