import type {
  ChannelRef, ChannelStory, DataSource, Era, Milestones, Persona, Report, TopicShare, VideoRef, WatchEntry, YearSummary,
} from './types';
import { OTHER_TOPIC, TOPICS, classifyChannel, lowerLabel, topicDef, type TopicId } from './topics';
import { displayWord, hash, tokenize } from './text';
import { cosine, normalize, optimalSegments } from './segment';

const DAY = 86_400_000;
const ALL_TOPICS: TopicId[] = [...TOPICS.map((t) => t.id), OTHER_TOPIC.id];
const T = ALL_TOPICS.length;
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type Progress = (stage: string, pct: number) => void;

interface ChannelAgg {
  name: string;
  url: string | null;
  count: number;
  musicCount: number;
  idxs: number[];
  firstT: number;
  lastT: number;
  maxGap: number;
  gapStart: number;
  gapEnd: number;
  beforeGap: number;
  topic: TopicId;
}

interface WordStat {
  n: number;
  ch: number[];
}

class Agg {
  count = 0;
  topics = new Float64Array(T);
  channels = new Map<number, number>();
  words = new Map<string, WordStat>();
  videos = new Map<string, number>();
  hours = new Array<number>(24).fill(0);
  weekday = new Array<number>(7).fill(0);
  months = new Array<number>(12).fill(0);
  days = new Set<number>();
  firstIdx = -1;
}

/** Local calendar day number (days since epoch for the local date). */
function dayNumber(d: Date): number {
  return Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
}

function dayToTime(dayNum: number): number {
  const d = new Date(dayNum * DAY);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12).getTime();
}

function videoKey(e: WatchEntry): string {
  return e.videoId ?? (e.title ? `t:${e.title}` : '');
}

