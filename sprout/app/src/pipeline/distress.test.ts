import { describe, expect, it } from 'vitest';
import { DEFAULT_HELPLINES, detectDistress, distressReply } from './distress';

describe('detectDistress', () => {
  it.each([
    ['i want to die', 'urgent', 'self_harm'],
    ["sometimes i don't want to wake up", 'urgent', 'self_harm'],
    ['my uncle hits me when mom is out', 'urgent', 'abuse'],
    ['he told me to keep it a secret from my parents', 'urgent', 'abuse'],
    ['someone in roblox asked for a photo of me', 'urgent', 'online_danger'],
    ["kids at school say i'm stupid and i don't want to go", 'concern', 'bullying'],
    ['nobody likes me', 'concern', 'bullying'],
    ["i'm really scared of the dark", 'concern', 'sad_or_scared'],
  ])('%s -> %s/%s', (text, level, kind) => {
    const d = detectDistress(text);
    expect(d.level).toBe(level);
    expect(d.kind).toBe(kind);
  });

  it.each([
    'why do volcanoes explode?',
    'how do people die in volcanoes',
    'what is a scary movie',
    'can you tell me a story about a sad dragon',
  ])('no distress: %s', (text) => {
    expect(detectDistress(text).level).toBe('none');
  });

  it('urgent replies include helplines and never blame the child', () => {
    const r = distressReply('abuse', '6-8', DEFAULT_HELPLINES.IN);
    expect(r).toContain('1098');
    expect(r).toContain('not your fault');
  });
});
