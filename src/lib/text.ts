/** Tokenising + stop-word filtering for "signature words". */

const STOP = new Set(
  (
    // English function words
    'a about above after again against all am an and any are aren as at be because been before being below between both but by can cannot ' +
    'could did do does doing don down during each few for from further had has have having he her here hers herself him himself his how i ' +
    'if in into is isn it its itself just let me more most my myself no nor not now of off on once only or other our ours ourselves out ' +
    'over own same she should so some such than that the their theirs them themselves then there these they this those through to too under ' +
    'until up very was we were what when where which while who whom why will with would you your yours yourself yourselves ever never every ' +
    'really still also much many get got gets getting go goes going went make makes made thing things way ways one two three first last ' +
    'like than vs via per into onto upon yet ' +
    // Generic YouTube title filler
    'video videos official full new best top part ep episode episodes live hd 4k 1080p 8k ft feat featuring watched watch channel subscribe ' +
    'shorts short youtube music audio lyrics lyric reaction react reacts reacting trailer ultimate guide tips tricks review reviews complete ' +
    'everything nobody everyone someone something day days week weeks year years time times minute minutes hour hours ' +
    'tried trying try made making need want know think look looking see seen tell told talk talking said says says ' +
    'seconds second work works working people guy guys stuff explained explain month months next easy beginners beginner challenge visually built build simple simply actually quick ' +
    'better good great bad worst biggest big small little real really actually finally insane crazy amazing epic awesome ' +
    'here why how what who where when which removed private untitled https http www com remix version edit ' +
    // A few common words in other Takeout languages
    'de la el los las en un una y que del por con para le les des et du au il est pas der die das und ist mit von zu den nicht im da do dos ' +
    'em uma com não o os as se na no di che il per'
  ).split(/\s+/),
);

/**
 * Lower-cased word tokens (unicode letters/digits), min length 3, stop words removed.
 * If `forms` is given, it records a nice display spelling for each token
 * (preferring mixed case like "LLMs" or "iPhone" over ALL CAPS shouting).
 */
export function tokenize(title: string, forms?: Map<string, string>): string[] {
  const out: string[] = [];
  const re = /[\p{L}\p{N}][\p{L}\p{N}'’+#.-]*/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title))) {
    const original = m[0].replace(/['’]s$/, '').replace(/[.'’-]+$/, '');
    let w = original.toLowerCase();
    if (w.length < 3 || w.length > 24) continue;
    if (/^\d+$/.test(w)) continue; // pure numbers / years
    if (/^\d/.test(w) && !/^\d+d$/.test(w)) continue; // "100x", "2nd"... keep "3d"
    if (STOP.has(w)) continue;
    if (forms) {
      const prev = forms.get(w);
      const shouty = (s: string) => s.length > 4 && s === s.toUpperCase();
      if (prev === undefined || (shouty(prev) && !shouty(original))) forms.set(w, original);
    }
    out.push(w);
  }
  return out;
}

/** Display spelling for a token, using a recorded original form when it carries meaningful casing. */
export function displayWord(w: string, forms?: Map<string, string>): string {
  const f = forms?.get(w);
  if (f && /\p{Lu}/u.test(f.slice(1)) && !(f.length > 4 && f === f.toUpperCase())) return f; // LLMs, iPhone, GTA

  if (w.length <= 3 && /^[a-z]+$/.test(w) && !['cat', 'dog', 'art', 'car', 'gym', 'pop', 'run', 'rap', 'tea', 'sea', 'sun'].includes(w)) {
    return w.toUpperCase(); // gta, nba, ufc, asmr-ish acronyms read better upper-cased
  }
  return w.charAt(0).toUpperCase() + w.slice(1);
}

/** Simple non-crypto string hash (FNV-1a) for stable seeds. */
export function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
