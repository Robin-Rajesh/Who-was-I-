import { describe, expect, it } from 'vitest';
import { fixMojibake, netflixShow, parseAnyFile, parseCsv, isCandidatePath } from './importers';
import { analyze } from './analyze';

const spotifyExtended = JSON.stringify([
  { ts: '2021-03-01T08:00:00Z', platform: 'ios', ms_played: 215000, conn_country: 'GB', master_metadata_track_name: 'Golden Hour', master_metadata_album_artist_name: 'Nova Lane', master_metadata_album_album_name: 'Dawn', spotify_track_uri: 'spotify:track:4uLU6hMCjMI75M1A2tKUQC', episode_name: null, episode_show_name: null, spotify_episode_uri: null, reason_start: 'trackdone', reason_end: 'trackdone', shuffle: false, skipped: false },
  { ts: '2021-03-01T08:04:00Z', ms_played: 4000, master_metadata_track_name: 'Skipped Song', master_metadata_album_artist_name: 'Someone', spotify_track_uri: 'spotify:track:abc' },
  { ts: '2021-03-01T09:00:00Z', ms_played: 1800000, master_metadata_track_name: null, master_metadata_album_artist_name: null, spotify_track_uri: null, episode_name: 'Ep 12: Money', episode_show_name: 'Money Minutes', spotify_episode_uri: 'spotify:episode:5aXyz' },
  { ts: '2021-03-01T10:00:00Z', ms_played: 50000, master_metadata_track_name: null, episode_name: null },
]);

const spotifyAccount = JSON.stringify([
  { endTime: '2023-01-05 16:45', artistName: 'Nova Lane', trackName: 'Golden Hour', msPlayed: 200000 },
  { endTime: '2023-01-05 16:46', artistName: 'Unknown Artist', trackName: 'Unknown Track', msPlayed: 200000 },
  { endTime: '2023-01-05 17:46', podcastName: 'Daily Show', episodeName: 'Monday', msPlayed: 900000 },
]);

const netflixFull = [
  'Profile Name,Start Time,Duration,Attributes,Title,Supplemental Video Type,Device Type,Bookmark,Latest Bookmark,Country',
  'Robin,2023-01-05 21:00:01,00:45:12,,"Stranger Things: Season 1: Chapter One: The Vanishing of Will Byers",,Smart TV,00:45:12,00:45:12,GB (United Kingdom)',
  'Robin,2023-01-05 20:58:00,00:01:30,,Stranger Things Trailer,TRAILER,Smart TV,00:01:30,00:01:30,GB (United Kingdom)',
  'Sam,2023-01-06 19:00:00,01:52:00,,The Grand Budapest Hotel,,iPhone,01:52:00,01:52:00,GB (United Kingdom)',
  'Robin,2023-01-07 22:00:00,00:00:40,Autoplayed: user action: None;,Wednesday: Season 1: Episode 1,,Smart TV,00:00:40,00:00:40,GB',
].join('\r\n');

const netflixQuick = '﻿Title,Date\r\n"Wednesday: Season 1: Woe Is the Loneliest Number","25/11/2022"\r\n"Glass Onion: A Knives Out Mystery","23/12/2022"\r\n';

const instagramLikes = JSON.stringify({
  likes_media_likes: [
    { title: 'natgeo', string_list_data: [{ href: 'https://www.instagram.com/p/abc/', value: '👍', timestamp: 1680000000 }] },
    { title: 'cafÃ©_paris', string_list_data: [{ href: 'https://www.instagram.com/p/def/', value: '👍', timestamp: 1680000500 }] },
  ],
});
const instagramFollowing = JSON.stringify({
  relationships_following: [{ title: '', media_list_data: [], string_list_data: [{ href: 'https://www.instagram.com/bakery_bob', value: 'bakery_bob', timestamp: 1600000000 }] }],
});
const instagramComments = JSON.stringify([
  { media: [], string_map_data: { Comment: { value: 'So good!' }, 'Media Owner': { value: 'natgeo' }, Time: { timestamp: 1690000000 } } },
]);
const instagramViewed = JSON.stringify({
  impressions_history_videos_watched: [{ string_map_data: { Author: { value: 'chef_anna' }, Time: { timestamp: 1699000000 } } }],
});

const tiktokOld = JSON.stringify({
  Activity: {
    'Video Browsing History': { VideoList: [{ Date: '2023-02-01 21:15:02', Link: 'https://www.tiktokv.com/share/video/7195000000000000001/' }] },
    'Like List': { ItemFavoriteList: [{ Date: '2023-02-01 21:16:00', Link: 'https://www.tiktokv.com/share/video/7195000000000000002/' }] },
  },
  Profile: { 'Profile Information': { ProfileMap: { userName: 'me' } } },
});
const tiktokNew = JSON.stringify({
  'Your Activity': { 'Watch History': { VideoList: [{ Date: '2024-05-01 07:00:00', Link: 'https://www.tiktokv.com/share/video/7360000000000000001/' }] } },
});

