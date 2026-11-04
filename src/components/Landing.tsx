import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../App';
import type { DataSource } from '../lib/types';
import { date, num } from '../lib/format';
import { Icon, Reveal } from './ui';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  onFiles: (files: File[]) => void;
  onSample: () => void;
  onResume: () => void;
  onForget: () => void;
  saved: { count: number; savedAt: number; source: DataSource } | null;
  error?: string;
  remember: boolean;
  setRemember: (v: boolean) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const PREVIEW_ERAS = [
  { name: 'The Minecraft Era', years: '2015–17', emoji: '🎮', slot: 1 },
  { name: 'The Anime Era', years: '2017–18', emoji: '🍥', slot: 2 },
  { name: 'The Study Era', years: '2019', emoji: '📚', slot: 3 },
  { name: 'The Sourdough Era', years: '2020', emoji: '🍳', slot: 4 },
  { name: 'The Crypto Era', years: '2021', emoji: '📈', slot: 5 },
  { name: 'The Travel Era', years: '2022', emoji: '✈️', slot: 6 },
  { name: 'The AI Era', years: '2023–now', emoji: '🧑‍💻', slot: 7 },
];

const FEATURES = [
  { emoji: '🗺️', title: 'Your eras', body: 'We find the moments your taste shifted and name each chapter of your life, from “The Minecraft Era” to whatever you’re in now.' },
  { emoji: '🌊', title: 'The river of you', body: 'Watch your interests rise and fade month by month, all the way back to the first video you ever watched.' },
  { emoji: '💌', title: 'Letters from past you', body: 'Every year gets a persona, signature words and a short letter written from what that version of you watched.' },
  { emoji: '👻', title: 'Abandoned obsessions', body: 'The channels you binged and then never went back to, plus the ones you came back to years later.' },
  { emoji: '🌙', title: 'Your rhythm', body: 'Were you a 2am rabbit-holer who became a 7am learner? See exactly when you watched, year by year.' },
  { emoji: '⏳', title: 'Time machine', body: '“On this day” memories, any date in your history, and a search that shows when an interest peaked.' },
];

