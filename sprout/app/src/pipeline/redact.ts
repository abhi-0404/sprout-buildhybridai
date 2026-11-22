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
  for (const p of PATTERNS) out = applyPattern(out, p, book);
  for (const raw of extraNames) {
    const n = raw.trim();
    if (n.length < 2 || n.startsWith('[')) continue;
    out = out.replace(wordRe(n), (m) => book.tokenFor(m, 'NAME', 'model'));
  }
  return { text: out, redactions: book.redactions };
}

/** Put real values back into text shown locally (e.g. "Great question, [CHILD]!"). */
export function restore(text: string, redactions: Redaction[], profile?: ChildProfile): string {
  let out = text;
  for (const r of redactions) {
    const value = r.kind === 'CHILD' && profile ? firstName(profile.childName) : r.original;
    out = out.split(r.token).join(value);
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
