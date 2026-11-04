import type { Report } from '../../lib/types';
import { topicDef } from '../../lib/topics';
import { useTooltip } from '../ui';
import { useWidth } from './useSize';

/** One bar per year: how different you were from the year before. The biggest change is emphasised. */
export function DriftChart({ report, onPick }: { report: Report; onPick?: (year: number) => void }) {
  const years = report.years.filter((y) => y.drift !== null);
  const [ref, width] = useWidth<HTMLDivElement>();
  const tt = useTooltip();
  if (!years.length) return null;
  const height = width < 600 ? 240 : 300;
  const pad = { top: 28, right: 4, bottom: 28, left: 4 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...years.map((y) => y.drift ?? 0));
  const peak = years.find((y) => y.drift === max)!;
  const band = innerW / years.length;
  const barW = Math.min(44, Math.max(6, band - 2));
  const yScale = (v: number) => (v / 100) * innerH;

  return (
    <div ref={ref} className="chart-frame">
      <svg width={width} height={height} role="img" aria-label="Bar chart of how much your viewing changed each year">
        <g transform={`translate(${pad.left},${pad.top})`}>
          {[25, 50, 75, 100].map((t) => (
            <line key={t} x1={0} x2={innerW} y1={innerH - yScale(t)} y2={innerH - yScale(t)} stroke="var(--grid)" />
          ))}
          {years.map((y, i) => {
            const h = Math.max(2, yScale(y.drift ?? 0));
            const cx = band * i + band / 2;
            const isPeak = y === peak;
            return (
              <g
                key={y.year}
                className="drift-bar"
                onClick={() => onPick?.(y.year)}
                onPointerEnter={(e) =>
                  tt.show(
                    <>
                      <div className="tt-title">
                        {y.year - 1} → {y.year}: {y.drift}% change
                      </div>
                      {y.gained[0] && (
                        <div className="tt-row">
                          <span>More</span>
                          <b>{y.gained.map((g) => topicDef(g.id).label).join(', ')}</b>
                        </div>
                      )}
                      {y.lost[0] && (
                        <div className="tt-row">
                          <span>Less</span>
                          <b>{y.lost.map((g) => topicDef(g.id).label).join(', ')}</b>
                        </div>
                      )}
                      <div className="muted" style={{ marginTop: 6 }}>Click to open {y.year}</div>
                    </>,
                    e.clientX,
                    e.clientY,
                  )
                }
                onPointerLeave={tt.hide}
                style={{ cursor: onPick ? 'pointer' : undefined }}
              >
                <rect x={band * i} y={0} width={band} height={innerH} fill="transparent" />
                <path d={roundedTop(cx - barW / 2, innerH - h, barW, h, Math.min(4, barW / 2))} fill={isPeak ? 'var(--s2)' : 'var(--s1)'} opacity={isPeak ? 1 : 0.75} />
                {isPeak && (
                  <text x={cx} y={innerH - h - 8} textAnchor="middle" className="bar-label">
                    {y.drift}%
                  </text>
                )}
                {(years.length <= 14 || i % 2 === 0) && (
                  <text x={cx} y={innerH + 18} textAnchor="middle" className="axis-label">
                    {width < 520 ? `’${String(y.year).slice(2)}` : y.year}
                  </text>
                )}
              </g>
            );
          })}
          <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--axis)" />
        </g>
      </svg>
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
