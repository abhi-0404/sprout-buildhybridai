import { describe, expect, it } from 'vitest';
import { extractJson, parseGuard, parseReferee } from './json';

describe('extractJson', () => {
  it('reads JSON wrapped in prose and code fences', () => {
    expect(extractJson('Sure!\n```json\n{"a": 1}\n```\nDone')).toEqual({ a: 1 });
  });
  it('throws when there is no object', () => {
    expect(() => extractJson('no json here')).toThrow();
    expect(() => extractJson('} {')).toThrow();
  });
});

describe('parseGuard', () => {
  it('keeps valid fields', () => {
    const g = parseGuard('{"category":"distress","needsBigBrain":true,"topic":"science","names":["Riya","Kapoor"]}');
    expect(g).toEqual({ category: 'distress', needsBigBrain: true, topic: 'science', names: ['Riya', 'Kapoor'] });
  });
  it('falls back for unknown values and drops junk names', () => {
    const g = parseGuard('{"category":"weird","needsBigBrain":"yes","topic":"cooking","names":["A", 3, "  ", "Bo"]}');
    expect(g.category).toBe('ok');
    expect(g.needsBigBrain).toBe(false);
    expect(g.topic).toBe('other');
    expect(g.names).toEqual(['Bo']);
  });
  it('caps names at 20', () => {
    const names = Array.from({ length: 30 }, (_, i) => `Name${i}`);
    expect(parseGuard(JSON.stringify({ names })).names).toHaveLength(20);
  });
});

describe('parseReferee', () => {
  it('reads pass and block', () => {
    expect(parseReferee('{"verdict":"pass","reason":"fine"}')).toEqual({ verdict: 'pass', reason: 'fine' });
    expect(parseReferee('{"verdict":"block"}')).toEqual({ verdict: 'block', reason: '' });
  });
  it('fails toward the safer rewrite on unknown output', () => {
    expect(parseReferee('{"verdict":"maybe","reason":7}')).toEqual({ verdict: 'simplify', reason: '' });
  });
});
