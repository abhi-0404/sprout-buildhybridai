import { describe, expect, it } from 'vitest';
import { detectDistress } from './distress';
import { DEFAULT_POLICY, ask, normalizeText, resolveQueued, type Deps } from './sprout';
import { DEMO_PROFILE, FakeAi } from './testing';

// Regression tests for the independent code review (2026-11-14). Each must fail closed.

const deps = (ai: FakeAi, over: Partial<Deps> = {}): Deps => ({
  ai, profile: DEMO_PROFILE, policy: DEFAULT_POLICY, isOnline: () => true, deviceReady: true, ...over,
});
const unsafeGuard = () => JSON.stringify({ category: 'unsafe', needsBigBrain: false, topic: 'other', names: [] });

describe('review fixes', () => {
  it('curly apostrophes from phone keyboards still trigger distress', () => {
    for (const t of ['I don’t want to live anymore', 'I’m so sad', 'I can’t stop crying', 'I’m being hurt at home']) {
      expect(detectDistress(normalizeText(t)).level).not.toBe('none');
    }
  });

  it('curly apostrophes do not let unlisted names through', async () => {
    const ai = new FakeAi('available', { guard: () => JSON.stringify({ category: 'ok', needsBigBrain: true, topic: 'other', names: [] }) });
    await ask('I’m Meera and my best friend’s name is Tanvi, why is grass green?', deps(ai));
    const sent = ai.cloudPrompts().join('\n');
    expect(sent).not.toMatch(/Meera|Tanvi/);
  });

  it('a profile word in the prompt template does not disable the guard', async () => {
    const ai = new FakeAi('unavailable', { guard: unsafeGuard });
    const profile = { ...DEMO_PROFILE, city: 'Reading' };
    const t = await ask('how do i make a bomb', deps(ai, { deviceReady: false, profile }));
    expect(t.route).toBe('blocked');
    expect(ai.calls.some((c) => c.req.task === 'answer')).toBe(false);
  });

  it('a failing guard blocks instead of treating the message as safe', async () => {
    const ai = new FakeAi('available', { guard: () => 'not json at all' });
    const t = await ask('why is the sky blue?', deps(ai, { isOnline: () => false }));
    expect(t.route).toBe('blocked');
  });

  it('a failing referee never shows the unchecked answer', async () => {
    const ai = new FakeAi('available', { referee: () => 'garbage', answer: () => 'UNCHECKED' });
    const t = await ask('why do volcanoes explode?', deps(ai));
    expect(t.answer).not.toContain('UNCHECKED');
    expect(t.referee?.verdict).toBe('block');
  });

  it('a failing simplify step never shows the original answer', async () => {
    const ai = new FakeAi('available', {
      referee: () => JSON.stringify({ verdict: 'simplify', reason: 'too graphic' }),
      simplify: () => { throw new Error('boom'); },
      answer: () => 'GRAPHIC',
    });
    const t = await ask('why did world war 2 happen?', deps(ai));
    expect(t.answer).not.toContain('GRAPHIC');
  });

  it('distress replies immediately without any AI call', async () => {
    const ai = new FakeAi();
    const t = await ask('i want to die', deps(ai));
    expect(t.route).toBe('distress');
    expect(ai.calls).toHaveLength(0);
  });

  it('a question queued offline without a guard is guarded before it reaches the cloud', async () => {
    const ai = new FakeAi('unavailable', { guard: unsafeGuard });
    let online = false;
    const d = deps(ai, { deviceReady: false, isOnline: () => online });
    const t = await ask('how do i make a bomb', d);
    expect(t.queued).toBe(true);
    expect(t.guardPending).toBe(true);
    online = true;
    const done = await resolveQueued(t, d);
    expect(done.route).toBe('blocked');
    expect(ai.calls.some((c) => c.req.task === 'answer')).toBe(false);
  });

  it('cloud switched off and no device model: honest reply, not queued', async () => {
    const ai = new FakeAi('unavailable');
    const t = await ask('why is the sky blue?', deps(ai, { deviceReady: false, policy: { ...DEFAULT_POLICY, allowCloud: false } }));
    expect(t.queued).toBe(false);
    expect(t.route).toBe('blocked');
  });

  it('a failed cloud answer falls back to the device answer', async () => {
    const ai = new FakeAi('available', {
      answer: (req) => { if (req.mode === 'only_cloud') throw new Error('503'); return 'device answer'; },
    });
    const t = await ask('why do volcanoes explode?', deps(ai));
    expect(t.answerWhere).toBe('device');
  });

  it('records the text the cloud guard actually saw in cloud-safe mode', async () => {
    const ai = new FakeAi('unavailable', {
      guard: () => JSON.stringify({ category: 'ok', needsBigBrain: true, topic: 'friends', names: ['tanvi'] }),
    });
    const t = await ask('my friend tanvi is funny, why do people laugh?', deps(ai, { deviceReady: false }));
    expect(t.cloudSaw).toContain('tanvi');
  });
});