function topN<K>(m: Map<K, number>, n: number): [K, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function hourLabel(h: number): string {
  if (h === 0) return 'midnight';
  if (h === 12) return 'noon';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function pct(x: number): number {
  return Math.round(x * 100);
}

function listJoin(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function analyze(entries: WatchEntry[], source: DataSource, progress: Progress = () => {}): Report {
  const n = entries.length;
  if (!n) throw new Error('No watch history found.');
  progress('Reading the timeline', 0.05);

  // ---------- 1. Per-entry calendar facts ----------
  const first = entries[0].t;
  const last = entries[n - 1].t;
  const d0 = new Date(first);
  const firstKey = d0.getFullYear() * 12 + d0.getMonth();
  const dl = new Date(last);
  const lastKey = dl.getFullYear() * 12 + dl.getMonth();
  const M = lastKey - firstKey + 1;
  const yearOf = new Int16Array(n);
  const monthOf = new Int32Array(n);
  const hourOf = new Uint8Array(n);
  const wdOf = new Uint8Array(n);
  const dayOf = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const d = new Date(entries[i].t);
    yearOf[i] = d.getFullYear();
    monthOf[i] = d.getFullYear() * 12 + d.getMonth() - firstKey;
    hourOf[i] = d.getHours();
    wdOf[i] = (d.getDay() + 6) % 7;
    dayOf[i] = dayNumber(d);
  }
  const years: number[] = [];
  for (let y = d0.getFullYear(); y <= dl.getFullYear(); y++) years.push(y);
  const yearIndex = (y: number) => y - years[0];

  // ---------- 2. Channels ----------
  progress('Getting to know your channels', 0.15);
  const channels: ChannelAgg[] = [];
  const chanByName = new Map<string, number>();
  const chanOf = new Int32Array(n).fill(-1);
  for (let i = 0; i < n; i++) {
    const e = entries[i];
    if (!e.channel) continue;
    let ci = chanByName.get(e.channel);
    if (ci === undefined) {
      ci = channels.length;
      chanByName.set(e.channel, ci);
      channels.push({
        name: e.channel, url: e.channelUrl, count: 0, musicCount: 0, idxs: [], firstT: e.t, lastT: e.t,
        maxGap: 0, gapStart: 0, gapEnd: 0, beforeGap: 0, topic: 'other',
      });
    }
    const c = channels[ci];
    const gap = e.t - c.lastT;
    if (gap > c.maxGap) {
      c.maxGap = gap;
      c.gapStart = c.lastT;
      c.gapEnd = e.t;
      c.beforeGap = c.count;
    }
    c.count++;
    if (e.music) c.musicCount++;
    c.idxs.push(i);
    c.lastT = e.t;
    chanOf[i] = ci;
  }

  progress('Working out what you were into', 0.25);
  for (const c of channels) {
    const step = Math.max(1, Math.floor(c.idxs.length / 60));
    const titles: string[] = [];
    for (let k = 0; k < c.idxs.length && titles.length < 60; k += step) titles.push(entries[c.idxs[k]].title);
    c.topic = classifyChannel(c.name, titles, c.musicCount / c.count);
  }
  const topicIdxOf = new Uint8Array(n);
  const topicIndex = new Map<TopicId, number>(ALL_TOPICS.map((t, i) => [t, i]));
  const otherIdx = topicIndex.get('other')!;
  for (let i = 0; i < n; i++) {
    const ci = chanOf[i];
    topicIdxOf[i] = ci >= 0 ? topicIndex.get(channels[ci].topic)! : entries[i].music ? topicIndex.get('music')! : otherIdx;
  }

  // ---------- 3. Words ----------
  progress('Reading between the titles', 0.35);
  const wordsOf: string[][] = new Array(n);
  const wordTotal = new Map<string, number>();
  const forms = new Map<string, string>();
  const show = (w: string) => displayWord(w, forms);
  const wordSpread = new Map<string, { last: number; switches: number }>();
  for (let i = 0; i < n; i++) {
    const toks = entries[i].title ? [...new Set(tokenize(entries[i].title, forms))] : [];
    wordsOf[i] = toks;
    for (const w of toks) {
      wordTotal.set(w, (wordTotal.get(w) ?? 0) + 1);
      const s = wordSpread.get(w);
      if (!s) wordSpread.set(w, { last: chanOf[i], switches: 1 });
      else if (s.last !== chanOf[i]) {
        s.last = chanOf[i];
        s.switches++;
      }
    }
  }
  // Words that only ever appear on a single channel are usually that channel's
  // title template ("Ep.", series names) – useful for eras, but they shouldn't
  // dominate "signature words". We keep them but require spread ≥ 2 per group.

  // ---------- 4. Aggregates ----------
  progress('Splitting your life into years', 0.45);
  const addTo = (a: Agg, i: number) => {
    a.count++;
    if (a.firstIdx < 0) a.firstIdx = i;
    a.topics[topicIdxOf[i]]++;
    const ci = chanOf[i];
    if (ci >= 0) a.channels.set(ci, (a.channels.get(ci) ?? 0) + 1);
    for (const w of wordsOf[i]) {
      let s = a.words.get(w);
      if (!s) a.words.set(w, (s = { n: 0, ch: [] }));
      s.n++;
      if (s.ch.length < 3 && !s.ch.includes(ci)) s.ch.push(ci);
    }
    const vk = videoKey(entries[i]);
    if (vk) a.videos.set(vk, (a.videos.get(vk) ?? 0) + 1);
    a.hours[hourOf[i]]++;
    a.weekday[wdOf[i]]++;
    a.months[(monthOf[i] + firstKey) % 12]++;
    a.days.add(dayOf[i]);
  };
  const overall = new Agg();
  const yearAggs = years.map(() => new Agg());
  const monthAggs = Array.from({ length: M }, () => new Agg());
  for (let i = 0; i < n; i++) {
    addTo(overall, i);
    addTo(yearAggs[yearIndex(yearOf[i])], i);
    addTo(monthAggs[monthOf[i]], i);
  }

  // Topic colour slots: the user's own top 7 topics (excluding "other").
  const overallTopics = topicShares(overall.topics, overall.count);
  const topicSlots: Partial<Record<TopicId, number>> = {};
  overallTopics.filter((t) => t.id !== 'other').slice(0, 7).forEach((t, i) => (topicSlots[t.id] = i + 1));

  // ---------- 5. Feature space (for drift + eras) ----------
  const featChannels = topN(new Map(channels.map((c, i) => [i, c.count])), 300).map(([i]) => i);
  const featWords = [...wordTotal.entries()]
    .filter(([w]) => (wordSpread.get(w)?.switches ?? 0) >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 300)
    .map(([w]) => w);
  const chanFeat = new Map(featChannels.map((c, i) => [c, T + i]));
  const wordFeat = new Map(featWords.map((w, i) => [w, T + featChannels.length + i]));
  const D = T + featChannels.length + featWords.length;
  const vectorOf = (a: Agg): Float64Array => {
    const v = new Float64Array(D);
    if (!a.count) return v;
    for (let t = 0; t < T; t++) v[t] = 1.4 * Math.sqrt(a.topics[t] / a.count);
    for (const [ci, c] of a.channels) {
      const f = chanFeat.get(ci);
      if (f !== undefined) v[f] = Math.sqrt(c / a.count);
    }
    for (const [w, s] of a.words) {
      const f = wordFeat.get(w);
      if (f !== undefined) v[f] = 0.8 * Math.sqrt(s.n / a.count);
    }
    return normalize(v);
  };

  const wordScoresFor = (a: Agg, minCount: number, needSpread: boolean) => {
    const out: { w: string; score: number }[] = [];
    const single = a.count === overall.count;
    for (const [w, s] of a.words) {
      if (s.n < minCount) continue;
      const p = s.n / a.count;
      const q = (wordTotal.get(w) ?? s.n) / overall.count;
      let score = single ? p : p * Math.log((p + 1e-9) / (q + 1e-9)) + p * 0.15;
      // Words used by only one channel are often its title template – dampen, don't drop.
      if (needSpread && s.ch.length < 2) score *= 0.55;
      out.push({ w, score });
    }
    return out.sort((x, y) => y.score - x.score);
  };

  // ---------- 6. Years ----------
  progress('Writing letters to past you', 0.55);
  const yearVectors = yearAggs.map(vectorOf);
  const yearSummaries: YearSummary[] = years.map((y, yi) => {
    const a = yearAggs[yi];
    const topChannels = topN(a.channels, 10).map(([ci, c]) => chanRef(channels[ci], c));
    const topTopics = topicShares(a.topics, a.count).slice(0, 6);
    const signatureWords = wordScoresFor(a, Math.max(3, Math.round(a.count * 0.002)), true).slice(0, 10).map((x) => show(x.w));
    const rewatch = topN(a.videos, 1)[0];
    const mostRewatched = rewatch && rewatch[1] >= 2 ? videoRef(entries, rewatch[0], rewatch[1], yearOf, y) : null;
    let night = 0, morning = 0;
    a.hours.forEach((c, h) => {
      if (h >= 23 || h < 5) night += c;
      else if (h >= 5 && h < 9) morning += c;
    });
    const weekend = a.weekday[5] + a.weekday[6];
    const newChans = [...a.channels.entries()].filter(([ci]) => new Date(channels[ci].firstT).getFullYear() === y);
    const notableNew = newChans.sort((p, q) => q[1] - p[1]).slice(0, 3).map(([ci]) => channels[ci].name);
    const firstIdx = firstTitled(entries, a.firstIdx, yearOf, y);
    const isPartial = (yi === 0 && d0.getMonth() > 1) || (yi === years.length - 1 && dl.getMonth() < 10);
    let drift: number | null = null;
    let gained: TopicShare[] = [];
    let lost: TopicShare[] = [];
    if (yi > 0 && yearAggs[yi - 1].count > 0 && a.count > 0) {
      drift = Math.round((1 - cosine(yearVectors[yi], yearVectors[yi - 1])) * 100);
      const prev = yearAggs[yi - 1];
      const diffs = ALL_TOPICS.map((id, ti) => ({
        id, count: a.topics[ti], share: a.topics[ti] / a.count - prev.topics[ti] / prev.count,
      })).filter((d) => d.id !== 'other');
      gained = diffs.filter((d) => d.share >= 0.03).sort((p, q) => q.share - p.share).slice(0, 2);
      lost = diffs.filter((d) => d.share <= -0.03).sort((p, q) => p.share - q.share).slice(0, 2);
    }
    const summary: YearSummary = {
      year: y,
      count: a.count,
      activeDays: a.days.size,
      perActiveDay: a.days.size ? Math.round((a.count / a.days.size) * 10) / 10 : 0,
      uniqueChannels: a.channels.size,
      newChannels: newChans.length,
      notableNewChannels: notableNew,
      topChannels,
      topTopics,
      signatureWords,
      mostRewatched,
      nightShare: a.count ? night / a.count : 0,
      morningShare: a.count ? morning / a.count : 0,
      weekendShare: a.count ? weekend / a.count : 0,
      peakHour: argmax(a.hours),
      busiestMonth: argmax(a.months),
      firstVideo: firstIdx >= 0 ? { title: entries[firstIdx].title, videoId: entries[firstIdx].videoId, channel: entries[firstIdx].channel, count: 1, t: entries[firstIdx].t } : null,
      persona: { title: '', emoji: '', blurb: '' },
      drift,
      gained,
      lost,
      letter: [],
      partial: isPartial,
    };
    summary.persona = personaFor(summary.topTopics, summary.nightShare, summary.morningShare, summary.weekendShare, summary.perActiveDay, summary.activeDays, summary.peakHour);
    summary.letter = letterFor(summary);
    return summary;
  });

  // ---------- 7. Eras ----------
  progress('Finding your eras', 0.68);
  const monthVectors = monthAggs.map(vectorOf);
  const monthWeights = monthAggs.map((a) => Math.sqrt(a.count));
  const spanYears = M / 12;
  const target = M < 6 ? 1 : Math.max(2, Math.min(9, Math.round(spanYears * 0.85) + 1));
  let segs = optimalSegments({ vectors: monthVectors, weights: monthWeights }, target, M >= 24 ? 4 : 2);
  // Merge neighbours that turned out to be the same "you".
  const eraVector = (s: [number, number]) => {
    const v = new Float64Array(D);
    for (let m = s[0]; m < s[1]; m++) {
      const w = monthWeights[m];
      const u = monthVectors[m];
      for (let d = 0; d < D; d++) v[d] += w * u[d];
    }
    return normalize(v);
  };
  let merged = true;
  while (merged && segs.length > 1) {
    merged = false;
    for (let k = 0; k < segs.length - 1; k++) {
      if (cosine(eraVector(segs[k]), eraVector(segs[k + 1])) > 0.86) {
        segs = [...segs.slice(0, k), [segs[k][0], segs[k + 1][1]], ...segs.slice(k + 2)];
        merged = true;
        break;
      }
    }
  }
  const eraOfMonth = new Int32Array(M);
  segs.forEach(([s, e], k) => {
    for (let m = s; m < e; m++) eraOfMonth[m] = k;
  });
  const eraAggs = segs.map(() => new Agg());
  for (let i = 0; i < n; i++) addTo(eraAggs[eraOfMonth[monthOf[i]]], i);
  const usedNames = new Set<string>();
  const eras: Era[] = segs.map(([s, e], k) => {
    const a = eraAggs[k];
    const topTopics = topicShares(a.topics, a.count).slice(0, 3);
    const topChannels = topN(a.channels, 5).map(([ci, c]) => chanRef(channels[ci], c));
    const words = wordScoresFor(a, Math.max(3, Math.round(a.count * 0.004)), false);
    const candidates: { label: string; score: number }[] = [];
    if (segs.length > 1) {
      for (const x of words.slice(0, 12)) candidates.push({ label: show(x.w), score: x.score * 2.6 });
      for (const [ci, c] of a.channels) {
        const p = c / a.count;
        if (p < 0.04) continue;
        const q = channels[ci].count / overall.count;
        candidates.push({ label: channels[ci].name, score: p * Math.log(p / q) + p * 0.15 });
      }
    }
    candidates.sort((x, y) => y.score - x.score);
    for (const tp of topTopics) candidates.push({ label: topicDef(tp.id).label, score: -1 });
    candidates.push({ label: `Chapter ${k + 1}`, score: -2 });
    const pick = candidates.find((c) => !usedNames.has(c.label.toLowerCase()) && c.label.length <= 34)!;
    usedNames.add(pick.label.toLowerCase());
    const months = e - s;
    const top = topTopics[0];
    const anthemEntry = topN(a.videos, 1)[0];
    const label = (m: number) => `${MONTH_SHORT[(firstKey + m) % 12]} ${Math.floor((firstKey + m) / 12)}`;
    return {
      start: s,
      end: e - 1,
      startLabel: label(s),
      endLabel: label(e - 1),
      name: `The ${pick.label} Era`,
      tagline: `${topTopics.slice(0, 2).map((t) => topicDef(t.id).label).join(' + ')} · ${months} month${months === 1 ? '' : 's'}`,
      count: a.count,
      topTopics,
      topChannels,
      words: words.filter((x) => (a.words.get(x.w)?.ch.length ?? 0) >= 1).slice(0, 6).map((x) => show(x.w)),
      emoji: top ? topicDef(top.id).emoji : '✨',
      anthem: anthemEntry && anthemEntry[1] >= 2 ? videoRef(entries, anthemEntry[0], anthemEntry[1]) : null,
    };
  });

  // ---------- 8. Topic river ----------
  progress('Mapping the river of your taste', 0.78);
  const riverTopics: TopicId[] = (Object.entries(topicSlots) as [TopicId, number][]).sort((a, b) => a[1] - b[1]).map(([id]) => id);
  const riverHasOther = overallTopics.some((t) => !riverTopics.includes(t.id) && t.count > 0);
  const riverIdx = riverTopics.map((id) => topicIndex.get(id)!);
  const river = {
    months: monthAggs.map((_, m) => {
      const key = firstKey + m;
      return `${Math.floor(key / 12)}-${String((key % 12) + 1).padStart(2, '0')}`;
    }),
    topics: riverHasOther ? [...riverTopics, 'other' as TopicId] : riverTopics,
    values: monthAggs.map((a) => {
      const row = riverIdx.map((ti) => a.topics[ti]);
      if (riverHasOther) row.push(a.count - row.reduce((s, x) => s + x, 0));
      return row;
    }),
  };

  // ---------- 9. Channel stories ----------
  progress('Remembering old obsessions', 0.86);
  const stories = channels.filter((c) => c.count >= 8).map((c) => storyFor(c, entries, monthOf, firstKey, years));
  const abandoned = stories
    .filter((s) => s.total >= 15 && s.peakCount >= 8 && s.lastSeen < last - 365 * DAY)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
  const rekindled = channels
    .filter((c) => c.maxGap >= 365 * DAY && c.beforeGap >= 5 && c.count - c.beforeGap >= 5)
    .sort((a, b) => Math.min(b.beforeGap, b.count - b.beforeGap) - Math.min(a.beforeGap, a.count - a.beforeGap))
    .slice(0, 8)
    .map((c) => ({
      ...storyFor(c, entries, monthOf, firstKey, years),
      gapDays: Math.round(c.maxGap / DAY),
      gapStart: c.gapStart,
      gapEnd: c.gapEnd,
    }));
  const fullYears = years.length;
  const constants =
    fullYears >= 3
      ? stories
          .map((s) => ({ s, active: s.perYear.filter((x) => x >= 3).length }))
          .filter(({ active }) => active >= Math.max(3, Math.ceil(fullYears * 0.75)))
          .sort((a, b) => b.active - a.active || b.s.total - a.s.total)
          .slice(0, 10)
          .map(({ s }) => s)
      : [];

  // ---------- 10. Rhythm + milestones ----------
  progress('Listening to your daily rhythm', 0.93);
  const hourByYear = yearAggs.map((a) => [...a.hours]);
  const weekdayHour = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (let i = 0; i < n; i++) weekdayHour[wdOf[i]][hourOf[i]]++;
  const milestones = milestonesFor(entries, overall, dayOf);

  const overallPersona = personaFor(
    overallTopics,
    (sumRange(overall.hours, 23, 24) + sumRange(overall.hours, 0, 5)) / n,
    sumRange(overall.hours, 5, 9) / n,
    (overall.weekday[5] + overall.weekday[6]) / n,
    overall.days.size ? n / overall.days.size : 0,
    overall.days.size,
    argmax(overall.hours),
  );

  const channelTopics: Record<string, TopicId> = {};
  for (const c of channels) channelTopics[c.name] = c.topic;

  progress('Done', 1);
  return {
    meta: {
      total: n,
      first,
      last,
      years,
      uniqueChannels: channels.length,
      uniqueVideos: overall.videos.size,
      musicCount: entries.reduce((s, e) => s + (e.music ? 1 : 0), 0),
      removedCount: entries.reduce((s, e) => s + (e.title ? 0 : 1), 0),
      activeDays: overall.days.size,
      spanDays: Math.round((last - first) / DAY) + 1,
      source,
      generatedAt: Date.now(),
    },
    topicSlots,
    overallTopics,
    overallPersona,
    years: yearSummaries,
    eras,
    river,
    abandoned,
    rekindled,
    constants,
    rhythm: { hourByYear, weekdayHour },
    similarity: yearVectors.map((va, i) => yearVectors.map((vb, j) => (i === j ? 1 : yearAggs[i].count && yearAggs[j].count ? cosine(va, vb) : 0))),
    milestones,
    channelTopics,
  };
}

// ---------------------------------------------------------------- helpers

function sumRange(arr: number[], from: number, to: number): number {
  let s = 0;
  for (let i = from; i < to; i++) s += arr[i];
  return s;
}

function argmax(arr: ArrayLike<number>): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) if (arr[i] > arr[best]) best = i;
  return best;
}

