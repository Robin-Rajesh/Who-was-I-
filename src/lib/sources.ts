/**
 * Supported platforms, the words we use for each, and how to export from them.
 */

export type SourceId = 'youtube' | 'spotify' | 'netflix' | 'instagram' | 'tiktok';

/** What a single entry is – drives topic fallbacks and wording. */
export type EntryKind = 'video' | 'music' | 'podcast' | 'show' | 'social';

export interface Vocab {
  /** "video" / "play" / "title" … */
  item: string;
  items: string;
  /** "channel" / "artist" / "show" / "account" … */
  creator: string;
  creators: string;
  /** "watching" / "listening" / "scrolling" … (as in "41% of your ___") */
  doing: string;
  /** "watched" / "played" / "liked" … */
  did: string;
  /** Overview headline; "{n}" is replaced with the formatted total. */
  headline: string;
}

export interface SourceDef {
  id: SourceId;
  label: string;
  /** Brand-neutral accent used for the source chip dot (not a chart colour). */
  color: string;
  emoji: string;
  vocab: Vocab;
  files: string;
  steps: { title: string; body: string }[];
  link: { href: string; label: string };
  note?: string;
}

export const SOURCES: SourceDef[] = [
  {
    id: 'youtube',
    label: 'YouTube',
    color: '#e5484d',
    emoji: '▶️',
    vocab: { item: 'video', items: 'videos', creator: 'channel', creators: 'channels', doing: 'watching', did: 'watched', headline: 'You pressed play {n} times.' },
    files: 'watch-history.json / .html or the Takeout .zip',
    link: { href: 'https://takeout.google.com/', label: 'takeout.google.com' },
    steps: [
      { title: 'Open Google Takeout', body: 'Click “Deselect all”, then tick only “YouTube and YouTube Music”.' },
      { title: 'Keep only history', body: 'Click “All YouTube data included”, deselect everything and tick “history”.' },
      { title: 'Choose JSON', body: 'Under “Multiple formats”, set History to JSON (HTML works too, JSON is better).' },
      { title: 'Export and drop', body: 'Create the export. Google emails a link, usually within minutes. Drop the .zip here.' },
    ],
  },
  {
    id: 'spotify',
    label: 'Spotify',
    color: '#1db954',
    emoji: '🎧',
    vocab: { item: 'play', items: 'plays', creator: 'artist', creators: 'artists', doing: 'listening', did: 'played', headline: 'You hit play {n} times.' },
    files: 'Streaming_History_*.json, StreamingHistory*.json or the .zip',
    link: { href: 'https://www.spotify.com/account/privacy/', label: 'spotify.com/account/privacy' },
    steps: [
      { title: 'Open Privacy settings', body: 'Sign in at spotify.com, go to Account → Privacy settings and scroll to “Download your data”.' },
      { title: 'Pick extended history', body: 'Tick “Extended streaming history” for your whole life on Spotify (up to 30 days to arrive). “Account data” is faster but only covers the last year.' },
      { title: 'Confirm by email', body: 'Click “Request data” and confirm the email Spotify sends you.' },
      { title: 'Drop the zip', body: 'When it arrives, drop the whole .zip (or the Streaming_History JSON files) here.' },
    ],
    note: 'Plays under 30 seconds are treated as skips and left out, like Spotify’s own stream count.',
  },
  {
    id: 'netflix',
    label: 'Netflix',
    color: '#e50914',
    emoji: '🍿',
    vocab: { item: 'title', items: 'titles', creator: 'show', creators: 'shows', doing: 'watching', did: 'watched', headline: 'You pressed play {n} times.' },
    files: 'ViewingActivity.csv, NetflixViewingHistory.csv or the .zip',
    link: { href: 'https://www.netflix.com/account/getmyinfo', label: 'netflix.com/account/getmyinfo' },
    steps: [
      { title: 'Quick option', body: 'Account → Profiles → Viewing activity → “Download all”. You get dates only, no times of day.' },
      { title: 'Full option (better)', body: 'Request your personal information at netflix.com/account/getmyinfo. It includes exact times and every profile.' },
      { title: 'Wait for the email', body: 'The full export can take a few days. Download the .zip from the link Netflix sends.' },
      { title: 'Drop it here', body: 'Drop the .zip or CONTENT_INTERACTION/ViewingActivity.csv. If several profiles share the account, we’ll ask which is you.' },
    ],
    note: 'Trailers, previews and anything under two minutes are left out.',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    color: '#d6249f',
    emoji: '📸',
    vocab: { item: 'interaction', items: 'interactions', creator: 'account', creators: 'accounts', doing: 'scrolling', did: 'had', headline: 'You tapped, liked and saved {n} times.' },
    files: 'the Instagram JSON .zip (likes, saves, comments, follows)',
    link: { href: 'https://accountscenter.instagram.com/info_and_permissions/', label: 'Accounts Center' },
    steps: [
      { title: 'Open Accounts Center', body: 'Instagram → Settings → Accounts Center → Your information and permissions → Download your information.' },
      { title: 'Choose your activity', body: 'Pick “Some of your information” and tick Likes, Saved, Comments, Followers and following, and Ads information.' },
      { title: 'Choose JSON', body: 'Set Format to JSON (not HTML) and Date range to “All time”.' },
      { title: 'Drop the zip', body: 'Meta emails you when it’s ready. Drop the .zip here.' },
    ],
    note: 'Instagram exports “posts viewed” for recent days only. Likes, saves, comments and follows go back years.',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    color: '#25f4ee',
    emoji: '🎵',
    vocab: { item: 'TikTok', items: 'TikToks', creator: 'creator', creators: 'creators', doing: 'scrolling', did: 'watched', headline: 'You watched and liked {n} TikToks.' },
    files: 'user_data.json or the TikTok .zip',
    link: { href: 'https://support.tiktok.com/en/account-and-privacy/personalized-ads-and-data/requesting-your-data', label: 'TikTok help: request your data' },
    steps: [
      { title: 'Open settings', body: 'Profile → ☰ → Settings and privacy → Account → Download your data.' },
      { title: 'Choose JSON', body: 'Select “All data” and set the file format to JSON.' },
      { title: 'Request and wait', body: 'Tap “Request data”. It appears under “Download data” a few days later.' },
      { title: 'Drop it here', body: 'Drop the .zip or user_data.json.' },
    ],
    note: 'TikTok only exports links and times, not titles or creators, so TikTok adds to your rhythm and volume rather than your topics.',
  },
];

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));
export const sourceDef = (id: SourceId): SourceDef => BY_ID.get(id)!;

const MIXED: Vocab = {
  item: 'play',
  items: 'plays',
  creator: 'creator',
  creators: 'creators',
  doing: 'activity',
  did: 'played',
  headline: 'You pressed play {n} times.',
};

/** Wording for a report covering one or more sources. */
export function vocabFor(sources: SourceId[]): Vocab {
  return sources.length === 1 ? sourceDef(sources[0]).vocab : MIXED;
}
