import { useState } from 'react';
import type { ChannelStory, Report } from '../../lib/types';
import { topicDef } from '../../lib/topics';
import { channelUrl, duration, monthYear, num } from '../../lib/format';
import { SparkBars } from '../charts/SparkBars';
import { MaybeLink, Reveal, SectionHead, Segmented, topicColor } from '../ui';

type Tab = 'abandoned' | 'rekindled' | 'constants';

export function Channels({ report }: { report: Report }) {
  const available: { value: Tab; label: string; list: ChannelStory[] }[] = [
    { value: 'abandoned' as Tab, label: `Abandoned (${report.abandoned.length})`, list: report.abandoned },
    { value: 'rekindled' as Tab, label: `Rekindled (${report.rekindled.length})`, list: report.rekindled },
    { value: 'constants' as Tab, label: `Constants (${report.constants.length})`, list: report.constants },
  ].filter((t) => t.list.length > 0);
  const [tab, setTab] = useState<Tab>(available[0]?.value ?? 'abandoned');
  if (!available.length) return null;
  const current = available.find((t) => t.value === tab) ?? available[0];
  const intro: Record<Tab, string> = {
    abandoned: 'Channels you were completely into, and then never watched again. Where did they go? Where did you go?',
    rekindled: 'Channels you left for a year or more, and then came back to.',
    constants: 'The ones that never left. Through every era, these stayed.',
  };
  return (
    <section className="section wrap" id="channels">
      <SectionHead eyebrow="People you spent time with" title="Obsessions, lost and found">
        {intro[current.value]}
      </SectionHead>
      <Reveal className="tab-row">
        <Segmented label="Channel stories" value={current.value} onChange={setTab} options={available.map(({ value, label }) => ({ value, label }))} />
      </Reveal>
      <div className="story-grid">
        {current.list.map((s, i) => (
          <Reveal key={`${current.value}-${s.name}`} className="story card" delay={Math.min(i, 8) * 40}>
            <div className="story-head">
              <span className="story-topic" style={{ background: topicColor(report, s.topic) }} aria-hidden>
                {topicDef(s.topic).emoji}
              </span>
              <div style={{ minWidth: 0 }}>
                <h3 className="story-name">
                  <MaybeLink href={channelUrl(s.url, report.meta.source)}>{s.name}</MaybeLink>
                </h3>
                <span className="muted">
                  {num(s.total)} videos · {monthYear(s.firstSeen)} – {monthYear(s.lastSeen)}
                </span>
              </div>
            </div>
            <p className="story-text ink-2">{storyLine(current.value, s)}</p>
            <SparkBars values={s.perYear} labels={report.meta.years} color={topicColor(report, s.topic)} />
            <div className="spark-axis muted">
              <span>{report.meta.years[0]}</span>
              <span>{report.meta.years[report.meta.years.length - 1]}</span>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function storyLine(tab: Tab, s: ChannelStory): string {
  if (tab === 'abandoned') {
    const window = monthYear(s.peakStart) === monthYear(s.peakEnd) ? monthYear(s.peakStart) : `${monthYear(s.peakStart)} – ${monthYear(s.peakEnd)}`;
    return `Peaked with ${num(s.peakCount)} videos in ${window}. Last seen ${monthYear(s.lastSeen)}${s.lastTitle ? `: “${s.lastTitle}”` : ''}.`;
  }
  if (tab === 'rekindled') {
    return `You disappeared for ${duration(s.gapDays ?? 0)} (${monthYear(s.gapStart ?? 0)} – ${monthYear(s.gapEnd ?? 0)}), then came back.`;
  }
  const active = s.perYear.filter((v) => v >= 3).length;
  return `Showed up in ${active} of your ${s.perYear.length} years, ${num(s.total)} videos in all.`;
}
