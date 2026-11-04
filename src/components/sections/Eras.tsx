import type { Report } from '../../lib/types';
import { link, num } from '../../lib/format';
import { MaybeLink, Reveal, SectionHead, TopicChip, topicColor } from '../ui';

export function Eras({ report }: { report: Report }) {
  const { eras, meta } = report;
  const totalMonths = eras.length ? eras[eras.length - 1].end - eras[0].start + 1 : 1;
  return (
    <section className="section wrap" id="eras">
      <SectionHead eyebrow={`${eras.length} chapter${eras.length === 1 ? '' : 's'}`} title={<>Your eras</>}>
        We compared every month of your history and found the points where your taste genuinely shifted. Each era is
        named after what made it different from the rest of your life.
      </SectionHead>

      <Reveal className="era-strip" aria-hidden>
        {eras.map((e, i) => (
          <a
            key={i}
            href={`#era-${i}`}
            className="era-strip-seg"
            style={{ flexGrow: e.end - e.start + 1, background: e.topTopics[0] ? topicColor(report, e.topTopics[0].id) : 'var(--s-other)' }}
            title={`${e.name} (${e.startLabel} – ${e.endLabel})`}
          >
            <span>{(e.end - e.start + 1) / totalMonths > 0.08 ? e.emoji : ''}</span>
          </a>
        ))}
      </Reveal>

      <ol className="era-list">
        {eras.map((e, i) => (
          <Reveal as="li" key={i} className="era" delay={40}>
            <div className="era-rail" aria-hidden>
              <span className="era-dot" style={{ background: e.topTopics[0] ? topicColor(report, e.topTopics[0].id) : 'var(--s-other)' }} />
            </div>
            <article className="era-card card" id={`era-${i}`}>
              <div className="era-when">
                <span className="era-index">Era {i + 1}</span>
                <span>
                  {e.startLabel} – {i === eras.length - 1 ? 'now' : e.endLabel}
                </span>
              </div>
              <h3>
                <span aria-hidden>{e.emoji}</span> {e.name}
              </h3>
              <p className="ink-2">
                {e.tagline} · {num(e.count)} {report.vocab.items}
              </p>
              <div className="era-chips">
                {e.topTopics.map((t) => (
                  <TopicChip key={t.id} report={report} id={t.id} extra={`${Math.round(t.share * 100)}%`} />
                ))}
              </div>
              <div className="era-body">
                <div>
                  <h4 className="mini-head">On repeat</h4>
                  <ol className="rank-list">
                    {e.topChannels.slice(0, 4).map((c) => (
                      <li key={c.name}>
                        <span className="rank-name">{c.name}</span>
                        <span className="muted tabular">{num(c.count)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  {e.words.length > 0 && (
                    <>
                      <h4 className="mini-head">On your mind</h4>
                      <div className="word-cloud">
                        {e.words.map((w) => (
                          <span key={w} className="word-chip">
                            {w}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  {e.anthem && (
                    <p className="anthem">
                      <span className="mini-head">Era anthem</span>
                      <MaybeLink href={link(e.anthem.url, meta.sample)}>“{e.anthem.title}”</MaybeLink>
                      <span className="muted"> · played {e.anthem.count}×</span>
                    </p>
                  )}
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
