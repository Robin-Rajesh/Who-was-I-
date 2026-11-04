import type { WatchEntry } from './types';
import { hash } from './text';

/**
 * A believable, entirely fictional watch history (~11 years) so people can try
 * the app before exporting their own data. Channels and videos are made up.
 * Deterministic: the same seed always produces the same "person".
 */

type Topic = string;

interface SampleChannel {
  name: string;
  topic: Topic;
  titles: string[];
  fill?: Record<string, string[]>;
  music?: boolean;
}

const CH: SampleChannel[] = [
  // gaming
  { name: 'BlockCraft Daily', topic: 'gaming', titles: ['Minecraft Survival Ep. {n} – Building a {thing}', 'I Spent 100 Days in Hardcore Minecraft', 'Minecraft Redstone Tutorial: {thing}', 'Minecraft but Every Block is {thing}', 'Our Minecraft Server Has a New {thing}'], fill: { thing: ['Castle', 'Lava Moat', 'Sheep Farm', 'Sky Base', 'Automatic Door', 'Dragon Lair', 'Village', 'Mob Grinder'] } },
  { name: 'PixelPlays', topic: 'gaming', titles: ['{game} Gameplay Walkthrough Part {n}', 'Top 10 Secrets in {game}', '{game} Funny Moments #{n}', 'First Time Playing {game}'], fill: { game: ['Skyrim', 'Zelda', 'Portal 2', 'Terraria', 'Elden Ring', 'Hollow Knight', 'Stardew Valley'] } },
  { name: 'Speedrun Saloon', topic: 'gaming', titles: ['How This {game} Speedrun Broke the World Record', 'The History of the {game} Speedrun', 'Speedrunner Explains the {game} Glitch'], fill: { game: ['Mario 64', 'Ocarina of Time', 'Portal', 'Celeste'] } },
  // music
  { name: 'Lofi Lounge', topic: 'music', music: true, titles: ['lofi hip hop radio – beats to {mood} to', '{mood} lofi beats playlist', 'rainy night lofi – beats to {mood} to'], fill: { mood: ['study', 'relax', 'sleep', 'chill', 'code'] } },
  { name: 'Midnight Vinyl', topic: 'music', music: true, titles: ['{artist} – {song} (Official Music Video)', '{artist} – {song} (Lyrics)', '{artist} – {song} [Live Acoustic]'], fill: { artist: ['Nova Lane', 'The Paper Kites Club', 'Juniper Fox', 'Arcadia Blue'], song: ['Golden Hour', 'Static Hearts', 'Neon Summer', 'Paper Planes', 'Slow Motion'] } },
  { name: 'Synthwave Station', topic: 'music', music: true, titles: ['Synthwave Mix – {mood} Night Drive', '80s Synthwave Playlist {n}', 'Retrowave Mix for {mood}'], fill: { mood: ['Neon', 'Midnight', 'Focus', 'Outrun'] } },
  // anime
  { name: 'Opening Credits', topic: 'anime', titles: ['{show} – Opening {n} Full', 'Top 20 Anime Openings of {year}', '{show} Ending Explained', 'Why {show} Is the Best Anime of the Decade'], fill: { show: ['Attack on Titan', 'Demon Slayer', 'My Hero Academia', 'Jujutsu Kaisen', 'One Piece'], year: ['2017', '2018'] } },
  { name: 'Manga Margin', topic: 'anime', titles: ['{show} Manga Chapter {n} Review', 'The Anime Art Style of {show}', 'Every {show} Arc Ranked'], fill: { show: ['One Piece', 'Naruto', 'Hunter x Hunter', 'Death Note'] } },
  // learning / science
  { name: 'Chalkboard Theory', topic: 'learning', titles: ['{subject} Explained in 10 Minutes', 'Crash Course {subject} #{n}', 'The History of {subject}', '{subject} Lecture {n} – Exam Review'], fill: { subject: ['Economics', 'Philosophy', 'Psychology', 'Calculus', 'Organic Chemistry', 'Statistics'] } },
  { name: 'Study With Sam', topic: 'learning', titles: ['Study With Me – {n} Hours (Pomodoro)', 'How I Study for Exams', 'Study With Me at the Library – Rain Sounds'] },
  { name: 'Cosmic Curiosity', topic: 'science', titles: ['What Happens Inside a Black Hole?', 'How Big Is the Universe, Really?', 'The Physics of {thing}', 'NASA Just Found {thing} on Mars'], fill: { thing: ['Time', 'Neutron Stars', 'Water', 'Quantum Tunneling', 'Dark Matter'] } },
  { name: 'Quantum Café', topic: 'science', titles: ['Quantum Physics for Curious People', 'The Math Behind {thing}', 'Why {thing} Breaks Physics'], fill: { thing: ['Entanglement', 'Infinity', 'Gravity', 'Chaos Theory'] } },
  // pandemic: cooking + fitness
  { name: 'Kitchen Alchemy', topic: 'cooking', titles: ['The Perfect {dish} Recipe', 'Cooking {dish} With Only 5 Ingredients', 'I Made {dish} From Scratch', 'Easy {dish} Meal Prep'], fill: { dish: ['Ramen', 'Pasta Carbonara', 'Chicken Curry', 'Banana Bread', 'Dumplings', 'Pizza Dough'] } },
  { name: 'Bread & Butter Bakery', topic: 'cooking', titles: ['Sourdough for Beginners – Day {n}', 'My Sourdough Starter Failed (Again)', 'Baking Focaccia at Home', 'How to Bake {thing}'], fill: { thing: ['Croissants', 'Bagels', 'Cinnamon Rolls', 'Brioche'] } },
  { name: 'Iron & Oats', topic: 'fitness', fill: { mins: ['10', '15', '20', '30', '45'] }, titles: ['{mins} Minute Home Workout – No Equipment', 'Full Body HIIT Workout', 'Beginner Calisthenics Routine', 'What I Eat in a Day for Muscle'] },
  { name: 'Ten Minute Yoga', topic: 'fitness', titles: ['10 Minute Morning Yoga Stretch', 'Yoga for Back Pain', 'Day {n} – 30 Day Yoga Challenge'] },
  // crypto / finance
  { name: 'Coin Theory', topic: 'finance', titles: ['Bitcoin to {price}? Crypto Market Update', 'Top 5 Altcoins to Watch This Month', 'Ethereum Explained for Beginners', 'Is This the Next Crypto Crash?', 'NFTs Explained in 8 Minutes'], fill: { price: ['$100k', '$60k', '$20k', 'Zero'] } },
  { name: 'Index Fund Ivy', topic: 'finance', titles: ['How I Invest My Salary (Index Funds)', 'Passive Income Ideas That Actually Work', 'Budget With Me – Month {n}', 'The Stock Market Explained'] },
  // travel + podcasts + diy
  { name: 'Wander Atlas', topic: 'travel', titles: ['48 Hours in {city} – Travel Vlog', '{city} Walking Tour 4K', 'How I Travel {city} on a Budget', 'Solo Backpacking Through {city}'], fill: { city: ['Tokyo', 'Lisbon', 'Kyoto', 'Mexico City', 'Seoul', 'Istanbul'] } },
  { name: 'Slow Train Diaries', topic: 'travel', titles: ['Overnight Sleeper Train Through {city}', 'The Most Scenic Train Trip in {city}', 'Riding Japan’s Slowest Train'], fill: { city: ['Norway', 'Switzerland', 'Scotland', 'Japan'] } },
  { name: 'The Long Table Podcast', topic: 'podcasts', titles: ['Ep. {n} – A Conversation About {thing}', 'Full Episode: {thing} With a Stranger', 'Podcast #{n} – On {thing}'], fill: { thing: ['Loneliness', 'Ambition', 'Moving Abroad', 'Burnout', 'Learning Late'] } },
  { name: 'Weekend Workshop', topic: 'diy', titles: ['DIY {thing} for Under $50', 'Woodworking for Beginners – {thing}', 'Van Build Ep. {n}', 'Restoring a Rusty {thing}'], fill: { thing: ['Bookshelf', 'Desk', 'Toolbox', 'Coffee Table', 'Bike'] } },
  // tech + code (recent)
  { name: 'Byte Sized', topic: 'tech', titles: ['iPhone vs Pixel – Camera Test', 'My Desk Setup {year}', 'The Laptop I Actually Use', 'Unboxing the New {thing}'], fill: { year: ['2023', '2024', '2025'], thing: ['MacBook', 'Mechanical Keyboard', 'Smartphone', 'Headphones'] } },
  { name: 'Neural Notes', topic: 'code', titles: ['How LLMs Actually Work', 'Building an AI Agent in Python', 'Machine Learning Explained Visually', 'I Built {thing} With AI in 24 Hours'], fill: { thing: ['an App', 'a Game', 'a Startup', 'a Chatbot'] } },
  { name: 'Code Campfire', topic: 'code', titles: ['React in 100 Seconds', 'TypeScript Tips for Beginners', 'Rust for JavaScript Developers', 'Coding Interview: {thing}', 'Git Explained Simply'], fill: { thing: ['Two Sum', 'Binary Trees', 'Dynamic Programming', 'Graphs'] } },
  { name: 'Ship It Show', topic: 'code', titles: ['How We Scaled Our Startup to {n} Users', 'Software Architecture in 10 Minutes', 'I Quit My Job to Build a Startup'] },
  // constants
  { name: 'Sketchy Sundays', topic: 'comedy', titles: ['Sketch: When {thing}', 'Try Not to Laugh Challenge #{n}', 'Every {thing} Ever (Comedy Sketch)', 'Our Funniest Bloopers'], fill: { thing: ['Your Mom Calls', 'the WiFi Dies', 'Group Project', 'Monday Morning', 'Roommate'] } },
  { name: 'Rain Room ASMR', topic: 'wellness', titles: ['Rain Sounds for Sleep – 10 Hours', 'Cozy Cabin Ambience', 'ASMR Library Study Ambience'] },
  { name: 'Calm Compass', topic: 'wellness', titles: ['Morning Routine for a Calm Mind', '5 Habits That Changed My Life', 'Minimalism: A Year Later', 'Guided Meditation for Anxiety'] },
];

