# Who Was I?

> It wasn’t just a phase. It was all of them.

**Who Was I?** turns your YouTube watch history into a portrait of every version of you: the eras you
went through, the obsessions you abandoned, the 2am rabbit holes, and how much you changed from one year to the next.

It is **100% private**. The app is a static web page. Your history file is read and analysed inside your own
browser (in a Web Worker) and is never uploaded anywhere. There is no server, no account and no analytics.

## Features

| | |
|---|---|
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

Light and dark themes, fully responsive, keyboard accessible, and reduced-motion aware. Every chart has a data-table view.

## Getting your watch history

1. Go to [takeout.google.com](https://takeout.google.com/) and click **Deselect all**.
2. Tick **YouTube and YouTube Music**, click **All YouTube data included**, and keep only **history**.
3. Click **Multiple formats** and set **History** to **JSON** (HTML also works, but JSON is faster and more reliable).
4. Create the export, download it, and drop the `.zip` (or `watch-history.json` / `watch-history.html` inside it) into the app.

YouTube’s API no longer exposes watch history, so Takeout is the only way to get it. It also means the app never asks for your Google password.

## Running locally

```bash
npm install
```

```bash
npm run dev
```

Other scripts:

```bash
npm test          # unit tests (parsers, classifier, analysis engine)
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
File (.json | .html | .zip)
   │  Web Worker
   ├─ parse.ts      Takeout JSON / HTML (regex, no DOM) / streaming unzip (fflate) → WatchEntry[]
   ├─ topics.ts     channel-level keyword classifier → 22 topics
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
- `.gitignore` excludes `watch-history.*` and `takeout-*.zip`, so personal exports aren’t committed by accident.

## Tech

React 18 · TypeScript · Vite · d3-shape · fflate · Vitest · Fraunces & Inter (self-hosted via Fontsource)

---

Not affiliated with YouTube or Google.
