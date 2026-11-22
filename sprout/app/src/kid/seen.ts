import { firstName } from '../pipeline/redact';
import type { ChildProfile, Redaction, RedactionKind } from '../pipeline/types';

// Helpers for the "What the big brain saw" panel.

export interface Seg {
  text: string;
  /** Present when this piece is private (typed text) or a placeholder (cloud text). */
  kind?: RedactionKind;
}

export const KIND_LABEL: Record<RedactionKind, string> = {
  CHILD: 'your name',
  NAME: 'a name',
  SCHOOL: 'your school',
  PLACE: 'a place',
  ADDRESS: 'an address',
  PHONE: 'a phone number',
  EMAIL: 'an email',
  NUMBER: 'a number',
};

const TOKEN_RE = /\[(CHILD|NAME|SCHOOL|PLACE|ADDRESS|PHONE|EMAIL|NUMBER)(?:_\d+)?\]/g;

/** The text the cloud saw, split so placeholders like [CHILD] can be drawn as small pills. */
export function splitSanitized(sanitized: string): Seg[] {
  const out: Seg[] = [];
  let last = 0;
  for (const m of sanitized.matchAll(TOKEN_RE)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ text: sanitized.slice(last, at) });
    out.push({ text: m[0], kind: m[1] as RedactionKind });
    last = at + m[0].length;
  }
  if (last < sanitized.length) out.push({ text: sanitized.slice(last) });
  return out;
}

/** What the child typed, with the private parts marked. */
export function highlightQuestion(question: string, redactions: Redaction[], profile: ChildProfile): Seg[] {
  const terms: { text: string; kind: RedactionKind }[] = [];
  for (const r of redactions) {
    terms.push({ text: r.original, kind: r.kind });
    if (r.kind === 'CHILD') {
      terms.push({ text: firstName(profile.childName), kind: 'CHILD' });
      for (const n of profile.nicknames) terms.push({ text: n, kind: 'CHILD' });
    }
  }
  terms.sort((a, b) => b.text.length - a.text.length);

  const lower = question.toLowerCase();
  const marks: (RedactionKind | undefined)[] = new Array(question.length).fill(undefined);
  for (const t of terms) {
    const needle = t.text.trim().toLowerCase();
    if (needle.length < 2) continue;
    let from = 0;
    for (;;) {
      const at = lower.indexOf(needle, from);
      if (at < 0) break;
      const end = at + needle.length;
      if (marks.slice(at, end).every((m) => m === undefined)) marks.fill(t.kind, at, end);
      from = end;
    }
  }

  const out: Seg[] = [];
  let start = 0;
  for (let i = 1; i <= question.length; i++) {
    if (i === question.length || marks[i] !== marks[start]) {
      out.push({ text: question.slice(start, i), kind: marks[start] });
      start = i;
    }
  }
  return out;
}

/** The device answer for a queued turn carries a note for the pipeline; the kid UI shows its own tag instead. */
export const stripQueuedNote = (answer: string) =>
  answer.replace(/\n\n\(I'll ask the big brain[^)]*\)\s*$/, '');
