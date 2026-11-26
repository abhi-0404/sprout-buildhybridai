import { describe, expect, it } from 'vitest';
import { highlightQuestion, splitSanitized, stripQueuedNote } from './seen';
import { DEMO_PROFILE as P } from '../pipeline/testing';
import type { Redaction } from '../pipeline/types';

describe('splitSanitized', () => {
  it('splits placeholders into pills', () => {
    expect(splitSanitized("I'm [CHILD] from [SCHOOL_1].")).toEqual([
      { text: "I'm " }, { text: '[CHILD]', kind: 'CHILD' }, { text: ' from ' }, { text: '[SCHOOL_1]', kind: 'SCHOOL' }, { text: '.' },
    ]);
  });
  it('leaves plain text and unknown brackets alone', () => {
    expect(splitSanitized('why [maybe] not')).toEqual([{ text: 'why [maybe] not' }]);
    expect(splitSanitized('')).toEqual([]);
  });
});

describe('highlightQuestion', () => {
  const school: Redaction = { token: '[SCHOOL_1]', kind: 'SCHOOL', original: 'Green Park Public School', by: 'profile' };
  const child: Redaction = { token: '[CHILD]', kind: 'CHILD', original: 'Aarav', by: 'profile' };

  it('marks private parts case-insensitively and keeps the text intact', () => {
    const q = 'i am aarav from green park public school';
    const segs = highlightQuestion(q, [child, school], P);
    expect(segs.map((s) => s.text).join('')).toBe(q);
    expect(segs.filter((s) => s.kind).map((s) => [s.text, s.kind])).toEqual([['aarav', 'CHILD'], ['green park public school', 'SCHOOL']]);
  });

  it('also marks nicknames when the child was redacted', () => {
    const segs = highlightQuestion('Avi here', [child], P);
    expect(segs[0]).toEqual({ text: 'Avi', kind: 'CHILD' });
  });

  it('returns one plain segment when nothing is private', () => {
    expect(highlightQuestion('why is the sky blue', [], P)).toEqual([{ text: 'why is the sky blue', kind: undefined }]);
  });
});

describe('stripQueuedNote', () => {
  it('removes the trailing pipeline note only', () => {
    expect(stripQueuedNote("Short answer.\n\n(I'll ask the big brain when we're back online.)")).toBe('Short answer.');
    expect(stripQueuedNote('Plain answer (with brackets).')).toBe('Plain answer (with brackets).');
  });
});
