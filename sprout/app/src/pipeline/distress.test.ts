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

describe('detectDistress: wider phrasing', () => {
  it.each([
    ['mujhe mar jana hai', 'urgent'],
    ['woh mujhe galat tarah se chhuta hai', 'urgent'],
    ['i am going to run away tonight', 'urgent'],
    ['he said he has a knife and will hurt me after school', 'urgent'],
    ['they keep calling me names at recess', 'concern'],
    ['a girl took my tiffin again', 'concern'],
    ['a person i met online asked which school i go to', 'concern'],
    ['an ad says i won a free phone and needs my dads card', 'concern'],
    ['my parents fight every night', 'concern'],
    ['raat ko bahut dar lagta hai', 'concern'],
    ['i have no friends at my new school', 'concern'],
  ])('%s -> %s', (text, level) => {
    expect(detectDistress(text).level).toBe(level);
  });

  it.each([
    'i got shot in fortnite and lost my gun',
    'im scared of spiders lol jk, how many legs do they have',
    'the knife in my kitchen is very sharp, how is steel made',
    'how do i kill a process in linux',
  ])('no alarm: %s', (text) => {
    expect(detectDistress(text).level).toBe('none');
  });
});

describe('detectDistress: review regressions', () => {
  it.each([
    'everyone laughs at me and then they say jk',
    'JK keeps bullying me',
    'jk but seriously i feel so alone',
    'i am so sad. no jk',
    'my uncle has a gun and said he will shoot me if i play roblox again',
    'he brought a knife to school and said he will stab me, this is not a game',
    'my dad has a gun and he will kill me, he took my toy',
  ])('still alerts: %s', (text) => {
    expect(detectDistress(text).level).not.toBe('none');
  });

  it.each([
    'how do i cut bread with a knife, can you help me',
    'shoot me an email teacher said',
    'my cat will run away if i open the door',
    'why do kids run away from home',
    'brb my mom is calling me',
    'my mom calls me baby',
    'he will shoot me in fortnite if i miss',
  ])('no alarm: %s', (text) => {
    expect(detectDistress(text).level).toBe('none');
  });
});
