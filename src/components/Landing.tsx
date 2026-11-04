import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../App';
import { date, num } from '../lib/format';
import { Icon, Reveal, Segmented } from './ui';
import { SOURCES, sourceDef, type SourceId } from '../lib/sources';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  onFiles: (files: File[]) => void;
  onSample: () => void;
  onResume: () => void;
  onForget: () => void;
  saved: { count: number; savedAt: number } | null;
  error?: string;
  remember: boolean;
  setRemember: (v: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const PREVIEW_ERAS = [
  { name: 'The Minecraft Era', years: '2015–17', slot: 1 },
  { name: 'The Anime Era', years: '2017–18', slot: 2 },
  { name: 'The Study Era', years: '2019', slot: 3 },
  { name: 'The Sourdough Era', years: '2020', slot: 4 },
  { name: 'The Crypto Era', years: '2021', slot: 5 },
  { name: 'The Travel Era', years: '2022', slot: 6 },
  { name: 'The AI Era', years: '2023–now', slot: 7 },
];

const FEATURES = [
  { title: 'Your eras', body: 'We find the moments your taste shifted across every platform and name each chapter of your life, from “The Minecraft Era” to whatever you’re in now.' },
  { title: 'The river of you', body: 'Watch your interests rise and fade month by month, all the way back to the first video you ever watched.' },
  { title: 'Letters from past you', body: 'Every year gets a persona, signature words and a short letter written from what that version of you watched.' },
  { title: 'Abandoned obsessions', body: 'The channels, artists and shows you binged and then never went back to, plus the ones you came back to years later.' },
  { title: 'Your rhythm', body: 'Were you a 2am rabbit-holer who became a 7am learner? See exactly when you watched, year by year.' },
  { title: 'Time machine', body: '“On this day” memories, any date in your history, and a search that shows when an interest peaked.' },
];

const FAQ = [
  {
    q: 'Is my data uploaded anywhere?',
    a: 'No. Who Was I? is a static web page. Your file is opened and analysed inside your own browser (in a background worker) and is never sent to any server. You can even disconnect from the internet after the page loads and it still works.',
  },
  {
    q: 'Why exports? Can’t I just log in?',
    a: 'Login APIs don’t give apps your full history: YouTube’s doesn’t expose watch history at all, and Spotify’s only shows your last 50 songs. The official data exports are the only way to get everything, and they mean you never give this site a password.',
  },
  {
    q: 'Can I combine several platforms?',
    a: 'Yes, and it’s the best part. Drop several exports at once, or add more later with “Add a platform” in your report. Your eras, rhythm and records then span everything, and you can filter back to one platform at any time.',
  },
  {
    q: 'Which files do you read?',
    a: 'YouTube: watch-history.json or .html. Spotify: Streaming_History_*.json (extended) or StreamingHistory*.json. Netflix: ViewingActivity.csv or NetflixViewingHistory.csv. Instagram: the JSON export (likes, saves, comments, follows, recently viewed). TikTok: user_data.json. Just drop the zip and we’ll find the right files inside.',
  },
  {
    q: 'My history only goes back a few years. Why?',
    a: 'Exports only contain history the platform still keeps. YouTube skips anything from while history was paused, Spotify’s quick “Account data” covers one year (ask for “Extended streaming history” instead), and Instagram only exports recently viewed posts.',
  },
  {
    q: 'How are topics decided?',
    a: 'Exports don’t include categories, so we classify each channel, artist, show or account from its name and the titles you played, using keyword patterns for more than 20 topics. Spotify artists count as music and Netflix titles as film & TV unless their names say otherwise. It isn’t perfect, but it’s surprisingly good.',
  },
  {
    q: 'What does “remember on this device” do?',
    a: 'It keeps your parsed history in this browser’s IndexedDB storage so you can reopen your report later without exporting again. It never leaves the device, and “Forget my data” deletes it.',
  },
];

export function Landing(props: Props) {
  const { onFiles, onSample, onResume, onForget, saved, error, remember, setRemember, theme, setTheme } = props;
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current++;
      setDragging(true);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (!dragDepth.current) setDragging(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setDragging(false);
      const files = [...(e.dataTransfer?.files ?? [])];
      if (files.length) onFiles(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, [onFiles]);

  return (
    <div className="landing">
      <header className="topbar wrap">
        <a className="brand" href="./" aria-label="Who Was I? home">
          <Logo />
          <span>Who Was I?</span>
        </a>
        <div className="topbar-actions">
          <a className="btn btn-ghost btn-sm hide-sm" href="#how">How it works</a>
          <a className="btn btn-ghost btn-sm hide-sm" href="#faq">FAQ</a>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </header>

      <main>
        <section className="hero wrap">
          <Reveal className="hero-meta mono">
            <span className="rec">
              <i aria-hidden /> REC
            </span>
            <span>Private · runs in your browser · nothing is uploaded</span>
          </Reveal>
          <div className="hero-grid">
            <div className="hero-copy">
              <Reveal delay={60}>
                <h1 className="hero-title">
                  It wasn’t just a phase. <span className="accent-text">It was all of them.</span>
                </h1>
              </Reveal>
              <Reveal delay={140}>
              <p className="lede">
                Drop in your watch, listen and scroll history and meet every version of you: your eras, your abandoned
                obsessions, the 2am rabbit holes, and how much you changed from one year to the next.
              </p>
              <p className="works-with mono" aria-label="Works with">
                <span className="muted">Works with</span>{' '}
                {SOURCES.map((src, i) => (
                  <span key={src.id}>
                    {i > 0 && <span className="muted"> / </span>}
                    {src.label}
                  </span>
                ))}
              </p>
              </Reveal>
            </div>

            <Reveal delay={200} className="upload-col">
              {saved && (
                <div className="resume card">
                  <div>
                    <strong>Welcome back.</strong>
                    <span className="ink-2">
                      {' '}
                      Your history ({num(saved.count)} items) is saved on this device from {date(saved.savedAt)}.
                    </span>
                  </div>
                  <div className="resume-actions">
                    <button className="btn btn-primary btn-sm" onClick={onResume}>
                      Open my report <Icon name="arrow-right" size={16} />
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={onForget}>
                      <Icon name="trash" size={16} /> Forget
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="error card" role="alert">
                  <strong>That didn’t work.</strong> <span>{error}</span>
                </div>
              )}

              <div
                className={`tape ${dragging ? 'is-dragging' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    inputRef.current?.click();
                  }
                }}
                aria-label="Choose your export files"
              >
                <div className="tape-label">
                  <div className="tape-head mono">
                    <span>Side A</span>
                    <span>{dragging ? 'Let go' : 'Insert your history'}</span>
                    <span>C-90</span>
                  </div>
                  <div className="tape-window" aria-hidden>
                    <span className="reel" />
                    <span className="tape-strip" />
                    <span className="reel" />
                  </div>
                  <h3>Drop your exports here</h3>
                  <p className="ink-2">YouTube, Spotify, Netflix, Instagram or TikTok. Zips are fine, several at once is fine.</p>
                  <span className="btn btn-primary">
                    <Icon name="file" size={18} /> Choose files
                  </span>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".json,.html,.htm,.zip,.csv,application/json,text/html,text/csv,application/zip"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = [...(e.target.files ?? [])];
                    e.target.value = '';
                    if (files.length) onFiles(files);
                  }}
                />
              </div>

              <div className="upload-meta">
                <label className="check">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                  <span>Remember on this device</span>
                </label>
                <button className="link-btn" onClick={onSample}>
                  No export yet? Play the sample tape <Icon name="arrow-right" size={15} />
                </button>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="ribbon" aria-label="Example eras">
          <div className="ribbon-track">
            {[...PREVIEW_ERAS, ...PREVIEW_ERAS].map((e, i) => (
              <div className="ribbon-item" key={i} aria-hidden={i >= PREVIEW_ERAS.length}>
                <span className="ribbon-dot" style={{ background: `var(--s${e.slot})` }} />
                <span className="ribbon-name">{e.name}</span>
                <span className="ribbon-years">{e.years}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section wrap" id="how">
          <Reveal className="section-head">
            <span className="eyebrow">Getting your data · a few minutes of clicking</span>
            <h2>Ask each platform for your history</h2>
            <p>
              Every big platform has to hand you a copy of your data. Here’s exactly where to ask. Start with one; you can add the
              others to your report whenever they arrive.
            </p>
          </Reveal>
          <ExportGuide />
        </section>

        <section className="section wrap">
          <Reveal className="section-head">
            <span className="eyebrow">What you’ll discover</span>
            <h2>A mirror with a memory</h2>
          </Reveal>
          <ol className="features">
            {FEATURES.map((f, i) => (
              <Reveal as="li" key={f.title} className="feature" delay={i * 50}>
                <span className="feature-n mono">{String(i + 1).padStart(2, '0')}</span>
                <h3>{f.title}</h3>
                <p className="ink-2">{f.body}</p>
              </Reveal>
            ))}
          </ol>
          <Reveal className="cta-row">
            <button className="btn btn-primary" onClick={onSample}>
              Play the sample tape <Icon name="play" size={16} />
            </button>
            <button className="btn" onClick={() => inputRef.current?.click()}>
              <Icon name="upload" size={18} /> Use my own history
            </button>
          </Reveal>
        </section>

        <section className="section wrap privacy-section">
          <Reveal className="privacy card">
            <div className="privacy-icon">
              <Icon name="lock" size={26} />
            </div>
            <div>
              <h2>Your history stays yours.</h2>
              <p className="ink-2">
                There’s no server, account or analytics. Your files are read by your browser, analysed in a background
                worker and shown to you. Nothing is uploaded, so there’s nothing for anyone to leak.
              </p>
            </div>
            <ul className="privacy-points">
              <li><Icon name="check" size={16} /> Runs offline after the page loads</li>
              <li><Icon name="check" size={16} /> No logins or passwords, ever</li>
              <li><Icon name="check" size={16} /> One click to forget everything</li>
            </ul>
          </Reveal>
        </section>

        <section className="section wrap" id="faq">
          <Reveal className="section-head">
            <span className="eyebrow">Questions</span>
            <h2>FAQ</h2>
          </Reveal>
          <div className="faq">
            {FAQ.map((f) => (
              <Reveal key={f.q}>
                <details className="faq-item">
                  <summary>
                    {f.q}
                    <Icon name="chevron-down" size={18} />
                  </summary>
                  <p className="ink-2">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer wrap">
        <span>
          <Logo size={20} /> Who Was I?
        </span>
        <span className="muted">Not affiliated with YouTube, Google, Spotify, Netflix, Meta or TikTok. Made for the curious.</span>
      </footer>

      {dragging && (
        <div className="drop-overlay" aria-hidden>
          <div>
            <Icon name="upload" size={40} />
            <p>Let go to meet your past selves</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** A record light on a tape-black tile. */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="logo">
      <rect width="32" height="32" rx="4" fill="var(--ink)" />
      <circle cx="16" cy="16" r="7" fill="var(--accent)" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="var(--accent)" strokeWidth="1.5" opacity=".45" />
    </svg>
  );
}

function ExportGuide() {
  const [id, setId] = useState<SourceId>('youtube');
  const src = sourceDef(id);
  return (
    <div className="export-guide">
      <Reveal className="tab-row">
        <Segmented label="Platform" value={id} onChange={setId} options={SOURCES.map((x) => ({ value: x.id, label: x.label }))} />
      </Reveal>
      <ol className="steps" key={id}>
        {src.steps.map((st, i) => (
          <Reveal as="li" className="step card" delay={i * 50} key={st.title}>
            <span className="step-n">{String(i + 1).padStart(2, '0')}</span>
            <h3>{st.title}</h3>
            <p className="ink-2">{st.body}</p>
          </Reveal>
        ))}
      </ol>
      <div className="guide-foot">
        <a className="btn btn-sm" href={src.link.href} target="_blank" rel="noreferrer noopener">
          Open {src.link.label} <Icon name="arrow-right" size={16} />
        </a>
        <span className="muted">
          We read: {src.files}.{src.note ? ` ${src.note}` : ''}
        </span>
      </div>
    </div>
  );
}
