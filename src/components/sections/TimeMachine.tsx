import { useDeferredValue, useMemo, useState } from 'react';
import type { Report, WatchEntry } from '../../lib/types';
import { date, link, monthLabel, monthYear, num, time, untitled } from '../../lib/format';
import { sourceDef } from '../../lib/sources';
import { Icon, MaybeLink, Reveal, SectionHead, useTooltip } from '../ui';

const pad = (n: number) => String(n).padStart(2, '0');
const isoDay = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function TimeMachine({ report, entries }: { report: Report; entries: WatchEntry[] }) {
  return (
    <section className="section wrap" id="time-machine">
      <SectionHead eyebrow="Time machine" title="Go back to any day">
        Memories from this exact date in past years, any day you choose, and a search across everything in your
        history.
      </SectionHead>
      <div className="tm-grid">
        <OnThisDay report={report} entries={entries} />
        <PickADay report={report} entries={entries} />
      </div>
      <Search report={report} entries={entries} />
    </section>
  );
}

function VideoRow({ e, report, showDate = false }: { e: WatchEntry; report: Report; showDate?: boolean }) {
  return (
    <li className="video-row">
      <span className="video-time muted tabular">{showDate ? date(e.t) : time(e.t)}</span>
      <div className="video-text">
        <MaybeLink className="video-title" href={link(e.url, report.meta.sample)}>
          {e.title || untitled(e.source)}
        </MaybeLink>
        <span className="muted video-channel">
          {report.meta.sources.length > 1 && <span className="src-tag">{sourceDef(e.source).label}</span>}
          {e.channel}
        </span>
      </div>
    </li>
  );
}

