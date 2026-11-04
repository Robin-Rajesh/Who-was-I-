import type { TopicId } from './topics';
import type { EntryKind, SourceId, Vocab } from './sources';

/**
 * One normalised activity event: a watched video, a played track, a Netflix
 * episode, an Instagram like… The field names come from the YouTube origins
 * of the app, but they are generic:
 *  - `videoId`  stable id of the item (video id, track URI…) for "on repeat"
 *  - `channel`  the creator: channel / artist / show / account
 */
export interface WatchEntry {
  /** Epoch milliseconds. */
  t: number;
  title: string;
  videoId: string | null;
  channel: string | null;
  channelUrl: string | null;
  /** Link to the item itself, when the platform provides one. */
  url: string | null;
  source: SourceId;
  kind: EntryKind;
  /** Milliseconds listened/watched, when known (Spotify, Netflix). */
  ms?: number;
  /** The date is known but not the time of day (e.g. Netflix quick export). */
  approx?: boolean;
}

export interface SourceCount {
  id: SourceId;
  count: number;
}

export interface ChannelRef {
  name: string;
  url: string | null;
  count: number;
}

export interface TopicShare {
  id: TopicId;
  count: number;
  share: number;
}

export interface VideoRef {
  title: string;
  videoId: string | null;
  url: string | null;
  channel: string | null;
  source: SourceId;
  count: number;
  t?: number;
}

export interface Persona {
  title: string;
  emoji: string;
  blurb: string;
}

export interface YearSummary {
  year: number;
  count: number;
  /** Count of distinct days with at least one watch. */
  activeDays: number;
  perActiveDay: number;
  uniqueChannels: number;
  newChannels: number;
  notableNewChannels: string[];
  topChannels: ChannelRef[];
  topTopics: TopicShare[];
  signatureWords: string[];
  mostRewatched: VideoRef | null;
  /** Share of watches between 23:00 and 04:59. */
  nightShare: number;
  /** Share of watches between 05:00 and 08:59. */
  morningShare: number;
  weekendShare: number;
  peakHour: number;
  busiestMonth: number;
  firstVideo: VideoRef | null;
  persona: Persona;
  /** 0–100 – how different this year is from the previous one (null for the first year). */
  drift: number | null;
  gained: TopicShare[];
  lost: TopicShare[];
  letter: string[];
  /** True when the year only has part of its months in the data. */
  partial: boolean;
}

export interface Era {
  /** Month index (0 = first month in data) inclusive. */
  start: number;
  end: number;
  startLabel: string;
  endLabel: string;
  name: string;
  tagline: string;
  count: number;
  topTopics: TopicShare[];
  /** The topic that defines the era (background topics like a Spotify soundtrack step aside). */
  lead: TopicId;
  topChannels: ChannelRef[];
  words: string[];
  emoji: string;
  /** Most watched video during the era. */
  anthem: VideoRef | null;
}

export interface ChannelStory {
  name: string;
  url: string | null;
  total: number;
  firstSeen: number;
  lastSeen: number;
  /** Watches in the busiest 3-month window. */
  peakCount: number;
  peakStart: number;
  peakEnd: number;
  /** For rekindled: the length of the gap in days. */
  gapDays?: number;
  gapStart?: number;
  gapEnd?: number;
  /** Per-year counts aligned with report.meta.years. */
  perYear: number[];
  lastTitle: string | null;
  topic: TopicId;
}

export interface Milestones {
  firstEver: VideoRef | null;
  mostRewatched: VideoRef[];
  busiestDay: { date: number; count: number; titles: string[] } | null;
  longestStreak: { days: number; start: number; end: number } | null;
  longestBreak: { days: number; start: number; end: number } | null;
}

export interface TopicRiver {
  /** Labels like "2019-04". */
  months: string[];
  /** Topics in stack order; may end with "other". */
  topics: TopicId[];
  /** values[monthIndex][topicIndex] */
  values: number[][];
}

export interface Report {
  meta: {
    total: number;
    first: number;
    last: number;
    years: number[];
    uniqueChannels: number;
    uniqueVideos: number;
    musicCount: number;
    removedCount: number;
    activeDays: number;
    spanDays: number;
    /** Total listening/watching time where the platform records it. */
    totalMs: number;
    /** Sources present in this report, largest first. */
    sources: SourceCount[];
    sample: boolean;
    generatedAt: number;
  };
  vocab: Vocab;
  /** Top 7 topics overall get categorical colour slots 1–7; everything else is neutral. */
  topicSlots: Partial<Record<TopicId, number>>;
  overallTopics: TopicShare[];
  overallPersona: Persona;
  years: YearSummary[];
  eras: Era[];
  river: TopicRiver;
  abandoned: ChannelStory[];
  rekindled: ChannelStory[];
  constants: ChannelStory[];
  rhythm: {
    /** [yearIndex][hour] counts */
    hourByYear: number[][];
    /** [weekday 0=Mon][hour] counts */
    weekdayHour: number[][];
  };
  /** Cosine similarity between every pair of years (aligned with meta.years). */
  similarity: number[][];
  milestones: Milestones;
  /** channel name -> topic, for the UI (search results etc.). */
  channelTopics: Record<string, TopicId>;
}

export interface LoadOptions {
  /** Netflix profile to keep when an account has several. */
  netflixProfile?: string;
}

export type WorkerRequest =
  /** Parse files and merge them into `base` (already-loaded entries). */
  | { type: 'files'; files: File[]; base: WatchEntry[]; sample: boolean; options: LoadOptions }
  | { type: 'sample' }
  /** Analyse `entries`; `all` is what gets handed back (filtering keeps the full set). */
  | { type: 'entries'; entries: WatchEntry[]; sample: boolean };

export type WorkerResponse =
  | { type: 'progress'; stage: string; pct: number }
  | { type: 'done'; entries: WatchEntry[] | null; report: Report; sample: boolean; added: SourceCount[] }
  | { type: 'choose-profile'; profiles: { name: string; count: number }[] }
  | { type: 'error'; message: string };
