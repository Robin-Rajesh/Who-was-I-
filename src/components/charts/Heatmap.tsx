import type { ReactNode } from 'react';
import { num, pct } from '../../lib/format';
import { useTooltip } from '../ui';

const LEVELS = ['var(--seq-0)', 'var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)'];

/**
 * A rows × columns heatmap on a single-hue sequential ramp.
 * When `normalizeRows` is set each row is coloured by its own share, so a
 * light year and a heavy year can be compared by *shape*, not volume.
 */
export function Heatmap({
  rows,
  cols,
  values,
  normalizeRows = false,
  label,
  colTickEvery = 3,
  describe,
}: {
  rows: string[];
  cols: string[];
  values: number[][];
  normalizeRows?: boolean;
  label: string;
  colTickEvery?: number;
  describe: (row: number, col: number, value: number, share: number) => ReactNode;
}) {
  const tt = useTooltip();
  const rowTotals = values.map((r) => r.reduce((s, v) => s + v, 0));
  const norm = values.map((r, i) => r.map((v) => (normalizeRows ? (rowTotals[i] ? v / rowTotals[i] : 0) : v)));
  const max = Math.max(1e-9, ...norm.flat());
  const level = (v: number) => (v <= 0 ? -1 : Math.min(4, Math.floor((v / max) * 5 - 1e-9)));

  return (
    <div className="heatmap" role="img" aria-label={label}>
      <div className="heatmap-grid" style={{ gridTemplateColumns: `auto repeat(${cols.length}, minmax(0, 1fr))` }}>
        {rows.map((r, i) => (
          <div className="heatmap-row" key={r} style={{ display: 'contents' }}>
            <div className="heatmap-rowlabel">{r}</div>
            {cols.map((c, j) => {
              const v = values[i][j];
              const lv = level(norm[i][j]);
              return (
                <div
                  key={c}
                  className="heatmap-cell"
                  style={{ background: lv < 0 ? 'var(--surface-2)' : LEVELS[lv] }}
                  onPointerEnter={(e) => tt.show(describe(i, j, v, rowTotals[i] ? v / rowTotals[i] : 0), e.clientX, e.clientY)}
                  onPointerMove={(e) => tt.show(describe(i, j, v, rowTotals[i] ? v / rowTotals[i] : 0), e.clientX, e.clientY)}
                  onPointerLeave={tt.hide}
                />
              );
            })}
          </div>
        ))}
        <div />
        {cols.map((c, j) => (
          <div className="heatmap-collabel" key={c}>
            {j % colTickEvery === 0 ? c : ''}
          </div>
        ))}
      </div>
      <div className="heatmap-legend">
        <span className="muted">Less</span>
        {LEVELS.map((l) => (
          <span key={l} className="heatmap-swatch" style={{ background: l }} />
        ))}
        <span className="muted">More</span>
      </div>
      <details className="data-table">
        <summary>View as table</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th />
                {cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r}>
                  <td>{r}</td>
                  {values[i].map((v, j) => (
                    <td key={j}>{normalizeRows ? pct(rowTotals[i] ? v / rowTotals[i] : 0) : num(v)}</td>
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