function OnThisDay({ report, entries }: { report: Report; entries: WatchEntry[] }) {
  const today = new Date();
  const groups = useMemo(() => {
    const m = today.getMonth();
    const d = today.getDate();
    const byYear = new Map<number, WatchEntry[]>();
    for (const e of entries) {
      const dt = new Date(e.t);
      if (dt.getMonth() === m && dt.getDate() === d && dt.getFullYear() < today.getFullYear()) {
        const arr = byYear.get(dt.getFullYear()) ?? [];
        arr.push(e);
        byYear.set(dt.getFullYear(), arr);
      }
    }
    return [...byYear.entries()].sort((a, b) => b[0] - a[0]);
  }, [entries]);
  return (
    <Reveal className="card tm-card">
      <h3 className="tm-title">
        <Icon name="heart" size={18} /> On this day · {date(today.getTime(), { month: 'long', day: 'numeric' })}
      </h3>
      {groups.length === 0 ? (
        <p className="muted">Nothing on this date in previous years. Past you was apparently busy.</p>
      ) : (
        <div className="otd">
          {groups.map(([year, list]) => (
            <div key={year} className="otd-year">
              <div className="otd-head">
                <strong>{year}</strong>
                <span className="muted">
                  {today.getFullYear() - year} year{today.getFullYear() - year === 1 ? '' : 's'} ago · {num(list.length)} {list.length === 1 ? report.vocab.item : report.vocab.items}
                </span>
              </div>
              <ul className="video-list">
                {list.slice(0, 3).map((e, i) => (
                  <VideoRow key={i} e={e} report={report} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Reveal>
  );
}

function PickADay({ report, entries }: { report: Report; entries: WatchEntry[] }) {
  const busiest = report.milestones.busiestDay?.date ?? report.meta.last;
  const [day, setDay] = useState(isoDay(busiest));
  const list = useMemo(() => {
    const [y, m, d] = day.split('-').map(Number);
    const start = new Date(y, m - 1, d).getTime();
    const end = new Date(y, m - 1, d + 1).getTime();
    return entries.filter((e) => e.t >= start && e.t < end);
  }, [day, entries]);
  const shift = (delta: number) => {
    const [y, m, d] = day.split('-').map(Number);
    const next = new Date(y, m - 1, d + delta).getTime();
    if (next >= new Date(report.meta.first).setHours(0, 0, 0, 0) && next <= report.meta.last) setDay(isoDay(next));
  };
  return (
    <Reveal className="card tm-card" delay={60}>
      <h3 className="tm-title">
        <Icon name="calendar" size={18} /> Pick a day
      </h3>
      <div className="day-picker">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="Previous day">
          ‹
        </button>
        <input
          className="input"
          type="date"
          value={day}
          min={isoDay(report.meta.first)}
          max={isoDay(report.meta.last)}
          onChange={(e) => e.target.value && setDay(e.target.value)}
          aria-label="Date"
        />
        <button className="icon-btn" onClick={() => shift(1)} aria-label="Next day">
          ›
        </button>
      </div>
      <p className="muted day-summary">
        {list.length ? `${num(list.length)} ${list.length === 1 ? report.vocab.item : report.vocab.items} on ${date(new Date(day + 'T12:00').getTime(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}` : 'Nothing on this day.'}
        {report.milestones.busiestDay && day === isoDay(report.milestones.busiestDay.date) && ' · your busiest day ever'}
      </p>
      <ul className="video-list scroll">
        {list.map((e, i) => (
          <VideoRow key={i} e={e} report={report} />
        ))}
      </ul>
    </Reveal>
  );
}

function Search({ report, entries }: { report: Report; entries: WatchEntry[] }) {
  const [q, setQ] = useState('');
  const dq = useDeferredValue(q.trim().toLowerCase());
  const tt = useTooltip();
  const result = useMemo(() => {
    if (dq.length < 2) return null;
    const months = report.river.months;
    const first = months[0].split('-').map(Number);
    const firstKey = first[0] * 12 + first[1] - 1;
    const perMonth = new Array<number>(months.length).fill(0);
    const hits: WatchEntry[] = [];
    for (const e of entries) {
      if (e.title.toLowerCase().includes(dq) || (e.channel && e.channel.toLowerCase().includes(dq))) {
        hits.push(e);
        const d = new Date(e.t);
        const idx = d.getFullYear() * 12 + d.getMonth() - firstKey;
        if (idx >= 0 && idx < perMonth.length) perMonth[idx]++;
      }
    }
    const peak = perMonth.indexOf(Math.max(...perMonth));
    return { hits, perMonth, peak };
  }, [dq, entries, report.river.months]);
  const suggestions = useMemo(() => report.years.flatMap((y) => y.signatureWords.slice(0, 1)).filter((w, i, arr) => arr.indexOf(w) === i).slice(0, 6), [report]);
  const max = result ? Math.max(1, ...result.perMonth) : 1;

  return (
    <Reveal className="card tm-search">
      <h3 className="tm-title">
        <Icon name="search" size={18} /> When were you into…?
      </h3>
      <div className="search-box">
        <Icon name="search" size={18} className="search-icon" />
        <input
          className="input"
          type="search"
          placeholder={`Try a game, an artist, a show, a hobby, a ${report.vocab.creator}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search your history"
        />
      </div>
      {!result && (
        <div className="suggestions">
          <span className="muted">Ideas from your history:</span>
          {suggestions.map((s) => (
            <button key={s} className="word-chip chip-btn" onClick={() => setQ(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {result && result.hits.length === 0 && <p className="muted">No matches for “{q}”. Past you never went there.</p>}
      {result && result.hits.length > 0 && (
        <>
          <div className="search-stats">
            <div>
              <span className="fact-value">{num(result.hits.length)}</span>
              <span className="fact-label">matching {report.vocab.items}</span>
            </div>
            <div>
              <span className="fact-value">{monthYear(result.hits[0].t)}</span>
              <span className="fact-label">first time</span>
            </div>
            <div>
              <span className="fact-value">{monthLabel(report.river.months[result.peak])}</span>
              <span className="fact-label">peak month</span>
            </div>
            <div>
              <span className="fact-value">{monthYear(result.hits[result.hits.length - 1].t)}</span>
              <span className="fact-label">most recent</span>
            </div>
          </div>
          <div className="search-chart" role="img" aria-label={`Monthly matches for ${q}`}>
            {result.perMonth.map((v, i) => (
              <div
                key={i}
                className="search-col"
                onPointerEnter={(e) => tt.show(<><b>{monthLabel(report.river.months[i])}</b> · {num(v)} matches</>, e.clientX, e.clientY)}
                onPointerLeave={tt.hide}
              >
                <div className="search-bar" style={{ height: `${v ? Math.max(4, (v / max) * 100) : 0}%`, background: i === result.peak ? 'var(--s2)' : 'var(--s1)' }} />
              </div>
            ))}
          </div>
          <div className="spark-axis muted">
            <span>{report.river.months[0].slice(0, 4)}</span>
            <span>{report.river.months[report.river.months.length - 1].slice(0, 4)}</span>
          </div>
          <h4 className="mini-head" style={{ marginTop: 20 }}>Most recent matches</h4>
          <ul className="video-list scroll">
            {result.hits
              .slice(-40)
              .reverse()
              .map((e, i) => (
                <VideoRow key={i} e={e} report={report} showDate />
              ))}
          </ul>
        </>
      )}
    </Reveal>
  );
}
