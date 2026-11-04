import { useMemo, useState } from 'react';
import type { Report, WatchEntry } from '../../lib/types';
import { topicDef } from '../../lib/topics';
import { num, pct } from '../../lib/format';
import { Reveal, SectionHead, useTooltip } from '../ui';

function channelCounts(entries: WatchEntry[], year: number): Map<string, number> {
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  const m = new Map<string, number>();
  for (const e of entries) {
    if (e.t < start || e.t >= end || !e.channel) continue;
    m.set(e.channel, (m.get(e.channel) ?? 0) + 1);
  }
  return m;
}

export function Compare({ report, entries }: { report: Report; entries: WatchEntry[] }) {
  const years = report.years.filter((y) => y.count >= 20);
  const [a, setA] = useState(() => years[0]?.year ?? 0);
  const [b, setB] = useState(() => years[years.length - 1]?.year ?? 0);
  const tt = useTooltip();
  const ya = report.years.find((y) => y.year === a);
  const yb = report.years.find((y) => y.year === b);

  const diff = useMemo(() => {
    const ca = channelCounts(entries, a);
    const cb = channelCounts(entries, b);
    const shared = [...ca.keys()].filter((k) => cb.has(k)).map((k) => ({ name: k, a: ca.get(k)!, b: cb.get(k)! }));
    shared.sort((p, q) => Math.min(q.a, q.b) - Math.min(p.a, p.b));
    const onlyA = [...ca.entries()].filter(([k]) => !cb.has(k)).sort((p, q) => q[1] - p[1]).slice(0, 6);
    const onlyB = [...cb.entries()].filter(([k]) => !ca.has(k)).sort((p, q) => q[1] - p[1]).slice(0, 6);
    return { shared, onlyA, onlyB, sharedCount: shared.length, union: new Set([...ca.keys(), ...cb.keys()]).size };
  }, [entries, a, b]);

  if (years.length < 2 || !ya || !yb) return null;
  const ia = report.meta.years.indexOf(a);
  const ib = report.meta.years.indexOf(b);
  const sim = Math.round((report.similarity[ia]?.[ib] ?? 0) * 100);

  const topicIds = [...new Set([...ya.topTopics.slice(0, 5), ...yb.topTopics.slice(0, 5)].map((t) => t.id))].filter((id) => id !== 'other');
  const share = (y: typeof ya, id: string) => y.topTopics.find((t) => t.id === id)?.share ?? 0;
  const maxShare = Math.max(0.01, ...topicIds.flatMap((id) => [share(ya, id), share(yb, id)]));

  const verdict =
    sim >= 75 ? 'Practically the same person.' : sim >= 50 ? 'Clearly related, with some new habits.' : sim >= 25 ? 'Distant cousins.' : 'Total strangers.';

  return (
    <section className="section wrap" id="compare">
      <SectionHead eyebrow="You vs. you" title="Put two versions of yourself side by side">
        Pick any two years. See what stayed, what you left behind, and what took its place.
      </SectionHead>
      <Reveal className="compare-pickers">
        <YearSelect label="First year" value={a} years={years.map((y) => y.year)} onChange={setA} />
        <span className="vs" aria-hidden>
          vs
        </span>
        <YearSelect label="Second year" value={b} years={years.map((y) => y.year)} onChange={setB} />
      </Reveal>

      <div className="compare-grid">
        <Reveal className="card compare-person">
          <span className="compare-year" style={{ color: 'var(--s1)' }}>{a}</span>
          <span className="persona-emoji sm" aria-hidden>{ya.persona.emoji}</span>
          <h3>{ya.persona.title}</h3>
          <p className="muted">{num(ya.count)} videos · {num(ya.uniqueChannels)} channels</p>
        </Reveal>
        <Reveal className="card compare-score" delay={60}>
          <span className="eyebrow">Similarity</span>
          <strong className="score-big">{sim}%</strong>
          <p className="ink-2">{verdict}</p>
          <p className="muted">
            {num(diff.sharedCount)} of {num(diff.union)} channels in common
          </p>
        </Reveal>
        <Reveal className="card compare-person" delay={120}>
          <span className="compare-year" style={{ color: 'var(--s2)' }}>{b}</span>
          <span className="persona-emoji sm" aria-hidden>{yb.persona.emoji}</span>
          <h3>{yb.persona.title}</h3>
          <p className="muted">{num(yb.count)} videos · {num(yb.uniqueChannels)} channels</p>
        </Reveal>
      </div>

      <Reveal className="card chart-card" delay={80}>
        <div className="chart-toolbar">
          <h3 className="chart-title" style={{ margin: 0 }}>Topic mix</h3>
          <div className="legend">
            <span className="chip"><span className="dot" style={{ background: 'var(--s1)' }} />{a}</span>
            <span className="chip"><span className="dot" style={{ background: 'var(--s2)' }} />{b}</span>
          </div>
        </div>
        <div className="paired-bars">
          {topicIds.map((id) => (
            <div key={id} className="paired-row">
              <span className="paired-label">
                {topicDef(id).emoji} {topicDef(id).label}
              </span>
              <div className="paired-tracks">
                {[
                  { y: a, v: share(ya, id), c: 'var(--s1)' },
                  { y: b, v: share(yb, id), c: 'var(--s2)' },
                ].map((r) => (
                  <div
                    key={r.y}
                    className="paired-track"
                    onPointerEnter={(e) => tt.show(<><b>{r.y}</b> · {topicDef(id).label}: {pct(r.v, 1)}</>, e.clientX, e.clientY)}
                    onPointerLeave={tt.hide}
                  >
                    <div className="paired-fill" style={{ width: `${(r.v / maxShare) * 100}%`, background: r.c }} />
                    <span className="paired-value tabular">{pct(r.v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      <div className="compare-lists">
        <Reveal className="card year-box">
          <h4 className="mini-head">Only in {a}</h4>
          <ChannelList items={diff.onlyA} empty="Nothing. Everything you watched carried over." />
        </Reveal>
        <Reveal className="card year-box" delay={60}>
          <h4 className="mini-head">Survived both</h4>
          <ChannelList items={diff.shared.slice(0, 6).map((s) => [s.name, s.a + s.b] as [string, number])} empty="Not a single channel in common." />
        </Reveal>
        <Reveal className="card year-box" delay={120}>
          <h4 className="mini-head">New by {b}</h4>
          <ChannelList items={diff.onlyB} empty="No new channels." />
        </Reveal>
      </div>
    </section>
  );
}

function ChannelList({ items, empty }: { items: [string, number][]; empty: string }) {
  if (!items.length) return <p className="muted">{empty}</p>;
  return (
    <ol className="rank-list">
      {items.map(([name, count]) => (
        <li key={name}>
          <span className="rank-name">{name}</span>
          <span className="muted tabular">{num(count)}</span>
        </li>
      ))}
    </ol>
  );
}

function YearSelect({ label, value, years, onChange }: { label: string; value: number; years: number[]; onChange: (y: number) => void }) {
  return (
    <label className="year-select">
      <span className="sr-only">{label}</span>
      <select className="select" value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
