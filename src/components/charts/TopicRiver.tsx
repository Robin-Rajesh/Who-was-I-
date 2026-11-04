import { useMemo, useState } from 'react';
import { area, curveMonotoneX, stack, stackOffsetExpand, stackOffsetNone, stackOrderNone } from 'd3-shape';
import type { Report } from '../../lib/types';
import { topicDef } from '../../lib/topics';
import { monthLabel, num, pct } from '../../lib/format';
import { Segmented, TopicChip, topicColor, useTooltip } from '../ui';
import { useWidth } from './useSize';

type Mode = 'share' | 'volume';

function smooth(values: number[][], radius: number): number[][] {
  if (radius <= 0) return values;
  return values.map((_, i) => {
    const row = new Array(values[0].length).fill(0);
    let n = 0;
    for (let k = Math.max(0, i - radius); k <= Math.min(values.length - 1, i + radius); k++) {
      const w = radius + 1 - Math.abs(k - i);
      n += w;
      values[k].forEach((v, j) => (row[j] += v * w));
    }
    return row.map((v) => v / n);
  });
}

export function TopicRiver({ report }: { report: Report }) {
  const { river, eras } = report;
  const [mode, setMode] = useState<Mode>('share');
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const tt = useTooltip();
  const height = width < 600 ? 280 : 380;
  const pad = { top: 8, right: 8, bottom: 56, left: width < 600 ? 34 : 44 };
  const innerW = Math.max(10, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const M = river.months.length;

  const series = useMemo(() => {
    const sm = smooth(river.values, M > 36 ? 1 : 0);
    const rows = sm.map((r) => Object.fromEntries(r.map((v, j) => [String(j), v])));
    const keys = river.topics.map((_, j) => String(j));
    return stack<Record<string, number>>()
      .keys(keys)
      .order(stackOrderNone)
      .offset(mode === 'share' ? stackOffsetExpand : stackOffsetNone)(rows);
  }, [river, mode, M]);

  const yMax = mode === 'share' ? 1 : Math.max(1, ...series[series.length - 1].map((d) => d[1]));
  const x = (i: number) => (M <= 1 ? innerW / 2 : (i / (M - 1)) * innerW);
  const y = (v: number) => innerH - (v / yMax) * innerH;
  const areaGen = area<[number, number]>()
    .x((_, i) => x(i))
    .y0((d) => y(d[0]))
    .y1((d) => y(d[1]))
    .curve(curveMonotoneX);

  const yearTicks = river.months.map((m, i) => ({ m, i })).filter(({ m }) => m.endsWith('-01'));
  const tickEvery = Math.ceil(yearTicks.length / Math.max(1, Math.floor(innerW / 70)));
  const yTicks = mode === 'share' ? [0, 0.25, 0.5, 0.75, 1] : niceTicks(yMax);

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = (e.currentTarget as SVGRectElement).getBoundingClientRect();
    const i = Math.max(0, Math.min(M - 1, Math.round(((e.clientX - r.left) / r.width) * (M - 1))));
    setHover(i);
    const raw = river.values[i];
    const total = raw.reduce((s, v) => s + v, 0);
    const rows = river.topics
      .map((id, j) => ({ id, v: raw[j] }))
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v);
    tt.show(
      <>
        <div className="tt-title">
          {monthLabel(river.months[i])} · {num(total)} {report.vocab.items}
        </div>
        {rows.map((r) => (
          <div className="tt-row" key={r.id}>
            <span>
              <i className="dot" style={{ width: 8, height: 8, borderRadius: 99, display: 'inline-block', background: topicColor(report, r.id) }} />
              {topicDef(r.id).label}
            </span>
            <b>{mode === 'share' ? pct(r.v / (total || 1)) : num(r.v)}</b>
          </div>
        ))}
      </>,
      e.clientX,
      e.clientY,
    );
  };

  const tableRows = report.meta.years.map((yr) => {
    const idx = river.months.map((m, i) => (m.startsWith(`${yr}-`) ? i : -1)).filter((i) => i >= 0);
    const sums = river.topics.map((_, j) => idx.reduce((s, i) => s + river.values[i][j], 0));
    const total = sums.reduce((s, v) => s + v, 0) || 1;
    return { yr, shares: sums.map((s) => s / total) };
  });

  return (
    <div className="river">
      <div className="chart-toolbar">
        <div className="legend" aria-label="Legend">
          {river.topics.map((id) => (
            <TopicChip key={id} report={report} id={id} />
          ))}
        </div>
        <Segmented
          label="Chart mode"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'share', label: 'Share' },
            { value: 'volume', label: 'Volume' },
          ]}
        />
      </div>
      <div ref={ref} className="chart-frame">
        <svg width={width} height={height} role="img" aria-label="Stacked area chart of your topics each month">
          <g transform={`translate(${pad.left},${pad.top})`}>
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={0} x2={innerW} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className="axis-label">
                  {mode === 'share' ? `${Math.round(t * 100)}%` : num(t)}
                </text>
              </g>
            ))}
            {series.map((s, j) => (
              <path
                key={j}
                d={areaGen(s as unknown as [number, number][]) ?? ''}
                fill={topicColor(report, river.topics[j])}
                stroke="var(--surface)"
                strokeWidth={1}
                opacity={hover === null ? 0.95 : 0.88}
              />
            ))}
            <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="var(--axis)" />
            {yearTicks.map(({ m, i }, k) =>
              k % tickEvery === 0 ? (
                <g key={m} transform={`translate(${x(i)},${innerH})`}>
                  <line y2={5} stroke="var(--axis)" />
                  <text y={18} textAnchor="middle" className="axis-label">
                    {m.slice(0, 4)}
                  </text>
                </g>
              ) : null,
            )}
            {/* Era bands */}
            {eras.length > 1 &&
              eras.map((e, k) => {
                const x0 = x(e.start);
                const x1 = x(e.end);
                const w = Math.max(2, x1 - x0);
                return (
                  <g key={k} transform={`translate(${x0},${innerH + 28})`}>
                    <rect width={w} height={4} rx={2} fill="var(--ink-2)" opacity={k % 2 ? 0.35 : 0.6} />
                    {w > 56 && (
                      <text x={w / 2} y={18} textAnchor="middle" className="axis-label era-label">
                        {e.name.replace(/^The /, '').replace(/ Era$/, '')}
                      </text>
                    )}
                  </g>
                );
              })}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={0} y2={innerH} stroke="var(--ink)" strokeWidth={1.5} />}
            <rect
              width={innerW}
              height={innerH}
              fill="transparent"
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => {
                setHover(null);
                tt.hide();
              }}
              style={{ touchAction: 'pan-y' }}
            />
          </g>
        </svg>
      </div>
      <details className="data-table">
        <summary>View as table</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Year</th>
                {river.topics.map((id) => (
                  <th key={id}>{topicDef(id).label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.yr}>
                  <td>{r.yr}</td>
                  {r.shares.map((s, j) => (
                    <td key={j}>{pct(s)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function niceTicks(max: number): number[] {
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const s = max / step > 5 ? step * 2 : max / step > 2 ? step : step / 2;
  const out: number[] = [];
  for (let v = 0; v <= max; v += s) out.push(Math.round(v));
  return out;
}
