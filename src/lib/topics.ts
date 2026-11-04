/**
 * Topic taxonomy + a lightweight keyword classifier.
 *
 * Takeout exports carry no categories, so we infer a topic per *channel* from
 * its name and a sample of the titles watched from it. Classifying channels
 * (not individual videos) is far more stable: one "Minecraft" channel uploading
 * a vlog doesn't suddenly become a travel channel.
 */

export type TopicId =
  | 'gaming'
  | 'music'
  | 'anime'
  | 'tech'
  | 'code'
  | 'science'
  | 'learning'
  | 'cooking'
  | 'fitness'
  | 'finance'
  | 'comedy'
  | 'news'
  | 'sports'
  | 'film'
  | 'travel'
  | 'diy'
  | 'style'
  | 'cars'
  | 'animals'
  | 'wellness'
  | 'kids'
  | 'podcasts'
  | 'other';

export interface TopicDef {
  id: TopicId;
  label: string;
  emoji: string;
  /** Persona noun: "The Night-Owl ___". */
  noun: string;
  keywords: string[];
}

export const TOPICS: TopicDef[] = [
  {
    id: 'gaming', label: 'Gaming', emoji: '🎮', noun: 'Gamer',
    keywords: ['minecraft', 'fortnite', 'gameplay', 'walkthrough', "let's play", 'lets play', 'gaming', 'gamer', 'speedrun', 'playthrough',
      'roblox', 'gta', 'pokemon', 'pokémon', 'zelda', 'nintendo', 'xbox', 'playstation', 'ps4', 'ps5', 'steam', 'valorant',
      'league of legends', 'overwatch', 'among us', 'elden ring', 'skyrim', 'call of duty', 'warzone', 'apex legends', 'csgo', 'cs2',
      'dota', 'hardcore', 'survival', 'boss fight', 'redstone', 'mario', 'sims', 'terraria', 'speedrunner', 'esports', 'twitch', 'genshin', 'game'],
  },
  {
    id: 'music', label: 'Music', emoji: '🎵', noun: 'Melophile',
    keywords: ['official video', 'official music video', 'music video', 'lyrics', 'lyric video', 'official audio', 'remix', 'cover',
      'live performance', 'acoustic', 'album', 'song', 'songs', 'playlist', 'mv', 'feat', 'ft', 'concert', 'karaoke', 'instrumental',
      'beats', 'lofi', 'lo-fi', 'piano', 'guitar', 'vevo', 'records', 'music', 'tiny desk', 'unplugged', 'synthwave', 'jazz', 'hip hop', 'rap'],
  },
  {
    id: 'anime', label: 'Anime', emoji: '🍥', noun: 'Otaku',
    keywords: ['anime', 'manga', 'naruto', 'one piece', 'amv', 'jujutsu', 'attack on titan', 'demon slayer', 'dragon ball', 'ghibli',
      'cosplay', 'opening', 'shonen', 'my hero academia', 'chainsaw man', 'bleach', 'hunter x hunter', 'death note', 'spy x family', 'waifu'],
  },
  {
    id: 'tech', label: 'Tech', emoji: '📱', noun: 'Techie',
    keywords: ['iphone', 'android', 'unboxing', 'tech', 'laptop', 'pc build', 'gpu', 'cpu', 'apple', 'samsung', 'pixel', 'gadget', 'gadgets',
      'setup', 'macbook', 'ipad', 'windows', 'keyboard', 'smartphone', 'headphones', 'camera', 'specs', 'benchmark', 'galaxy', 'vision pro'],
  },
  {
    id: 'code', label: 'Code & AI', emoji: '🧑‍💻', noun: 'Builder',
    keywords: ['programming', 'coding', 'javascript', 'python', 'react', 'developer', 'software', 'web development', 'algorithm', 'algorithms',
      'leetcode', 'rust', 'typescript', 'api', 'git', 'css', 'html', 'java', 'c++', 'docker', 'kubernetes', 'machine learning', 'chatgpt',
      'llm', 'llms', 'neural network', 'data science', 'artificial intelligence', 'ai', 'startup', 'linux', 'devops', 'framework', 'code', 'agents'],
  },
  {
    id: 'science', label: 'Science', emoji: '🔭', noun: 'Curious Mind',
    keywords: ['science', 'physics', 'space', 'nasa', 'universe', 'quantum', 'biology', 'chemistry', 'math', 'mathematics', 'black hole',
      'evolution', 'experiment', 'astronomy', 'planet', 'galaxy', 'telescope', 'dna', 'brain', 'climate', 'theory', 'atoms', 'cosmos', 'mars'],
  },
  {
    id: 'learning', label: 'Learning', emoji: '📚', noun: 'Scholar',
    keywords: ['lecture', 'course', 'study', 'exam', 'explained', 'history', 'philosophy', 'learn', 'lesson', 'class', 'university',
      'economics', 'psychology', 'ted', 'tedx', 'study with me', 'crash course', 'essay', 'documentary', 'language', 'grammar', 'tutorial', 'how to'],
  },
  {
    id: 'cooking', label: 'Cooking', emoji: '🍳', noun: 'Home Chef',
    keywords: ['recipe', 'recipes', 'cooking', 'cook', 'bake', 'baking', 'kitchen', 'chef', 'food', 'pasta', 'chicken', 'curry', 'bread',
      'sourdough', 'dessert', 'cake', 'meal prep', 'street food', 'mukbang', 'restaurant', 'ramen', 'pizza', 'steak', 'eat', 'eating', 'taste test'],
  },
  {
    id: 'fitness', label: 'Fitness', emoji: '💪', noun: 'Athlete',
    keywords: ['workout', 'fitness', 'gym', 'exercise', 'yoga', 'abs', 'hiit', 'running', 'marathon', 'bodybuilding', 'protein', 'calisthenics',
      'stretch', 'stretching', 'cardio', 'weight loss', 'diet', 'keto', 'nutrition', 'pilates', 'push ups', 'squat', 'muscle', 'training'],
  },
  {
    id: 'finance', label: 'Money', emoji: '📈', noun: 'Investor',
    keywords: ['stock', 'stocks', 'investing', 'invest', 'crypto', 'bitcoin', 'ethereum', 'money', 'finance', 'trading', 'stock market',
      'economy', 'budget', 'passive income', 'real estate', 'side hustle', 'nft', 'nfts', 'wealth', 'salary', 'tax', 'taxes', 'millionaire',
      'recession', 'inflation', 'dividend', 'index fund', 'altcoin', 'portfolio', 'fire', 'retire'],
  },
  {
    id: 'comedy', label: 'Comedy', emoji: '😂', noun: 'Jester',
    keywords: ['funny', 'comedy', 'prank', 'pranks', 'sketch', 'stand up', 'stand-up', 'standup', 'meme', 'memes', 'try not to laugh',
      'parody', 'roast', 'fails', 'snl', 'jokes', 'bloopers', 'hilarious', 'comedian', 'skit', 'improv', 'satire'],
  },
  {
    id: 'news', label: 'News & Politics', emoji: '📰', noun: 'Watchdog',
    keywords: ['news', 'politics', 'political', 'election', 'president', 'debate', 'war', 'breaking', 'government', 'policy', 'senate',
      'congress', 'parliament', 'prime minister', 'crisis', 'protest', 'geopolitics', 'explainer', 'report', 'journalist'],
  },
  {
    id: 'sports', label: 'Sports', emoji: '⚽', noun: 'Superfan',
    keywords: ['football', 'soccer', 'nba', 'nfl', 'highlights', 'cricket', 'tennis', 'f1', 'formula 1', 'ufc', 'boxing', 'goals', 'match',
      'basketball', 'baseball', 'premier league', 'champions league', 'world cup', 'olympics', 'wwe', 'ipl', 'mma', 'golf', 'hockey', 'fifa'],
  },
  {
    id: 'film', label: 'Film & TV', emoji: '🎬', noun: 'Cinephile',
    keywords: ['trailer', 'movie', 'movies', 'film', 'films', 'scene', 'netflix', 'marvel', 'series', 'season', 'behind the scenes', 'cinema',
      'actor', 'actress', 'oscars', 'star wars', 'breaking bad', 'video essay', 'teaser', 'clip', 'sitcom', 'tv show', 'review', 'ending explained'],
  },
  {
    id: 'travel', label: 'Travel', emoji: '✈️', noun: 'Wanderer',
    keywords: ['travel', 'travelling', 'traveling', 'trip', 'tour', 'japan', 'explore', 'exploring', 'visiting', 'hotel', 'flight', 'backpacking',
      'beach', 'island', 'road trip', 'walking tour', 'city', 'abroad', 'airport', 'train', 'hostel', 'vlog', 'tokyo', 'paris', 'itinerary'],
  },
  {
    id: 'diy', label: 'Making & DIY', emoji: '🔨', noun: 'Tinkerer',
    keywords: ['diy', 'woodworking', 'restoration', 'restore', 'repair', 'fix', 'craft', 'crafts', 'garden', 'gardening', 'how to make',
      '3d print', '3d printing', 'lego', 'home improvement', 'tools', 'knitting', 'sewing', 'drawing', 'painting', 'pottery', 'build', 'workshop', 'van build'],
  },
  {
    id: 'style', label: 'Style & Beauty', emoji: '💄', noun: 'Trendsetter',
    keywords: ['makeup', 'skincare', 'fashion', 'outfit', 'outfits', 'haul', 'hair', 'hairstyle', 'beauty', 'style', 'nails', 'grwm',
      'get ready with me', 'lookbook', 'thrift', 'thrifting', 'sneakers', 'streetwear', 'perfume', 'fragrance'],
  },
  {
    id: 'cars', label: 'Cars', emoji: '🏎️', noun: 'Gearhead',
    keywords: ['car', 'cars', 'supercar', 'engine', 'drift', 'tesla', 'motorcycle', 'bmw', 'porsche', 'ferrari', 'test drive', 'mustang',
      'jdm', 'turbo', 'lamborghini', 'ev', 'horsepower', 'top gear', 'motorsport', 'rally'],
  },
  {
    id: 'animals', label: 'Animals', emoji: '🐾', noun: 'Animal Whisperer',
    keywords: ['cat', 'cats', 'dog', 'dogs', 'puppy', 'puppies', 'kitten', 'kittens', 'animals', 'animal', 'wildlife', 'pet', 'pets', 'bird',
      'birds', 'zoo', 'shark', 'snake', 'aquarium', 'horse', 'rescue'],
  },
  {
    id: 'wellness', label: 'Mind & Calm', emoji: '🧘', noun: 'Seeker',
    keywords: ['meditation', 'asmr', 'sleep', 'relaxing', 'relax', 'motivation', 'motivational', 'productivity', 'self improvement', 'habits',
      'mindset', 'morning routine', 'mental health', 'therapy', 'anxiety', 'rain sounds', 'ambience', 'ambient', 'minimalism', 'stoic',
      'stoicism', 'discipline', 'journaling', 'calm', 'mindfulness', 'white noise'],
  },
  {
    id: 'kids', label: 'Kids', emoji: '🧸', noun: 'Kid at Heart',
    keywords: ['nursery', 'nursery rhymes', 'kids', 'cartoon', 'cartoons', 'peppa', 'cocomelon', 'toys', 'toy', 'baby shark', 'children',
      'bluey', 'paw patrol', 'sesame street'],
  },
  {
    id: 'podcasts', label: 'Podcasts & Talk', emoji: '🎙️', noun: 'Deep Listener',
    keywords: ['podcast', 'podcasts', 'full episode', 'conversation', 'interview', 'talk show', 'late show', 'tonight show', 'q&a', 'ama',
      'discussion', 'roundtable', 'episode'],
  },
];

