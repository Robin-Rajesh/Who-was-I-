import type { Report } from '../../lib/types';
import { WEEKDAYS, hourLabel, num, pct } from '../../lib/format';
import { Heatmap } from '../charts/Heatmap';
import { Reveal, SectionHead } from '../ui';

const HOURS = Array.from({ length: 24 }, (_, h) => hourLabel(h));

export function Rhythm({ report }: { report: Report }) {
  const { rhythm, years, meta } = report;
  const rows = years.filter((y) => y.count > 0);
  const nightTrend = rows.map((y) => ({ year: y.year, night: y.nightShare, morning: y.morningShare }));
  const owl = nightTrend.reduce((a, b) => (b.night > a.night ? b : a));
  const lark = nightTrend.reduce((a, b) => (b.morning > a.morning ? b : a));
  const weekTotals = rhythm.weekdayHour.map((r) => r.reduce((s, v) => s + v, 0));
  const busiestDay = weekTotals.indexOf(Math.max(...weekTotals));
  return (
    <section className="section wrap" id="rhythm">
      <SectionHead eyebrow="When you showed up" title="Your daily rhythm, through the years">
        Each row is a year and each column is an hour of the day. Rows are coloured by that year’s own pattern, so you
        can see your habits change shape even when you did more or less.
      </SectionHead>
      <div className="rhythm-callouts">
        <Reveal className="card callout">
          <span className="eyebrow">Peak night owl</span>
          <strong className="callout-big">{owl.year}</strong>
          <p className="ink-2">{pct(owl.night)} of your {report.vocab.doing} happened between 11pm and 5am.</p>
        </Reveal>
        <Reveal className="card callout" delay={60}>
          <span className="eyebrow">Peak early bird</span>
          <strong className="callout-big">{lark.year}</strong>
          <p className="ink-2">{pct(lark.morning)} of your {report.vocab.doing} happened between 5am and 9am.</p>
        </Reveal>
        <Reveal className="card callout" delay={120}>
          <span className="eyebrow">Favourite day</span>
          <strong className="callout-big">{['Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays', 'Sundays'][busiestDay]}</strong>
          <p className="ink-2">{pct(weekTotals[busiestDay] / Math.max(1, weekTotals.reduce((s, x) => s + x, 0)))} of all your {report.vocab.doing}.</p>
        </Reveal>
      </div>
      <Reveal className="card chart-card">
        <h3 className="chart-title">Hour of day × year</h3>
        <Heatmap
          label="Heatmap of viewing by hour for each year"
          rows={rows.map((y) => String(y.year))}
          cols={HOURS}
          values={rows.map((y) => rhythm.hourByYear[meta.years.indexOf(y.year)])}
          normalizeRows
          colTickEvery={3}
          describe={(r, c, v, share) => (
            <>
              <div className="tt-title">
                {rows[r].year} · {HOURS[c]}–{HOURS[(c + 1) % 24]}
              </div>
              {num(v)} {report.vocab.items} ({pct(share, 1)} of that year)
            </>
          )}
        />
      </Reveal>
      <Reveal className="card chart-card" delay={60} style={{ marginTop: 16 }}>
        <h3 className="chart-title">Your week, all time</h3>
        <Heatmap
          label="Heatmap of viewing by weekday and hour"
          rows={WEEKDAYS}
          cols={HOURS}
          values={rhythm.weekdayHour}
          colTickEvery={3}
          describe={(r, c, v) => (
            <>
              <div className="tt-title">
                {WEEKDAYS[r]} · {HOURS[c]}
              </div>
              {num(v)} {report.vocab.items}
            </>
          )}
        />
      </Reveal>
    </section>
  );
}
