import { describe, expect, it } from 'vitest';
import { cleanTitle, detectFormat, parseHtmlHistory, parseJsonHistory, parseTakeoutDate } from './parse';
import { classifyChannel } from './topics';
import { tokenize, displayWord } from './text';

const JSON_SAMPLE = JSON.stringify([
  {
    header: 'YouTube',
    title: 'Watched I Spent 100 Days in Minecraft',
    titleUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
    subtitles: [{ name: 'Blocky', url: 'https://www.youtube.com/channel/UC1' }],
    time: '2023-01-05T16:45:32.123Z',
    products: ['YouTube'],
  },
  {
    header: 'YouTube',
    title: 'Watched Some Ad',
    titleUrl: 'https://www.youtube.com/watch?v=adadadadad1',
    time: '2023-01-05T16:40:00Z',
    details: [{ name: 'From Google Ads' }],
  },
  {
    header: 'YouTube',
    title: 'Watched https://www.youtube.com/watch?v=gone1234567',
    titleUrl: 'https://www.youtube.com/watch?v=gone1234567',
    time: '2022-12-31T23:59:00Z',
  },
  {
    header: 'YouTube Music',
    title: 'Watched Golden Hour',
    titleUrl: 'https://music.youtube.com/watch?v=music123456',
    subtitles: [{ name: 'Nova Lane - Topic', url: 'https://www.youtube.com/channel/UC2' }],
    time: '2023-02-01T08:00:00Z',
  },
  {
    header: 'YouTube',
    title: 'Visto Receta de pasta',
    titleUrl: 'https://www.youtube.com/watch?v=pasta123456',
    subtitles: [{ name: 'Cocina', url: 'https://www.youtube.com/channel/UC3' }],
    time: '2023-03-01T08:00:00Z',
  },
]);

describe('parseJsonHistory', () => {
  const entries = parseJsonHistory(JSON_SAMPLE);
  it('drops ads and sorts ascending', () => {
    expect(entries).toHaveLength(4);
    expect(entries[0].t).toBeLessThan(entries[1].t);
  });
  it('strips the "Watched" prefix and extracts ids', () => {
    const mc = entries.find((e) => e.videoId === 'abc123DEF45')!;
    expect(mc.title).toBe('I Spent 100 Days in Minecraft');
    expect(mc.channel).toBe('Blocky');
  });
  it('marks removed videos with an empty title and no channel', () => {
    const gone = entries.find((e) => e.videoId === 'gone1234567')!;
    expect(gone.title).toBe('');
    expect(gone.channel).toBeNull();
  });
  it('handles YouTube Music and " - Topic" channels', () => {
    const m = entries.find((e) => e.kind === 'music')!;
    expect(m.channel).toBe('Nova Lane');
  });
  it('strips localised prefixes', () => {
    expect(entries.find((e) => e.videoId === 'pasta123456')!.title).toBe('Receta de pasta');
  });
  it('rejects non-arrays with a helpful error', () => {
    expect(() => parseJsonHistory('{"a":1}')).toThrow(/not a YouTube watch history/);
  });
});

const HTML_SAMPLE = `<!DOCTYPE html><html><body><div class="mdl-grid">
<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp"><div class="mdl-grid"><div class="header-cell mdl-cell mdl-cell--12-col"><p class="mdl-typography--title">YouTube<br></p></div><div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">Watched&nbsp;<a href="https://www.youtube.com/watch?v=xyz98765432">Tom &amp; Jerry&#39;s Best Moments</a><br><a href="https://www.youtube.com/channel/UCabc">Cartoon Vault</a><br>Jan 5, 2023, 10:15:32 PM IST<br></div><div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1 mdl-typography--text-right"></div></div></div>
<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp"><div class="mdl-grid"><div class="header-cell mdl-cell mdl-cell--12-col"><p class="mdl-typography--title">YouTube<br></p></div><div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">Watched&nbsp;<a href="https://www.youtube.com/watch?v=ad000000000">Buy Now</a><br>5 Jan 2023, 22:10:00 GMT<br></div><div class="content-cell mdl-cell mdl-cell--12-col mdl-typography--caption"><b>Products:</b><br>&emsp;YouTube<br><b>Details:</b><br>&emsp;From Google Ads<br></div></div></div>
<div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp"><div class="mdl-grid"><div class="header-cell mdl-cell mdl-cell--12-col"><p class="mdl-typography--title">YouTube<br></p></div><div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">Watched&nbsp;<a href="https://www.youtube.com/watch?v=abc00000001">Morning Yoga</a><br><a href="https://www.youtube.com/channel/UCyoga">Flow</a><br>3 Feb 2021, 07:05:00 GMT<br></div></div></div>
</div></body></html>`;

describe('parseHtmlHistory', () => {
  const entries = parseHtmlHistory(HTML_SAMPLE);
  it('parses entries, skips ads and decodes entities', () => {
    expect(entries).toHaveLength(2);
    expect(entries[1].title).toBe("Tom & Jerry's Best Moments");
    expect(entries[1].channel).toBe('Cartoon Vault');
  });
  it('reads US and UK style dates', () => {
    const d = new Date(entries[1].t);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2023, 0, 5, 22, 15]);
    const u = new Date(entries[0].t);
    expect([u.getFullYear(), u.getMonth(), u.getDate(), u.getHours()]).toEqual([2021, 1, 3, 7]);
  });
});

describe('helpers', () => {
  it('parses assorted Takeout date formats', () => {
    const iso = new Date(parseTakeoutDate('2020-06-07 13:04:05'));
    expect(iso.getMonth()).toBe(5);
    expect(new Date(parseTakeoutDate('Sep 30, 2019, 12:01:00 AM PDT')).getHours()).toBe(0);
    expect(new Date(parseTakeoutDate('30 Sept 2019, 12:01:00 PM')).getHours()).toBe(12);
  });
  it('detects formats from the first bytes', () => {
    const enc = new TextEncoder();
    expect(detectFormat(enc.encode('  [ {"a":1} ]'))).toBe('json');
    expect(detectFormat(enc.encode('<html><body>'))).toBe('html');
    expect(detectFormat(new Uint8Array([0x50, 0x4b, 3, 4]))).toBe('zip');
  });
  it('cleans titles', () => {
    expect(cleanTitle('Watched Hello World')).toBe('Hello World');
    expect(cleanTitle('Some Title angesehen')).toBe('Some Title');
  });
  it('classifies channels by name and titles', () => {
    expect(classifyChannel('Gordon Cooks', ['Perfect Steak Recipe', 'Pasta in 10 minutes'])).toBe('cooking');
    expect(classifyChannel('Random Name', ['Bitcoin price update', 'Is crypto dead?'])).toBe('finance');
    expect(classifyChannel('Some Artist - Topic', ['Track'])).toBe('music');
    expect(classifyChannel('Rain Man', ['Rainy afternoon thoughts', 'Said the painter'])).toBe('other');
  });
  it('keeps meaningful casing for display words', () => {
    const forms = new Map<string, string>();
    tokenize('How LLMs work', forms);
    tokenize('MINECRAFT HARDCORE', forms);
    tokenize('minecraft survival', forms);
    expect(displayWord('llms', forms)).toBe('LLMs');
    expect(displayWord('minecraft', forms)).toBe('Minecraft');
  });
});
