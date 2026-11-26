import type { ChildProfile, Redaction, RedactionKind, RedactionResult } from './types';

// Deterministic identity redaction. This layer runs BEFORE any model sees the text, so the
// privacy guarantee for known identifiers does not depend on model quality.

const SCHOOL_SUFFIXES =
  /\s+(?:public\s+school|international\s+school|high\s+school|primary\s+school|elementary(?:\s+school)?|middle\s+school|school|academy|vidyalaya|convent|college)$/i;

const COMMON_ACRONYMS = new Set(['GPS', 'USA', 'NASA', 'DNA', 'TV', 'PE', 'ABC', 'PTA', 'CEO', 'ATM', 'SOS', 'FAQ', 'UFO']);
const HONORIFICS = /^(?:mr|mrs|ms|miss|dr|sir|madam|aunty|auntie|uncle)\.?$/i;

// Capitalised words that follow "I'm" / "this is" but are not names.
const NOT_NAMES = new Set([
  'Indian', 'American', 'British', 'English', 'Hindi', 'Spanish', 'French', 'Chinese', 'Japanese', 'Muslim', 'Hindu',
  'Christian', 'Sikh', 'Jewish', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November',
  'December', 'Sprout', 'Okay', 'Ok', 'Sorry', 'Not', 'So', 'Very', 'Really', 'Just', 'In', 'At', 'From', 'The',
  'Happy', 'Sad', 'Bored', 'Hungry', 'Tired', 'Scared', 'Good', 'Fine', 'Back', 'Here', 'Done', 'Ready', 'Grade',
  'Class', 'Year', 'God', 'Batman', 'Spiderman', 'Superman',
]);

const MONTHS = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
const DATE = `(?:\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTHS}(?:,?\\s+\\d{4})?|${MONTHS}\\s+\\d{1,2}(?:st|nd|rd|th)?(?:,?\\s+\\d{4})?|\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4})`;

