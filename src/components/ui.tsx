import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Report } from '../lib/types';
import { topicDef, type TopicId } from '../lib/topics';

/* ------------------------------------------------------------------ colour */

export function topicColor(report: Report, id: TopicId): string {
  const slot = report.topicSlots[id];
  return slot ? `var(--s${slot})` : 'var(--s-other)';
}

export function TopicChip({ report, id, extra }: { report: Report; id: TopicId; extra?: ReactNode }) {
  const def = topicDef(id);
  return (
    <span className="chip">
      <span className="dot" style={{ background: topicColor(report, id) }} aria-hidden />
      {def.label}
      {extra != null && <span className="muted tabular" style={{ fontWeight: 500 }}>{extra}</span>}
    </span>
  );
}

/* ------------------------------------------------------------------ reveal */

export function Reveal({ children, delay = 0, as: Tag = 'div', className = '', style }: {
  children: ReactNode;
  delay?: number;
  as?: 'div' | 'section' | 'article' | 'li';
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${inView ? 'in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ tooltip */

interface TooltipState {
  content: ReactNode;
  x: number;
  y: number;
}

const TooltipCtx = createContext<{ show: (c: ReactNode, x: number, y: number) => void; hide: () => void }>({
  show: () => {},
  hide: () => {},
});

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [tt, setTt] = useState<TooltipState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const show = useCallback((content: ReactNode, x: number, y: number) => setTt({ content, x, y }), []);
  const hide = useCallback(() => setTt(null), []);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEffect(() => {
    if (!tt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const pad = 12;
    let left = tt.x + 16;
    let top = tt.y + 16;
    if (left + r.width > window.innerWidth - pad) left = tt.x - r.width - 16;
    if (left < pad) left = pad;
    if (top + r.height > window.innerHeight - pad) top = tt.y - r.height - 16;
    if (top < pad) top = pad;
    setPos({ left, top });
  }, [tt]);
  useEffect(() => {
    const onScroll = () => setTt(null);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <TooltipCtx.Provider value={{ show, hide }}>
      {children}
      {tt && (
        <div ref={ref} className="tooltip" role="tooltip" style={{ left: pos.left, top: pos.top }}>
          {tt.content}
        </div>
      )}
    </TooltipCtx.Provider>
  );
}

export const useTooltip = () => useContext(TooltipCtx);

/* ------------------------------------------------------------------ links */

export function MaybeLink({ href, children, className }: { href: string | null; children: ReactNode; className?: string }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ icons */

type IconName =
  | 'upload' | 'sparkle' | 'sun' | 'moon' | 'share' | 'download' | 'arrow-right' | 'lock' | 'refresh' | 'trash'
  | 'search' | 'calendar' | 'play' | 'x' | 'check' | 'copy' | 'chevron-down' | 'file' | 'zap' | 'heart' | 'clock';

const PATHS: Record<IconName, string> = {
  upload: 'M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  share: 'M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13',
  download: 'M12 4v12m0 0-4.5-4.5M12 16l4.5-4.5M4 20h16',
  'arrow-right': 'M5 12h14m0 0-6-6m6 6-6 6',
  lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  refresh: 'M4 4v6h6M20 20v-6h-6M5.6 15a8 8 0 0 0 13.8 1.7M18.4 9A8 8 0 0 0 4.6 7.3',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  play: 'M7 5v14l11-7z',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
  'chevron-down': 'M6 9l6 6 6-6',
  file: 'M14 3H6v18h12V7l-4-4zM14 3v4h4',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
};

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

/* ------------------------------------------------------------------ misc */

export function SectionHead({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="section-head">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
    </Reveal>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