const FAVOURITE_SONGS = [
  'Nova Lane – Golden Hour (Official Music Video)',
  'Juniper Fox – Paper Planes (Lyrics)',
  'Arcadia Blue – Neon Summer [Live Acoustic]',
];

interface Phase {
  from: string; // YYYY-MM
  /** channel name -> weight */
  mix: Record<string, number>;
  /** typical hour of day */
  hours: number[];
  intensity: number;
}

const PHASES: Phase[] = [
  { from: '2015-03', intensity: 7, hours: [21, 22, 23, 0, 1, 16, 17], mix: { 'BlockCraft Daily': 9, PixelPlays: 4, 'Speedrun Saloon': 2, 'Sketchy Sundays': 3, 'Midnight Vinyl': 2 } },
  { from: '2017-07', intensity: 8, hours: [22, 23, 0, 1, 2, 20], mix: { 'Opening Credits': 7, 'Manga Margin': 4, 'Midnight Vinyl': 4, PixelPlays: 2, 'Sketchy Sundays': 2, 'Lofi Lounge': 1 } },
  { from: '2019-01', intensity: 8, hours: [19, 20, 21, 22, 15, 16], mix: { 'Chalkboard Theory': 6, 'Study With Sam': 4, 'Lofi Lounge': 6, 'Cosmic Curiosity': 4, 'Quantum Café': 3, 'Sketchy Sundays': 2 } },
  { from: '2020-03', intensity: 11, hours: [8, 9, 12, 13, 18, 19, 20], mix: { 'Kitchen Alchemy': 6, 'Bread & Butter Bakery': 5, 'Iron & Oats': 5, 'Ten Minute Yoga': 3, 'Sketchy Sundays': 3, 'Rain Room ASMR': 2, 'Lofi Lounge': 2 } },
  { from: '2021-03', intensity: 9, hours: [7, 8, 12, 13, 21, 22], mix: { 'Coin Theory': 8, 'Index Fund Ivy': 5, 'Byte Sized': 2, 'Sketchy Sundays': 2, 'Lofi Lounge': 2 } },
  { from: '2022-05', intensity: 7, hours: [9, 10, 19, 20, 21], mix: { 'Wander Atlas': 7, 'Slow Train Diaries': 4, 'The Long Table Podcast': 4, 'Weekend Workshop': 3, 'Sketchy Sundays': 2, 'Synthwave Station': 2, 'Lofi Lounge': 1 } },
  { from: '2023-06', intensity: 8, hours: [6, 7, 8, 12, 20, 21], mix: { 'Neural Notes': 7, 'Code Campfire': 6, 'Ship It Show': 3, 'Byte Sized': 3, 'Calm Compass': 3, 'Lofi Lounge': 3, 'Sketchy Sundays': 2, PixelPlays: 1.2 } },
];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateSampleHistory(seed = 20151, end = Date.now()): WatchEntry[] {
  const rand = rng(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const byName = new Map(CH.map((c) => [c.name, c]));
  const vidIds = new Map<string, string>();
  const idFor = (title: string) => {
    let id = vidIds.get(title);
    if (!id) {
      id = Array.from({ length: 11 }, () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_'[Math.floor(rand() * 64)]).join('');
      vidIds.set(title, id);
    }
    return id;
  };
  const favourites: string[] = ['Midnight Vinyl', 'Synthwave Station'];
  const entries: WatchEntry[] = [];
  const startParts = PHASES[0].from.split('-').map(Number);
  const day = new Date(startParts[0], startParts[1] - 1, 4);
  const phaseStart = PHASES.map((p) => {
    const [y, m] = p.from.split('-').map(Number);
    return new Date(y, m - 1, 1).getTime();
  });
  while (day.getTime() < end) {
    const t0 = day.getTime();
    let pi = 0;
    while (pi + 1 < PHASES.length && phaseStart[pi + 1] <= t0) pi++;
    const phase = PHASES[pi];
    // Blend into the next phase during the last 6 weeks of each phase for realism.
    const next = PHASES[pi + 1];
    const blend = next ? Math.max(0, 1 - (phaseStart[pi + 1] - t0) / (42 * 86_400_000)) : 0;
    const weekend = day.getDay() === 0 || day.getDay() === 6;
    const skip = rand() < (weekend ? 0.08 : 0.2);
    if (!skip) {
      const count = Math.max(1, Math.round(phase.intensity * (weekend ? 1.5 : 1) * (0.35 + rand() * 1.3)));
      for (let k = 0; k < count; k++) {
        const use = next && rand() < blend ? next : phase;
        const names = Object.keys(use.mix);
        const total = names.reduce((s, nm) => s + use.mix[nm], 0);
        let r = rand() * total;
        let chName = names[0];
        for (const nm of names) {
          r -= use.mix[nm];
          if (r <= 0) {
            chName = nm;
            break;
          }
        }
        const ch = byName.get(chName)!;
        let title = pick(ch.titles).replace(/\{(\w+)\}/g, (_, key: string) => (key === 'n' ? String(1 + Math.floor(rand() * 180)) : pick(ch.fill?.[key] ?? ['Something'])));
        // Comfort rewatches share one video id; everything else is a distinct upload.
        const rewatch = favourites.includes(chName) && rand() < 0.18;
        if (rewatch) title = chName === 'Midnight Vinyl' ? pick(FAVOURITE_SONGS) : 'Synthwave Mix – Midnight Night Drive';
        const hour = pick(use.hours);
        const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, Math.floor(rand() * 60), Math.floor(rand() * 60)).getTime() + k * 7 * 60_000;
        if (t > end) continue;
        const removed = rand() < 0.012;
        entries.push({
          t,
          title: removed ? '' : title,
          videoId: rewatch ? idFor(title) : idFor(`${title}#${Math.floor(rand() * 60)}`),
          channel: removed ? null : ch.name,
          channelUrl: removed ? null : `https://www.youtube.com/channel/UC${hash(ch.name).toString(36)}`,
          url: null,
          source: 'youtube',
          kind: ch.music && rand() < 0.5 ? 'music' : 'video',
        });
      }
    }
    day.setDate(day.getDate() + 1);
  }
  addSpotify(entries, rand, end);
  addNetflix(entries, rand, end);
  entries.sort((a, b) => a.t - b.t);
  return entries;
}

/* ------------------------------------------------------------------ Spotify + Netflix */

interface MediaPhase {
  from: number;
  artists: string[];
  podcasts: string[];
  shows: string[];
}

const SONGS = ['Golden Hour', 'Static Hearts', 'Paper Planes', 'Slow Motion', 'Northern Lights', 'Undertow', 'Glass House', 'Late Bloomer', 'Satellites', 'Low Tide', 'Overgrown', 'Small Hours'];

const MEDIA_PHASES: MediaPhase[] = [
  { from: Date.UTC(2017, 6, 1), artists: ['Nova Lane', 'Juniper Fox', 'Arcadia Blue', 'Sakura Static'], podcasts: [], shows: ['Starfall Academy (Anime)'] },
  { from: Date.UTC(2019, 0, 1), artists: ['Lo-Fi Lantern', 'Nova Lane', 'Quiet Library', 'Arcadia Blue'], podcasts: ['Curious Minds Podcast'], shows: ['Cosmos Uncharted: A Space Documentary'] },
  { from: Date.UTC(2020, 2, 1), artists: ['Sundial', 'Velvet Thursday', 'Kitchen Radio Collective', 'Nova Lane'], podcasts: ['The Long Table Podcast'], shows: ['The Great Home Bake Off', 'Street Food Stories'] },
  { from: Date.UTC(2021, 2, 1), artists: ['Neon Harbor', 'Glasswing', 'Static Bloom'], podcasts: ['Money Minutes'], shows: ['Crypto Kings', 'The Heist Season'] },
  { from: Date.UTC(2022, 4, 1), artists: ['Wanderline', 'Glasswing', 'Juniper Fox', 'Coastal Radio'], podcasts: ['The Long Table Podcast'], shows: ['Slow Travel Japan', 'Wanderlust Diaries'] },
  { from: Date.UTC(2023, 5, 1), artists: ['Focus Machine', 'Deep Work Radio', 'Neon Harbor', 'Nova Lane'], podcasts: ['Build in Public', 'The Long Table Podcast'], shows: ['Silicon Dreams', 'The Last Startup'] },
];

function phaseAt(t: number): MediaPhase | null {
  let p: MediaPhase | null = null;
  for (const ph of MEDIA_PHASES) if (ph.from <= t) p = ph;
  return p;
}

function addSpotify(out: WatchEntry[], rand: () => number, end: number) {
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  for (let day = MEDIA_PHASES[0].from; day < end; day += 86_400_000) {
    const ph = phaseAt(day)!;
    if (rand() < 0.25) continue;
    const n = Math.round(3 + rand() * 14);
    const hour = pick([7, 8, 9, 13, 17, 18, 22]);
    let t = day + hour * 3_600_000 + Math.floor(rand() * 3_000_000);
    for (let k = 0; k < n; k++) {
      const podcast = ph.podcasts.length > 0 && rand() < 0.08;
      const ms = podcast ? 1_200_000 + Math.floor(rand() * 2_400_000) : 150_000 + Math.floor(rand() * 90_000);
      t += ms;
      if (t > end) return;
      if (podcast) {
        const show = pick(ph.podcasts);
        const ep = `Ep. ${1 + Math.floor(rand() * 200)}: ${pick(['On Ambition', 'Starting Over', 'Money and Meaning', 'What We Learned', 'Small Steps'])}`;
        out.push({ t, title: ep, videoId: `${show}::${ep}`, channel: show, channelUrl: null, url: null, source: 'spotify', kind: 'podcast', ms });
      } else {
        const artist = pick(ph.artists);
        const song = SONGS[(hash(artist) + Math.floor(rand() * 5)) % SONGS.length];
        out.push({ t, title: song, videoId: `${artist}::${song}`, channel: artist, channelUrl: null, url: null, source: 'spotify', kind: 'music', ms });
      }
    }
  }
}

function addNetflix(out: WatchEntry[], rand: () => number, end: number) {
  const episodes = new Map<string, number>();
  for (let day = MEDIA_PHASES[0].from; day < end; day += 86_400_000) {
    const ph = phaseAt(day)!;
    if (rand() < 0.72) continue;
    const show = ph.shows[Math.floor(rand() * ph.shows.length)];
    const n = 1 + Math.floor(rand() * (rand() < 0.15 ? 6 : 2)); // occasional binge
    let t = day + (20 + Math.floor(rand() * 3)) * 3_600_000;
    for (let k = 0; k < n; k++) {
      const ep = (episodes.get(show) ?? 0) + 1;
      episodes.set(show, ep);
      const title = `${show}: Season ${1 + Math.floor((ep - 1) / 10)}: Episode ${((ep - 1) % 10) + 1}`;
      const ms = 1_500_000 + Math.floor(rand() * 1_800_000);
      if (t > end) return;
      out.push({ t, title, videoId: title, channel: show, channelUrl: null, url: null, source: 'netflix', kind: 'show', ms });
      t += ms + 60_000;
    }
  }
}
