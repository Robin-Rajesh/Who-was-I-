import { describe, expect, it } from 'vitest';
import { analyze } from './analyze';
import { generateSampleHistory } from './sample';

describe('analyze(sample)', () => {
  const entries = generateSampleHistory(20151, new Date(2025, 9, 20).getTime());
  const report = analyze(entries, { sample: true });

  it('covers every year', () => {
    expect(report.meta.years[0]).toBe(2015);
    expect(report.meta.years.at(-1)).toBe(2025);
    expect(report.years.reduce((s, y) => s + y.count, 0)).toBe(entries.length);
  });

  it('finds multiple distinct eras', () => {
    expect(report.eras.length).toBeGreaterThanOrEqual(4);
    const names = report.eras.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('spots abandoned obsessions and constants', () => {
    expect(report.abandoned.map((s) => s.name)).toContain('BlockCraft Daily');
    expect(report.constants.map((s) => s.name)).toContain('Sketchy Sundays');
    expect(report.rekindled.map((s) => s.name)).toContain('PixelPlays');
  });

  it('classifies channels sensibly', () => {
    expect(report.channelTopics['BlockCraft Daily']).toBe('gaming');
    expect(report.channelTopics['Kitchen Alchemy']).toBe('cooking');
    expect(report.channelTopics['Coin Theory']).toBe('finance');
    expect(report.channelTopics['Neural Notes']).toBe('code');
    // Spotify artists are music, Netflix shows are film unless named otherwise, podcasts are podcasts.
    expect(report.channelTopics['Glasswing']).toBe('music');
    expect(report.channelTopics['Silicon Dreams']).toBe('film');
    expect(report.channelTopics['Starfall Academy (Anime)']).toBe('anime');
    expect(report.channelTopics['Money Minutes']).toBe('finance');
  });

  it('spans every platform in the sample', () => {
    expect(report.meta.sources.map((s) => s.id).sort()).toEqual(['netflix', 'spotify', 'youtube']);
    expect(report.vocab.items).toBe('plays');
    expect(report.meta.totalMs).toBeGreaterThan(0);
  });

  it('prints a debug overview', () => {
    console.log(entries.length, 'entries');
    for (const e of report.eras) console.log(e.startLabel, '→', e.endLabel, e.name, '|', e.tagline, '|', e.words.join(', '));
    for (const y of report.years) console.log(y.year, y.count, y.persona.title, 'drift', y.drift, y.signatureWords.slice(0, 5).join(','));
    console.log('abandoned', report.abandoned.map((s) => s.name));
    console.log('rekindled', report.rekindled.map((s) => s.name));
    console.log('constants', report.constants.map((s) => s.name));
    console.log('overall', report.overallPersona);
    console.log(report.milestones);
    
  });
});
