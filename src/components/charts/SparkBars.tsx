import { num } from '../../lib/format';
import { useTooltip } from '../ui';

/** Tiny per-year bars for a channel ("how much did I watch them each year?"). */
export function SparkBars({ values, labels, color = 'var(--s1)', height = 36 }: { values: number[]; labels: (string | number)[]; color?: string; height?: number }) {
  const tt = useTooltip();
  const max = Math.max(1, ...values);
  return (
    <div className="spark" style={{ height }} role="img" aria-label={values.map((v, i) => `${labels[i]}: ${v}`).join(', ')}>
      {values.map((v, i) => (
        <div
          key={i}
          className="spark-col"
          onPointerEnter={(e) => tt.show(<><b>{labels[i]}</b> · {num(v)} videos</>, e.clientX, e.clientY)}
          onPointerLeave={tt.hide}
        >
          <div className="spark-bar" style={{ height: `${v ? Math.max(6, (v / max) * 100) : 0}%`, background: v ? color : 'transparent' }} />
        </div>
      ))}
    </div>
  );
}