describe('Spotify', () => {
  it('reads extended streaming history, skipping <30s plays and unknown items', () => {
    const r = parseAnyFile('Streaming_History_Audio_2021_0.json', spotifyExtended)!;
    expect(r.source).toBe('spotify');
    expect(r.variant).toBe('spotify-extended');
    expect(r.entries).toHaveLength(2);
    const song = r.entries.find((e) => e.kind === 'music')!;
    expect(song).toMatchObject({ title: 'Golden Hour', channel: 'Nova Lane', url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC', ms: 215000 });
    expect(r.entries.find((e) => e.kind === 'podcast')!.channel).toBe('Money Minutes');
  });
  it('reads account-data history in UTC', () => {
    const r = parseAnyFile('StreamingHistory_music_0.json', spotifyAccount)!;
    expect(r.variant).toBe('spotify-account');
    expect(r.entries).toHaveLength(2);
    expect(r.entries[0].t).toBe(Date.UTC(2023, 0, 5, 16, 45));
  });
});

describe('Netflix', () => {
  it('reads the full ViewingActivity export, dropping trailers and short previews', () => {
    const r = parseAnyFile('CONTENT_INTERACTION/ViewingActivity.csv', netflixFull)!;
    expect(r.source).toBe('netflix');
    expect(r.entries).toHaveLength(2);
    expect(r.entries.map((e) => e.channel).sort()).toEqual(['Stranger Things', 'The Grand Budapest Hotel']);
    expect(r.profileOf).toBeDefined();
  });
  it('reads the quick CSV with day-first dates and flags times as approximate', () => {
    const r = parseAnyFile('NetflixViewingHistory.csv', netflixQuick)!;
    expect(r.variant).toBe('netflix-quick');
    expect(r.entries).toHaveLength(2);
    const d = new Date(r.entries[0].t);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2022, 10, 25]);
    expect(r.entries[0].approx).toBe(true);
    expect(r.entries[0].channel).toBe('Wednesday');
  });
  it('extracts show names', () => {
    expect(netflixShow('Breaking Bad: Season 2: Grilled')).toBe('Breaking Bad');
    expect(netflixShow('Arcane: League of Legends: Season 1: Welcome to the Playground')).toBe('Arcane');
    expect(netflixShow('Glass Onion: A Knives Out Mystery')).toBe('Glass Onion: A Knives Out Mystery');
  });
});

describe('Instagram', () => {
  it('reads likes and fixes Meta’s mojibake', () => {
    const r = parseAnyFile('your_instagram_activity/likes/liked_posts.json', instagramLikes)!;
    expect(r.source).toBe('instagram');
    expect(r.entries.map((e) => e.channel)).toEqual(['natgeo', 'café_paris']);
    expect(r.entries[0]).toMatchObject({ kind: 'social', title: 'Liked a post', t: 1680000000 * 1000 });
  });
  it('reads following, comments and recently viewed', () => {
    expect(parseAnyFile('connections/followers_and_following/following.json', instagramFollowing)!.entries[0].channel).toBe('bakery_bob');
    const c = parseAnyFile('your_instagram_activity/comments/post_comments_1.json', instagramComments)!;
    expect(c.entries[0]).toMatchObject({ channel: 'natgeo', title: 'Commented: “So good!”' });
    expect(parseAnyFile('ads_information/ads_and_topics/videos_watched.json', instagramViewed)!.entries[0].channel).toBe('chef_anna');
  });
  it('explains HTML exports', () => {
    expect(() => parseAnyFile('your_instagram_activity/likes/liked_posts.html', '<html><body>likes</body></html>')).toThrow(/JSON/);
  });
  it('fixMojibake leaves normal text alone', () => {
    expect(fixMojibake('café')).toBe('café');
    expect(fixMojibake('cafÃ©')).toBe('café');
  });
});

describe('TikTok', () => {
  it('reads old and new user_data layouts', () => {
    const a = parseAnyFile('user_data.json', tiktokOld)!;
    expect(a.source).toBe('tiktok');
    expect(a.entries.map((e) => e.title)).toEqual(['Watched a TikTok', 'Liked a TikTok']);
    expect(parseAnyFile('user_data_tiktok.json', tiktokNew)!.entries).toHaveLength(1);
  });
});

describe('dispatcher', () => {
  it('ignores unrelated files', () => {
    expect(parseAnyFile('Userdata.json', JSON.stringify({ username: 'x', email: 'y' }))).toBeNull();
    expect(parseAnyFile('Inferences.json', JSON.stringify({ inferences: ['a'] }))).toBeNull();
    expect(parseAnyFile('PROFILES/Profiles.csv', 'Profile Name,Email\nRobin,x')).toBeNull();
  });
  it('filters zip paths', () => {
    expect(isCandidatePath('Takeout/YouTube and YouTube Music/history/watch-history.json')).toBe(true);
    expect(isCandidatePath('Takeout/YouTube and YouTube Music/history/search-history.json')).toBe(false);
    expect(isCandidatePath('your_instagram_activity/comments/post_comments_1.json')).toBe(true);
    expect(isCandidatePath('your_instagram_activity/messages/inbox/a/message_1.json')).toBe(false);
    expect(isCandidatePath('media/posts/1.jpg')).toBe(false);
  });
  it('parses quoted CSV', () => {
    expect(parseCsv('a,"b, c","d ""e"""\n1,2,3')).toEqual([['a', 'b, c', 'd "e"'], ['1', '2', '3']]);
  });
  it('analyses a mixed history with approximate times without crashing', () => {
    const entries = [
      ...parseAnyFile('a.json', spotifyExtended)!.entries,
      ...parseAnyFile('b.csv', netflixQuick)!.entries,
      ...parseAnyFile('c.json', instagramLikes)!.entries,
      ...parseAnyFile('d.json', tiktokOld)!.entries,
    ].sort((x, y) => x.t - y.t);
    const r = analyze(entries, { sample: false });
    expect(r.meta.sources).toHaveLength(4);
    expect(r.rhythm.weekdayHour.flat().reduce((s, x) => s + x, 0)).toBe(entries.length - 2); // the 2 Netflix-quick rows have no time
  });
});
