import type { SourceId } from './sources';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const num = (n: number) => Math.round(n).toLocaleString('en-US');

export function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export const pct = (x: number, digits = 0) => `${(x * 100).toFixed(digits)}%`;

export function date(t: number, opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return new Date(t).toLocaleDateString('en-US', opts);
}

export const monthYear = (t: number) => date(t, { month: 'short', year: 'numeric' });

export function time(t: number) {
  return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function hourLabel(h: number): string {
  if (h === 0) return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export function duration(days: number): string {
  if (days >= 730) return `${(days / 365).toFixed(1).replace(/\.0$/, '')} years`;
  if (days >= 60) return `${Math.round(days / 30)} months`;
  if (days >= 14) return `${Math.round(days / 7)} weeks`;
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** Links only make sense for real exports – the sample data is made up. */
export function link(url: string | null | undefined, sample: boolean): string | null {
  return url && !sample ? url : null;
}

/** Label for an entry whose title is missing. */
export function untitled(source: SourceId): string {
  return source === 'youtube' ? 'A video that’s no longer available' : 'Untitled';
}

/** "1,234 hours" / "45 minutes" from milliseconds. */
export function listenTime(ms: number): { value: string; unit: string } {
  const h = ms / 3_600_000;
  if (h >= 48) return { value: compact(h), unit: 'hours' };
  if (h >= 1) return { value: h.toFixed(1), unit: 'hours' };
  return { value: String(Math.round(ms / 60_000)), unit: 'minutes' };
}

export const plural = (n: number, word: string, pluralWord = `${word}s`) => `${num(n)} ${n === 1 ? word : pluralWord}`;