const escapeRe =(s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Everyday words that follow cues like "my friend ..." or come before "sir" but are not names.
// Kids type names in lowercase, so lowercase cues are only trusted when the word is not one of these.
const COMMON_WORDS = new Set((
  'a an the and or but so if then than that this these those there here is are was were be been being am do does did done ' +
  'has have had having get gets got gave give gives go goes going went gone come comes came make makes made say says said ' +
  'tell tells told ask asks asked want wants wanted like likes liked love loves loved know knows knew think thinks thought ' +
  'see sees saw look looks looked play plays played eat eats ate live lives lived work works worked call calls called ' +
  'send sends sent take takes took keep keeps kept let lets help helps helped need needs try tries tried use uses used ' +
  'can could will would should shall may might must not no yes yeah ok okay hi hello hey bye thanks thank please sorry ' +
  'i me my mine you your yours he him his she her hers it its we us our they them their who whom whose what which where when why how ' +
  'all any some every each both few many much more most other another such only own same too very just also still even ' +
  'again ever never always often sometimes today tomorrow yesterday now later soon before after during while because ' +
  'about above across at by for from in into of off on onto out over through to under up with without near ' +
  'one two three four five six seven eight nine ten first last next new old good bad big small little best better ' +
  'friend friends teacher brother sister cousin mom dad mum mummy papa uncle aunty aunt sir madam school class home ' +
  'boy girl kid kids man woman lady guy people person everyone someone somebody nobody anyone thing things stuff ' +
  'really actually maybe sure well right wrong true false nice cool funny mean happy sad angry scared tired bored ' +
  'game games homework test exam lunch bus park street road day night morning evening week year time ' +
  // Verbs that often follow "my brother ...", "my friend ...".
  'hit hits fell fall falls broke breaks cried cries cry ran runs run kicks bit bites fights fought won wins lost loses ' +
  'drew draws sings sang dances reads read wrote writes jumped jumps sleeps slept laughs laughs found finds stole steals ' +
  'teaches taught shouts yells pushes pulls bought buys brought brings eats drinks drank swims swam walks talks talked ' +
  'cooks cooked sits sat stands stood shows showed hates hated misses missed wears wore lets borrowed borrows ' +
  // Words before "sir"/"ji" that are not names, famous people and places kids ask about, and words one letter from common names.
  'dear maths math science english hindi marathi sanskrit social computer art music pt dance sports class gandhi modi bapu ' +
  'nehru jallianwala angle brain grade page sail parts'
).split(/\s+/));

const titleCase = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
const looksLikeName = (w: string) =>
  /^\p{L}[\p{L}-]{2,30}$/u.test(w) && !COMMON_WORDS.has(w.toLowerCase()) && !NOT_NAMES.has(titleCase(w)) && !/(?:ing|ed)$/i.test(w);

/** Words next to a misspelled short name that make it a name ("ryia and i", "mrs kapur", "kabeer ne"). */
const NAME_CONTEXT = new Set(
  'and with aur ne ko ka ki ke se mrs mr ms miss dr sir ji didi bhaiya madam friend bestie named called told said says calls'.split(' '),
);

/** Folds kid spellings together: lowercase, repeated letters collapsed ("avii" -> "avi", "kapoor" -> "kapor"). */
const fold = (w: string) => w.toLowerCase().replace(/(\p{L})\1+/gu, '$1');

/** Damerau-Levenshtein distance with adjacent swaps, capped at 2. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return Math.min(d[a.length][b.length], 2);
}

/** A typed word that is a likely misspelling of a profile word ("ryia" for "Riya", "kabeer" for "Kabir"). */
function closeSpelling(typed: string, known: string): boolean {
  const t = fold(typed);
  const k = fold(known);
  if (t === k) return k.length >= 3;
  // Kids misspell the middle of a name, rarely its first letter ("vapor" is not "Kapoor").
  if (COMMON_WORDS.has(typed.toLowerCase()) || t[0] !== k[0]) return false;
  // Four letters: only a swap of two letters ("ryia"), since one changed letter often makes a real word.
  if (k.length === 4) return t.length === 4 && editDistance(t, k) === 1 && [...t].sort().join('') === [...k].sort().join('');
  if (k.length >= 5) return editDistance(t, k) <= 1;
  return false;
}

/** Matches a term only as a whole word (letters/digits on either side break the match). */
const wordRe = (term: string) =>
  new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`, 'giu');

interface Term {
  value: string;
  kind: RedactionKind;
}

export function profileTerms(p: ChildProfile): Term[] {
  const out: Term[] = [];
  const add = (v: string | undefined, kind: RedactionKind) => {
    const t = (v ?? '').trim();
    if (t.length >= 2) out.push({ value: t, kind });
  };
  add(p.childName, 'CHILD');
  // First name alone too ("Aarav Sharma" -> also "Aarav", "Sharma").
  for (const part of (p.childName ?? '').trim().split(/\s+/)) add(part, 'CHILD');
  p.nicknames.forEach((n) => add(n, 'CHILD'));
  add(p.school, 'SCHOOL');
  const shortSchool = (p.school ?? '').trim().replace(SCHOOL_SUFFIXES, '');
  if (shortSchool !== (p.school ?? '').trim()) add(shortSchool, 'SCHOOL');
  // Kids shorten school names ("Green Park Public School" -> "Green Park School").
  if (shortSchool.length >= 2) {
    for (const suffix of ['School', 'High School', 'Public School', 'Academy', 'Primary', 'Elementary']) {
      add(`${shortSchool} ${suffix}`, 'SCHOOL');
    }
  }
  // School initials ("Green Park Public School" -> "GPPS"), unless they spell a common acronym.
  const initials = (p.school ?? '').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join('').toUpperCase();
  if (initials.length >= 3 && !COMMON_ACRONYMS.has(initials)) add(initials, 'SCHOOL');
  add(p.city, 'PLACE');
  for (const place of p.places) {
    add(place, 'PLACE');
    // "Lane 7" is also written "lane no. 7", "lane number 7", "lane #7".
    const m = place.trim().match(/^(.*\D)\s+(\d+[A-Za-z]?)$/);
    if (m) for (const sep of ['no.', 'no', 'number', '#', 'num']) add(`${m[1]} ${sep} ${m[2]}`, 'PLACE');
  }
  for (const n of p.otherNames) {
    add(n, 'NAME');
    for (const part of n.trim().split(/\s+/)) {
      if (part.length >= 3 && !HONORIFICS.test(part)) add(part, 'NAME');
    }
  }
  // Longest first so "Green Park School" wins over "Green Park".
  const seen = new Set<string>();
  return out
    .filter((t) => {
      const k = t.value.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort((a, b) => b.value.length - a.value.length);
}

interface Pattern {
  kind: RedactionKind;
  re: RegExp;
  /** Capture group holding the identifier (0 = whole match). */
  group?: number;
  /** Only redact when the captured word looks like a name or a handle (not an everyday word). */
  check?: boolean;
}

// Run before profile terms so a surname inside an email or a digit run is not split first.
const EARLY_PATTERNS: Pattern[] = [
  { kind: 'EMAIL', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
  // US style with brackets: (555) 123-4567
  { kind: 'PHONE', re: /\(\d{3}\)\s*\d{3}[\s.-]?\d{4}\b/g },
  // 8+ digits with optional spaces/dashes/dots/plus: phone numbers (US and India).
  { kind: 'PHONE', re: /(?<!\w)\+?\d(?:[\s.-]?\d){7,13}(?!\w)/g },
];

const PATTERNS: Pattern[] = [
  {
    kind: 'ADDRESS',
    re: /\b\d{1,5}[A-Za-z]?,?\s+(?:[A-Za-z][\w'-]*\s+){0,3}(?:road|rd|street|st|avenue|ave|lane|ln|drive|dr|nagar|marg|colony|sector|block|apartments?|apt|boulevard|blvd|way|court|ct|place|pl)\b\.?/gi,
  },
  // "I live at/on/in/near X", "my address is X", "my house is on X" -> hide X (up to 6 words, stops at punctuation).
  {
    kind: 'ADDRESS',
    re: /\b(?:i\s+live\s+(?:at|on|near)|my\s+address\s+is|my\s+house\s+is\s+(?:at|on|near))\s+([^.,!?\n]{2,60})/gi,
    group: 1,
  },
  // Postal codes only when announced ("pin code 110001", "zip 94043").
  { kind: 'NUMBER', re: /\b(?:pin\s*code|pincode|zip(?:\s*code)?|postal\s*code)\s*(?:is\s*)?(\d{5,6}(?:-\d{4})?)/gi, group: 1 },
  // "my name is X" / "call me X" for names not in the profile (capitalised word).
  { kind: 'NAME', re: /\b(?:[Mm]y\s+name\s+is|[Cc]all\s+me)\s+([A-Z][\p{L}'-]{1,30})/gu, group: 1 },
  // Birthdays / dates of birth (only when announced, so history dates are kept).
  {
    kind: 'NUMBER',
    re: new RegExp(`\\b(?:born\\s+(?:on\\s+)?|birth\\s*day\\s+(?:is\\s+(?:on\\s+)?|on\\s+)|b'?day\\s+(?:is\\s+)?|dob\\s*(?:is\\s*|:\\s*)?|date\\s+of\\s+birth\\s*(?:is\\s*|:\\s*)?)(${DATE})`, 'gi'),
    group: 1,
  },
  // Self-introductions and friend names not in the profile, written with a capital letter:
  // "this is Meera speaking", "I'm Meera", "my best friend is Tanvi", "Tanvi is my friend".
  {
    kind: 'NAME',
    re: /\b(?:[Tt]his\s+is|[Ii]'?m|[Ii]\s+am|[Ii]t'?s|[Mm]y\s+(?:best\s+)?(?:friend|buddy|bestie|sister|brother|cousin|teacher|crush)(?:'?s\s+name)?\s+is)\s+([A-Z][\p{Ll}'-]{2,30})/gu,
    group: 1,
  },
  { kind: 'NAME', re: /\b([A-Z][\p{Ll}'-]{2,30})\s+is\s+my\s+(?:best\s+)?(?:friend|buddy|bestie|sister|brother|cousin|teacher|neighbou?r|crush)\b/gu, group: 1 },
  // "my friend X", "my teacher Mrs X", "my sister X" (capitalised name after relation word).
  {
    kind: 'NAME',
    re: /\b[Mm]y\s+(?:best\s+|little\s+|big\s+|older\s+|younger\s+|baby\s+)?(?:friend|friends|teacher|sister|brother|cousin|neighbou?r|coach|mom|mum|dad|aunt|uncle|grandma|grandpa|nani|dadi|nana|dada)\s+((?:(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+)?[A-Z][\p{L}'-]{1,30})/gu,
    group: 1,
  },
  // "her name is Savitri", "his name is Rohan"
  { kind: 'NAME', re: /\b(?:[Hh]is|[Hh]er|[Tt]heir)\s+name\s+is\s+([A-Z][\p{Ll}'-]{2,30})/gu, group: 1 },
  // "my friends are Jake and Emma": the whole list becomes one token.
  {
    kind: 'NAME',
    re: /\b[Mm]y\s+(?:best\s+)?friends\s+are\s+([A-Z][\p{Ll}'-]+(?:,?\s+(?:and\s+)?[A-Z][\p{Ll}'-]+)*)/gu,
    group: 1,
  },
  // A title before a name: "Coach Daniels", "Mr Joshi", "Aunty Neha".
  { kind: 'NAME', re: /\b(?:Coach|Mr|Mrs|Ms|Miss|Dr|Aunty|Auntie|Uncle|Sir|Madam)\.?\s+([A-Z][\p{Ll}'-]{2,30})/gu, group: 1 },
  // Lowercase versions of the strong name cues (kids rarely capitalise). `check` skips everyday words.
  // (?<![\p{L}\p{N}]) is used instead of \b, which is ASCII-only even with the u flag.
  {
    kind: 'NAME',
    re: /(?<![\p{L}\p{N}])(?:name\s+is|(?:boy|girl|kid|friend|teacher|man|lady|guy|someone|somebody|person|cousin|brother|sister|tutor|coach)\s+named)\s+((?:(?:mr|mrs|ms|miss|dr)\.?\s+)?\p{L}[\p{L}-]{2,30})(?![\p{L}'])/giu,
    group: 1,
    check: true,
  },
  {
    kind: 'NAME',
    re: /(?<![\p{L}\p{N}])(?:teacher|friend|boy|girl|kid|man|lady|tutor|coach|brother|sister|cousin|neighbou?r)\s+(?:is\s+)?called\s+((?:(?:mr|mrs|ms|miss|dr)\.?\s+)?\p{L}[\p{L}-]{2,30})(?![\p{L}'])/giu,
    group: 1,
    check: true,
  },
  {
    // "my friend zoya ..." but not "my teacher scolds me" or "my friend doesn't".
    kind: 'NAME',
    re: /(?<![\p{L}\p{N}])my\s+(?:best\s+|little\s+|big\s+|older\s+|younger\s+|baby\s+)?(?:friend|teacher|sister|brother|cousin|neighbou?r|coach|tutor|bestie|crush)\s+(\p{L}[\p{L}-]{2,30})(?![\p{L}'])(?!(?<=s)\s+(?:me|my|us|him|her|them|the|a|an|to|at|with|that|it)(?![\p{L}]))/giu,
    group: 1,
    check: true,
  },
  { kind: 'NAME', re: /(?<![\p{L}\p{N}])(?:mrs|ms|miss|mr|dr|coach)\.?\s+(\p{L}[\p{L}-]{2,30})(?![\p{L}'])/giu, group: 1, check: true },
  { kind: 'NAME', re: /(?<![\p{L}\p{N}])(\p{L}[\p{L}-]{2,30})\s+(?:sir|madam|ma'?am|didi|bhaiya|bhaiyya|ji)(?![\p{L}])/giu, group: 1, check: true },
  // Game and social handles: "my roblox name is CoolAvi99", "my insta id: avi_rocks".
  {
    kind: 'NAME',
    re: /(?<![\p{L}\p{N}])(?:roblox|minecraft|fortnite|free\s*fire|pubg|bgmi|insta(?:gram)?|discord|snap(?:chat)?|tiktok|youtube|game|gaming|gamer|user|player)\s*(?:name|id|username|handle|tag)\s*(?:is(?![\p{L}'])|:)?\s*([\p{L}\p{N}_.]{3,30})(?![\p{L}\p{N}'])/giu,
    group: 1,
    check: true,
  },
  // Flat, house and plot numbers ("flat 402", "house no 12b"; not "flat 2d shapes"); "i live in ..." with a number.
  {
    kind: 'ADDRESS',
    re: /\b(?:flat|house|h\.?\s*no|plot|apartment|apt|tower|wing|building|bldg)\s*(?:(?:no\.?|number|#)\s*\d{1,5}[a-z]?\b|\d{2,5}(?![\p{L}\p{N}]))/giu,
  },
  { kind: 'ADDRESS', re: /\bi\s+live\s+in\s+((?=[^.,!?\n]*\d)[^.,!?\n]{2,60})/gi, group: 1 },
  // Indian localities: "kalyani nagar". Housing societies only when the child is talking about home.
  {
    kind: 'PLACE',
    re: /(?<![\p{L}\p{N}])(\p{L}{3,20}\s+(?:nagar|vihar|enclave|puram|peth|wadi|ganj|bagh|chowk|residency))(?![\p{L}])/giu,
    group: 1,
    check: true,
  },
  {
    kind: 'PLACE',
    re: /\b(?:live|living|stay|staying|house|flat|address|home)\b[^.!?\n]{0,40}?(?<![\p{L}\p{N}])(\p{L}{3,20}\s+(?:heights|towers|villa|society|apartments))(?![\p{L}])/giu,
    group: 1,
    check: true,
  },
  // A pincode right after an address or place token: "[PLACE_1] 411045".
  { kind: 'NUMBER', re: /(?<=\]\s*,?\s*)[1-9]\d{5}\b/g },
  // Numbers that identify the child: roll and admission numbers, bus and route numbers.
  { kind: 'NUMBER', re: /\b(?:roll|admission|registration|enrol(?:l)?ment|bus|van|route)\s*(?:no\.?|number|num|#)?\s*(?:is\s+)?(\d{1,6})\b/gi, group: 1 },
];

class TokenBook {
  private counters = new Map<RedactionKind, number>();
  private byValue = new Map<string, Redaction>();
  readonly redactions: Redaction[] = [];

  tokenFor(original: string, kind: RedactionKind, by: Redaction['by']): string {
    const key = `${kind}:${original.toLowerCase()}`;
    const existing = this.byValue.get(key);
    if (existing) return existing.token;
    let token: string;
    if (kind === 'CHILD') {
      token = '[CHILD]';
    } else {
      const n = (this.counters.get(kind) ?? 0) + 1;
      this.counters.set(kind, n);
      token = `[${kind}_${n}]`;
    }
    const r: Redaction = { token, kind, original, by };
    this.byValue.set(key, r);
    this.redactions.push(r);
    return token;
  }
}

/** Replace a regex match (or one capture group of it) with a token. */
function applyPattern(text: string, p: Pattern, book: TokenBook): string {
  return text.replace(p.re, (...args) => {
    const match = args[0] as string;
    if (!p.group) return book.tokenFor(match.trim(), p.kind, 'pattern');
    const grp = args[p.group] as string | undefined;
    if (!grp) return match;
    const value = grp.trim();
    if (value.startsWith('[') || value.length < 2) return match; // already a token
    if (p.kind === 'NAME' && NOT_NAMES.has(value)) return match;
    if (p.check) {
      const head = value.split(/\s+/).find((w) => !/^(?:mr|mrs|ms|miss|dr)\.?$/i.test(w)) ?? '';
      if (!looksLikeName(head) && !/[\d_.]/.test(head)) return match;
    }
    return match.replace(grp, book.tokenFor(value, p.kind, 'pattern'));
  });
}

/**
 * Redact known identifiers (from the parent's profile) and common identifier patterns.
 * `extraNames` are names an on-device model found; they are redacted the same way.
 */
export function redact(text: string, profile: ChildProfile, extraNames: string[] = []): RedactionResult {
  const book = new TokenBook();
  let out = text;
  for (const p of EARLY_PATTERNS) out = applyPattern(out, p, book);
  for (const t of profileTerms(profile)) {
    out = out.replace(wordRe(t.value), (m) => book.tokenFor(t.kind === 'CHILD' ? profile.childName : m, t.kind, 'profile'));
  }
  // Patterns first, so a misspelled street name is still swallowed whole by the address pattern.
  for (const p of PATTERNS) out = applyPattern(out, p, book);
  out = redactCloseSpellings(out, profile, book);
  out = redactHandles(out, profile, book);
  for (const raw of extraNames) {
    const n = raw.trim();
    if (n.length < 2 || n.startsWith('[')) continue;
    out = out.replace(wordRe(n), (m) => book.tokenFor(m, 'NAME', 'model'));
  }
  return { text: out, redactions: book.redactions };
}

/** Misspelled profile names and places ("ryia", "kabeer", "mrs kapur", "koregoan park"). */
function redactCloseSpellings(text: string, profile: ChildProfile, book: TokenBook): string {
  const words = [...text.matchAll(/\p{L}[\p{L}']*/gu)]
    .map((m) => ({ w: m[0], at: m.index ?? 0 }))
    .filter((x) => text[x.at - 1] !== '[' && !/^[A-Z]+$/.test(x.w)); // skip tokens like [CHILD]
  const hits: { at: number; end: number; kind: RedactionKind }[] = [];
  for (const t of profileTerms(profile)) {
    const parts = t.value.split(/\s+/).filter((x) => !HONORIFICS.test(x));
    if (!parts.length || !/^\p{L}+$/u.test(parts.join(''))) continue;
    // Short single names ("Riya", "Kabir") collide with real words ("brain", "grade"), so a misspelling of
    // one only counts when it is capitalised or sits next to a name-like word ("ryia and i", "mrs kapur").
    const strong = parts.length > 1 || fold(parts[0]).length >= 6;
    for (let i = 0; i + parts.length <= words.length; i++) {
      const win = words.slice(i, i + parts.length);
      if (!win.every((x, j) => closeSpelling(x.w, parts[j]))) continue;
      const exact = win.every((x, j) => fold(x.w) === fold(parts[j]));
      if (!exact && !strong) {
        const near = [words[i - 1]?.w, words[i + 1]?.w].map((w) => (w ?? '').toLowerCase());
        if (!/^\p{Lu}/u.test(win[0].w) && !near.some((w) => NAME_CONTEXT.has(w))) continue;
      }
      const at = win[0].at;
      const end = win[win.length - 1].at + win[win.length - 1].w.length;
      if (!hits.some((h) => at < h.end && end > h.at)) hits.push({ at, end, kind: t.kind });
    }
  }
  hits.sort((a, b) => b.at - a.at);
  let out = text;
  for (const h of hits) {
    const original = out.slice(h.at, h.end);
    const token = book.tokenFor(h.kind === 'CHILD' ? profile.childName : original, h.kind, 'profile');
    out = out.slice(0, h.at) + token + out.slice(h.end);
  }
  return out;
}

/** Usernames that contain the child's or a friend's name ("CoolAvi99", "aarav_plays07"). */
function redactHandles(text: string, profile: ChildProfile, book: TokenBook): string {
  const names = profileTerms(profile)
    .filter((t) => (t.kind === 'CHILD' || t.kind === 'NAME') && !/\s/.test(t.value) && t.value.length >= 3)
    .map((t) => t.value.toLowerCase());
  // Linear scan: a run of letters, digits and underscores, with single dots inside.
  return text.replace(/(?<![\p{L}\p{N}_.[])[\p{L}\p{N}_](?:[\p{L}\p{N}_]|\.(?=[\p{L}\p{N}_]))*/gu, (h) => {
    if (!/\d|_/.test(h) || !/\p{L}/u.test(h)) return h;
    const lower = h.toLowerCase();
    return names.some((n) => lower.includes(n)) ? book.tokenFor(h, 'NAME', 'pattern') : h;
  });
}

/** Put real values back into text shown locally (e.g. "Great question, [CHILD]!"). */
export function restore(text: string, redactions: Redaction[], profile?: ChildProfile): string {
  let out = text;
  // A later redaction can contain an earlier token ("12 [PLACE_1] Road"), so repeat until nothing changes.
  for (let pass = 0; pass < 4; pass++) {
    const before = out;
    for (const r of redactions) {
      const value = r.kind === 'CHILD' && profile ? firstName(profile.childName) : r.original;
      out = out.split(r.token).join(value);
    }
    if (out === before) break;
  }
  return out;
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

/**
 * Hard gate before ANY cloud call: returns the known identifiers still present in `text`.
 * The pipeline refuses to send text to the cloud if this is non-empty.
 */
export function findKnownIdentifiers(text: string, profile: ChildProfile): string[] {
  return profileTerms(profile)
    .filter((t) => wordRe(t.value).test(text))
    .map((t) => t.value);
}
