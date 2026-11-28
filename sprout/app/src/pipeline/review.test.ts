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
    const ai = new FakeAi('unavailable', { guard: unsafeGuard, answer: () => 'CLOUD ANSWER' });
    const profile = { ...DEMO_PROFILE, city: 'Reading' };
    const t = await ask('how do i make a bomb', deps(ai, { deviceReady: false, profile }));
    expect(t.route).toBe('blocked');
    // Cloud-safe mode may start the cloud answer alongside the cloud guard (same redacted text, for
    // speed), but an unsafe verdict throws it away: the child never sees it.
    expect(t.answer).not.toContain('CLOUD ANSWER');
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
    const t = await ask('tanvi and i laughed so hard, why do people laugh?', deps(ai, { deviceReady: false }));
    expect(t.cloudSaw).toContain('tanvi');
  });
});

describe('cloud-safe speed-up: answer alongside the guard', () => {
  const okGuard = (names: string[] = []) => () => JSON.stringify({ category: 'ok', needsBigBrain: true, topic: 'science', names });

  it('uses the early answer when the guard says ok (one answer call, refereed)', async () => {
    const ai = new FakeAi('unavailable', { guard: okGuard(), answer: () => 'Light scatters in the air.' });
    const t = await ask('why is the sky blue?', deps(ai, { deviceReady: false }));
    expect(t.route).toBe('cloud');
    expect(t.answer).toBe('Light scatters in the air.');
    expect(ai.calls.filter((c) => c.req.task === 'answer')).toHaveLength(1);
    expect(t.steps.map((s) => s.task)).toEqual(['guard', 'answer', 'referee']);
  });

  it('throws the early answer away when the guard finds extra names, and answers the redacted text', async () => {
    // "Bluebell" is not caught by the deterministic rules; only the guard flags it as a name.
    const ai = new FakeAi('unavailable', { guard: okGuard(['Bluebell']), answer: (r) => (r.prompt.includes('Bluebell') ? 'EARLY' : 'REDACTED') });
    const t = await ask('why is the sky blue says Bluebell?', deps(ai, { deviceReady: false }));
    expect(t.answer).toBe('REDACTED');
    expect(t.steps.filter((s) => s.task === 'answer')).toHaveLength(2); // both calls are on record
  });

  it('never shows the early answer for a distress verdict', async () => {
    const ai = new FakeAi('unavailable', {
      guard: () => JSON.stringify({ category: 'distress', needsBigBrain: false, topic: 'feelings', names: [] }),
      answer: () => 'EARLY',
    });
    // Not caught by the built-in distress rules, so the guard and the early answer both run.
    const t = await ask('everything feels grey lately', deps(ai, { deviceReady: false }));
    expect(t.route).toBe('distress');
    expect(t.answer).not.toContain('EARLY');
    expect(ai.calls.some((c) => c.req.task === 'answer')).toBe(true);
  });

  it('a failing guard still fails closed even if the early answer succeeded', async () => {
    const ai = new FakeAi('unavailable', { guard: () => 'not json', answer: () => 'EARLY' });
    const t = await ask('why is the sky blue?', deps(ai, { deviceReady: false }));
    expect(t.route).toBe('blocked');
    expect(t.answer).not.toContain('EARLY');
  });

  it('an unsafe verdict records the discarded early call as sent', async () => {
    const ai = new FakeAi('unavailable', { guard: unsafeGuard, answer: () => 'EARLY' });
    const t = await ask('how do i pick a lock', deps(ai, { deviceReady: false }));
    expect(t.route).toBe('blocked');
    const early = t.steps.find((s) => s.task === 'answer');
    expect(early?.where).toBe('cloud');
    expect(early?.sentToCloud).toContain('how do i pick a lock');
  });

  it('a sensitive verdict reuses the early answer (still refereed)', async () => {
    const ai = new FakeAi('unavailable', {
      guard: () => JSON.stringify({ category: 'sensitive', needsBigBrain: true, topic: 'history', names: [] }),
      answer: () => 'A careful answer.',
    });
    const t = await ask('why did world war 2 happen?', deps(ai, { deviceReady: false }));
    expect(t.answer).toBe('A careful answer.');
    expect(ai.calls.filter((c) => c.req.task === 'answer')).toHaveLength(1);
    expect(t.steps.map((s) => s.task)).toEqual(['guard', 'answer', 'referee']);
  });

  it('a blocked or distress verdict does not wait for a slow early answer', async () => {
    class SlowAnswerAi extends FakeAi {
      override async generate(req: Parameters<FakeAi['generate']>[0]) {
        if (req.task === 'answer') return new Promise<never>(() => { /* never answers */ });
        return super.generate(req);
      }
    }
    const ai = new SlowAnswerAi('unavailable', { guard: unsafeGuard });
    const t0 = Date.now();
    const t = await ask('how do i pick a lock', deps(ai, { deviceReady: false }));
    expect(t.route).toBe('blocked');
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('with a device model the guard runs first and nothing is started early', async () => {
    const ai = new FakeAi('available', { guard: unsafeGuard });
    await ask('how do i make a bomb', deps(ai));
    expect(ai.calls.some((c) => c.req.task === 'answer')).toBe(false);
  });
});

describe('privacy ledger', () => {
  it('counts a private detail once per question, however many cloud calls carried it', async () => {
    const { totals } = await import('./ledger');
    const turn = {
      id: 't', at: 0, question: 'q', sanitized: 'q', queued: false, route: 'cloud', answerWhere: 'cloud', answer: 'a', mode: 'cloud-safe',
      redactions: [{ original: 'Bluebell', token: '[NAME_1]', kind: 'name' }],
      steps: [
        { task: 'guard', where: 'cloud', latencyMs: 1, sentToCloud: 'Bluebell asked', outChars: 1 },
        { task: 'answer', where: 'cloud', latencyMs: 1, sentToCloud: 'Bluebell asked', outChars: 1 },
      ],
    };
    expect(totals([turn as never]).identifiersSentToCloud).toBe(1);
  });
});

describe('cloud out of quota', () => {
  const resting = () => { throw Object.assign(new Error('[429 ] quota'), { sproutCloudUnavailable: true }); };

  it('says the big brain is resting when the guard cannot run (not "could not double-check")', async () => {
    const ai = new FakeAi('unavailable', { guard: resting, answer: resting });
    const t = await ask('why is the sky blue?', deps(ai, { deviceReady: false }));
    expect(t.route).toBe('blocked');
    expect(t.answer).toMatch(/taking a rest/);
  });

  it('says resting when the referee cannot run, and never shows the unchecked answer', async () => {
    const ai = new FakeAi('unavailable', { referee: resting, answer: () => 'UNCHECKED' });
    const t = await ask('why is the sky blue?', deps(ai, { deviceReady: false }));
    expect(t.answer).toMatch(/taking a rest/);
    expect(t.answer).not.toContain('UNCHECKED');
  });

  it('says resting when only the answer call runs out of quota', async () => {
    const ai = new FakeAi('unavailable', { answer: resting });
    const t = await ask('why is the sky blue?', deps(ai, { deviceReady: false }));
    expect(t.answer).toMatch(/taking a rest/);
  });
});

describe('cloud timeouts', () => {
  it('a cloud call that times out in the pipeline counts as busy (resting), and shows nothing unchecked', async () => {
    class HangingAi extends FakeAi {
      override async generate(req: Parameters<FakeAi['generate']>[0]) {
        if (req.task === 'guard') return new Promise<never>(() => { /* never answers */ });
        return super.generate(req);
      }
    }
    const ai = new HangingAi('unavailable', { answer: () => 'UNCHECKED' });
    const t = await ask('why is the sky blue?', deps(ai, { deviceReady: false, timeoutMs: 30 }));
    expect(t.answer).toMatch(/taking a rest/);
    expect(t.answer).not.toContain('UNCHECKED');
  });
});