export const OTHER_TOPIC: TopicDef = { id: 'other', label: 'Everything else', emoji: '✨', noun: 'Explorer', keywords: [] };

const TOPIC_BY_ID = new Map<TopicId, TopicDef>([...TOPICS, OTHER_TOPIC].map((t) => [t.id, t]));

/** "Code & AI" -> "code & AI" for use mid-sentence. */
export function lowerLabel(label: string): string {
  return label.toLowerCase().replace(/\bai\b/g, 'AI').replace(/\btv\b/g, 'TV');
}

export function topicDef(id: TopicId): TopicDef {
  return TOPIC_BY_ID.get(id) ?? OTHER_TOPIC;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Unicode-aware "word" boundaries so "ai" doesn't match "rain" or "said".
const MATCHERS = TOPICS.map((t) => ({
  id: t.id,
  re: new RegExp(`(?<![\\p{L}\\p{N}])(?:${t.keywords.map(escapeRe).join('|')})(?![\\p{L}\\p{N}])`, 'giu'),
}));

function countMatches(re: RegExp, text: string): number {
  re.lastIndex = 0;
  let n = 0;
  while (re.exec(text)) n++;
  return n;
}

/**
 * Score topics for a channel.
 * @param channelName the channel's display name (weighted ×3)
 * @param titles a sample of titles watched from it
 * @param musicShare fraction of its watches that came from YouTube Music
 */
export function classifyChannel(channelName: string, titles: string[], musicShare = 0): TopicId {
  const name = channelName.toLowerCase();
  if (musicShare >= 0.5 || /\s-\stopic$/.test(name) || /vevo$/.test(name)) return 'music';
  const body = titles.join(' \n ').toLowerCase();
  let best: TopicId = 'other';
  let bestScore = 0;
  const minHits = Math.max(1, Math.round(titles.length * 0.08));
  for (const m of MATCHERS) {
    const score = countMatches(m.re, name) * 3 + countMatches(m.re, body);
    if (score > bestScore) {
      bestScore = score;
      best = m.id;
    }
  }
  // Require a little evidence relative to sample size so one stray keyword doesn't decide.
  return bestScore >= minHits ? best : 'other';
}

/** Classify a single title when there is no channel (e.g. removed videos never are, but just in case). */
export function classifyTitle(title: string): TopicId {
  return classifyChannel('', [title]);
}