const FAQ = [
  {
    q: 'Is my data uploaded anywhere?',
    a: 'No. Who Was I? is a static web page. Your file is opened and analysed inside your own browser (in a background worker) and is never sent to any server. You can even disconnect from the internet after the page loads and it still works.',
  },
  {
    q: 'Why do I need Google Takeout? Can’t you just log in to YouTube?',
    a: 'YouTube’s public API stopped giving apps access to watch history years ago. Google Takeout is the official way to download your own data, and it also means you never have to give this site your Google password.',
  },
  {
    q: 'JSON or HTML?',
    a: 'Both work. JSON is faster and more reliable, so if you can, switch “History format” to JSON when you create the export. You can also drop the whole Takeout .zip and we’ll find the file for you.',
  },
  {
    q: 'My history only goes back a few years. Why?',
    a: 'Takeout only contains history that is still saved in your account. If watch history was paused or auto-delete was turned on, older years won’t be there.',
  },
  {
    q: 'How are topics decided?',
    a: 'Takeout doesn’t include categories, so we classify each channel from its name and the titles you watched, using keyword patterns for more than 20 topics. It isn’t perfect, but it’s surprisingly good. Channels we can’t place go under “Everything else”.',
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
          <div className="hero-copy">
            <Reveal>
              <span className="pill">
                <Icon name="lock" size={14} /> 100% private · runs entirely in your browser
              </span>
            </Reveal>
            <Reveal delay={80}>
              <h1>
                It wasn’t just a phase.
                <br />
                <span className="gradient-text">It was all of them.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="lede">
                Drop in your YouTube watch history and meet every version of you: your eras, your abandoned
                obsessions, the 2am rabbit holes, and how much you’ve changed from one year to the next.
              </p>
            </Reveal>
          </div>

          <Reveal delay={220} className="upload-col">
            {saved && (
              <div className="resume card">
                <div>
                  <strong>Welcome back.</strong>
                  <span className="ink-2">
                    {' '}
                    Your history ({num(saved.count)} videos) is saved on this device from {date(saved.savedAt)}.
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
              className={`dropzone card ${dragging ? 'is-dragging' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              aria-label="Choose your watch history file"
            >
              <div className="drop-icon">
                <Icon name="upload" size={26} />
              </div>
              <h3>Drop your watch history here</h3>
              <p className="ink-2">
                <code>watch-history.json</code>, <code>.html</code> or the whole Takeout <code>.zip</code>
              </p>
              <span className="btn btn-primary">
                <Icon name="file" size={18} /> Choose file
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".json,.html,.htm,.zip,application/json,text/html,application/zip"
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
              <span className="muted">·</span>
              <button className="link-btn" onClick={onSample}>
                <Icon name="sparkle" size={16} /> No file yet? Try a sample life
              </button>
            </div>
          </Reveal>
        </section>

        <section className="ribbon" aria-label="Example eras">
          <div className="ribbon-track">
            {[...PREVIEW_ERAS, ...PREVIEW_ERAS].map((e, i) => (
              <div className="ribbon-item" key={i} aria-hidden={i >= PREVIEW_ERAS.length}>
                <span className="ribbon-dot" style={{ background: `var(--s${e.slot})` }} />
                <span className="ribbon-emoji">{e.emoji}</span>
                <span className="ribbon-name">{e.name}</span>
                <span className="muted">{e.years}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="section wrap" id="how">
          <Reveal className="section-head">
            <span className="eyebrow">Getting your file · about 2 minutes of clicking</span>
            <h2>Four steps to meet your past selves</h2>
            <p>Google keeps your watch history and will hand you a copy. Here’s exactly how to ask for it.</p>
          </Reveal>
          <ol className="steps">
            <Reveal as="li" className="step card">
              <span className="step-n">1</span>
              <h3>Open Google Takeout</h3>
              <p className="ink-2">
                Go to{' '}
                <a href="https://takeout.google.com/" target="_blank" rel="noreferrer noopener">
                  takeout.google.com
                </a>{' '}
                and click <b>Deselect all</b>, then scroll down and tick only <b>YouTube and YouTube Music</b>.
              </p>
            </Reveal>
            <Reveal as="li" className="step card" delay={60}>
              <span className="step-n">2</span>
              <h3>Choose just your history</h3>
              <p className="ink-2">
                Click <b>All YouTube data included</b>, deselect everything, and tick only <b>history</b>. That keeps the
                export small, with no videos.
              </p>
            </Reveal>
            <Reveal as="li" className="step card" delay={120}>
              <span className="step-n">3</span>
              <h3>Switch to JSON (recommended)</h3>
              <p className="ink-2">
                Click <b>Multiple formats</b> and change <b>History</b> from HTML to <b>JSON</b>. HTML works too, but
                JSON is faster and more accurate.
              </p>
            </Reveal>
            <Reveal as="li" className="step card" delay={180}>
              <span className="step-n">4</span>
              <h3>Export, download, drop</h3>
              <p className="ink-2">
                Click <b>Next step → Create export</b>. Google emails you a link (usually within minutes). Drop the
                .zip here, or the <code>watch-history</code> file inside it.
              </p>
            </Reveal>
          </ol>
        </section>

        <section className="section wrap">
          <Reveal className="section-head">
            <span className="eyebrow">What you’ll discover</span>
            <h2>A mirror with a memory</h2>
          </Reveal>
          <div className="features">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} className="feature card" delay={i * 50}>
                <span className="feature-emoji" aria-hidden>
                  {f.emoji}
                </span>
                <h3>{f.title}</h3>
                <p className="ink-2">{f.body}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="cta-row">
            <button className="btn btn-primary" onClick={onSample}>
              <Icon name="sparkle" size={18} /> See a sample report
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
                There’s no server, account or analytics. Your file is read by your browser, analysed in a background
                worker and shown to you. Nothing is uploaded, so there’s nothing for anyone to leak.
              </p>
            </div>
            <ul className="privacy-points">
              <li><Icon name="check" size={16} /> Runs offline after the page loads</li>
              <li><Icon name="check" size={16} /> No Google login, ever</li>
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
        <span className="muted">Not affiliated with YouTube or Google. Made for the curious.</span>
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

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className="logo">
      <defs>
        <linearGradient id="wwi-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9085e9" />
          <stop offset="1" stopColor="#eb6834" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="var(--surface-2)" />
      <circle cx="26" cy="32" r="13" fill="none" stroke="url(#wwi-g)" strokeWidth="5" />
      <circle cx="38" cy="32" r="13" fill="none" stroke="url(#wwi-g)" strokeWidth="5" opacity=".55" />
    </svg>
  );
}
