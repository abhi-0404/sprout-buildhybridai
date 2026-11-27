import { describe, expect, it } from 'vitest';
import { speechChunks } from './voiceText';

describe('speechChunks', () => {
  it('splits sentences and drops emoji', () => {
    expect(speechChunks('The sky is blue because of sunlight. 🌞 It scatters! Neat, right?')).toEqual([
      'The sky is blue because of sunlight.',
      'It scatters! Neat, right?',
    ]);
  });

  it('merges tiny fragments into the next chunk', () => {
    expect(speechChunks('Yes! Bees make honey from flower nectar.')).toEqual(['Yes! Bees make honey from flower nectar.']);
  });

  it('keeps every chunk under the limit', () => {
    const long = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ') + '.';
    const chunks = speechChunks(long, 80);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(80);
    expect(chunks.join(' ')).toBe(long);
  });

  it('returns nothing for empty or emoji-only text', () => {
    expect(speechChunks('')).toEqual([]);
    expect(speechChunks('🌈 ✨')).toEqual([]);
  });
});
