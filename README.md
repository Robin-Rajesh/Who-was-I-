# Who Was I?

> It wasn’t just a phase. It was all of them.

**Who Was I?** turns your YouTube, Spotify, Netflix, Instagram and TikTok history into a portrait of every
version of you: the eras you went through, the obsessions you abandoned, the 2am rabbit holes, and how much you changed
from one year to the next.

It is **100% private**. The app is a static web page. Your export files are read and analysed inside your own
browser (in a Web Worker) and are never uploaded anywhere. There is no server, no account and no analytics.

## Supported platforms

| Platform | What to export | Files read | Notes |
|---|---|---|---|
| **YouTube** | [Google Takeout](https://takeout.google.com/) → YouTube and YouTube Music → history (JSON recommended) | `watch-history.json` / `.html` | YouTube Music plays count as music |
| **Spotify** | [Privacy settings](https://www.spotify.com/account/privacy/) → *Extended streaming history* (lifetime) or *Account data* (1 year) | `Streaming_History_*.json`, `StreamingHistory*.json`, `endsong_*.json` | Plays under 30 s are skips and are ignored. Shows hours listened. |
| **Netflix** | [Get my info](https://www.netflix.com/account/getmyinfo) (full) or *Viewing activity → Download all* (quick) | `ViewingActivity.csv`, `NetflixViewingHistory.csv` | Asks which profile is you; trailers and <2 min plays are ignored. The quick CSV has no times of day. |
| **Instagram** | Accounts Center → Download your information → **JSON**, all time | likes, saves, comments, follows, recently viewed | Fixes Meta’s garbled emoji/accents encoding. Views only cover recent days. |
| **TikTok** | Settings → Account → Download your data → **JSON** | `user_data.json` (old and new layouts) | Links and times only, so TikTok adds rhythm and volume rather than topics |

Drop any mix of files or whole export zips at once, or add platforms later with **Add a platform**. The report can
show everything together or be filtered to one platform, and wording adapts ("videos", "plays", "shows", "accounts").
When Spotify is combined with other platforms, music is treated as your *soundtrack*, so personas and eras describe
what else you were into instead of reading "music" for every year.

## Features

| | |
|---|---|
| 🔀 **Multi-platform** | Combine YouTube, Spotify, Netflix, Instagram and TikTok in one report, filter to any one, add or remove platforms anytime. |
| 🗺️ **Eras** | Finds the points where your taste genuinely shifted (optimal segmentation of monthly taste vectors) and names each chapter, e.g. *The Minecraft Era*, *The Sourdough Era*. |
| 🌊 **Taste river** | Month-by-month stacked chart of your topics, with your eras marked underneath. Share/volume modes, hover details, table view. |
| 💌 **Letters from past you** | Every year gets a persona (*The Night-Owl Gamer*), signature words, top channels and a short letter. |
| 📈 **Drift** | How different each year was from the one before: your biggest reinvention and your most settled year. |
| 👻 **Obsessions** | Abandoned channels you binged and never returned to, rekindled ones you came back to after a year or more, and lifelong constants. |
| 🌙 **Rhythm** | Hour-of-day × year heatmap and weekday × hour heatmap, plus your peak night-owl and early-bird years. |
| ⚖️ **You vs. you** | Compare any two years: similarity score, topic mix, channels that stayed, left and arrived. |
| ⏳ **Time machine** | “On this day” memories, browse any date, and search your whole history to see when an interest started, peaked and faded. |
| 🏆 **Records** | Busiest day, longest streak, longest break, most rewatched videos, first video ever. |
| 🖼️ **Share cards** | 1080×1350 PNG cards for any year or your whole history, ready for stories (native share sheet on mobile). |
| 💾 **Remember on this device** | Optional local storage in IndexedDB, with one-click “Forget my data”. |
| ✨ **Sample life** | A fictional 11-year history so anyone can try it before exporting their own data. |

Designed as a personal tape archive: newsprint and ink, condensed poster type, monospace timestamps and one record-light accent. Light and dark themes, fully responsive, keyboard accessible, and reduced-motion aware. Every chart has a data-table view.

## Why exports instead of logging in?

Platform APIs don’t give apps your full history: YouTube’s API no longer exposes watch history at all, and Spotify’s
only returns your last 50 tracks. The official data exports are the only way to get everything, and they mean the app
never asks for a password. The landing page has step-by-step export instructions for each platform.

## Running locally

```bash
npm install
```

```bash
npm run dev
```

Other scripts:

```bash
npm test          # unit tests (all importers, classifier, analysis engine)
npm run build     # type-check + production build into dist/
npm run preview   # serve the production build
```

## Deploying

The build is a static site with relative asset paths, so `dist/` can be hosted anywhere (GitHub Pages, Netlify,
Vercel, any static host).

A GitHub Actions workflow (`.github/workflows/deploy.yml`) tests, builds and deploys to **GitHub Pages** on every push to
`main`. To turn it on, go to **Settings → Pages → Build and deployment** and choose **GitHub Actions** as the source.

## How it works

```
Files (.json | .html | .csv | .zip, any mix)
   │  Web Worker
   ├─ importers.ts  detects each file by content: YouTube, Spotify, Netflix, Instagram, TikTok
   ├─ parse.ts      Takeout JSON / HTML (regex, no DOM); zips are stream-unzipped with fflate
   ├─ topics.ts     creator-level keyword classifier → 23 topics (kind-aware fallbacks)
   ├─ analyze.ts    years, personas, letters, drift, channel stories, rhythm, milestones
   └─ segment.ts    eras: optimal K-segmentation of monthly taste vectors (DP over prefix sums)
   ▼
React UI (charts are hand-built SVG with d3-shape; share cards are drawn on <canvas>)
```

- **Topics.** Takeout has no categories, so each *channel* is classified from its name (weighted ×3) and a sample of up
  to 60 titles you watched from it, using Unicode-aware keyword patterns. Classifying channels instead of single
  videos keeps results stable.
- **Taste vectors.** Each month or year is a vector of √share over topics, the top 300 channels and the top 300
  title words.
- **Eras.** The cost of an era is `Σ wₘ − |Σ wₘ·uₘ|` (how much its months disagree with the era’s average taste).
  With unit vectors this is O(D) per pair via prefix sums, and the best segmentation comes from an O(K·M²) dynamic
  programme. Adjacent eras that are still too similar are merged, and each era is named after its most distinctive
  word or channel.
- **Drift.** `1 − cosine` between consecutive years’ vectors.
- **Performance.** About 170,000 videos analyse in roughly 1.3 seconds.

## Privacy

- No network requests are made with your data. Fonts are bundled, and there are no trackers or third-party scripts.
- “Remember on this device” stores parsed entries in this browser’s IndexedDB only. “Forget my data” deletes them.
- `.gitignore` excludes common export file names, so personal exports aren’t committed by accident.

## Tech

React 18 · TypeScript · Vite · d3-shape · fflate · Vitest · Archivo (variable width) & IBM Plex Mono, self-hosted via Fontsource

---

Not affiliated with YouTube, Google, Spotify, Netflix, Meta or TikTok.