function topicShares(counts: Float64Array, total: number): TopicShare[] {
  return ALL_TOPICS.map((id, i) => ({ id, count: counts[i], share: total ? counts[i] / total : 0 }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);
}

function chanRef(c: ChannelAgg, count: number): ChannelRef {
  return { name: c.name, url: c.url, count };
}

function videoRef(entries: WatchEntry[], key: string, count: number, yearOf?: Int16Array, year?: number): VideoRef {
  for (let i = entries.length - 1; i >= 0; i--) {
    if (yearOf && year !== undefined && yearOf[i] !== year) continue;
    const e = entries[i];
    if (videoKey(e) === key) return { title: e.title || 'A video that is no longer available', videoId: e.videoId, channel: e.channel, count, t: e.t };
  }
  return { title: key, videoId: null, channel: null, count };
}

function firstTitled(entries: WatchEntry[], from: number, yearOf: Int16Array, year: number): number {
  for (let i = Math.max(0, from); i < entries.length && yearOf[i] === year; i++) if (entries[i].title) return i;
  return from;
}

function storyFor(c: ChannelAgg, entries: WatchEntry[], monthOf: Int32Array, firstKey: number, years: number[]): ChannelStory {
  const monthly = new Map<number, number>();
  const perYear = new Array<number>(years.length).fill(0);
  for (const i of c.idxs) {
    monthly.set(monthOf[i], (monthly.get(monthOf[i]) ?? 0) + 1);
    perYear[new Date(entries[i].t).getFullYear() - years[0]]++;
  }
  let best = 0, bestStart = 0;
  for (const m of monthly.keys()) {
    const s = (monthly.get(m) ?? 0) + (monthly.get(m + 1) ?? 0) + (monthly.get(m + 2) ?? 0);
    if (s > best) {
      best = s;
      bestStart = m;
    }
  }
  // Trim the window to months that actually have watches.
  let bestEnd = bestStart + 2;
  while (bestEnd > bestStart && !monthly.get(bestEnd)) bestEnd--;
  const toTime = (m: number) => {
    const key = firstKey + m;
    return new Date(Math.floor(key / 12), key % 12, 15).getTime();
  };
  let lastTitle: string | null = null;
  for (let k = c.idxs.length - 1; k >= 0; k--) {
    const t = entries[c.idxs[k]].title;
    if (t) {
      lastTitle = t;
      break;
    }
  }
  return {
    name: c.name,
    url: c.url,
    total: c.count,
    firstSeen: c.firstT,
    lastSeen: c.lastT,
    peakCount: best,
    peakStart: toTime(bestStart),
    peakEnd: toTime(bestEnd),
    perYear,
    lastTitle,
    topic: c.topic,
  };
}

function milestonesFor(entries: WatchEntry[], overall: Agg, dayOf: Int32Array): Milestones {
  const firstIdx = entries.findIndex((e) => e.title);
  const firstEver: VideoRef | null =
    firstIdx >= 0 ? { title: entries[firstIdx].title, videoId: entries[firstIdx].videoId, channel: entries[firstIdx].channel, count: 1, t: entries[firstIdx].t } : null;
  const mostRewatched = topN(overall.videos, 30)
    .filter(([, c]) => c >= 3)
    .slice(0, 5)
    .map(([k, c]) => videoRef(entries, k, c));
  const perDay = new Map<number, number[]>();
  for (let i = 0; i < entries.length; i++) {
    let arr = perDay.get(dayOf[i]);
    if (!arr) perDay.set(dayOf[i], (arr = []));
    arr.push(i);
  }
  let busiestDay: Milestones['busiestDay'] = null;
  for (const [day, idxs] of perDay) {
    if (!busiestDay || idxs.length > busiestDay.count) {
      busiestDay = { date: dayToTime(day), count: idxs.length, titles: [] };
    }
  }
  if (busiestDay) {
    const day = dayNumber(new Date(busiestDay.date));
    const counts = new Map<string, number>();
    for (const i of perDay.get(day) ?? []) if (entries[i].title) counts.set(entries[i].title, (counts.get(entries[i].title) ?? 0) + 1);
    busiestDay.titles = topN(counts, 3).map(([t]) => t);
  }
  const days = [...perDay.keys()].sort((a, b) => a - b);
  let streak: Milestones['longestStreak'] = null;
  let gap: Milestones['longestBreak'] = null;
  let runStart = days[0];
  for (let k = 1; k <= days.length; k++) {
    if (k < days.length && days[k] === days[k - 1] + 1) continue;
    const len = days[k - 1] - runStart + 1;
    if (!streak || len > streak.days) streak = { days: len, start: dayToTime(runStart), end: dayToTime(days[k - 1]) };
    if (k < days.length) {
      const g = days[k] - days[k - 1] - 1;
      if (g >= 2 && (!gap || g > gap.days)) gap = { days: g, start: dayToTime(days[k - 1] + 1), end: dayToTime(days[k] - 1) };
      runStart = days[k];
    }
  }
  return { firstEver, mostRewatched, busiestDay, longestStreak: streak, longestBreak: gap };
}

function personaFor(
  topTopics: TopicShare[],
  nightShare: number,
  morningShare: number,
  weekendShare: number,
  perDay: number,
  activeDays: number,
  peakHour: number,
): Persona {
  const named = topTopics.filter((t) => t.id !== 'other');
  const top = named[0] ?? topTopics[0];
  const def = topicDef(top?.id ?? 'other');
  let adj: string;
  let why: string;
  if (nightShare >= 0.28) {
    adj = 'Night-Owl';
    why = `${pct(nightShare)}% of your watching happened between 11pm and 5am`;
  } else if (morningShare >= 0.22) {
    adj = 'Early-Bird';
    why = `${pct(morningShare)}% of your watching happened before 9am`;
  } else if (perDay >= 22) {
    adj = 'Binge-Watching';
    why = `you averaged ${Math.round(perDay)} videos on the days you watched`;
  } else if (top && top.share < 0.2 && named.length >= 6) {
    adj = 'Renaissance';
    why = `no single topic took more than ${pct(top.share)}% of your attention`;
  } else if (weekendShare >= 0.42) {
    adj = 'Weekend';
    why = `${pct(weekendShare)}% of your watching happened on Saturdays and Sundays`;
  } else if (top && top.share >= 0.45) {
    adj = 'Devoted';
    why = `${lowerLabel(def.label)} took ${pct(top.share)}% of everything you watched`;
  } else if (activeDays < 100 && perDay < 5) {
    adj = 'Casual';
    why = `you only dipped in on ${activeDays} days`;
  } else {
    adj = 'Curious';
    why = `you usually tuned in around ${hourLabel(peakHour)}`;
  }
  const second = named[1] ? ` with a side of ${lowerLabel(topicDef(named[1].id).label)}` : '';
  return {
    title: `The ${adj} ${def.noun}`,
    emoji: def.emoji,
    blurb: `Mostly ${lowerLabel(def.label)}${second} – and ${why}.`,
  };
}

const CLOSINGS = [
  'Whoever you are now, they made you.',
  'I hope you still laugh at the same things.',
  'You were figuring it out. You still are.',
  'Not just a phase. A chapter.',
  'Thanks for every rabbit hole.',
  'Say hi to whoever you became.',
  'Some of that is still in you somewhere.',
];

function letterFor(y: YearSummary): string[] {
  const lines: string[] = [];
  const fmt = (x: number) => x.toLocaleString('en-US');
  lines.push(
    `You watched ${fmt(y.count)} videos in ${y.year}${y.partial ? ' (at least – this year is only partly in your history)' : ''}, about ${Math.round(y.perActiveDay)} on each day you pressed play.`,
  );
  const top = y.topChannels[0];
  if (top) lines.push(`Your most constant companion was ${top.name}, with ${fmt(top.count)} videos.`);
  if (y.signatureWords.length >= 3) lines.push(`Your head was full of ${listJoin(y.signatureWords.slice(0, 3).map((w) => w.toLowerCase()))}.`);
  if (y.nightShare >= 0.25) lines.push(`A lot of it happened in the dark: ${pct(y.nightShare)}% of your watching came after 11pm.`);
  else if (y.morningShare >= 0.2) lines.push(`You were a morning person: ${pct(y.morningShare)}% of it happened before 9am.`);
  else lines.push(`Your prime time was around ${hourLabel(y.peakHour)}.`);
  if (y.newChannels > 0) {
    const notable = y.notableNewChannels.slice(0, 2);
    lines.push(`You discovered ${fmt(y.newChannels)} new channel${y.newChannels === 1 ? '' : 's'}${notable.length ? `, including ${listJoin(notable)}` : ''}.`);
  }
  if (y.mostRewatched && y.mostRewatched.count >= 3 && y.mostRewatched.title) {
    lines.push(`You played “${y.mostRewatched.title}” ${y.mostRewatched.count} times. It clearly meant something.`);
  }
  if (y.gained.length) {
    const g = lowerLabel(topicDef(y.gained[0].id).label);
    const l = y.lost[0] ? lowerLabel(topicDef(y.lost[0].id).label) : null;
    lines.push(`Compared with ${y.year - 1}, you leaned into ${g}${l ? ` and drifted away from ${l}` : ''}.`);
  }
  lines.push(CLOSINGS[hash(String(y.year)) % CLOSINGS.length]);
  return lines;
}
